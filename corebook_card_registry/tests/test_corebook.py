import copy
import importlib.util
import json
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[2]
def load(name,path):
    spec=importlib.util.spec_from_file_location(name,ROOT/path)
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module
registry=load('registry','anki_live_drill_bridge/anki_addon/corebook_registry.py')
guard=load('guard','tools/corebook_card_guard.py')

def entry(cid='1',nid='11',q='Which phase shows finding alpha?',a='The delayed phase.',**kw):
    e={'entryId':cid,'cardId':cid,'noteId':nid,'stableId':'H7UZ9RNT2MKA','deck':'Corebook::GI::Liver::Topic',
       'clinicalContext':'H7UZ9RNT2MKA','noteType':'core_rad_notetype_v2',
       'question':q,'answer':a,'cardType':'highYield','imageRecognition':False,'suspended':False}
    e.update(kw);e['contentHash']=registry.digest([e['question'],e['answer'],e['imageRecognition']]);return e

def bank(entries=None):
    entries=[entry()] if entries is None else entries
    return {'schemaVersion':1,'complete':True,'scopeRoot':'Corebook','collectionIdentity':'profile1',
        'capturedAt':datetime.now(timezone.utc).isoformat(),'entries':entries,'removedEntries':[],
        'cardCount':len(entries),'snapshotId':'snapshot1','historyStartedAt':'baseline'}

class HistoryTests(unittest.TestCase):
    def test_removal_reasons_and_edits(self):
        old=bank([entry(str(i),str(i+10)) for i in range(1,5)])
        current=bank([entry('4','14',a='A corrected explanation.')])
        out=registry.reconcile(old,current,{'12','13','14'},{'3','4'})
        self.assertEqual({e['cardId']:e['reason'] for e in out['removedEntries']},
            {'1':'noteDeleted','2':'cardRemoved','3':'movedOutOfCorebook','4':'questionRevised'})
    def test_baseline_does_not_accept_generated_files(self):
        out=registry.reconcile(None,bank(),{'11'},{'1'})
        self.assertEqual(out['removedEntries'],[])
        self.assertFalse(out['generatedFilesAreAccepted'])
    def test_restore_clears_old_tombstone(self):
        deleted=registry.reconcile(bank(),bank([]),set(),set())
        restored=registry.reconcile(deleted,bank(),{'11'},{'1'})
        self.assertEqual(restored['removedEntries'],[])
    def test_suspension_is_not_deletion(self):
        out=registry.reconcile(bank(),bank([entry(suspended=True)]),{'11'},{'1'})
        self.assertEqual(out['removedEntries'],[])
        self.assertTrue(out['entries'][0]['suspended'])
    def test_partial_or_other_collection_cannot_erase_history(self):
        for field,value in [('complete',False),('collectionIdentity','another')]:
            bad=bank([]);bad[field]=value
            with self.assertRaises(ValueError):registry.reconcile(bank(),bad,set(),set())
    def test_snapshot_uses_existing_cards_filtered_deck_and_specific_fields(self):
        model={'name':'core_rad_notetype_v2','flds':[{'name':n} for n in ['Clinical_Context','High_Yield_Q','High_Yield_A','summary']],
            'tmpls':[{'ord':0,'name':'High Yield','qfmt':'{{High_Yield_Q}}'}]}
        fields='H7UZ9RNT2MKA\x1fQuestion?\x1fAnswer.\x1fRepeated whole article summary'
        db=SimpleNamespace(all=lambda sql:[(1,11,999,2,0,-1,20,fields,'guid')],list=lambda sql:[11],scalar=lambda sql:123)
        decks=SimpleNamespace(name=lambda did:'Corebook::GI::Liver' if did==2 else 'Filtered',
            all_names_and_ids=lambda:[SimpleNamespace(name='Corebook::GI::Liver')])
        col=SimpleNamespace(db=db,decks=decks,models=SimpleNamespace(get=lambda mid:model))
        result,_,_=registry.capture(col,'some-profile')
        self.assertEqual(result['entries'][0]['answer'],'Answer.')
        self.assertEqual(result['entries'][0]['deck'],'Corebook::GI::Liver')
        self.assertTrue(result['entries'][0]['suspended'])
        self.assertNotIn('summary',json.dumps(result))

class ValidationTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.b=Path(self.tmp.name);self.bank=bank()
        self.meta={'anki':{'deckName':'Corebook::GI::Liver::Topic','noteType':'core_rad_notetype_v2'}}
        self.write('metadata.json',self.meta)
    def tearDown(self):self.tmp.cleanup()
    def write(self,name,data):guard.write_json(self.b/name,data)
    def cards(self,q='Which independent feature identifies beta?',a='Beta has feature gamma.',image=False,action='newConcept',matches=None,stable='K7TN9HAQ2XZP'):
        r=['']*22;r[0]=stable;r[20]='Retained article summary'
        r[3 if image else 14]=q;r[4 if image else 15]=a
        if image:r[1]='<img src="different_patient.jpg">';r[2]='<div class="stackCap">Raw <img src="arrow_WS.png"></div>'
        body='\t'.join(r)+'\n'
        (self.b/'corrected_cards.tsv').write_text(body,encoding='utf-8')
        (self.b/'generated_cards.tsv').write_text(body,encoding='utf-8')
        headers='#separator:tab\n#html:true\n#notetype:core_rad_notetype_v2\n#deck:Corebook::GI::Liver::Topic\n'
        (self.b/'corrected_cards_anki_import.tsv').write_text(headers+body,encoding='utf-8')
        self.write('card_overlap_review.json',{'snapshotId':self.bank['snapshotId'],'scopeReviewed':'Corebook::GI::Liver',
            'semanticReviewComplete':True,'fullOrganReviewComplete':True,'crossCategoryReviewComplete':True,
            'decisions':[{'clinicalContext':stable,'disposition':action,'learningObjective':'Recognize a distinct imaging discriminator.',
                'rationale':'This tests a different feature from the previously owned question.','matchedEntryIds':matches or []}],
            'skippedQuestions':[]})
    def test_distinct_concept_passes_without_anki_write(self):
        self.cards();out=guard.validate(self.b,self.bank)
        self.assertEqual(out['status'],'passed');self.assertFalse(out['ankiModified'])
    def test_repeat_blocked_across_card_types_and_removed_history(self):
        self.cards(q=self.bank['entries'][0]['question'],a=self.bank['entries'][0]['answer'])
        self.bank['entries'][0]['cardType']='boardsTrap'
        with self.assertRaisesRegex(ValueError,'owned/removed'):guard.validate(self.b,self.bank)
        old=self.bank['entries'].pop();old.update(historyId='removed1',reason='noteDeleted')
        self.bank['removedEntries']=[old];self.bank['cardCount']=0
        with self.assertRaisesRegex(ValueError,'owned/removed'):guard.validate(self.b,self.bank)
    def test_same_concept_different_image_stays(self):
        self.cards(q=self.bank['entries'][0]['question'],a=self.bank['entries'][0]['answer'],image=True,action='distinctImage')
        self.assertEqual(guard.validate(self.b,self.bank)['status'],'passed')
    def test_text_cannot_bypass_as_image(self):
        self.cards(action='distinctImage')
        with self.assertRaisesRegex(ValueError,'Text-only'):guard.validate(self.b,self.bank)
    def test_existing_note_correction_must_preserve_identity(self):
        self.cards(action='existingNoteCorrection',matches=['1'])
        with self.assertRaisesRegex(ValueError,'preserve'):guard.validate(self.b,self.bank)
        self.cards(action='existingNoteCorrection',matches=['1'],stable='H7UZ9RNT2MKA')
        self.assertEqual(guard.validate(self.b,self.bank)['status'],'passed')
    def test_changed_bank_and_missing_semantic_review_fail(self):
        self.cards();b=copy.deepcopy(self.bank);b['snapshotId']='changed'
        with self.assertRaisesRegex(ValueError,'changed'):guard.validate(self.b,b)
        review=json.loads((self.b/'card_overlap_review.json').read_text());review['semanticReviewComplete']=False
        self.write('card_overlap_review.json',review)
        with self.assertRaisesRegex(ValueError,'Incomplete overlap'):guard.validate(self.b,self.bank)
    def test_stale_snapshot_and_import_corruption_fail(self):
        self.cards();b=copy.deepcopy(self.bank);b['capturedAt']='2000-01-01T00:00:00+00:00'
        with self.assertRaisesRegex(ValueError,'stale'):guard.validate(self.b,b)
        (self.b/'corrected_cards_anki_import.tsv').write_text('wrong deck\n')
        with self.assertRaisesRegex(ValueError,'headers/body'):guard.validate(self.b,self.bank)
    def test_prepare_does_not_mark_generated_cards_accepted(self):
        self.cards();guard.prepare(self.b,self.bank)
        saved=json.loads((self.b/'corebook_snapshot.json').read_text())
        self.assertEqual(saved['entries'],self.bank['entries'])
        self.assertEqual(json.loads((self.b/'corebook_validation.json').read_text())['status'],'reviewRequired')

if __name__=='__main__':unittest.main()
