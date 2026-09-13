from pathlib import Path
import json, hashlib, re
from datetime import datetime, timezone

B=Path(__file__).resolve().parents[1]
R=B/'_codex_review'
def read(n):return json.loads((B/n).read_text(encoding='utf-8-sig'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
guard=read('corebook_validation.json')
media=read('_codex_review/source_media_validation.json')
review=read('card_overlap_review.json')
assert guard['status']==media['status']=='passed'
for n,h in guard['outputSha256'].items():assert sha(B/n)==h
assert all(x['exactOriginalPlainFileMatch'] for x in read('_codex_review/source_image_hash_comparison.json'))
assert all(x['matchesVerifiedBundleAsset'] for x in read('_codex_review/anki_media_presence.json')['files'])
meta=read('metadata.json')
source_evidence=read('_codex_review/caption_source_comparison.json')
assert len(source_evidence)==48 and all(x['sourceMetadataEqual'] and x['originalSourcePackageContainsExactCaption'] for x in source_evidence)
now=datetime.now(timezone.utc).isoformat()
corepath=Path(r'C:\Users\josem.000\Downloads\junzi-shi-core-radiology-a-visual-approach-to.pdf')
core=dict(status='verified',capturedEvidenceStatus='USED',sourceFile=str(corepath),sha256=sha(corepath),sourceBasis='Core Radiology, Second Edition, 2021; printed GI pages',pageChecks={
 '100':'Chemical-shift signal loss supports hepatic fat, verifying the existing image-back clarification.',
 '103':'Peribiliary cysts and recanalized paraumbilical vein in cirrhosis.',
 '109':'Lymphoma may preserve vasculature and appear hypoechoic/hypoenhancing.',
 '116':'Nonspecific starry-sky ultrasound, periportal edema and gallbladder wall edema in hepatitis; imaging may be normal.',
 '121':'Periportal edema is an expected postoperative liver-transplant finding.',
 '122':'Cardiac hepatopathy with enlarged hepatic veins/IVC and contrast reflux. This corrects the broad page-range attribution in the staged report.',
 '125':'Portal vein thrombosis/cavernous transformation and characteristic portal-venous spectral spikes with gas.',
 '142':'Visually verified two-column gas table: pneumobilia central, portal venous gas peripheral; spiky Doppler waveform belongs to the portal venous gas column.',
 '143':'Ascending cholangitis wall thickening/hyperenhancement/debris; imaging may be normal; PSC beading.',
 '144':'AIDS/PSC overlap and papillary-stenosis distinction; recurrent pyogenic cholangitis pattern.'},
 originalEvidenceFileUnchanged=True,outsideClarificationsAdded=False,visualEvidence='_codex_review/core_table_p142.png')
(R/'core_source_verification.json').write_text(json.dumps(core,indent=2)+'\n',encoding='utf-8',newline='\n')
media.update(corebookGate='passed',currentCorebookSnapshotId=guard['snapshotId'],all48PlainFilesMatchOriginalStagedEvidence=True,all105FilesAlreadyMatchAnkiMedia=True,completedAt=now)
(R/'source_media_validation.json').write_text(json.dumps(media,indent=2)+'\n',encoding='utf-8',newline='\n')

lines=[
'# Periportal Lesion — card-quality audit',
'',
'**Passed.** The corrected import contains **45 notes: 35 image-recognition notes, 5 Mechanism notes, 1 Boards Trap note, and 4 High-Yield notes**. It preserves **47 distinct source images** and all 11 multi-image groups. No new notes were added; 24 redundant notes were omitted from the 69-note input.',
'',
'The fresh retained-Corebook validation passed for the exact final TSV hashes. All final image references and caption icons resolve to verified files, and those same files are already present with matching hashes in the current Anki media folder. Anki notes, templates, scheduling, and decks were not modified.',
'',
'## Import',
'',
'Use `corrected_cards_anki_import.tsv`. Its headers select note type `core_rad_notetype_v2` and deck `Corebook::GI::Liver::Periportal Lesion`. The body exactly matches `corrected_cards.tsv`, with 22 columns in the original order and no field-header row. All retained Clinical_Context values and their random 12-character IDs are unchanged.',
'',
'The bundle also contains a verified `media/` copy of all 96 staged diagnostic assets and all 9 auxiliary arrow icons. Only 94 diagnostic assets are referenced by the corrected cards, because the two versions of the already-owned CLL image remain archived with the source. All 105 copied assets already match the current Anki media files; no separate media transfer is needed for this checked collection.',
'',
'## Repairs and preservation',
'',
'- Restored the entirely missing Original_Caption and Image_Annotated fields on every retained image note. All 48 source captions were compared character-for-character against original RadPrimer/STATdx metadata and source text; the 47 retained captions occur unchanged in both final caption locations.',
'- Preserved exact HTML, spaces, punctuation, courtesy credit, and every inline arrow tag, including `arrow_CO.png`. All 9 icon assets were recovered from existing Anki media and checked separately from the diagnostic-image registry.',
'- Kept each retained Image field unchanged, including grouping and order. Added clean source labels outside the immutable captions. No group was split and no interval, treatment response, or shared patient was invented.',
'- Added compact differentials at the top of UNKNOWN backs. Both Differential_Q and Differentials remain blank on every note, preventing the legacy Differentials-triggered drill path without changing the installed note type.',
'- Reframed underdetermined image questions: an upstream duct image now tests ductal dilation/obstruction level rather than an unseen stone or pancreatic primary. The pseudotumor case teaches the malignant mimic with pathology as the documented outcome. Required source-provided treatment/surgical/oncologic context is included in the question where needed.',
'- Preserved the article-level summary exactly on every retained note. Its Core + RadPrimer + STATdx basis is auditable in this card bundle; the earlier master-source package itself had no Core evidence, which is a separate source-stage limitation.',
'- Removed cross-category and within-batch conceptual repeats. The duplicated stone text row also contained a literal less-than sign that could disrupt HTML; that redundant row was omitted. No counter-style or missing IDs required repair.',
'- Final learner fields contain no visible image-reference blocks, source URLs, or local filename lists. Actual image tags, original captions, and concise source attribution remain.',
'',
'## Retained-bank review',
'',
'The audit refreshed the live bank with the required prepare command before corrections and refreshed it again with validate afterward. The bank was unchanged between review and validation: **3,175 retained cards**, snapshot `'+guard['snapshotId']+'`.',
'',
'Read all **526 liver entries across GI and US**, **106 additional global candidates**, and **135 further biliary/cross-topic entries** (767 distinct entries), comparing questions and answers across card categories. The entire snapshot was searched for relevant objectives; lexical scores were used only to retrieve candidates. Suspended retained cards remain owned. There are **0 recorded removed-history entries** in this snapshot; that does not establish an absence of deletions before the history baseline. Generated TSVs were never treated as accepted coverage.',
'',
'`card_overlap_review.json` contains one explicit decision for each of the 45 final notes, existing-entry references for skipped coverage, and separate intra-batch consolidation records. No existing-note update or deletion was silently emitted.',
'',
'## Omitted notes already covered by retained cards',
'',
'| Input row | Stable ID | Retained entry IDs | Decision |',
'|---|---|---|---|']
for x in review['skippedQuestions']:
    lines.append('| '+str(x['originalRow'])+' | '+x['clinicalContext'].split()[-1]+' | '+', '.join(x['matchedEntryIds'])+' | '+x['rationale'].replace('|','/')+' |')
lines += ['',
'The CLL image omission is based on actual image comparison, not captions: STATdx image 33 and the retained `HepaticMetastasesandLymphoma25.jpg` show the same slice, vessel branching, periportal mass, spine, and liver margins. The rasters differ in size (1000 versus 900 pixels) and encoding; they are not byte-identical. See `_codex_review/live_comparison_1.jpg`. It is a standalone case, so no companion was lost.',
'',
'## Consolidated within this batch',
'',
'| Omitted input row | Retained input row(s) | Reason |',
'|---|---|---|']
for x in review['intraBatchConsolidations']:
    lines.append('| '+str(x['originalRow'])+' | '+', '.join(map(str,x['retainedOriginalRows']))+' | '+x['rationale']+' |')
lines += ['',
'## Text-card usefulness gate',
'',
'All 20 input High-Yield rows were reviewed. Four remain, each with a source-supported radiology pivot; none was kept simply for a broad frequency or demographic fact. The retained text objectives below add causal or modality-specific content beyond their related image cases. No quota was used.',
'',
'| Input row | Type | Distinct contribution |',
'|---|---|---|']
for x in review['decisions']:
    if x['disposition']=='newConcept':
        n=x['originalRow'];kind='Mechanism' if n in [37,38,39,41,42] else ('Boards Trap' if n==47 else 'High-Yield')
        lines.append('| '+str(n)+' | '+kind+' | '+x['learningObjective']+' |')
lines += ['',
'## Source and media evidence',
'',
'The imported `source_package.txt`, `generated_cards.tsv`, `metadata.json`, `audit_instructions.md`, and `core_evidence.txt` were compared. Source packages and metadata were preserved. Core evidence is `USED`, with a named book and printed-page references; it was not merely a claim in generation metadata.',
'',
'Direct checks of the local Core Radiology PDF corroborated GI 109, 116, 121, 125, and 142–144. The original table on GI 142 was visually inspected and confirms the generated spiky-waveform attribution was already correct. Additional direct checks of GI 100 and 122 verify the existing chemical-shift fat clarification and cardiac-congestion claims; GI 122 is the precise cardiac-hepatopathy page. Verification and source-file hash are recorded in `_codex_review/core_source_verification.json`. New mechanism explanations use RadPrimer/STATdx support; no outside clarification or external guideline was added.',
'',
'All 48 plain files exactly match the original staged master-source image-evidence hashes. All 96 plain/annotated files decode, have the exact registered filenames, and were checked against the visible source examples. Current Anki-image comparison used byte/decoded-pixel checks, perceptual retrieval, and visual confirmation of the one established same-image match. The other 47 source images remain selected as recognition reinforcement; shared diagnoses alone were not grounds for exclusion. This is a targeted media comparison, not an audit of every unrelated image in Anki.',
'',
'Caption icon set: `arrow_BC.png`, `arrow_BO.png`, `arrow_BS.png`, `arrow_CC.png`, `arrow_CO.png`, `arrow_CS.png`, `arrow_WC.png`, `arrow_WO.png`, `arrow_WS.png`. **Missing referenced media: none.**',
'',
'## Group and interpretation limits',
'',
'All 11 multi-image groups remain intact: RadPrimer 11–12; STATdx 4–5, 6–7, 8–9, 10–11, 12–13, 14–16, 17–18, 21–22, 26–27, and 28–29. Explicit same-patient links are preserved. Matching age/context or procedure context is not treated as proof of shared identity. In particular, the CT/cholangiography abscess examples, the ERCP appended to the same-patient PSC MR pair, and the chemotherapy examples retain that uncertainty. No time-lapse or follow-up interval is supplied.',
'',
'The pseudotumor CT does not prove inflammatory histology or IgG4-related disease. The hepatitis pattern remains nonspecific. The biliary-necrosis image raises concern for arterial compromise without pretending to directly show the artery. Expected transplant edema does not exclude a separate graft complication.',
'',
'## Validation files',
'',
'- `corebook_validation.json`: fresh retained-bank gate passed, bound to final TSV/review hashes.',
'- `_codex_review/source_media_validation.json`: schema, random IDs, raw captions, image ordering/grouping, media, summary preservation, and learner-field checks passed.',
'- `_codex_review/field_change_log.json`: changed fields for each retained note.',
'- `_codex_review/caption_source_comparison.json`, `source_image_hash_comparison.json`, `media_audit.json`, and `anki_media_presence.json`: source and asset traceability.',
'- `_codex_review/image_selection_review.json`: 47 selected source IDs and the one already-owned archived image.',
'',
'Completed UTC: '+now,
'']
(B/'audit_report.md').write_text('\n'.join(lines),encoding='utf-8',newline='\n')
# Completion is the last write, only after both validation gates and final-hash equality.
for n,h in guard['outputSha256'].items():assert sha(B/n)==h
marker=['AUDIT_STATUS: PASSED','Completed UTC: '+now,'Final notes: 45 (35 image; 10 text)','Selected source images: 47; retained multi-image groups: 11','Corebook validation: passed','Source/media validation: passed','Missing referenced media: none','Anki modified: false']
for n in ['corrected_cards.tsv','corrected_cards_anki_import.tsv','card_overlap_review.json','audit_report.md']:
    marker.append(n+' SHA256: '+sha(B/n))
(B/'_codex_audit_done.txt').write_text('\n'.join(marker)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(dict(status='complete',notes=45,sourceImages=47,outputFiles=['corrected_cards.tsv','corrected_cards_anki_import.tsv','audit_report.md','_codex_audit_done.txt'],ankiModified=False),indent=2))
