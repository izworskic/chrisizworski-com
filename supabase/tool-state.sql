-- Private TTL values and ordered alert indexes. Only the authenticated Edge
-- Function's service role can call this RPC; no browser/data-API access.
create schema if not exists tool_state;
revoke all on schema tool_state from public, anon, authenticated;
grant usage on schema tool_state to service_role;
create table if not exists tool_state.kv_entries (
 namespace text not null, key text not null, value text not null,
 expires_at timestamptz, primary key(namespace,key)
);
create index if not exists tool_state_expiry on tool_state.kv_entries(expires_at) where expires_at is not null;
create table if not exists tool_state.scores (
 namespace text not null, key text not null, member text not null,
 score double precision not null, updated_at timestamptz not null default now(),
 primary key(namespace,key,member)
);
create index if not exists tool_state_score_range on tool_state.scores(namespace,key,score,member);
alter table tool_state.kv_entries enable row level security;
alter table tool_state.scores enable row level security;
revoke all on tool_state.kv_entries,tool_state.scores from public,anon,authenticated;
grant select,insert,update,delete on tool_state.kv_entries,tool_state.scores to service_role;

create table if not exists tool_state.set_members (
 namespace text not null,key text not null,member text not null,primary key(namespace,key,member)
);
create table if not exists tool_state.list_items (
 id bigint generated always as identity primary key,namespace text not null,key text not null,value text not null
);
create index if not exists tool_state_list_order on tool_state.list_items(namespace,key,id desc);
alter table tool_state.set_members enable row level security;
alter table tool_state.list_items enable row level security;
revoke all on tool_state.set_members,tool_state.list_items from public,anon,authenticated;
grant select,insert,update,delete on tool_state.set_members,tool_state.list_items to service_role;
grant usage on sequence tool_state.list_items_id_seq to service_role;

create or replace function public.tool_state_command(ns text, args jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
 op text := upper(args->>0); k text := args->>1; v text;
 result jsonb; ttl double precision; expiry timestamptz; only_new boolean := false;
 i integer; affected integer := 0; n integer; lower_score double precision; upper_score double precision;
 lower_exclusive boolean; upper_exclusive boolean; skip_count integer := 0; take_count integer := 2000;
begin
 if ns !~ '^[a-z0-9-]{1,80}:(production|preview)$'
   or jsonb_typeof(args) <> 'array' or jsonb_array_length(args) > 2001
   or op not in ('PING','GET','SET','MGET','DEL','RELEASE','ZADD','ZREM','ZRANGEBYSCORE','ZREMRANGEBYSCORE','INCR','SADD','SREM','SMEMBERS','SCARD','SISMEMBER','LPUSH','LRANGE') then
  raise exception 'Invalid state command';
 end if;
 if op='PING' then return '"PONG"'::jsonb; end if;
 if k is null or length(k)>1024 or length(k)=0 then raise exception 'Invalid state key'; end if;
 -- Expired records are never returned, and bounded cleanup prevents accumulation.
 delete from tool_state.kv_entries where (namespace,key) in (
  select namespace,key from tool_state.kv_entries where expires_at<=now() limit 1000
 );
 if op='GET' then
  select value into v from tool_state.kv_entries where namespace=ns and key=k and (expires_at is null or expires_at>now());
  return to_jsonb(v);
 elsif op='MGET' then
  select jsonb_agg(to_jsonb(t.value) order by a.ordinality) into result
   from jsonb_array_elements_text(args) with ordinality a(key,ordinality)
   left join tool_state.kv_entries t on t.namespace=ns and t.key=a.key and (t.expires_at is null or t.expires_at>now())
   where a.ordinality>1;
  return coalesce(result,'[]'::jsonb);
 end if;
 -- Per-key transaction locks preserve NX leases and compare-and-delete ownership.
 perform pg_advisory_xact_lock(hashtextextended(ns||':'||k,0));
 delete from tool_state.kv_entries where namespace=ns and key=k and expires_at<=now();
 if op='SET' then
  if jsonb_array_length(args)<3 then raise exception 'Missing value'; end if;
  v := args->>2;
  if v is null or octet_length(v)>2097152 then raise exception 'State value too large'; end if;
  i := 3;
  while i<jsonb_array_length(args) loop
   if upper(args->>i)='NX' then only_new := true; i:=i+1;
   elsif upper(args->>i) in ('EX','PX') then
    ttl := (args->>(i+1))::double precision;
    if ttl<=0 or ttl in ('Infinity'::double precision,'-Infinity'::double precision,'NaN'::double precision) then raise exception 'Invalid TTL'; end if;
    if upper(args->>i)='PX' then ttl:=ttl/1000; end if;
    if ttl>34560000 then raise exception 'TTL exceeds 400 days'; end if;
    expiry := now()+make_interval(secs=>ttl); i:=i+2;
   else raise exception 'Unsupported SET option'; end if;
  end loop;
  if only_new then
   insert into tool_state.kv_entries values(ns,k,v,expiry) on conflict do nothing;
   get diagnostics affected = row_count;
   if affected=0 then return null; end if;
  else
   insert into tool_state.kv_entries values(ns,k,v,expiry) on conflict(namespace,key)
    do update set value=excluded.value,expires_at=excluded.expires_at;
  end if;
  return '"OK"'::jsonb;
 elsif op='RELEASE' then
  delete from tool_state.kv_entries where namespace=ns and key=k and value=args->>2;
  get diagnostics affected = row_count; return to_jsonb(affected);
 elsif op='INCR' then
  select value into v from tool_state.kv_entries where namespace=ns and key=k;
  v:=((coalesce(v,'0'))::bigint+1)::text;
  insert into tool_state.kv_entries values(ns,k,v,null) on conflict(namespace,key) do update set value=excluded.value;
  return to_jsonb(v::bigint);
 elsif op='SADD' then
  for i in 2..jsonb_array_length(args)-1 loop
   insert into tool_state.set_members values(ns,k,args->>i) on conflict do nothing;
   get diagnostics n=row_count;affected:=affected+n;
  end loop;
  return to_jsonb(affected);
 elsif op='SREM' then
  delete from tool_state.set_members where namespace=ns and key=k and member in
   (select value from jsonb_array_elements_text(args) with ordinality t(value,n) where t.n>2);
  get diagnostics affected=row_count;return to_jsonb(affected);
 elsif op='SMEMBERS' then
  select jsonb_agg(member order by member) into result from tool_state.set_members where namespace=ns and key=k;
  return coalesce(result,'[]'::jsonb);
 elsif op='SCARD' then
  select count(*) into affected from tool_state.set_members where namespace=ns and key=k;
  return to_jsonb(affected);
 elsif op='SISMEMBER' then
  return to_jsonb((exists(select 1 from tool_state.set_members where namespace=ns and key=k and member=args->>2))::integer);
 elsif op='LPUSH' then
  for i in 2..jsonb_array_length(args)-1 loop
   insert into tool_state.list_items(namespace,key,value) values(ns,k,args->>i);
  end loop;
  select count(*) into affected from tool_state.list_items where namespace=ns and key=k;
  return to_jsonb(affected);
 elsif op='LRANGE' then
  select count(*) into affected from tool_state.list_items where namespace=ns and key=k;
  skip_count:=(args->>2)::integer;n:=(args->>3)::integer;
  if skip_count<0 then skip_count:=greatest(0,affected+skip_count);end if;
  if n<0 then n:=affected+n;end if;
  take_count:=greatest(0,n-skip_count+1);
  select jsonb_agg(value order by id desc) into result from (
   select value,id from tool_state.list_items where namespace=ns and key=k order by id desc limit take_count offset skip_count
  ) ranked;
  return coalesce(result,'[]'::jsonb);
 elsif op='DEL' then
  for i in 1..jsonb_array_length(args)-1 loop
   delete from tool_state.kv_entries where namespace=ns and key=args->>i;
   get diagnostics n=row_count; affected:=affected+n;
   delete from tool_state.scores where namespace=ns and key=args->>i;
   delete from tool_state.set_members where namespace=ns and key=args->>i;
   delete from tool_state.list_items where namespace=ns and key=args->>i;
  end loop;
  return to_jsonb(affected);
 elsif op='ZADD' then
  if jsonb_array_length(args)<4 or jsonb_array_length(args)%2<>0 then raise exception 'Invalid score members'; end if;
  i:=2;
  while i<jsonb_array_length(args) loop
   lower_score := (args->>i)::double precision;
   if lower_score in ('NaN'::double precision,'Infinity'::double precision,'-Infinity'::double precision) then raise exception 'Invalid score'; end if;
   insert into tool_state.scores values(ns,k,args->>(i+1),lower_score,now()) on conflict do nothing;
   get diagnostics n=row_count; affected:=affected+n;
   update tool_state.scores set score=lower_score,updated_at=now() where namespace=ns and key=k and member=args->>(i+1);
   i:=i+2;
  end loop;
  return to_jsonb(affected);
 elsif op='ZREM' then
  delete from tool_state.scores where namespace=ns and key=k and member in
   (select value from jsonb_array_elements_text(args) with ordinality t(value,n) where t.n>2);
  get diagnostics affected=row_count; return to_jsonb(affected);
 elsif op in ('ZRANGEBYSCORE','ZREMRANGEBYSCORE') then
  lower_exclusive := left(args->>2,1)='('; upper_exclusive := left(args->>3,1)='(';
  lower_score := replace(replace(ltrim(args->>2,'('),'+inf','Infinity'),'-inf','-Infinity')::double precision;
  upper_score := replace(replace(ltrim(args->>3,'('),'+inf','Infinity'),'-inf','-Infinity')::double precision;
  if lower_score is null or upper_score is null or lower_score='NaN'::double precision or upper_score='NaN'::double precision then raise exception 'Invalid range'; end if;
  if op='ZREMRANGEBYSCORE' then
   delete from tool_state.scores where namespace=ns and key=k
    and (score>lower_score or (not lower_exclusive and score=lower_score))
    and (score<upper_score or (not upper_exclusive and score=upper_score));
   get diagnostics affected=row_count; return to_jsonb(affected);
  end if;
  if jsonb_array_length(args)>4 then
   if jsonb_array_length(args)<>7 or upper(args->>4)<>'LIMIT' then raise exception 'Invalid range limit'; end if;
   skip_count := (args->>5)::integer; take_count := (args->>6)::integer;
   if skip_count<0 or take_count<0 or take_count>2000 then raise exception 'Invalid range limit'; end if;
  end if;
  select jsonb_agg(member order by score,member) into result from (
   select member,score from tool_state.scores where namespace=ns and key=k
    and (score>lower_score or (not lower_exclusive and score=lower_score))
    and (score<upper_score or (not upper_exclusive and score=upper_score))
    order by score,member limit take_count offset skip_count
  ) ranked;
  return coalesce(result,'[]'::jsonb);
 end if;
 raise exception 'Unsupported command';
end $$;
revoke all on function public.tool_state_command(text,jsonb) from public,anon,authenticated;
grant execute on function public.tool_state_command(text,jsonb) to service_role;
