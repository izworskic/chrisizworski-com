import json
import tempfile
import unittest
from datetime import date, datetime, timedelta, time
from pathlib import Path
from unittest.mock import patch
import collector as c
import prospective as p

CYCLE=c.timestamp('2026-11-25T12:00:00Z')
VALID=CYCLE+timedelta(hours=72)
ASOF=c.timestamp('2026-12-02T00:00:00Z')


def receipt(root,url,text,when):
    raw=text.encode();h=c.digest(raw);c.write_once(root/'blobs'/h,raw)
    return dict(url=url,sha256=h,bytes=len(raw),state='CAPTURED',status=200,started_at=c.iso(when),captured_at=c.iso(when))


def manifest(root,rows):
    c.Archive(root).save('cycles','20261125T12Z',{'receipts':rows})


def inventory(cycle=CYCLE,lead=72,model='leofs'):
    key=c.key_for(model,cycle,lead)
    return f'<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Prefix>{key}</Prefix><IsTruncated>false</IsTruncated><KeyCount>1</KeyCount><Contents><Key>{key}</Key><LastModified>{c.iso(cycle+timedelta(hours=2))}</LastModified><ETag>test-etag</ETag><Size>1000</Size></Contents></ListBucketResult>'


class Tests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name)
    def tearDown(self): self.tmp.cleanup()
    def erie(self, report):
        return next(x for x in report['slots'] if x['cycle_at']==c.iso(CYCLE) and x['model']=='leofs' and x['lead_hours']==72)
    def obs(self,value,when):
        d=VALID.date();j=d.timetuple().tm_yday
        return receipt(self.root,p.OBS_URL,f'{d.year} {j} 0 0 0 {value} 0 0 0\n',when)
    def test_fixed_slots_and_missing(self):
        r=p.reconcile(self.root,ASOF);self.assertEqual(len(r['slots']),1016);self.assertEqual(self.erie(r)['forecast_state'],'MISSING_FORECAST');self.assertFalse(r['release_eligible']);self.assertEqual(r['scored_count'],0)
    def test_awaiting_cutoff(self):
        self.assertEqual(self.erie(p.reconcile(self.root,CYCLE+timedelta(hours=12)))['forecast_state'],'AWAITING_CAPTURE')
    def test_inventory_and_first_observed_zero_and_revision(self):
        manifest(self.root,[receipt(self.root,p.inventory_url('leofs',CYCLE,72),inventory(),CYCLE+timedelta(hours=3)),self.obs(0,VALID+timedelta(hours=15)),self.obs(2,VALID+timedelta(days=2)),self.obs(2,VALID+timedelta(days=3))]);r=self.erie(p.reconcile(self.root,ASOF));self.assertEqual(r['forecast_state'],'INVENTORY_ONLY');self.assertEqual(r['outcome_state'],'DATE_MATCHED_UNQUALIFIED');o=r['outcomes']['Erie'];self.assertEqual(o['first_value_pct'],0);self.assertTrue(o['revised']);self.assertEqual(len(o['versions']),2);self.assertFalse(r['score_eligible'])
    def test_late_forecast_not_reassigned(self):
        manifest(self.root,[receipt(self.root,p.inventory_url('leofs',CYCLE,72),inventory(),CYCLE+timedelta(hours=25))]);self.assertEqual(self.erie(p.reconcile(self.root,ASOF))['forecast_state'],'MISSING_FORECAST')
    def test_same_day_observation_not_exact_outcome(self):
        manifest(self.root,[self.obs(8,VALID+timedelta(hours=1))]);self.assertIsNone(self.erie(p.reconcile(self.root,ASOF))['outcomes']['Erie'])
    def test_corrupt_raw_bytes_fail_closed(self):
        r=receipt(self.root,p.OBS_URL,'bad',VALID+timedelta(days=1));manifest(self.root,[r]);(self.root/'blobs'/r['sha256']).write_bytes(b'changed');self.assertRaises(ValueError,p.reconcile,self.root,ASOF)
    def test_connector_body_without_http_status_is_not_fabricated(self):
        r=receipt(self.root,p.inventory_url('leofs',CYCLE,72),inventory(),CYCLE+timedelta(hours=3));r.update(state='BODY_CAPTURED',status=None,transport='connector-body');manifest(self.root,[r]);self.assertEqual(self.erie(p.reconcile(self.root,ASOF))['forecast_state'],'INVENTORY_ONLY')
    def test_future_receipt_rejected(self):
        manifest(self.root,[self.obs(0,ASOF+timedelta(days=1))]);self.assertRaises(ValueError,p.reconcile,self.root,ASOF)
    def test_conflicting_same_timestamp(self):
        when=VALID+timedelta(days=1);manifest(self.root,[self.obs(1,when),self.obs(2,when)]);self.assertEqual(self.erie(p.reconcile(self.root,ASOF))['outcomes']['Erie']['state'],'AMBIGUOUS')
    def test_separate_groups_cannot_substitute_inventory(self):
        manifest(self.root,[receipt(self.root,p.inventory_url('leofs',CYCLE,72),inventory(),CYCLE+timedelta(hours=3))]);manifest(self.root,[self.obs(0,VALID+timedelta(days=1))]);self.assertEqual(self.erie(p.reconcile(self.root,ASOF))['forecast_state'],'INVENTORY_ONLY')
    def test_full_field_replay_requires_raw_vectors_and_same_capture(self):
        from urllib.parse import quote
        when=CYCLE+timedelta(hours=3)
        base=f'{c.DAP}LEOFS/MODELS/{CYCLE:%Y/%m/%d}/{Path(c.key_for("leofs",CYCLE,72)).name}'
        fields={'aice':[0,.5,1],'wet_nodes':[1,1,1],'art1':[1,2,3],'lon':[-83,-82,-81],'lat':[41,42,43]}
        schema='\n'.join(['Float32 aice[time = 1][node = 3]','Int32 wet_nodes[time = 1][node = 3]','Float32 art1[node = 3]','Float32 lon[node = 3]','Float32 lat[node = 3]','String Times[time = 1]'])
        rows=[receipt(self.root,p.inventory_url('leofs',CYCLE,72),inventory(),when),receipt(self.root,base+'.dds',schema,when),receipt(self.root,base+'.das','Area of Node-Base Control volume; ice area',when),receipt(self.root,base+'.ascii?Times','"2026-11-28T12:00:00"',when)]
        for var,values in fields.items():
            sel=f'{var}[0:1:2]' if var in ('art1','lon','lat') else f'{var}[0][0:1:2]'
            rows.append(receipt(self.root,base+'.ascii?'+quote(sel,safe=''),'Dataset {}\n------------\n'+var+'\n[0], '+', '.join(map(str,values)),when))
        with patch.dict(c.MODELS,{'leofs':3}):
            manifest(self.root,rows[:-1]);self.assertEqual(self.erie(p.reconcile(self.root,ASOF))['forecast_state'],'INVENTORY_ONLY')
            manifest(self.root,rows);result=self.erie(p.reconcile(self.root,ASOF));self.assertEqual(result['forecast_state'],'PROVISIONAL_FIELD');self.assertAlmostEqual(result['provisional_domain_pct'],100*4/6);self.assertFalse(result['score_eligible'])
    def test_original_seed_body_integrity_and_replay(self):
        seed=Path(__file__).resolve().parent/'seed'
        result=p.reconcile(seed,c.timestamp('2026-11-26T11:59:00Z'))
        self.assertEqual(result['raw_receipts'],9)
        rows=[x for x in result['slots'] if x['cycle_at']==c.iso(CYCLE)]
        self.assertEqual(len(rows),8)
        self.assertTrue(all(x['forecast_state']=='INVENTORY_ONLY' and x['mos_captured'] for x in rows))
        self.assertTrue(all(x['outcome_state']=='NOT_YET_DUE' and not x['score_eligible'] for x in rows))
    def test_undecodable_body_is_quarantined_without_losing_valid_data(self):
        when=VALID+timedelta(days=1)
        raw=b'\xff'; h=c.digest(raw); c.write_once(self.root/'blobs'/h,raw)
        bad=dict(url=p.OBS_URL,sha256=h,bytes=1,state='CAPTURED',status=200,started_at=c.iso(when),captured_at=c.iso(when))
        manifest(self.root,[bad,self.obs(0,when)])
        report=p.reconcile(self.root,ASOF)
        self.assertEqual(report['raw_receipts'],2)
        self.assertEqual(report['quarantined_receipts'][0]['sha256'],h)
        self.assertEqual(report['quarantined_receipts'][0]['reason'],'INVALID_UTF8')
        self.assertEqual(self.erie(report)['outcomes']['Erie']['first_value_pct'],0)
        self.assertEqual((self.root/'blobs'/h).read_bytes(),raw)
    def test_conflict_after_first_timestamp_is_ambiguous(self):
        first=VALID+timedelta(days=1); later=first+timedelta(days=1)
        manifest(self.root,[self.obs(0,first),self.obs(1,later),self.obs(2,later)])
        outcome=self.erie(p.reconcile(self.root,ASOF))['outcomes']['Erie']
        self.assertEqual(outcome['state'],'AMBIGUOUS')
        self.assertEqual(outcome['conflicting_timestamps'],[c.iso(later)])
        self.assertNotIn('versions',outcome)
    def test_final_target_has_post_day_followup(self):
        final=datetime.combine(p.END,time(12),c.UTC)+timedelta(hours=120)
        after=datetime.combine(final.date()+timedelta(days=1),time(),c.UTC)
        self.assertGreaterEqual(p.FOLLOWUP,after.date())
        self.assertEqual(p.match_outcome({(final.date(),'Erie'):[(after,'hash',0)]},final.date(),'Erie')['state'],'DATE_MATCHED_UNQUALIFIED')
        workflow=(Path(__file__).resolve().parents[3]/'.github/workflows/great-lakes-ice-prospective-archive.yml').read_text()
        self.assertIn("30 22 1-10 4 *",workflow)
        self.assertIn('2027-04-10',workflow)
    def test_cycle_selection(self):
        self.assertEqual(p.cycle_for(c.timestamp('2026-11-26T01:00:00Z')),CYCLE);self.assertEqual(p.cutoff(CYCLE),CYCLE+timedelta(days=1));self.assertEqual(p.collect(self.root,c.timestamp('2027-04-11T22:30:00Z'))['state'],'OUTSIDE_SEASON')

if __name__=='__main__':unittest.main()
