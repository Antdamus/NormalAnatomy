import csv
import hashlib
import io
import json
import re
from collections import Counter
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

work = Path(__file__).resolve().parent
bundle = work.parent
staged = Path('C:/Users/josem.000/Downloads/RadPrimerAudit') / bundle.name
meta = json.loads((bundle/'metadata.json').read_text(encoding='utf-8-sig'))
checks = json.loads((work/'validation_results.json').read_text())
media = json.loads((work/'anki_media_integrity.json').read_text(encoding='utf-8-sig'))
downloads = json.loads((work/'download_media_integrity.json').read_text())
digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()

source_names = ['source_package.txt','generated_cards.tsv','metadata.json','audit_instructions.md','core_evidence.txt','_bundle_complete.txt']
source_hashes = {n:digest(bundle/n) for n in source_names}
assert all(source_hashes[n] == digest(staged/n) for n in source_names)
original = list(csv.reader(io.StringIO((bundle/'generated_cards.tsv').read_text(encoding='utf-8-sig')),delimiter='\t'))
text = (bundle/'corrected_cards.tsv').read_text(encoding='utf-8')
rows = list(csv.reader(io.StringIO(text),delimiter='\t'))
assert len(rows)==27 and all(len(r)==22 for r in rows)
assert len(text.splitlines())==27
assert len({r[0] for r in rows})==27
assert all(re.search(r'[A-Z0-9]{12}$',r[0]) and not re.search(r'(?:Q|CASE)\d{8,}$',r[0]) for r in rows)
assert all(r[6]==r[7]=='' for r in rows)
assert sum(bool(r[3]) for r in rows)==8
assert sum(bool(r[12]) for r in rows)==2
assert sum(bool(r[14]) for r in rows)==17
assert all(sum(bool(r[i]) for i in [3,6,10,12,14])==1 for r in rows)
assert all(bool(r[q])==bool(r[a]) for r in rows for q,a in [(3,4),(10,11),(12,13),(14,15)])
assert all(r[8].startswith('<b>Differential:</b>') for r in rows if r[3])
assert len(set(r[20] for r in rows))==1 and all(r[20] for r in rows)
assert all(r[21]=='' for r in rows)
assert {r[0] for r in original if r[0] in {n[0] for n in rows}} == {r[0] for r in rows[:20]}
assert 'T2-weighted' not in text and 'CLAIMED_BUT_UNSTRUCTURED' not in text

class AuditHTML(HTMLParser):
    def __init__(self):
        super().__init__(); self.images=[]; self.visible=[]; self.stack=[]
    def handle_starttag(self, tag, attrs):
        attrs=dict(attrs)
        if tag=='img':
            assert attrs.get('src'); self.images.append(attrs['src'])
        if tag not in ['img','br','hr','input','meta','link']:
            self.stack.append(tag)
    def handle_endtag(self, tag):
        assert self.stack and self.stack.pop()==tag, tag
    def handle_data(self, data): self.visible.append(data)

before=[]; after=[]
for target, dest in [(original,before),(rows,after)]:
    for row in target:
        for val in row[:21]:
            parser=AuditHTML(); parser.feed(val); parser.close(); assert not parser.stack
            dest.extend(parser.images)
            if target is rows:
                visible=' '.join(parser.visible)
                assert not re.search(r'Image references?:|Source image links?(?:\(s\))?:|https?://|source URL|thumbnail URL|arrow_\w+\.png|(?:RP|SDX)-\d+_[^\s]+\.(?:jpg|png)', visible, re.I)
assert Counter(before)==Counter(after)
assert set(after)=={r['filename'] for r in media}
assert len(set(after))==27
assert all(r['exists'] and r['bytes']>0 for r in media)
assert sum(r['matchesStagedDownload'] is True for r in media)==22
assert all(r['decodes'] for r in downloads)
assert sum(r['matchesRegistryEvidence'] is True for r in downloads)==11
assert set(meta['masterImageIds']) == {r['masterImageId'] for r in downloads}
for name, width in [('corrected_cards_anki_import.tsv',22),('corrected_cards_anki_create_deck.tsv',23)]:
    body=(bundle/name).read_text(encoding='utf-8')
    headers=[l for l in body.splitlines() if l.startswith('#')]
    assert '#separator:tab' in headers and '#html:true' in headers
    assert '#notetype:'+meta['anki']['noteType'] in headers
    assert '#deck:'+meta['anki']['deckName'] in headers
    assert '#tags column:22' in headers
    parsed=list(csv.reader(io.StringIO('\n'.join(l for l in body.splitlines() if not l.startswith('#'))),delimiter='\t'))
    assert len(parsed)==27 and all(len(r)==width for r in parsed)
    assert [r[:22] for r in parsed]==rows
    if width==23:
        assert '#deck column:23' in headers and all(r[22]==meta['anki']['deckName'] for r in parsed)

now=datetime.now(timezone.utc).isoformat(timespec='seconds')
checks.update(independentValidation='PASS',sourceFilesUnchanged=True,sourceSha256=source_hashes,
              verifiedMediaFiles=27,scanFilesMatchingAnki=22,plainFilesMatchingRegistry=11,
              allImageFilesDecode=True,htmlBalanced=True,originalImageTagOccurrencesPreserved=len(after),
              imageVisualReview='All 11 plain and 11 annotated images viewed in separate contact sheets; exact scan filenames and hashes checked.',
              importRowsEqualCleanRows=True,finalizedAt=now)
(work/'validation_results.json').write_text(json.dumps(checks,indent=2)+'\n',encoding='utf-8')

row_table=[]
by_id={r[0][-12:]: (i+1, r) for i,r in enumerate(rows)}
for entry in sorted(checks['rowAudit'],key=lambda e:(e['originalRow'] is None,e['originalRow'] or 0)):
    output=by_id.get(entry['id'])
    out_n=str(output[0]) if output else 'removed'
    row_table.append('| '+str(entry['originalRow'] or 'new')+' | '+out_n+' | '+entry['id']+' | '+entry['reason']+' |')
gate_table=[]
entry_by_id={e['id']:e for e in checks['rowAudit']}
for i,r in enumerate(rows,1):
    if not r[14]: continue
    entry=entry_by_id[r[0][-12:]]
    assert entry['gate']
    gate_table.append('| '+str(i)+' | '+r[14]+' | '+entry['gate']+' | '+entry['source']+' |')
media_table=['| '+r['filename']+' | '+str(r['bytes'])+' | '+r['sha256'][:16]+'… |' for r in media]

report=f'''# Widened Hepatic Fissures — card-quality audit

Completed {now}. Result: **PASS with documented source and live-Anki limits**.

Imported the newest complete browser bundle using `edge_radprimer_extension/tools/import-latest-radprimer-audit-bundle.ps1`, then read `radprimer_audit_queue/_latest_radprimer_audit_bundle.txt`. The pointer resolved to this bundle. All six imported source/control files remain byte-identical to the staged Downloads bundle.

## Deliverables and counts

- `corrected_cards.tsv`: **27 notes**, 22 columns, UTF-8, no header row. Original: 23 notes.
- `corrected_cards_anki_import.tsv`: the same 27 rows and 22 columns, with HTML, separator, note-type, deck, and Tags-column directives.
- `corrected_cards_anki_create_deck.tsv`: optional automatic-deck-creation transport wrapper. It preserves the original 22 columns in order and appends only the deck control column as column 23.
- `_codex_audit_done.txt`: completion marker written after final validation.
- Final mix: **8 UNKNOWN, 2 Boards Trap, 17 High-Yield, 0 Mechanism, 0 Differential Drill**. These are intended card triggers, not a claim that a live Anki import was run.

Three original notes were removed/merged and seven focused notes added: two splits plus five missing source-supported pivots. All 20 retained original `Clinical_Context` fields, including their random-looking IDs, are unchanged. Seven new IDs were generated independently from random bytes. No missing or counter-style IDs were found in the input.

## Main corrections

1. Split focal confluent fibrosis location from venous-phase isoattenuation. Preserve the article's 90% and 80% figures as attributed frequencies, with the interpretive pivot explicit and no invented diagnostic cutoff.
2. Split schistosomiasis fissural distribution from septal/tortoise-shell calcification. Do not assert calcification in RP-08, whose caption does not document it.
3. Merge the age-only senescent-change question and its duplicate CT pitfall into the existing Boards Trap. Age over 70 remains a source-described association, not an absolute diagnostic threshold. Remove the generic four-domain checklist as a standalone High-Yield note; retain its organizing framework in the summary.
4. Remove the unsupported **T2-weighted** specificity from the cirrhosis MRI prompt. The captured Core report supports MRI morphology, but does not identify that sequence.
5. Add five omitted useful pivots: congenital hepatic fibrosis medial-segment preservation, associated renal/biliary abnormalities, PSC with inflammatory bowel disease context, resection/ablation as an iatrogenic mimic, and confluent fibrosis wedge shape with capsular retraction.
6. Replace absolute statements about absent portal hypertension with supportive, probabilistic wording. Source-case senescent change, metastatic pseudocirrhosis, and congenital hepatic fibrosis retain the need for clinical correlation.
7. Separate the general treated-breast-cancer association from RP-05, whose caption documents breast cancer metastases but no treatment interval. Do not claim that RP-05 specifically shows capsular retraction.
8. Improve source-supported mechanisms in UNKNOWN backs: fibrosis/parenchymal loss explains fissural widening; peripheral scarring with relative central hypertrophy explains PSC contour remodeling. No histology-specific claims or external medical explanations were added.

No standalone metadata/bookkeeping questions were present. No prohibited visible image-reference, source-URL, thumbnail-URL, or filename-list blocks were found in the generated learner-facing fields; final checks confirm none remain. Real image tags and useful captions, including the arrow icons, are preserved.

## Core and article evidence

`core_evidence.txt` is present, has `CORE_EVIDENCE_STATUS: USED`, identifies `junzi-shi-core-radiology-a-visual-approach-to.pdf`, GI/liver/biliary coverage on GI pp. 103–104, 109, 119, and 143–144, and enumerates the facts used. `metadata.json` agrees: provided=true and recoveredFromUnwrappedReport=false. The report is usable captured evidence under the bundle instructions; it is not a new direct review of the Core PDF.

Accepted Core support is limited to the enumerated facts: cirrhotic CT/MRI remodeling, ultrasound coarse heterogeneous echotexture/nodular contour, metastatic pseudocirrhosis and capsular retraction, wedge-shaped confluent fibrosis/capsular retraction, Caroli saccular intrahepatic duct dilatation, and PSC duct beading/cirrhotic remodeling. The captured report gives an aggregate page range, not a per-claim page image or verbatim excerpt. No wider Core coverage is claimed.

The older fused source section says no Core pages/excerpts were supplied at that stage. The later generation-stage captured Core report supplies the specific additional evidence for this audit. The summary's source-basis label now states that distinction. Senescent change, congenital segment absence, specific congenital hepatic fibrosis and schistosomiasis clues, and the 90%/80% statistics remain **RadPrimer/STATdx-derived**, not Core-verified claims. Primary studies supporting the statistics were not supplied.

The article-level summary is preserved on every note with its original topic, differential, pearls/pitfalls, and concluding synthesis structure. Corrections clarify the captured Core basis, label article statistics, and restore useful congenital-fibrosis and confluent-fibrosis distinctions. Repetition was not treated as a defect.

The source package already records an editorial correction of an organism-name error in the upstream extracts. No organism-taxonomy or generic frequency trivia was added. An external literature search did not provide an accessible primary full-text verification, and no medical content from it was imported into the cards. All retained/added medical claims are grounded in the supplied article and captured Core report; there is no unlabeled outside clarification.

## Differential Drill prevention and image groups

Both `Differential_Q` and `Differentials` are blank on all 27 notes. Each UNKNOWN mini-differential is at the **top of `Imaging_Differentiation`**. This is the user-authorized compatibility fallback for a note type that could still gate Differential Drill on `Differentials`.

The installed template was not successfully inspected: the local endpoint returned HTTP 404 and the collection database was locked. No live note-type patch or note import was performed, and none was required for this field-level fallback. Actual live card rendering, model field order, and template deck overrides were not changed or independently validated.

- RP-02 remains one complete A–D precontrast/arterial/venous/delayed MRI montage.
- SDX-04 and SDX-05 remain together as distinct examples; the front/back no longer imply a confirmed shared patient.
- SDX-09 and SDX-10 remain paired CT levels in the caption-implied 22-year-old man's case, without progression or treatment claims. SDX-08 stays in the teaching cluster as a separately sourced example with no established patient link.
- All 11 selected source-image IDs are retained. Front labels are source-qualified display labels; no filenames or URLs are exposed as visible bookkeeping.

## Media integrity

The imported audit bundle initially contained six text/control files and **no media directory**. Media were therefore verified in `Downloads/RadPrimer` and `AppData/Roaming/Anki2/User 1/collection.media`, rather than pretending they were included in the bundle.

- All **22 scan files** exist, decode successfully, and match the Anki media copies byte-for-byte by SHA-256.
- All **11 plain-image hashes** exactly match `metadata.json` registry evidence. The registry did not supply annotated hashes; those 11 files were decoded, visually checked, and matched against Anki's copies.
- All **five caption icon files** exist in Anki media under the exact referenced filenames with nonzero bytes. They are listed in registry `captionMarkerAssets`; no independent source icon checksum was supplied.
- The **{len(after)} image-tag occurrences / 27 unique filenames** are identical as a multiset before and after audit. No actual image or caption icon was removed.
- All plain and annotated scans were reviewed in separate contact sheets. RP-03 and SDX-10 have byte-identical plain/annotated variants; their captions do not require an arrow overlay. Both exact filenames remain valid.

Full checksums, sizes, dimensions, and comparison outcomes are in `_codex_review/download_media_integrity.json` and `_codex_review/anki_media_integrity.json`. The shortened hashes below are an index, not a substitute for those full records.

| Exact media filename | Bytes | SHA-256 prefix |
| --- | ---: | --- |
{chr(10).join(media_table)}

## Anki import routing

Target note type: `core_rad_notetype_v2`.

Target deck: `Corebook::GI::Liver::Widened Hepatic Fissures`.

Use **`corrected_cards_anki_create_deck.tsv`** when the target subdeck may not exist. Its `#deck column:23` directive instructs Anki to create the named deck when needed. Use `corrected_cards_anki_import.tsv` for the requested strict 22-column import when the target deck already exists. The standard global `#deck` header presets an existing deck; it does not guarantee creation. The automatic-creation wrapper adds a transport control column only; the note's 21 fields plus Tags remain identical and in the original order. This behavior follows the [official Anki text-import manual](https://docs.ankiweb.net/importing/text-files.html#file-headers).

The existing note type must be available. A TSV header does not create a missing note type. Template deck overrides or updating existing notes can affect placement; those live settings were not changed. This task prepares and verifies the files; it does not import notes or delete any previously imported versions.

## Row-by-row decisions

Original/output numbers are audit references only; they were never used to generate learner-facing IDs. Source bases and gate results are also recorded in `_codex_review/validation_results.json`.

| Original row | Output row | Preserved or new ID | Decision |
| ---: | ---: | --- | --- |
{chr(10).join(row_table)}

## High-Yield usefulness gate — all 17 rows

Each final High-Yield note teaches a modality appearance, contrast behavior, discriminator, pitfall, or pretest clue that changes interpretation. None relies on a bare prevalence ranking or generic checklist.

| Output row | Retrieval target | Gate passed | Auditable basis |
| ---: | --- | --- | --- |
{chr(10).join(gate_table)}

## Final validation

Independent Python TSV parsing and HTML parsing passed after the authoring checks: 27 rows, exactly 22 clean-data columns in original order, no field header row, no embedded raw tabs/newlines, balanced HTML, one intended card trigger per row, paired questions/answers, unique nonsequential IDs, 17/17 High-Yield gates documented, all 27 repeated summaries present, blank differential triggers, and all image references preserved. Both import variants reproduce the clean 22 columns exactly; the optional wrapper's final column contains only the exact target deck.

Input hashes and output validation details are recorded in `_codex_review/validation_results.json`. Completion does not imply that the live Anki collection or a Core PDF was directly reviewed beyond the explicit limits above.
'''
(bundle/'audit_report.md').write_text(report,encoding='utf-8')
outputs=['corrected_cards.tsv','corrected_cards_anki_import.tsv','corrected_cards_anki_create_deck.tsv','audit_report.md']
out_hashes={name:digest(bundle/name) for name in outputs}
marker='\n'.join(['DONE','validation: passed','articleTitle: Widened Hepatic Fissures','completedAt: '+now,'originalNotes: 23','correctedNotes: 27','unknownNotes: 8','boardsTrapNotes: 2','highYieldNotes: 17','cleanTsvColumns: 22','selectedImages: 11','verifiedMediaFiles: 27','deck: '+meta['anki']['deckName'],'differentialDrillSuppressed: true; Differential_Q and Differentials blank; mini-differentials on UNKNOWN backs','automaticDeckCreationFile: corrected_cards_anki_create_deck.tsv']+[n+' SHA256: '+v for n,v in out_hashes.items()]+['validationReport: _codex_review/validation_results.json','No live Anki import or note-type modification performed.'])+'\n'
(bundle/'_codex_audit_done.txt').write_text(marker,encoding='utf-8')
print(json.dumps({'validation':'PASS','notes':27,'columns':22,'verifiedMedia':27,'imageTagOccurrences':len(after),'outputs':out_hashes},indent=2))
