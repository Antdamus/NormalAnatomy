# RadPrimer Card Audit Report: Traumatic Aortic Injury

Bundle: `C:\Users\josem.000\NormalAnatomy\radprimer_audit_queue\Traumatic_Aortic_Injury_2026-06-06T16-59-25-999Z`

## Inputs reviewed
- `source_package.txt` RadPrimer article and image captions.
- `generated_cards.tsv` (34 original rows, 22 columns).
- `metadata.json` including selected images, case map, and Anki target.
- `core_evidence.txt` with auditable Core support from Core Radiology Vascular:547-548 and IR:604.

## Output files
- `corrected_cards.tsv` (39 rows, 22 columns, no header row).
- `corrected_cards_anki_import.tsv` with Anki import directives.
- `_codex_audit_done.txt`.

## Highest-signal changes
- Preserved all six primary image-recognition cases covering images 1-10 and the case groups in `metadata.json`.
- Kept differential drill cards for the true injury cases, chronic pseudoaneurysm, traumatic pseudoaneurysm, and ductus diverticulum mimic because they intentionally test structured comparisons.
- Narrowed the grade II-IV treatment card to TEVAR only, then added a separate open-repair/risk card.
- Split the overloaded MR/TEE/angiography card into separate modality cards.
- Added two missing source-supported high-yield cards: aortic injury level distribution and the radiographic mediastinal-widening threshold.
- Preserved Core-specific claims only where supported by `core_evidence.txt`; no outside sources were used.
- Cleaned non-caption mojibake in card bodies/summaries while leaving verbatim `Image_Annotated` captions and `Original_Caption` text unchanged.

## Validation
- Corrected TSV row count: 39.
- Column counts: all rows have 22 fields.
- First field validation: all rows have nonempty unique first fields.
- Anki target: `Corebook::Thoracic::Trauma::Traumatic Aortic Injury` / note type `core_rad_notetype_v2`.
- Selected image coverage: images 1-10 are represented in primary image cards; grouped cases match metadata cases `[1,2]`, `[3,4]`, `[5,6]`, `[9,10]`, `[7]`, `[8]`.

## Residual notes
- Some multi-fact cards remain intentionally grouped where mutual recall is the point, such as CTA sensitivity/specificity, SVS grade framework, and anti-impulse targets.
- No Core-only claim was added beyond the exported Core evidence block.
