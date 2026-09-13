from pathlib import Path
from datetime import datetime, timezone
from html.parser import HTMLParser
import csv, hashlib, io, json, re

B=Path(__file__).resolve().parent.parent; R=B/'_codex_review'; ROOT=B.parent.parent
def read(n):return json.loads((B/n).read_text(encoding='utf-8-sig'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
meta=read('metadata.json');audit=read('_codex_review/row_audit.json');media=read('media_integrity.json')
FIELDS=audit['fields'];original=read('_codex_review/original_rows.json')
tsv=(B/'corrected_cards.tsv').read_text(encoding='utf-8')
arrays=list(csv.reader(io.StringIO(tsv,newline=''),delimiter='\t'));rows=[dict(zip(FIELDS,r)) for r in arrays]
checks=[]
def check(name,func):func();checks.append({'name':name,'passed':True})
class HTML(HTMLParser):
    def __init__(self):super().__init__(convert_charrefs=True);self.data=[];self.images=[];self.links=[];self.stack=[];self.problems=[]
    def handle_data(self,d):self.data.append(d)
    def handle_starttag(self,t,attrs):
        a=dict(attrs)
        if t=='img':self.images.append(a.get('src',''))
        if t=='a':self.links.append(a.get('href',''))
        if t not in ['br','img','hr','input','meta','link','wbr']:self.stack.append(t)
    def handle_endtag(self,t):
        if not self.stack or self.stack[-1]!=t:self.problems.append(t)
        else:self.stack.pop()
def parsed(value):
    p=HTML();p.feed(value);p.close();return p
def schema():
    assert len(arrays)==43 and all(len(r)==22 for r in arrays)
    assert len(tsv.splitlines())==43 and not tsv.startswith('#')
    assert FIELDS==['Clinical_Context','Image','Image_Annotated','Question','Most_Likely_Diagnosis','Entity_Label','Differential_Q','Differentials','Imaging_Differentiation','Original_Caption','Mechanism_Q','Mechanism','Boards_Trap_Q','Boards_Trap','High_Yield_Q','High_Yield_A','Radiopaedia_Link','Radiopaedia_Case_Context','Radiopaedia_Case_Summary','Radiopaedia_Case_Differential','summary','Tags']
    assert rows==read('_codex_review/corrected_rows.json')
    buf=io.StringIO(newline='');csv.writer(buf,delimiter='\t',lineterminator='\n').writerows(arrays);assert buf.getvalue()==tsv
check('43 no-header rows preserve the 22-field schema and round-trip exactly',schema)
def importing():
    imported=(B/'corrected_cards_anki_import.tsv').read_text(encoding='utf-8')
    headers=['#separator:tab','#html:true','#notetype:'+meta['anki']['noteType'],'#deck:'+meta['anki']['deckName'],'#tags column:22']
    assert imported=='\n'.join(headers)+'\n'+tsv
    image_arrays=[r for r in arrays if r[1]]
    assert len(image_arrays)==18
    image_buf=io.StringIO(newline='');csv.writer(image_buf,delimiter='\t',lineterminator='\n').writerows(image_arrays)
    assert (B/'corrected_image_cards.tsv').read_text(encoding='utf-8')==image_buf.getvalue()
    assert (B/'corrected_image_cards_anki_import.tsv').read_text(encoding='utf-8')=='\n'.join(headers)+'\n'+image_buf.getvalue()
    assert meta['anki']['deckName']=='Corebook::GI::Liver::Widespread Low Attenuation Within Liver'
    assert 'Introduction to Osseous Trauma' not in imported
check('Anki import directives match metadata and the body equals corrected TSV',importing)
def ids():
    contexts=[r['Clinical_Context'] for r in rows];identifiers=[c.split()[-1] for c in contexts]
    assert len(set(contexts))==43 and len(set(identifiers))==43
    for ident in identifiers:
        assert re.fullmatch(r'[A-Z0-9]{12}',ident)
        assert re.search('[A-Z]',ident) and re.search('[0-9]',ident)
        assert not re.fullmatch(r'(?:Q|CASE|ROW|ID)?\d+',ident)
    assert all(r['Clinical_Context'] in contexts for n,r in enumerate(original,1) if n!=27)
    assert original[26]['Clinical_Context'] not in contexts
    assert len(audit['newIds'])==6
    assert set(audit['newIds'].values()).issubset(identifiers)
check('All 37 retained original first fields remain unchanged and six new IDs are unique',ids)
def families():
    triggers=['Question','Differential_Q','Mechanism_Q','Boards_Trap_Q','High_Yield_Q']
    for r in rows:
        assert sum(bool(r[k]) for k in triggers)==1
        assert not r['Differentials'] and not r['Differential_Q']
        if r['Question']:
            assert r['Most_Likely_Diagnosis'] and r['Image'] and r['Image_Annotated']
            assert r['Imaging_Differentiation'].startswith('<b>Mini-differential:</b>')
        if r['Mechanism_Q']:assert r['Mechanism']
        if r['High_Yield_Q']:assert r['High_Yield_A']
    assert sum(bool(r['Question']) for r in rows)==18
    assert sum(bool(r['Mechanism_Q']) for r in rows)==2
    assert sum(bool(r['High_Yield_Q']) for r in rows)==23
    assert {g['context'] for g in audit['highYieldGate']}=={r['Clinical_Context'] for r in rows if r['High_Yield_Q']}
    assert all(g['gate'] and g['sourceBasis'] for g in audit['highYieldGate'])
check('One card family per note; all 23 High-Yield notes have a gate and source basis',families)
def markup():
    for r in rows:
        for field,val in r.items():
            if field=='Tags':continue
            p=parsed(val)
            assert not p.problems and not p.stack,(r['Clinical_Context'],field,p.problems,p.stack)
            visible=''.join(p.data)
            assert not re.search(r'Image references?:|Source image links?:|Source image link\(s\):|https?://|\.jpe?g|\.png',visible,re.I),(r['Clinical_Context'],field)
            assert '\ufffd' not in val
    assert len([r for r in rows if 'Outside clarification:' in r['Mechanism']+r['High_Yield_A']])==2
    original16=next(r for r in rows if r['Clinical_Context']==original[15]['Clinical_Context'])
    original37=next(r for r in rows if r['Clinical_Context']==original[36]['Clinical_Context'])
    assert 'Outside clarification:' in original16['Mechanism'] and 'Daza' in original16['Mechanism']
    assert 'Outside clarification:' in original37['High_Yield_A'] and 'ACR LI-RADS' in original37['High_Yield_A']
check('HTML is balanced, diagnostic media remain and visible bookkeeping is absent',markup)
def images():
    files={f['filename']:f for f in meta['downloadFiles']};used=[]
    auxiliary={f['filename']:f for f in media if f['role']=='originalCaptionAnnotation'}
    byplain={e['plainFilename']:e for e in meta['imageRegistry']}
    icon_references=0
    for r in rows:
        for key in ['Image','Image_Annotated']:
            for filename in parsed(r[key]).images:
                if filename in auxiliary:
                    assert key=='Image_Annotated';icon_references+=1;continue
                assert filename in files,filename
                assert files[filename]['masterImageId'] in meta['masterImageIds']
                assert files[filename]['variant']==('plain' if key=='Image' else 'annotated')
                used.append(filename)
        if r['Image']:
            expected=[byplain[n].get('captionOriginal',byplain[n]['caption']) for n in parsed(r['Image']).images]
            assert re.findall(r'<div class="stackCap">(.*?)</div>',r['Image_Annotated'],re.S)==expected
            assert r['Original_Caption']=='<br>'.join(expected)
    assert len(used)==46 and set(used)==set(files)
    assert icon_references==29 and len(auxiliary)==4
    assert len({f['masterImageId'] for f in files.values()})==23
    for f in media:
        assert (B/f['bundlePath']).is_file()
        assert f['sha256']==sha(B/f['bundlePath'])
    source_groups=[['SDX-03','SDX-04'],['SDX-10','SDX-11'],['SDX-12','SDX-13'],['SDX-14','SDX-15'],['SDX-17','SDX-18']]
    note_groups=[[files[n]['masterImageId'] for n in parsed(r['Image']).images] for r in rows if r['Question']]
    for group in source_groups:assert group in note_groups
    for orig in original[:14]:
        corrected=next(r for r in rows if r['Clinical_Context']==orig['Clinical_Context'])
        for key in ['Image','Image_Annotated']:assert parsed(orig[key]).images==[n for n in parsed(corrected[key]).images if n in files]
    before=list(csv.reader((R/'before_caption_repair/corrected_cards.tsv').open(encoding='utf-8',newline=''),delimiter='\t'))
    assert len(before)==len(arrays)
    for old,new in zip(before,arrays):
        assert all(a==b for i,(a,b) in enumerate(zip(old,new)) if i not in [2,9])
        if not old[1]:assert old==new
check('All 23 raw captions, 46 diagnostic references, original arrows and unchanged non-caption fields verified',images)
def summary():
    summaries={r['summary'] for r in rows};assert len(summaries)==1
    s=next(iter(summaries));assert len(s)>4000
    for token in ['Key Imaging Findings','Pearls / Pitfalls','Key Measurements / Criteria','Super Summary','Canonical article differential','Common:','Less common:','Wilson','glycogen','10 HU','25 HU']:assert token in s
    for bad in ['1 HU','renal cortex','starry-sky','target sign','T1-low','melanin or blood']:assert bad not in s
    assert 'explicitly captured Core facts' in s
    assert 'disagreement' in s or 'Source limits' in s
    assert 'CORE_EVIDENCE_STATUS: USED' in (B/'core_evidence.txt').read_text(encoding='utf-8')
check('Full repeated summary retained with supported criteria and source-gap corrections',summary)
def sources():
    staged=Path('C:/Users/josem.000/Downloads/RadPrimerAudit')/B.name
    count=0
    for p in staged.rglob('*'):
        if p.is_file() and not p.name.endswith('.crdownload'):
            assert sha(p)==sha(B/p.relative_to(staged));count+=1
    assert count==6
    # This follow-up targets this earlier bundle; the queue pointer may now name a newer topic.
    assert B.name=='Widespread_Low_Attenuation_Within_Liver_2026-09-09T03-01-09-438Z'
    master=ROOT/'master_source_queue/Widespread_Low_Attenuation_Within_Liver_2026-09-09T02-43-21-860Z/master_source_package.txt'
    assert master.read_text(encoding='utf-8') in (B/'source_package.txt').read_text(encoding='utf-8')
check('All six imported source files are unchanged and article equals the reviewed master',sources)
now=datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00','Z')
result={'status':'passed','validatedAt':now,'checks':checks,'totals':{'originalNotes':38,'correctedNotes':43,'unknown':18,'mechanism':2,'highYield':23,'mediaFiles':46,'selectedImages':23},
 'scope':'Static schema, content, HTML and actual staged media verification; installed Anki template rendering/import not performed.',
 'inputHashes':{n:sha(B/n) for n in ['source_package.txt','generated_cards.tsv','metadata.json','audit_instructions.md','core_evidence.txt']},
 'captionRepair':read('_codex_review/caption_repair_validation.json'),
 'captionPreview':read('_codex_review/caption_preview_validation.json'),
 'outputHashes':{n:sha(B/n) for n in ['corrected_cards.tsv','corrected_cards_anki_import.tsv','corrected_image_cards.tsv','corrected_image_cards_anki_import.tsv','audit_report.md','caption_repair_report.md']}}
(R/'validation_results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
marker=['DONE','validation: passed','articleTitle: '+meta['articleTitle'],'completedAt: '+now,'originalNotes: 38','correctedNotes: 43','selectedImages: 23','verifiedMediaFiles: 46','deck: '+meta['anki']['deckName'],
 'differentialDrillSuppressed: true; Differentials and Differential_Q blank; mini-differentials on UNKNOWN backs',
 'captionRepair: 18 image notes; 23 exact original captions; 29 arrows per caption field; 25 non-image notes unchanged',
 *[n+' SHA256: '+digest for n,digest in result['outputHashes'].items()], 'validationReport: _codex_review/validation_results.json','No live Anki import or note-type modification performed.']
(B/'_codex_audit_done.txt').write_text('\n'.join(marker)+'\n',encoding='utf-8')
print(json.dumps({'status':'passed','checks':len(checks),**result['totals'],'completionMarkerWritten':True},indent=2))
