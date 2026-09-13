from pathlib import Path
from datetime import datetime, timezone
import csv, json, hashlib, re, io

B=Path(__file__).resolve().parent
rows=list(csv.reader((B/'corrected_cards.tsv').open(encoding='utf-8',newline=''),delimiter='\t'))
original=list(csv.reader((B/'generated_cards.tsv').open(encoding='utf-8',newline=''),delimiter='\t'))
ledger=json.loads((B/'_audit_row_map.json').read_text())
stats=json.loads((B/'_audit_validation.json').read_text())
media=json.loads((B/'media_integrity.json').read_text())
caption_icons=json.loads((B/'caption_icon_integrity.json').read_text())
meta=json.loads((B/'metadata.json').read_text())
timestamp=datetime.now(timezone.utc).isoformat()

gate={
27:('Pretest clue','Core ADPKD association + article polycystic-liver synthesis; NIDDK terminology clarification','Replaced percentage-recall framing and avoided conflating ADPKD-associated liver cysts with isolated ADPLD.'),
28:('Pretest clue','Article biliary cystic neoplasm synthesis; SDX-18','Retained demographic clue only with complex mass/enhancement pivot.'),
29:('CT / contrast behavior','Core simple-cyst bullet + article hepatic-cyst synthesis','Requires morphology and absent enhancement, not HU alone.'),
30:('MRI / contrast behavior','Core simple-cyst bullet; SDX-03 hemorrhage example','Retained low T1/high T2/nonenhancement with hemorrhage caveat.'),
31:('US / Doppler behavior','Core simple-cyst bullet','Retained anechoic/posterior enhancement/no internal flow.'),
32:('Differential discriminator','Article polycystic-liver and hamartoma syntheses; Core matching bullets','Reframed as a pattern comparison; hereditary subtype requires correlation.'),
33:('CT / contrast behavior','Article abscess synthesis; SDX-05; Core abscess bullet','Split MRI into its own card; removed unsupported reactive perilesional hyperenhancement.'),
34:('US appearance','Core pyogenic-abscess bullet','Removed uncaptured early-evolution sequence; retained mature lesion with internal echoes.'),
35:('CT appearance / pitfall','SDX-06; article hamartoma synthesis','Kept the explicitly illustrated nodular-wall variant without making it obligatory.'),
36:('US appearance','SDX-07; Core hamartoma bullet','Retained size-dependent echogenic versus cystic appearance.'),
37:('MRCP differential discriminator','SDX-08; Core hamartoma and Caroli bullets','Retained noncommunication versus communicating duct dilatation.'),
38:('Neoplastic discriminator / pitfall','SDX-09 plus SDX-06 benign exception','Qualified nodularity; neither malignant histology nor primary site is proved.'),
40:('CT appearance / specificity pitfall','Article amebic-abscess synthesis; SDX-12; Core amebic bullet','Retained CT pattern with explicit infectious-etiology limitation.'),
41:('Pretest / interval discriminator','Article biloma/seroma synthesis; SDX-13','Retained injury/procedure history and prior-study comparison.'),
42:('Report-critical vascular pivot','Article transplant-biloma synthesis; SDX-14/15; Core transplant bullet','Prioritizes arterial patency assessment; no broad most-common recall question.'),
43:('CT/MRI appearance / pretest clue','Core fungal-infection bullet; SDX-16','Changed obligatory MR restriction to may; retained immune/infection context.'),
44:('US appearance / pretest clue','Core fungal-infection bullet; article candidiasis context','Removed unsupported treated granuloma/calcification teaching.'),
45:('Internal-structure discriminator','Core hydatid bullet; article hydatid synthesis; SDX-17','Retained daughter cysts/membrane/calcified wall without modality overstatement.'),
46:('US sign / mechanism','Core water-lily sign; outside membrane clarification','Split membrane sign from hydatid-sand distinction.'),
47:('Contrast behavior / malignant-risk discriminator','Article biliary cystic-neoplasm synthesis; SDX-18; Core cystadenoma bullet','Retained enhancement and nodules with benign/malignant overlap.'),
48:('Report / management pivot','Article biliary cystadenoma/carcinoma synthesis; SDX-18','Replaced blanket most-are-resected assertion with suspected neoplasm and complete-resection/recurrence point.'),
49:('Ductal contrast behavior / differential','Article biliary IPMN synthesis; SDX-19','ERCP filling proves communication, not carcinoma; nodularity supplies the neoplastic concern.'),
50:('Contrast-phase behavior','Article HCC synthesis','Retained arterial enhancement/washout in viable tissue; article support only.'),
53:('CT appearance / report-critical rupture','Article sarcoma synthesis; SDX-21','Retained enhancing peripheral tissue and hemorrhagic rupture; histology requires pathology.'),
55:('US/MRI discrepancy / pitfall','Article foregut-cyst synthesis; SDX-22','Consolidated duplicated MRI/US teaching; no histologic certainty from MRI alone.'),
57:('Structured interpretation checklist','Article high-yield discriminators, reconciled with abscess and SDX-06 exceptions','Repaired the tumor-until-proven-otherwise overgeneralization.'),
58:('Interval discriminator','Article high-yield discriminators','Retained slow cyst change versus rapid infection change versus treatment necrosis.'),
59:('Imaging review / ductal discriminator','Article high-yield discriminators','Retained multiplanar review only with concrete lesion-number and duct-relationship consequences.')}

report=f'''# Cystic Hepatic Mass — full card-quality audit

Completed: {timestamp}

## Result

**60 corrected notes: 18 UNKNOWN, 5 Mechanism, 4 Boards Trap, and 33 High-Yield.** The original contained 59 notes. Six redundant notes were removed; splitting three overloaded notes produced four additional notes; three missing interpretation-focused notes were added. No standalone Differential Drill notes remain or are requested.

All five input files were compared: `source_package.txt`, `generated_cards.tsv`, `metadata.json`, `audit_instructions.md`, and `core_evidence.txt`. The import script was run from `C:\\Users\\josem.000\\NormalAnatomy`; the subsequently read `_latest_radprimer_audit_bundle.txt` pointed to this September 8 bundle, which was the newest complete staged bundle. Original input files were preserved.

## Deliverables and Anki routing

- `corrected_cards.tsv`: UTF-8, no field-header row, the original 22 columns in the original order.
- `corrected_cards_anki_import.tsv`: identical 22-column data, prefixed with the four requested import directives plus `#tags column:22`. Targets `core_rad_notetype_v2` and `Corebook::GI::Liver::Cystic Hepatic Mass`.
- `corrected_cards_anki_create_deck.tsv`: optional automatic deck-creation import wrapper. Its first 22 columns are identical to the corrected schema; the appended 23rd column is explicitly designated as Anki deck-routing metadata. Use this file if the target subdeck needs to be created automatically.
- `media/`: all 44 clinical image files plus six original caption-arrow icons, with exact filenames preserved.
- `media_integrity.json`: exact filenames, source paths, dimensions, sizes, SHA-256 hashes, and evidence-hash comparison results.
- `caption_icon_integrity.json`: six caption icon filenames, existing Anki source paths, dimensions, and hashes.
- `_audit_row_map.json` and `_audit_validation.json`: note/ID lineage and check results.

The Anki manual documents `#deck` as selecting an existing deck; a dedicated deck column creates a missing deck. That is why the optional routing wrapper is separate from the strictly preserved 22-column outputs. The note type must already exist. [Anki text import documentation](https://docs.ankiweb.net/importing/text-files.html).

Text import does not embed image bytes. The files in `media/` must be present by these exact basenames in the active Anki profile's `collection.media` directory when studying. The existing Anki `User 1` profile was confirmed during the caption-icon repair, and its original six arrow icons were copied into this bundle. The first audit's statement that no populated Anki profile was found was incorrect: the initial sandboxed read could not inspect that directory. No Anki collection mutation or live import was performed. [Anki media import documentation](https://docs.ankiweb.net/importing/text-files.html#importing-media).

## Main content repairs

1. **Separate clinical cases:** Original row 1 combined three different simple-cyst examples and assigned the first patient's age to the whole stack. It is now three focused UNKNOWN notes: uncomplicated cyst, obstructing large cyst, and hemorrhagic cyst. The original ID stays with SDX-01. The true GIST before/after pair (SDX-10/11), transplant process pair (SDX-14/15), and hamartoma multimodality group (SDX-06/07/08) remain grouped.
2. **Answerable fronts and calibrated diagnoses:** Added existing source-provided diverticulitis, trauma timing, transplant, fever/immunosuppression, endemic exposure, and ERCP context to appropriate questions. These additions do not change the retained first fields. Qualified thyroid primary, amebic/Candida etiology, malignant biliary histology, transplant thrombosis, and sarcoma histology as source-established outcomes or concerns rather than deductions proved by a single image.
3. **Benign exceptions to nodularity:** The source itself illustrates tiny biliary hamartomas with enhancing wall nodules and abscesses with enhancing septa. Corrected the blanket tumor rule in the relevant cards and repeated summary. The revised rule is to characterize complexity and assess the whole pattern.
4. **Polycystic-liver nuance:** Replaced the 40% recall question with the actual ADPKD pretest pivot. The captured Core report contains that figure, but the useful teaching is the renal/liver association, not an age- and modality-independent percentage or an automatic diagnosis of isolated ADPLD.
5. **Hydatid mechanism:** Separated the floating detached membrane (water-lily sign) from microscopic hydatid sand. Removed unsupported daughter-cyst repositioning language. Corrected the CT caption's conflation of visible daughter cysts with microscopic scolices; labeled the outside clarification.
6. **Blood versus serous fluid:** Preserved the trauma case and its bile/blood description, but corrected the source caption's erroneous equation of blood with seroma. The note now explicitly distinguishes biloma, hematoma, and seroma as an outside terminology clarification.
7. **Unsupported additions removed:** Removed reactive perilesional hyperenhancement, the uncaptured early US abscess-evolution sequence, fungal post-treatment calcified-granuloma teaching, and an uncaptured spleen-involvement claim. Restricted diffusion is now described with appropriate variability rather than as an obligatory organism-specific sign.
8. **Mechanism clarity:** Simplified the hamartoma embryologic explanation, the portal-branch basis of the Caroli central dot, and the infection route in the diverticulitis abscess note. Added the source-supported sarcoma US/CT-MRI discordance with a labeled explanation of water-rich myxoid stroma.
9. **Management/reporting:** Focused cystic biliary neoplasm on complete resection/recurrence and uncertain imaging histology; transplant biloma on arterial evaluation; sarcoma rupture on hemoperitoneum. Added the source-described prolonged course of uninfected postprocedural collections without turning it into a blanket no-drainage rule.

No pure metadata/bookkeeping note was present, so none was fabricated or removed under that label. Six genuinely redundant questions were removed instead. No new epidemiology, diagnostic-performance statistic, Core-only cutoff, or unsupported histology drill was introduced.

## IDs, differential fields, and summary

- The input's 59 IDs were already random-looking, non-diagnostic, unique 12-character identifiers. No counter-style or missing IDs required repair.
- All **53 retained original Clinical_Context fields and IDs are unchanged**. Seven split/new notes received random 12-character IDs generated without row numbers or diagnostic names; their saved mapping makes reruns stable.
- `Differential_Q` and `Differentials` are blank in every corrected row. All 18 UNKNOWN notes have the mini-differential at the top of `Imaging_Differentiation`, followed by findings/reasoning. This implements the user-authorized compatibility fallback without depending on an installed Differential Drill template's trigger behavior.
- The article summary remains populated in **all 60 rows**. It was not deleted for repetition. Only source-basis wording, polycystic-liver classification, the complexity rule, and the benign hamartoma exception were corrected.

## Core evidence boundary

`core_evidence.txt` reports `CORE_EVIDENCE_STATUS: USED`, names Core Radiology, Second Edition, lists GI page ranges, and supplies specific facts. `metadata.json` agrees and marks `recoveredFromUnwrappedReport: false`. This is usable captured claim-level evidence under the audit instructions; it is not a fresh inspection of the original Core PDF in this audit.

The older fused source inside `source_package.txt` says that no Core evidence existed at the earlier source-fusion stage. The separate current captured evidence file supplies the later cross-check. The source-fusion statement was not used to discard the current structured file, and metadata status alone was not used to validate additional facts.

Core attribution is limited to the actual bullets: simple-cyst CT/MRI/US appearance, hamartoma development/noncommunication, polycystic-liver pattern/ADPKD association, abscess and fungal imaging, hydatid structures, amebic/pyogenic overlap, cystic biliary neoplasm/mural-nodule concern, Caroli communication/central dot, focal-fat discriminators, cystic metastasis context, and the transplant vascular pivot. GIST treatment change, IPMN details, HCC viable-tissue enhancement, sarcoma, foregut cyst, pseudocyst, and detailed collection-course teaching use the article/captions, not an invented Core verification.

## Image integrity

Neither the new browser bundle nor the older September 4 audit folder contained the actual image files. The images were located at `C:\\Users\\josem.000\\Downloads\\RadPrimer`.

- `metadata.json` selects **SDX-01 through SDX-22**, with 44 plain/annotated download entries. The 16 RP images in the larger registry are archive-optional duplicates and were not substituted into the primary set.
- Original cards used registry target names ending in short hashes, whereas `downloadFiles` and the actual files use names such as `SDX-01_STATdx_plain_Cystic_Hepatic_Mass1.jpg`. All 44 clinical `<img src>` references were mapped by master image ID and variant to the exact download filenames.
- All **22 plain images match their recorded visualEvidence SHA-256 hashes exactly**. All 44 files successfully decoded as images. Annotated variants were checked by paired visual review and their downloaded source-ID/variant mapping; no preexisting annotated reference hash was supplied, so their computed local hashes are recorded without claiming a comparison that was unavailable.
- Reviewed both plain and annotated contact sheets for all 22 source images. The modality, anatomy, lesion pattern, and case pairing agree with the source captions. Some requested annotated variants have no overlaid marks; that is not a missing clinical image.
- Caption-icon repair: the original generation preserved all six distinct arrow styles, but their assets were absent from the bundle download list. The first audit incorrectly flattened them to generic `(arrow)` text. The original 16-by-16-pixel icons were subsequently recovered from `Anki2/User 1/collection.media`, decoded and visually inspected, and copied unchanged into this bundle. Every caption now preserves its exact original icon reference and style distinction. The audit script now validates icons as meaningful media rather than stripping them as bookkeeping.
- No visible image-reference/source-link/thumbnail/local-filename bookkeeping blocks remain in learner-facing fields. No image or URL fallback to the web is required by the corrected cards.
- The top-level selected image IDs and explicit source cluster notes governed grouping. The empty `cases` array and stale numeric settings/caseMap were not allowed to cross-pair unrelated images.

## Deleted original notes

| Original row | ID | Reason |
|---|---|---|
'''
for num,reason in stats['deleted_original_rows'].items():
    n=int(num);report+=f"| {n} | {original[n-1][0]} | {reason} |\n"
report+='''
## High-Yield usefulness and source ledger

Every retained/added High-Yield row was read in full. The table identifies the radiology pivot and the actual evidence basis; a PASS here is a content audit, not a new primary-source study verification. Row numbers below refer to `corrected_cards.tsv`.

| Corrected row | Original row / origin | Usefulness gate | Evidence basis | Disposition |
|---|---|---|---|---|
'''
for row,item in zip(rows,ledger):
    if not row[14]:continue
    origin=item['origin']
    if isinstance(origin,int):g,b,d=gate[origin]
    else:g,b,d=item['gate'],item['basis'],'Focused split/addition; PASS.'
    report+=f"| {item['output_row']} | {origin} | {g} | {b} | {d} |\n"
report+='''
## Other note coverage

- UNKNOWN rows 1–18: all 22 selected clinical images are covered; source captions were compared, question context was checked, and differential/diagnosis specificity was reviewed individually.
- Mechanism rows 19–23: hamartomas, Caroli central dot, mucin-driven intraductal dilatation, GIST treatment necrosis, and colon-to-liver abscess pathway. Each has one main causal explanation linked to interpretation.
- Boards Trap rows 24–27: focal-fat mimic, multicystic-liver differential, amebic/pyogenic overlap, and cystic biliary neoplasm benign/malignant overlap. These retained questions have concrete safety checks rather than generic cautions.
- All 60 notes have exactly one populated question/trigger family. No image-only orphan note, empty answer, duplicated first field, standalone differential trigger, or counter-derived new ID is present.

## Outside clarifications

These clarifications are visibly labeled in the relevant card answers. They were not relabeled as Core material, and bibliographic URLs are kept here rather than as image/source-link bookkeeping on cards.

- Hydatid microscopic structures and the distinction between daughter cysts and scolices: [CDC DPDx — Echinococcosis](https://www.cdc.gov/dpdx/echinococcosis/index.html). CDC describes protoscolices and free hooklets in cyst contents.
- Hydatid sonographic sediment, repositioning, and detached membrane distinction: [Cystic liver lesions: a pictorial review](https://pmc.ncbi.nlm.nih.gov/articles/PMC9287528/) and [Rare cystic liver lesions: a diagnostic and managing challenge](https://pmc.ncbi.nlm.nih.gov/articles/PMC3837259/). These were used only for the limited sign-definition clarification, not to add treatment stages or procedural recommendations.
- Collection terminology: [NCI — seroma](https://www.cancer.gov/publications/dictionaries/cancer-terms/def/seroma) and [NCI — hematoma](https://www.cancer.gov/publications/dictionaries/cancer-terms/def/hematoma).
- Renal/liver association wording: [NIDDK — Autosomal Dominant Polycystic Kidney Disease](https://www.niddk.nih.gov/health-information/kidney-disease/polycystic-kidney-disease/autosomal-dominant-pkd). The quantitative 40% statement was removed rather than reasserted as a general prevalence estimate.
- Portal drainage explanation: [The Gastrointestinal Circulation — Anatomy](https://www.ncbi.nlm.nih.gov/books/NBK53099/). The inference connecting the source's colon infection to liver seeding is labeled as an anatomic explanation on the card.
- Myxoid stroma and fluid-like CT/MRI appearance: [Undifferentiated embryonal sarcoma: paradoxical hepatic tumor, radiologic-pathologic case report](https://pmc.ncbi.nlm.nih.gov/articles/PMC2844756/), consistent with the [28-case Radiology correlation study](https://pubs.rsna.org/doi/full/10.1148/radiology.203.3.9169704). Only the water-content explanation was added; no study percentages or age cutoffs were imported.

## Validation and remaining limits

PASS: 60 rows × 22 columns; original field order; UTF-8 round trip; no data header row; exact row equality between clean TSV and the standard Anki import data; 60 unique non-counter IDs; unchanged first fields for all 53 retained originals; seven new random IDs; one trigger family per row; all answer pairs complete; summary present on every row; zero populated differential triggers; exact 50-file reference coverage (44 clinical images and six caption icons); 22/22 original plain evidence hashes; all images decoded and visually paired; exact caption arrow styles restored; no generic `(arrow)` substitutions, broken caption icon references, or visible source-URL bookkeeping.

The optional automatic-deck wrapper additionally passed equality of its first 22 fields against the clean TSV and has only the target deck name in its declared routing column. Live Anki import, note-type field order on the user's actual installation, card-template deck overrides, and media installation in that profile remain outside this file audit. Re-importing does not automatically delete the six redundant notes if they were previously imported; the deletion table identifies their original IDs for review. All retained first-field values remain stable for normal Anki duplicate matching.
'''
(B/'audit_report.md').write_text(report,encoding='utf-8')

# Independently read final files, including both Anki wrappers, before completion.
assert len(rows)==60 and all(len(r)==22 for r in rows)
for path,width in [('corrected_cards_anki_import.tsv',22),('corrected_cards_anki_create_deck.tsv',23)]:
    lines=(B/path).read_text(encoding='utf-8').splitlines()
    imported=list(csv.reader([s for s in lines if not s.startswith('#')],delimiter='\t'))
    assert len(imported)==60 and all(len(r)==width for r in imported)
    assert [r[:22] for r in imported]==rows
    if width==23: assert all(r[22]==meta['anki']['deckName'] for r in imported)
for r,item in zip(rows,ledger):
    if isinstance(item['origin'],int):assert r[0]==original[item['origin']-1][0]
    assert sum(bool(r[i]) for i in [3,6,10,12,14])==1
    for q,a in [(3,4),(10,11),(12,13),(14,15)]:assert bool(r[q])==bool(r[a])
    if r[3]:assert r[8].startswith('<b>Mini-differential:</b>')
    assert len(r)==22 and r[20] and not r[6] and not r[7]
refs=set(re.findall(r'<img\b[^>]*src="([^"]+)"','\n'.join('\t'.join(r) for r in rows)))
assert refs=={x['filename'] for x in media+caption_icons}
for entry in media+caption_icons:assert hashlib.sha256((B/'media'/entry['filename']).read_bytes()).hexdigest().upper()==entry['sha256']
assert sum(e['matches_metadata_plain_evidence'] is True for e in media)==22
hashes={name:hashlib.sha256((B/name).read_bytes()).hexdigest() for name in ['corrected_cards.tsv','corrected_cards_anki_import.tsv','corrected_cards_anki_create_deck.tsv','audit_report.md','media_integrity.json','caption_icon_integrity.json']}
done='AUDIT_COMPLETE\ncompleted_utc='+timestamp+'\ninput_rows=59\ncorrected_rows=60\nclinical_images=44\ncaption_icons=6\ntotal_media_files=50\nplain_evidence_hash_matches=22/22\nvalidation=PASS\nlive_anki_import=NOT_PERFORMED\n'+''.join(name+'_sha256='+sha+'\n' for name,sha in hashes.items())
(B/'_codex_audit_done.txt').write_text(done,encoding='utf-8')
print('Final audit complete:',len(rows),'rows;',len(refs),'verified media references.')
print('Output files:',', '.join(hashes))
