# Card-quality audit: Focal Liver Lesion With Hemorrhage

## Result

54 input notes → 57 corrected notes: 51 original notes retained with their exact Clinical_Context values, 3 weak/redundant text notes removed, and 6 focused High-Yield notes added. Final types: 17 UNKNOWN, 2 Mechanism, 3 Boards Trap, 35 High-Yield, and no Differential Drill. The no-header 22-column TSV schema and column order are unchanged.

## Source basis

- Imported the newest complete browser bundle with import-latest-radprimer-audit-bundle.ps1 and read the updated queue pointer. All six staged files remain unchanged.
- Compared source_package.txt, generated_cards.tsv, metadata.json, audit_instructions.md and core_evidence.txt. The Core evidence status is USED with a named PDF and page ranges; it is not unstructured metadata-only validation.
- Checked the cited local textbook directly: C:/Users/josem.000/Documents/junzi-shi-core-radiology-a-visual-approach-to.pdf. Printed page numbers are 12 less than the PDF page number: GI:98 (PDF 110), GI:105-108 (117-120), GI:114-115 (126-127), GI:118-120 (130-132), and Nucs:462-465 (474-477). The liver-trauma grading page was rendered and visually checked. Extracted verification pages are in _codex_review/core_pages.json and core_additional_pages.json.
- Shared RadPrimer/STATdx article facts and source captions remain the basis for hemorrhage, HELLP, coagulopathy, sentinel clot and reported case outcomes. No unprovided Core support is claimed for those details.

## High-signal corrections

- Original row 29 attempted all five liver-injury grades at once. Its original ID now tests active-bleeding compartment. Five added notes separate subcapsular hematoma extent, intraparenchymal hematoma size, laceration depth, major lobar/venous injury, and combination of multiple injuries. Related facts remain structured comparisons, not unrelated multi-part prompts.
- Replaced right-versus-left injury percentages and the ADPKD/ADPLD percentage with morphology and renal-association clues that change interpretation.
- Removed original row 31 (duplicates the corrected blood/fat Boards Trap), row 52 (reverse HELLP acronym recall), and row 53 (weak amyloidosis rarity ranking). Amyloidosis remains in the repeated article summary/differential.
- Added a focused sentinel-clot localization question supported by the HCC/melanoma captions.
- Replaced absolute HCC/adenoma likelihood slogans with patient-substrate and complete-imaging-pattern reasoning.
- Corrected the MRI explanation: preserve the captions' hemorrhage attribution, but do not teach T2 brightness as a definitive blood/fat separator. Chemical-shift signal loss is the source-supported intracellular-lipid test. Referenced T2 companions are not supplied.
- Separated sulfur-colloid/Kupffer-cell physiology from HIDA behavior. Core GI:114-115 describes scattered Kupffer cells and qualified photopenia; Nucs:463 uses an absolute formulation. The corrected cards use the qualified account. Core Nucs:465 confirms that IDA enters hepatocytes, so the explanation no longer attributes initial uptake to ductules.
- Preserved the complete article-level summary on every retained/added note. Only its HIDA mechanism and overgeneralized T2 blood/fat sentence were corrected; repetition was not penalized.

## Outside clarifications and source limits

The structured Core evidence identifies the textbook, page ranges and facts used. Retained Core teaching is checked against those auditable topics. The HIDA uptake-site explanation additionally uses a direct check of Core Nucs:465, beyond the staged page range; it is labeled outside physiology clarification on the card and its extracted supporting text is preserved in _codex_review/core_additional_pages.json. It is not represented as part of the captured Core evidence.

The AAST publication confirms arterial plus portal venous imaging, the grade-II laceration length qualifier, and the bleeding-compartment distinctions. Protocol/length details added beyond the captured digest are explicitly labeled outside clarification. [AAST 2018 original publication, Table 2](https://www.aast.org/asset/1EDF1B04-6B52-4E7B-9130ACA30413089D/).
The adenoma size card keeps Core's >5-cm teaching point while explicitly labeling current management qualifications: sex, subtype, growth and risk-factor modification matter. This is not a universal automatic-resection rule. [ACG 2024 focal liver lesion guideline highlights](https://gi.org/wp-content/uploads/2025/04/GuidelineHighlight_FLL.pdf).
The local textbook omits the >10-cm intraparenchymal hematoma criterion in its grade-III digest, whereas AAST Table 2 includes it. The dedicated intraparenchymal-hematoma card labels this completion as outside clarification. The published <10-cm and >10-cm inequalities are preserved; no unsupported exact-10-cm boundary is invented.

## Differential behavior, IDs and grouping

Differential_Q is blank throughout; no standalone Differential Drill was requested. The installed Anki collection could not be queried because the database was locked. Used the requested import-safe fallback: Differentials is blank throughout, and each of the 17 mini-differentials is preserved verbatim at the top of Imaging_Differentiation on the UNKNOWN back. No Anki template, collection, review state or existing note was modified.
All 54 input IDs were valid, unique, random-looking 12-character trailing identifiers. Exact Clinical_Context strings are preserved for all 51 retained original notes. Six new notes use new cryptographically random identifiers. No counter-style or row-derived IDs were introduced.
All 17 original image notes and their image-group order are preserved: [1], [2,3], [4], [5], [6,7], [8,9], [10], [11], [12], [13], [14], [15], [16], [17], [18], [19,20], [21,22,23]. No cluster was split, no selected image was removed, and no distinct image was replaced. Source-confirmed versus unconfirmed patient/procedure relationships remain qualified.

## Raw-caption and media integrity

All 23 stackCap strings already matched the raw metadata/source-package registry captions character-for-character, including spacing, punctuation, HTML and inline arrow tags. They were not repaired or normalized. Each complete Image and Image_Annotated field is byte-for-byte unchanged. Original_Caption was blank in all input rows because captions are in the annotated stacks; those fields remain exactly blank. No caption-only change affected any note ID, group or unrelated field.
Verified 46 exact diagnostic <img src> filenames against downloadFiles and the selected image registry. Every file decoded successfully from Downloads/RadPrimer and the existing Anki collection.media; corresponding hashes agree. All 23 selected images are covered by the UNKNOWN groups.
Eight caption-icon filenames were checked separately from diagnostic media. All eight were recovered byte-for-byte from the existing Anki collection.media into this bundle's media/ directory. Their original tags remain intact. All 54 unique image references are locally available and decode successfully; there are no unresolved media filenames in this audit.

| Recovered auxiliary filename | Bundle path |
|---|---|
| arrow_BC.png | media/arrow_BC.png |
| arrow_BO.png | media/arrow_BO.png |
| arrow_BS.png | media/arrow_BS.png |
| arrow_CC.png | media/arrow_CC.png |
| arrow_CS.png | media/arrow_CS.png |
| arrow_WC.png | media/arrow_WC.png |
| arrow_WO.png | media/arrow_WO.png |
| arrow_WS.png | media/arrow_WS.png |

Image download/source URL and local filename-list bookkeeping is absent from learner-facing text. The image references themselves remain as <img> tags; useful source captions and annotation icons were preserved. The image-retention rationale was removed from the biopsy explanation while its non-time-lapse context remains.

## Per-note audit

Row numbers below refer to generated_cards.tsv. Detailed field-level changes, preserved IDs, output row mapping, source bases and High-Yield usefulness categories are recorded in _codex_review/row_audit.json.

| Input row | Action | Usefulness gate / rationale |
|---|---|---|
| 1 | revised | Moved mini-differential to the UNKNOWN back and cleared legacy drill trigger. Clarified vascular grading versus hemoperitoneum and the possibility of a higher injury grade. |
| 2 | revised | Moved mini-differential to the UNKNOWN back and cleared legacy drill trigger. Removed the image-retention audit rationale while retaining necessary chronology limits. |
| 3 | revised | Moved mini-differential to the UNKNOWN back and cleared legacy drill trigger. |
| 4 | revised | Moved mini-differential to the UNKNOWN back and cleared legacy drill trigger. Removed generator/recognition-variant commentary from the learner explanation. |
| 5 | revised | Moved mini-differential to the UNKNOWN back and cleared legacy drill trigger. Preserved source diagnoses while removing an overgeneralized T2-brightness discriminator. |
| 6 | revised | Moved mini-differential to the UNKNOWN back and cleared legacy drill trigger. |
| 7 | revised | Moved mini-differential to the UNKNOWN back and cleared legacy drill trigger. |
| 8 | revised | Moved mini-differential to the UNKNOWN back and cleared legacy drill trigger. |
| 9 | revised | Moved mini-differential to the UNKNOWN back and cleared legacy drill trigger. |
| 10 | revised | Moved mini-differential to the UNKNOWN back and cleared legacy drill trigger. |
| 11 | revised | Moved mini-differential to the UNKNOWN back and cleared legacy drill trigger. |
| 12 | revised | Moved mini-differential to the UNKNOWN back and cleared legacy drill trigger. |
| 13 | revised | Moved mini-differential to the UNKNOWN back and cleared legacy drill trigger. |
| 14 | revised | Moved mini-differential to the UNKNOWN back and cleared legacy drill trigger. |
| 15 | revised | Moved mini-differential to the UNKNOWN back and cleared legacy drill trigger. |
| 16 | revised | Moved mini-differential to the UNKNOWN back and cleared legacy drill trigger. |
| 17 | revised | Moved mini-differential to the UNKNOWN back and cleared legacy drill trigger. |
| 18 | revised | Focused the mechanism on neovascularization and preserved the high-grade dysplasia overlap. |
| 19 | revised | Separated Kupffer-cell/sulfur-colloid physiology from the HIDA behavior card. Explained the tissue-to-tracer mechanism and reconciled the textbook's absolute versus qualified Kupffer-cell wording. |
| 20 | revised | Source-supported note retained. |
| 21 | revised | Corrected the fat-versus-blood pitfall without changing any raw source caption. |
| 22 | revised | Source-supported note retained. |
| 23 | revised | pretest clue; Qualified the source's likelihood shorthand while retaining the actionable pretest clue. |
| 24 | revised | pretest clue/differential; Replaced an absolute HCC-until-proven-otherwise slogan with a supported risk-plus-pattern discriminator. |
| 25 | revised | modality appearance/pitfall; Replaced right/left-lobe percentage trivia with an image morphology discriminator. |
| 26 | revised | pretest clue; Replaced 40-percent recall with a pretest/imaging-association clue. |
| 27 | revised | attenuation pitfall; Focused an overloaded CT/MRI/extension list on the source-supported attenuation pitfall. |
| 28 | revised | modality/protocol; Separated protocol choice from morphology and labeled the phase detail from the original AAST publication. |
| 29 | revised | report-critical grading; Split the five-grade list into focused grading questions; kept this original ID for the bleeding-compartment question. |
| 30 | revised | contrast behavior;  |
| 31 | deleted | Near-identical text-only blood-versus-fat recall duplicates the corrected Boards Trap in original row 21; no image or unique discriminator is lost. |
| 32 | revised | ultrasound specificity;  |
| 33 | revised | tracer behavior; Separated HIDA from sulfur-colloid recall and corrected the implied site of tracer uptake. |
| 34 | revised | management/reporting; Retained the source-supported size pivot while labeling current management qualifications. |
| 35 | revised | contrast behavior;  |
| 36 | revised | MRI appearance;  |
| 37 | revised | ultrasound/Doppler appearance;  |
| 38 | revised | tracer behavior/pitfall;  |
| 39 | revised | staging/reporting;  |
| 40 | revised | contrast behavior/pitfall;  |
| 41 | revised | ultrasound appearance;  |
| 42 | revised | MRI appearance;  |
| 43 | revised | MRI appearance;  |
| 44 | revised | differential discriminator;  |
| 45 | revised | pretest clue; Reframed a most-common list as a pretest clue that changes interpretation. |
| 46 | revised | contrast phase;  |
| 47 | revised | MRI appearance/pitfall;  |
| 48 | revised | ultrasound appearance;  |
| 49 | revised | report-critical appearance;  |
| 50 | revised | procedure/management;  |
| 51 | revised | pretest clue; Made the syndrome question test interpretation rather than isolated acronym recall. |
| 52 | deleted | Reverse HELLP-acronym recall duplicates the interpretation-focused HELLP card in original row 51. |
| 53 | deleted | Amyloidosis rarity ranking does not provide a useful hemorrhage discriminator; nonspecific hypoattenuation adds little. Amyloidosis remains in the article-level summary/differential. |
| 54 | revised | structured differential comparison; Kept a deliberate structured comparison and qualified overlapping imaging signs. |
| Added | added | Focused split from the overloaded original grading card. |
| Added | added | Focused split from the overloaded original grading card; restored the AAST length qualifier omitted by Core. |
| Added | added | Preserved the intraparenchymal size criterion from the original overloaded note and supplied the labeled grade-III completion. |
| Added | added | Focused high-grade injury split; preserves major venous-injury assessment. |
| Added | added | Preserves the original multiple-injury rule as one grading pitfall. |
| Added | added | Adds a missing standalone localization question already supported by several image captions. |

## Import and validation

Use corrected_cards_anki_import.tsv for note type core_rad_notetype_v2 and deck Corebook::GI::Liver::Focal Liver Lesion With Hemorrhage. It prepends the four requested Anki directives and contains no field header row. corrected_cards.tsv is the plain no-header audit output.
Independent validation passed: all 22 fields, original ID preservation, group/image order, raw caption equality, auxiliary-icon recovery hashes, selected-image coverage, empty drill triggers, repeated-summary consistency, changed-field scope and exact Anki header/body agreement. See _codex_review/validation_results.json. The completion marker was written after these checks passed.
Local media integrity is complete for these references. This audit does not claim a live Anki import or a verified installed-template render; the locked collection was not modified.

The three deletions are omissions from the corrected import file. Importing this file does not delete corresponding notes that may already exist in Anki.
