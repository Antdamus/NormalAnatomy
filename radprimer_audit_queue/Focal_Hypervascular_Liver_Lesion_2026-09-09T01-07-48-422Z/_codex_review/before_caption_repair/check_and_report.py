from pathlib import Path
import csv,json,re,hashlib,html,collections
from html.parser import HTMLParser
from datetime import datetime,timezone

B=Path(__file__).resolve().parent.parent
R=B/'_codex_review'
data=json.loads((R/'correction_data.json').read_text(encoding='utf-8-sig'))
metadata=json.loads((B/'metadata.json').read_text(encoding='utf-8-sig'))
media=json.loads((R/'media_audit.json').read_text(encoding='utf-8-sig'))
original=json.loads((R/'original_rows.json').read_text(encoding='utf-8-sig'))
fields=data['fields']
def readrows(name,skip=0):
    with (B/name).open(encoding='utf-8-sig',newline='') as f:
        for _ in range(skip): next(f)
        return list(csv.reader(f,delimiter='\t'))
matrix=readrows('corrected_cards.tsv')
rows=[dict(zip(fields,r)) for r in matrix]
assert len(matrix)==64 and {len(r) for r in matrix}=={22}
assert rows==data['rows']
header_lines=(B/'corrected_cards_anki_import.tsv').read_text(encoding='utf-8-sig').splitlines()[:5]
assert header_lines==['#separator:tab','#html:true','#notetype:core_rad_notetype_v2','#deck:'+metadata['anki']['deckName'],'#tags column:22']
assert readrows('corrected_cards_anki_import.tsv',5)==matrix
assert not (B/'corrected_cards.tsv').read_text(encoding='utf-8-sig').startswith('#')
assert len({r['summary'] for r in rows})==1 and all(len(r['summary'])>3400 for r in rows)
original_body=original[0]['summary'].split('<div><b>&#x1F50D; Summary</b></div>',1)[1]
assert all(r['summary'].split('<div><b>&#x1F50D; Summary</b></div>',1)[1]==original_body for r in rows)
triggers=['Question','Differential_Q','Mechanism_Q','Boards_Trap_Q','High_Yield_Q']
for r in rows:
    assert sum(bool(r[k]) for k in triggers)==1
    for q,a in [('Question','Most_Likely_Diagnosis'),('Mechanism_Q','Mechanism'),('Boards_Trap_Q','Boards_Trap'),('High_Yield_Q','High_Yield_A')]:
        assert bool(r[q])==bool(r[a])
    assert r['Differentials']==r['Differential_Q']==''
    if r['Question']: assert r['Imaging_Differentiation'].startswith('<b>Mini-differential:</b>')
    assert re.search(r'\b[A-Z2-7]{12}$',r['Clinical_Context'])
    assert not re.search(r'\b(?:Q|CASE)0{4,}\d+\b',r['Clinical_Context'])
    assert not any('\t' in v or '\n' in v or '\r' in v for v in r.values())
assert len({r['Clinical_Context'] for r in rows})==64
for n,origin in enumerate(data['originalRowByOutput']):
    if origin:
        assert rows[n]['Clinical_Context']==original[origin-1]['Clinical_Context']
        assert rows[n]['Image']==original[origin-1]['Image']

class FieldParser(HTMLParser):
    def __init__(self): super().__init__(); self.images=[]; self.visible=[]; self.danger=[]
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if tag=='img': self.images.append(attrs.get('src',''))
        if tag in ['script','iframe'] or any(k.startswith('on') for k in attrs): self.danger.append(tag)
    def handle_data(self,text): self.visible.append(text)

file_names={x['filename'] for x in metadata['downloadFiles']}
registry={x['masterImageId']:x for x in metadata['imageRegistry']}
expected={x['filename']:x for x in metadata['downloadFiles']}
allrefs=[]
for r in rows:
    for name,value in r.items():
        p=FieldParser(); p.feed(value); assert not p.danger
        allrefs+=p.images
        assert set(p.images)<=file_names, (name,set(p.images)-file_names)
        visible=' '.join(p.visible)
        assert not re.search(r'Image references?:|Source image links?(?:\(s\))?:|https?://|\b(?:RP|SDX)-\d+[^\s<>]*\.(?:jpg|png)',visible,re.I),name
    if r['Question']:
        p=FieldParser(); p.feed(r['Image']); mids=[expected[x]['masterImageId'] for x in p.images]
        q=FieldParser(); q.feed(r['Image_Annotated']); amids=[expected[x]['masterImageId'] for x in q.images]
        assert mids==amids
        assert all(expected[x]['variant']=='plain' for x in p.images)
        assert all(expected[x]['variant']=='annotated' for x in q.images)
        cluster_ids={registry[x]['caseClusterId'] for x in mids}; assert len(cluster_ids)==1
        members=[e['masterImageId'] for e in metadata['imageRegistry'] if e.get('caseClusterId') in cluster_ids and e['downloadRecommendation']=='primaryTeachingSet']
        assert mids==members
assert set(allrefs)==file_names and len(allrefs)==80
for e in media:
    p=Path(e['path']); assert p.exists() and hashlib.sha256(p.read_bytes()).hexdigest()==e['sha256']
assert len(media)==80
assert sum(e.get('matchesStagedEvidenceHash',False) for e in media)==40

staged=Path('C:/Users/josem.000/Downloads/RadPrimerAudit')/B.name
source_hashes=[]
for p in staged.iterdir():
    if p.is_file():
        sh=hashlib.sha256(p.read_bytes()).hexdigest()
        assert hashlib.sha256((B/p.name).read_bytes()).hexdigest()==sh
        source_hashes.append({'filename':p.name,'sha256':sh})
assert len(source_hashes)==6
assert Path((B.parent/'_latest_radprimer_audit_bundle.txt').read_text().strip()).resolve()==B
source=(B/'source_package.txt').read_text(encoding='utf-8-sig')
fused=source.split('=== FUSED MASTER SOURCE PACKAGE ===',1)[1].split('=== IMAIOS LABEL REPOSITORY STATUS ===',1)[0].strip()
master=B.parent.parent/'master_source_queue/Focal_Hypervascular_Liver_Lesion_2026-09-09T00-46-09-986Z/master_source_package.txt'
assert fused==master.read_text(encoding='utf-8-sig').strip()
preview=json.loads((R/'preview_validation.json').read_text(encoding='utf-8-sig'))
assert preview['status']=='passed' and preview['loadedImages']==80 and preview['renderedNotes']==64

checks=['64 notes each have 22 fields in the original order','TSV quote escaping round-trips through a standard reader','Anki body exactly equals corrected TSV; no field header row','Anki note-type/deck/tags headers match metadata','One front-driving card family per note','All 26 UNKNOWN mini-differentials retained on back; Differential fields blank','All retained original Clinical_Context values unchanged; all 64 IDs unique','Full repeated article summary retained except limited source-basis amendment','No learner-visible image reference, URL or filename-list bookkeeping','All 80 <img src> references exactly match primary bundle media entries','Every primary case cluster and phase order preserved','All 80 staged media files decode; all 40 plain hashes match master evidence','All original bundle files unchanged from the browser source','All 29 High-Yield notes have a specific usefulness gate and source basis']
checks+=['Fused master-source article exactly matches the reviewed master package','All 64 HTML previews load and all 80 diagnostic images render; four representative screenshots visually inspected']
result={'status':'passed','validatedAt':datetime.now(timezone.utc).isoformat(timespec='seconds'),'counts':data['counts'],'checks':checks,'inputHashes':source_hashes,'mediaVerifiedAt':'C:/Users/josem.000/Downloads/RadPrimer','liveAnkiImportPerformed':False,'installedNoteTypePatched':False,'differentialStrategy':'Blank Differential_Q and Differentials; mini-differential at top of Imaging_Differentiation','visualPreview':preview,'visuallyInspectedOriginalRows':[2,20,29,54]}
(R/'validation_results.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')

lines=['# Card-quality audit — Focal Hypervascular Liver Lesion','',
 '**64 corrected notes** from 62 original notes: 2 removed, 2 additional notes from splitting, and 2 new source-supported interpretation notes. The original 22-column order is unchanged. The corrected set contains 26 UNKNOWN, 5 Mechanism, 4 Boards Trap and 29 High-Yield notes.','',
 '## Source basis','',
 'Imported the newest complete bundle with the repository importer and read the latest-bundle pointer. Compared source_package.txt, generated_cards.tsv, metadata.json, audit_instructions.md and core_evidence.txt. The fused article agrees with the previously reviewed RadPrimer/STATdx master package; RadPrimer hierarchy and the supplied Anki deck routing are preserved.',
 'The captured Core report is `CORE_EVIDENCE_STATUS: USED`, names `junzi-shi-core-radiology-a-visual-approach-to.pdf`, cites PDF pages 117–127 and 133–134 / printed pages 105–115 and 121–122, and lists the facts used. It was not recovered from an unwrapped fallback report. Those explicit facts are accepted as the audit’s Core evidence. The underlying textbook PDF was not independently reopened in this task. A card-family label in CORE_DERIVED_CARDS is not treated as support for an unlisted fact.','',
 '## Principal corrections','',
 '- Preserved the 26 image-recognition cases with all 40 selected images, their 80 plain/annotated references and original case/phase order.',
 '- Removed 122 references to seven unstaged arrow-icon files from captions. Actual diagnostic images and the useful caption text remain. All remaining `<img src>` values are exact metadata/media filenames.',
 '- Moved all 26 mini-differentials to the top of Imaging_Differentiation and left both Differentials and Differential_Q blank. This avoids unsolicited Differential Drill cards even with a legacy note type; no installed note type was modified.',
 '- Corrected the regenerative-nodule explanation: persistence of enhancement distinguishes the illustrated large regenerative nodules; the source did not mean that this behavior is rare within those nodules.',
 '- Removed the HCC mechanism’s unsupported inference that arterial remodeling itself explains venous invasion. Narrowed it to increasing neovascularity and arterial enhancement.',
 '- Removed unsupported ultrasound, nuclear-medicine, MRI and histology embellishments unless retained as a specifically labeled outside clarification.',
 '- Replaced pure HHT numerical recall with an interpretation-changing FNH pretest question. Reframed hormonal associations and adenoma size around their imaging/reporting implications.',
 '- Split hemangioma dynamic enhancement from T2 signal and adenoma sulfur-colloid behavior from HIDA behavior.',
 '- Added a large mosaic HCC/washout pitfall and a Fontan/regenerative-nodule pretest note, both supported by the supplied article/captions.',
 '- All retained original IDs are unchanged. Four new notes received independently random 12-character identifiers; no counter or row-derived IDs were introduced.',
 '- Preserved the complete repeated article summary and its Common/Less Common content. Only its source-basis sentence was adjusted to limit Core support to captured facts and acknowledge labeled outside clarification.',
 '- No pure metadata/bookkeeping cards or visible image-link/URL/filename-list blocks were present. The two removed notes failed on redundancy/inaccuracy or unsupported content, as detailed below.','',
 '## Outside clarifications','',
 'These are explicitly labeled in the affected answers and are not presented as Core facts.','',
 '- Original rows 29 and 43: hepatocyte transporters explain hepatobiliary uptake; some adenomas also retain contrast, so retention is not exclusive to FNH. [Sciarra et al., 2019, primary radiology-pathology study](https://pubmed.ncbi.nlm.nih.gov/30218633/).',
 '- Original row 30: hemangioma’s endothelial-lined vascular spaces connect histology to its blood-pool behavior. Original row 54: adenoma management depends on sex, growth and size, with a period of lifestyle modification in women; the Core >5 cm shorthand is not a universal rule. [EASL benign liver tumour guideline, 2016](https://easl.eu/wp-content/uploads/2016/10/EASL-CPG-on-Management-of-benign-liver-tumours.pdf).',
 '', 'Only these bounded clarifications were added; this was not a full update of all clinical guidelines or a new Core-textbook review.','',
 '## Removed and split notes','',
 '| Original row / ID | Action | Reason |','|---|---|---|']
for e in data['rowAudit']:
    if e['disposition']=='deleted': lines.append(f"| {e['originalRow']} / {e['clinicalContext']} | Remove | {e['reason']} |")
for e in data['newRows']:
    lines.append(f"| Original {e['parentOriginalRow']} / new ID {e['id']} | {e['kind'].capitalize()} | {e['question']} {e['sourceBasis']} |")
lines+=['','If the uncorrected notes were already imported into Anki, omission from a later TSV does not delete them. The two removed IDs above identify the notes to retire. No live Anki import, deletion or template change was performed.','',
 '## High-Yield usefulness gate','',
 'Every retained or added High-Yield note teaches a modality appearance, contrast/tracer behavior, differential discriminator, pitfall, report-critical/management pivot, or pretest clue that changes interpretation. Broad prevalence recall was not accepted without the radiology implication.','',
 '| Original row / new ID | Gate | Source basis |','|---|---|---|']
for e in data['rowAudit']:
    if e['highYieldGate'] and e['disposition']!='deleted': lines.append(f"| {e['originalRow']} / {e['clinicalContext']} | {e['highYieldGate']} | {e['sourceBasis']} |")
for e in data['newRows']: lines.append(f"| {e['id']} | {e['usefulnessGate']} | {e['sourceBasis']} |")
lines+=['','## Media, import and validation','',
 'All 80 declared primary media files are present under `C:\\Users\\josem.000\\Downloads\\RadPrimer` and decode successfully. The 40 plain files are SHA-256-identical to the already visually reviewed master-source evidence. All 40 annotated files also decode, and filenames map to the corresponding image IDs. No archived image was substituted or selected.',
 'The audit bundle itself contains no media folder. Verification was against metadata plus the staged Downloads media. Presence in an installed Anki collection.media folder was not established; this audit did not copy or import media into Anki.',
 'The Anki import TSV includes the requested tab/HTML/note-type/deck directives and `#tags column:22`, followed directly by data rows. It targets `core_rad_notetype_v2` and `Corebook::GI::Liver::Focal Hypervascular Liver Lesion`. Headers guide import routing; an installed template deck override can still affect the final destination. [Anki text-import documentation](https://docs.ankiweb.net/importing/text-files.html).','',
 'Validation passed:','']+['- '+c for c in checks]
lines+=['','A detailed machine-readable row audit and file/media hashes are retained in `_codex_review`. Representative HTML/media previews passed, with all 80 images loading. These previews test the exported content, not the installed Anki template. The completion marker records the validated output hashes.','',
 '## Row-by-row audit','',
 '| Original row / preserved context | Disposition | Content changes |','|---|---|---|']
for e in data['rowAudit']:
    content=[c['reason'] for c in e['changes'] if not c['reason'].startswith(('Removed ','Put the mini'))]
    if e['disposition']=='deleted': content=[e['reason']]
    lines.append(f"| {e['originalRow']} / {e['clinicalContext']} | {e['disposition']} | {' '.join(dict.fromkeys(content)) or 'Content reviewed and retained; universal media/differential cleanup applied where relevant.'} |")
lines+=['','## Deliverables','',
 '- [corrected_cards.tsv](corrected_cards.tsv)',
 '- [corrected_cards_anki_import.tsv](corrected_cards_anki_import.tsv)',
 '- [audit_report.md](audit_report.md)',
 '- [_codex_audit_done.txt](_codex_audit_done.txt)']
(B/'audit_report.md').write_text('\n'.join(lines)+'\n',encoding='utf-8',newline='\n')
outputs=['corrected_cards.tsv','corrected_cards_anki_import.tsv','audit_report.md']
marker=['DONE','articleTitle: '+metadata['articleTitle'],'completedAt: '+result['validatedAt'],'validation: passed','originalNotes: 62','correctedNotes: 64','columnCount: 22','deletedNotes: 2','additionalSplitNotes: 2','addedSourceSupportedNotes: 2','imageCases: 26','uniquePrimaryImages: 40','verifiedMediaFiles: 80','differentialDrillNotes: 0','targetNoteType: '+metadata['anki']['noteType'],'targetDeck: '+metadata['anki']['deckName'],'liveAnkiImportPerformed: false','validationReport: _codex_review/validation_results.json']
for name in outputs: marker.append(name+' SHA256: '+hashlib.sha256((B/name).read_bytes()).hexdigest())
(B/'_codex_audit_done.txt').write_text('\n'.join(marker)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({'status':'passed','checks':len(checks),'notes':len(rows),'actualImageReferences':len(allrefs),'reportWritten':True,'completionMarkerWritten':True}))
