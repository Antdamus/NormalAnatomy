"""Validate the narrow retained-Anki overlap pass without reauthoring cards."""
from pathlib import Path
import collections
import datetime
import hashlib
import html
import json
import re
from PIL import Image

B = Path(__file__).resolve().parent.parent
R = B / '_codex_review'
ARCHIVE = R / 'before_corebook_dedup_2026-09-12'
checks = []

def check(value, description):
    assert value, description
    checks.append(description)

def read(path):
    return path.read_text(encoding='utf-8-sig')

def js(path):
    return json.loads(read(path))

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def rows(path):
    return [line.split('\t') for line in read(path).splitlines() if line]

def imgs(value):
    return re.findall(r'<img\b[^>]*\bsrc=[\"\']([^\"\']+)[\"\']', value)

prior = rows(ARCHIVE / 'corrected_cards.tsv')
final = rows(B / 'corrected_cards.tsv')
original = rows(B / 'generated_cards.tsv')
meta = js(B / 'metadata.json')
review = js(B / 'card_overlap_review.json')
bank = js(B / 'corebook_snapshot.json')
source_audit = js(R / 'validation_results.json')
row_audit = js(R / 'dedup_row_audit.json')
check(source_audit['status'] == 'passed', 'Prior complete source audit passed')
check(len(original) == 54 and len(prior) == 57 and len(final) == 31, 'Original 54 / previous 57 / final 31 counts')
check(sha(ARCHIVE/'corrected_cards.tsv') == review['priorCorrectedSha256'] == source_audit['outputSha256']['corrected_cards.tsv'], 'Exact prior audited TSV hash')
check(all(len(r) == 22 for r in final), 'Exact no-header 22-column schema')
check(all(r[21] == '' for r in final), 'Trailing empty Tags field preserved')
check(len({r[0] for r in final}) == 31, 'Unique retained Clinical_Context values')
check(all(re.search(r'[A-Z0-9]{12}$', r[0]) for r in final), 'Random-looking 12-character trailing IDs preserved')
ids = [re.search(r'[A-Z0-9]{12}$', r[0]).group() for r in final]
check(all(not re.fullmatch(r'(?:Q|CASE)?\d{8,}', value) for value in ids), 'No counter-style IDs')
prior_map = {r[0]:r for r in prior}
check(all(r == prior_map[r[0]] for r in final), 'Every retained field raw-equal to the previous audit')
check(final == [r for r in prior if r[0] in {v[0] for v in final}], 'Retained note order unchanged')
check(all(r[20] == prior[0][20] and r[20] for r in final), 'Full repeated article summary unchanged')
check(all(not r[6] and not r[7] for r in final), 'No Differential Drill triggers')
check(final[:17] == prior[:17], 'All 17 image notes wholly unchanged')
check(all(r[8].startswith('<b>Mini-differential:</b>') for r in final[:17]), 'Mini-differentials remain on UNKNOWN backs')
counts = collections.Counter()
for r in final:
    active = [bool(r[i]) for i in [3,10,12,14]]
    check(sum(active) == 1, 'One question family: '+r[0])
    counts[['unknown','mechanism','boardsTrap','highYield'][active.index(True)]] += 1
    for q,a in [(3,4),(10,11),(12,13),(14,15)]:
        check(bool(r[q]) == bool(r[a]), 'Answer pair: '+r[0]+'/'+str(q))
check(dict(counts) == {'unknown':17,'boardsTrap':1,'highYield':13}, 'Final card-family counts')
check(len(review['decisions']) == 31 and len(review['skippedQuestions']) == 23 and len(review['withinBundleOmissions']) == 3, '31 final / 23 owned-overlap / 3 internal-overlap decisions')
all_decisions = review['decisions'] + review['skippedQuestions'] + review['withinBundleOmissions']
check(len({d['clinicalContext'] for d in all_decisions}) == 57, 'Every previous note has one disposition')
check({d['clinicalContext'] for d in all_decisions} == set(prior_map), 'Disposition coverage exactly matches prior file')
check(not {e.get('clinicalContext') for e in bank['entries']} & set(prior_map), 'None of the bundle IDs is owned in the reviewed bank')
for d in review['withinBundleOmissions']:
    check(d['coveredByClinicalContext'] in {r[0] for r in final}, 'Internal omission points to a retained note: '+d['clinicalContext'])
check(len(row_audit) == 57 and sum(x['action']=='retainedUnchanged' for x in row_audit)==31, 'Complete row audit')
for x in row_audit:
    if x['finalRow']:
        check(final[x['finalRow']-1][0] == x['clinicalContext'], 'Final row mapping: '+x['clinicalContext'])
        check(bool(x['sourceBasis']) and bool(x['usefulnessCategory']), 'Prior source/usefulness basis retained: '+x['clinicalContext'])

tsv = read(B / 'corrected_cards.tsv')
header = '\n'.join(['#separator:tab','#html:true','#notetype:'+meta['anki']['noteType'],'#deck:'+meta['anki']['deckName']])+'\n'
check(read(B/'corrected_cards_anki_import.tsv') == header+tsv, 'Exact Anki directives and TSV body')
check(not (B/'corrected_cards.tsv').read_bytes().startswith(b'\xef\xbb\xbf'), 'No unexpected BOM')
check(meta['anki']['deckName'] == 'Corebook::GI::Liver::Focal Liver Lesion With Hemorrhage', 'Original target deck retained')
check(read(B.parent/'_latest_radprimer_audit_bundle.txt').strip() == str(B), 'Queue pointer matches this bundle')
staged = Path('C:/Users/josem.000/Downloads/RadPrimerAudit')/B.name
for name, expected in source_audit['inputSha256'].items():
    check(sha(B/name) == expected == sha(staged/name), 'Staged input unchanged: '+name)

source = read(B/'source_package.txt')
registry = json.loads(source.split('=== MASTER IMAGE REGISTRY ===',1)[1].split('=== MASTER SOURCE MANIFEST ===',1)[0].strip())
by_id = {e['masterImageId']:e for e in registry}
by_plain = {e['plainFilename']:e for e in registry}
for e in meta['imageRegistry']:
    check(e['caption'] == by_id[e['masterImageId']]['caption'], 'Raw source/metadata caption agreement: '+e['masterImageId'])
groups = []
for i,r in enumerate(final[:17],1):
    plain = imgs(r[1])
    caps = re.findall(r'<div class="stackCap">(.*?)</div>',r[2],re.S)
    check(caps == [by_plain[p]['caption'] for p in plain], 'Character-for-character source stackCap equality: '+str(i))
    check(imgs(r[2]) == [x for p,c in zip(plain,caps) for x in [by_plain[p]['annotatedFilename']]+imgs(c)], 'Annotated/caption-icon stack order: '+str(i))
    check(r[9] == original[i-1][9], 'Original_Caption raw-equal: '+str(i))
    groups.append([by_plain[p]['masterImageId'] for p in plain])
check([x for g in groups for x in g] == meta['masterImageIds'], 'All 23 selected source images remain covered in order')
refs = set(imgs(' '.join(v for r in final for v in r)))
media = js(R/'media_audit.json')
check(refs == {e['filename'] for e in media} and len(refs)==54, '54 exact image filenames preserved')
anki_media = Path('C:/Users/josem.000/AppData/Roaming/Anki2/User 1/collection.media')
media_results = []
for e in media:
    filename = e['filename']
    expected = e['files'][0]['sha256']
    local = B/e['recoveredFile'] if e['role']=='captionIcon' else Path(e['files'][0]['path'])
    check(sha(local)==expected, 'Local media hash unchanged: '+filename)
    check(sha(anki_media/filename)==expected, 'Exact Anki media hash unchanged: '+filename)
    with Image.open(local) as im:
        im.load()
        check(im.width>0 and im.height>0,'Media decodes: '+filename)
    media_results.append({'filename':filename,'role':e['role'],'sha256':expected,'localPath':str(local),'ankiMediaPresent':True})
image_overlap = js(R/'live_image_overlap.json')
check(image_overlap['readFiles']==1305, 'Actual existing media files compared')
check(not any(e['byteMatches'] or e['pixelMatches'] for e in image_overlap['checks']), 'No exact binary or decoded-pixel matches found')
check(len(image_overlap['checks'])==46, 'All diagnostic variants included in image comparison')
for r in final:
    visible = html.unescape(re.sub(r'<[^>]+>',' ',' '.join(r)))
    check(not re.search(r'Image references?\s*:|Source image links?\s*:|source URL|thumbnail URL',visible,re.I), 'No visible media bookkeeping: '+r[0])
    check(not any(fn in visible for fn in refs), 'No visible filename lists: '+r[0])
result = {'status':'passed','validatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'checkCount':len(checks),'previousCorrectedNotes':57,'finalNotes':31,'removedConceptualNotes':26,'ownedConceptualOverlap':23,'withinBundleOverlap':3,'cardTypes':dict(counts),'newNotesThisPass':0,'retainedFieldsChanged':0,'imageGroups':17,'selectedImages':23,'rawSourceCaptionsEqual':23,'diagnosticFiles':46,'auxiliaryIcons':8,'missingBundleMedia':[],'existingMediaComparisonLimitations':image_overlap['errors'],'ankiModified':False,'outputSha256':{n:sha(B/n) for n in ['corrected_cards.tsv','corrected_cards_anki_import.tsv','audit_report.md','card_overlap_review.json']},'checks':checks,'media':media_results}
(R/'dedup_validation_results.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:v for k,v in result.items() if k not in ['checks','media','outputSha256','existingMediaComparisonLimitations']},indent=2))
