"""Evidence-gated offline hybrid scorer. No production integration or safety use."""
from datetime import datetime,timedelta,timezone
import math,statistics as st,re
LAKES={'Superior','Michigan','Huron','Erie','Ontario'}
HORIZONS={72,120}
MODELS={'Superior':'lsofs','Michigan':'lmhofs','Huron':'lmhofs','Erie':'leofs','Ontario':'loofs'}

def valid_number(v,lo,hi):return type(v) in (float,int) and math.isfinite(v) and lo<=v<=hi

def timestamp(s):
    if not isinstance(s,str) or not s.endswith('Z'):raise ValueError('explicit UTC required')
    return datetime.fromisoformat(s[:-1]+'+00:00')

def sha(s):return isinstance(s,str) and re.fullmatch('[0-9a-f]{64}',s) is not None

def area_mean(areas,fractions,wet,*,expected_count,reviewed_domain):
    """Caller supplies reviewed lake-specific node control-volume membership/areas."""
    if reviewed_domain is not True:raise ValueError('lake mask and fraction semantics unreviewed')
    return domain_arithmetic(areas,fractions,wet,expected_count=expected_count)

def domain_arithmetic(areas,fractions,wet,*,expected_count):
    """Numerical calculation only; no claim of scientific domain review."""
    if len(areas)!=len(fractions) or len(areas)!=len(wet) or len(areas)!=expected_count or not areas:raise ValueError('incomplete domain')
    if any(not valid_number(a,1e-15,1e14) or not valid_number(c,0,1) or type(w) is not int or w not in (0,1) for a,c,w in zip(areas,fractions,wet)):raise ValueError('invalid node')
    den=math.fsum(a for a,w in zip(areas,wet) if w);total=math.fsum(areas)
    if den<=0 or den/total<.99:raise ValueError('insufficient wet-area support')
    return {'coverage_pct':100*math.fsum(a*c for a,c,w in zip(areas,fractions,wet) if w)/den,'wet_area_fraction':den/total,'nodes':expected_count,'scope':'model-domain arithmetic, not ice safety'}

def validate(row):
    lake=row['lake'];lead=row['lead_hours'];cycle=timestamp(row['cycle_at']);decision=timestamp(row['decision_at']);valid=timestamp(row['valid_at']);observed=timestamp(row['outcome_observed_at']);out_avail=timestamp(row['outcome_available_at'])
    if lake not in LAKES or lead not in HORIZONS or row['physical_model']!=MODELS[lake] or valid!=cycle+timedelta(hours=lead) or observed!=valid:raise ValueError('identity/time mismatch')
    if not cycle<=decision<valid or out_avail<valid:raise ValueError('invalid decision/outcome chronology')
    for kind in ('physical','thermal','baseline'):
        if not valid_number(row[kind+'_pct'],0,100) or not sha(row[kind+'_sha256']) or timestamp(row[kind+'_available_at'])>decision:raise ValueError('missing, invalid or late input '+kind)
    if timestamp(row['thermal_cycle_at'])!=cycle or timestamp(row['thermal_valid_at'])!=valid:raise ValueError('thermal horizon mismatch')
    if not cycle<=timestamp(row['thermal_available_at']):raise ValueError('thermal publication before cycle')
    if not cycle<=timestamp(row['physical_available_at']):raise ValueError('physical publication before cycle')
    if timestamp(row['baseline_observed_at'])>timestamp(row['baseline_available_at']):raise ValueError('baseline chronology')
    if decision-timestamp(row['baseline_observed_at'])>timedelta(hours=48):raise ValueError('stale baseline')
    if not valid_number(row['outcome_pct'],0,100) or not sha(row['outcome_sha256']) or not sha(row['lake_mask_sha256']):raise ValueError('invalid outcome/mask provenance')
    if row.get('physical_kind')!='issued_forecast' or row.get('thermal_kind')!='issued_forecast' or row.get('outcome_kind')!='independent_observation' or row.get('domain_reviewed') is not True:raise ValueError('unqualified evidence')
    return (lake,lead,row['cycle_at'])

def fit_weight(rows):
    """Training-only bounded least squares. 0 = thermal, 1 = physical."""
    if not rows:raise ValueError('empty training')
    d=[r['physical_pct']-r['thermal_pct'] for r in rows]; e=[r['outcome_pct']-r['thermal_pct'] for r in rows];den=sum(v*v for v in d)
    return min(1,max(0,sum(a*b for a,b in zip(d,e))/den)) if den else .5

def evaluate(train,test,expected_train,expected_test):
    """Strict frozen cohorts, identical complete rows, no silent dropping."""
    def check(rows,expected):
        keys=[validate(r) for r in rows]
        if len(expected)!=len(set(expected)):raise ValueError('duplicate frozen slots')
        if not keys or len(keys)!=len(set(keys)) or set(keys)!=set(expected):raise ValueError('incomplete/duplicate cohort')
    check(train,expected_train);check(test,expected_test)
    if max(timestamp(r['outcome_available_at']) for r in train)>=min(timestamp(r['decision_at']) for r in test):raise ValueError('training outcome leaked across split')
    out={}
    for lake,lead in sorted({(r['lake'],r['lead_hours']) for r in test}):
        tr=[r for r in train if (r['lake'],r['lead_hours'])==(lake,lead)];te=[r for r in test if (r['lake'],r['lead_hours'])==(lake,lead)]
        w=fit_weight(tr);models={'persistence':lambda r:r['baseline_pct'],'thermal':lambda r:r['thermal_pct'],'physical':lambda r:r['physical_pct'],'hybrid':lambda r:w*r['physical_pct']+(1-w)*r['thermal_pct']}
        out[f'{lake}:{lead}']={'weight_physical':w,'train_n':len(tr),'test_n':len(te),'mae_pp':{k:st.mean(abs(p(r)-r['outcome_pct']) for r in te) for k,p in models.items()}}
    return {'scores':out,'can_promote':False,'interval_eligible':False,'note':'Provenance assertions require independent source audit; synthetic tests are not evidence of skill.'}
