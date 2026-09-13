from pathlib import Path
import collections, datetime, hashlib, html, json, re
from PIL import Image

B = Path(__file__).resolve().parent.parent
R = B / '_codex_review'
fields = 'Clinical_Context Image Image_Annotated Question Most_Likely_Diagnosis Entity_Label Differential_Q Differentials Imaging_Differentiation Original_Caption Mechanism_Q Mechanism Boards_Trap_Q Boards_Trap High_Yield_Q High_Yield_A Radiopaedia_Link Radiopaedia_Case_Context Radiopaedia_Case_Summary Radiopaedia_Case_Differential summary Tags'.split()
checks = []
def check(condition, name):
    assert condition, name
    checks.append(name)
def read(name):
    return (B / name).read_text(encoding='utf-8-sig')
def jread(name):
    return json.loads(read(name))
def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()
def rows(text):
    return [line.split('\t') for line in text.splitlines()]
def images(text):
    return re.findall(r'<img\b[^>]*\bsrc=[\"\']([^\"\']+)[\"\']', text)

original = rows(read('generated_cards.tsv'))
corrected_text = read('corrected_cards.tsv')
corrected = rows(corrected_text)
meta = jread('metadata.json')
audit = jread('_codex_review/row_audit.json')
media = jread('_codex_review/media_audit.json')
source = read('source_package.txt')
registry = json.loads(source.split('=== MASTER IMAGE REGISTRY ===', 1)[1].split('=== MASTER SOURCE MANIFEST ===', 1)[0].strip())
check(len(original) == 54 and len(corrected) == 57, '54 input / 57 output notes')
check(all(len(r) == 22 for r in original + corrected), 'Exact 22-column TSV schema')
check(not corrected_text.startswith('\ufeff') and not corrected_text.startswith('Clinical_Context\t'), 'Plain output has no BOM or field header')
check(all(not r[21] for r in corrected), 'Empty Tags column retained at the end of each record')
headers = ['#separator:tab', '#html:true', '#notetype:' + meta['anki']['noteType'], '#deck:' + meta['anki']['deckName']]
check(read('corrected_cards_anki_import.tsv') == '\n'.join(headers) + '\n' + corrected_text, 'Exact Anki header / body agreement')
check(meta['anki']['deckName'] == 'Corebook::GI::Liver::Focal Liver Lesion With Hemorrhage', 'Target deck matches metadata')
check(meta['anki']['noteType'] == 'core_rad_notetype_v2', 'Target note type matches metadata')
check((B.parent / '_latest_radprimer_audit_bundle.txt').read_text().strip() == str(B), 'Newest queue pointer matches audited folder')
staged = Path('C:/Users/josem.000/Downloads/RadPrimerAudit') / B.name
input_hashes = {}
for name in ['_bundle_complete.txt', 'audit_instructions.md', 'core_evidence.txt', 'generated_cards.tsv', 'metadata.json', 'source_package.txt']:
    check(sha(B/name) == sha(staged/name), 'Original staged file unchanged: ' + name)
    input_hashes[name] = sha(B/name)

id_pattern = re.compile(r'[A-Z0-9]{12}$')
old_ids = [id_pattern.search(r[0]).group() for r in original]
new_ids = [id_pattern.search(r[0]).group() for r in corrected]
check(len(set(old_ids)) == 54 and len(set(new_ids)) == 57, 'Unique original and final identifiers')
check(all(not re.fullmatch(r'(?:Q|CASE)?\d{8,}', x) and re.search('[A-Z]', x) for x in new_ids), 'No missing, numeric-counter, or sequential-prefix identifiers')
check(set(old_ids) & set(new_ids) == set(old_ids) - {old_ids[i-1] for i in [31,52,53]}, 'Exactly the three documented text-only deletions')
check(len(set(new_ids) - set(old_ids)) == 6, 'Six new unique identifiers')
check([x for x in new_ids if x in old_ids] == [x for x in old_ids if x in new_ids], 'Relative order of retained notes preserved')
check(len(audit) == 60 and sum(a['action'] == 'added' for a in audit) == 6, 'Audit record for all 54 input and six added notes')
for a in audit:
    if a['action'] == 'deleted':
        check(a['id'] not in new_ids, 'Deleted ID excluded: ' + a['id'])
        continue
    out = corrected[a['outputRow'] - 1]
    check(new_ids[a['outputRow'] - 1] == a['id'], 'Audit output mapping: ' + a['id'])
    if a['inputRow'] is not None:
        src = original[a['inputRow'] - 1]
        check(out[0] == src[0], 'Entire existing Clinical_Context preserved: ' + a['id'])
        actual_changed = [f for i,f in enumerate(fields) if src[i] != out[i]]
        check(actual_changed == a['changedFields'], 'Changed-field scope exact: ' + a['id'])
        check(all(out[i] == src[i] for i in [1,2,9]), 'Image/caption fields raw-equal: ' + a['id'])
    else:
        check(all(not v for i,v in enumerate(out) if i not in [0,14,15,20]), 'Added note contains only HY fields, ID and summary: ' + a['id'])
    if out[14]:
        check(a['highYieldGate'] == 'passed' and bool(a['usefulnessCategory']) and bool(a['sourceBasis']), 'HY source and usefulness decision: ' + a['id'])

check(all(not r[6] and not r[7] for r in corrected), 'No Differential_Q or legacy Differentials drill triggers')
for n in range(17):
    check(corrected[n][8].startswith('<b>Mini-differential:</b><br>' + original[n][7] + '<br><br>'), 'Verbatim differential on UNKNOWN back: ' + str(n+1))
counts = collections.Counter()
for r in corrected:
    families = [bool(r[i]) for i in [3,10,12,14]]
    check(sum(families) == 1, 'One question family: ' + r[0])
    for q,a in [(3,4),(10,11),(12,13),(14,15)]:
        check(bool(r[q]) == bool(r[a]), 'Question-answer pair: ' + r[0] + '/' + fields[q])
    counts[['unknown','mechanism','boardsTrap','highYield'][families.index(True)]] += 1
check(dict(counts) == {'unknown':17,'mechanism':2,'boardsTrap':3,'highYield':35}, 'Final card family counts')

expected_summary = original[0][20].replace('sulfur colloid is usually photopenic and HIDA shows little uptake because bile ducts are absent.', 'sulfur-colloid uptake is usually reduced; Core describes typically little HIDA uptake. IDA uptake occurs in hepatocytes, so absent ductules should not be equated with absent initial hepatocyte uptake.').replace('Do not equate T1 hyperintensity with fat: the adenoma MRI examples remained hyperintense on T2 and were attributed to hemorrhage; intracellular lipid is assessed with opposed-phase signal loss.', 'Do not equate T1 hyperintensity with fat. The source captions attribute the adenoma foci to hemorrhage, but their referenced T2 images are not staged. Intracellular lipid is assessed by opposed-phase signal loss; T2 brightness alone is not a definitive blood-versus-fat test.')
check(all(r[20] == expected_summary and r[20] for r in corrected), 'Full repeated summary retained with exactly two documented corrections')
check(all(r[20] == original[0][20] for r in original), 'Original summary repetition verified')

source_by_id = {e['masterImageId']:e for e in registry}
meta_by_id = {e['masterImageId']:e for e in meta['imageRegistry']}
check(len(source_by_id) == 43 and source_by_id.keys() == meta_by_id.keys(), 'Source-package and metadata registry alignment')
check(all(e['caption'] == meta_by_id[k]['caption'] for k,e in source_by_id.items()), 'All 43 source registry captions agree raw')
by_plain = {e['plainFilename']:e for e in registry}
groups = []
caption_count = 0
for i,r in enumerate(corrected):
    plain = images(r[1])
    if not plain:
        continue
    caps = re.findall(r'<div class="stackCap">(.*?)</div>', r[2], re.S)
    check(caps == [by_plain[p]['caption'] for p in plain], 'Source raw stackCap equality: note ' + str(i+1))
    check(images(r[2]) == [v for p,c in zip(plain,caps) for v in [by_plain[p]['annotatedFilename']] + images(c)], 'Annotated image / arrow order: note ' + str(i+1))
    groups.append([by_plain[p]['masterImageId'] for p in plain])
    caption_count += len(caps)
check(caption_count == 23, 'All 23 raw source captions preserved including every inline icon')
expected_groups = [[1],[2,3],[4],[5],[6,7],[8,9],[10],[11],[12],[13],[14],[15],[16],[17],[18],[19,20],[21,22,23]]
check(groups == [[f'SDX-{i:02d}' for i in g] for g in expected_groups], 'All 17 atomic groups and image order unchanged')
check([x for g in groups for x in g] == meta['masterImageIds'], 'All 23 selected primary images covered exactly once')
refs = set(images(' '.join(v for r in corrected for v in r)))
media_by_name = {e['filename']:e for e in media}
check(len(refs) == 54 and refs == media_by_name.keys(), 'All 54 exact img src filenames audited')
df = {e['filename']:e for e in meta['downloadFiles']}
check(len(df) == 46, '46 diagnostic media download records')
icon_names = set()
for filename in sorted(refs):
    record = media_by_name[filename]
    check(record['available'] and all(e['decoded'] for e in record['files']), 'Previously decoded exact local media: ' + filename)
    hashes = {e['sha256'] for e in record['files']}
    check(len(hashes) == 1, 'No conflicting local media hashes: ' + filename)
    if record['role'] == 'captionIcon':
        icon_names.add(filename)
        p = B / record['recoveredFile']
        check(sha(p) == record['recoveredSha256'] == next(iter(hashes)), 'Recovered icon byte equality: ' + filename)
        with Image.open(p) as im:
            im.load()
            check(im.width > 0 and im.height > 0, 'Recovered icon decodes: ' + filename)
    else:
        check(filename in df and df[filename]['masterImageId'] in meta['masterImageIds'], 'Diagnostic filename selected in registry: ' + filename)
        local = Path('C:/Users/josem.000/Downloads/RadPrimer') / filename
        check(sha(local) in hashes, 'Downloaded diagnostic bytes unchanged: ' + filename)
        with Image.open(local) as im:
            im.load()
            check(im.width > 0 and im.height > 0, 'Diagnostic image decodes: ' + filename)
        if df[filename]['variant'] == 'plain':
            check(sha(local) == meta_by_id[df[filename]['masterImageId']]['visualEvidence']['sha256'], 'Plain diagnostic matches master-source visual evidence: ' + filename)
check(icon_names == {'arrow_BC.png','arrow_BO.png','arrow_BS.png','arrow_CC.png','arrow_CS.png','arrow_WC.png','arrow_WO.png','arrow_WS.png'}, 'Eight distinct auxiliary annotation icons retained')

forbidden = re.compile(r'Image references?\s*:|Source image links?\s*:|Source image link\(s\)\s*:|source URL|thumbnail URL', re.I)
for i,r in enumerate(corrected):
    visible = html.unescape(re.sub(r'<[^>]+>', ' ', ' '.join(r)))
    check(not forbidden.search(visible), 'No visible image bookkeeping: note ' + str(i+1))
    check(not any(name in visible for name in refs), 'No visible media filename lists: note ' + str(i+1))

result = {'status':'passed','checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'checkCount':len(checks),'inputRows':54,'outputRows':57,'columns':22,'cardTypes':dict(counts),'retainedOriginalIds':51,'newIds':6,'deletedInputRows':[31,52,53],'imageGroups':17,'selectedImages':23,'rawCaptionsEqual':23,'diagnosticMedia':46,'auxiliaryMedia':8,'missingMedia':[],'inputSha256':input_hashes,'outputSha256':{n:sha(B/n) for n in ['corrected_cards.tsv','corrected_cards_anki_import.tsv','audit_report.md']},'checks':checks}
(R/'validation_results.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in result.items() if k not in ['checks','inputSha256','outputSha256']},indent=2))
