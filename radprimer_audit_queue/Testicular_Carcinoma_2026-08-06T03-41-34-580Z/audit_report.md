# RadPrimer Card Audit Report - Testicular Carcinoma

Bundle: `C:\Users\josem.000\NormalAnatomy\radprimer_audit_queue\Testicular_Carcinoma_2026-08-06T03-41-34-580Z`
Audit date: 2026-08-06

## Outputs
- `corrected_cards.tsv`: 45 rows, 22 columns, no header row.
- `corrected_cards_anki_import.tsv`: Anki directives plus the corrected rows.
- `_codex_audit_done.txt`: completion marker.

## Source Review
- `core_evidence.txt` status is `NOT_PROVIDED`; no Core-specific claim was treated as verified.
- `metadata.json` selected images are RadPrimer images 1-8 only.
- `source_package.txt` contains the RadPrimer article and eight selected RadPrimer image captions; no auditable STATdx staging image set was present in the imported bundle.

## Major Corrections
- Replaced the repeated oversized summary field. New summary says RadPrimer-only and notes that Core evidence was not provided.
- Preserved and cleaned the 8 supported RadPrimer image-recognition cards, including verbatim captions in `Original_Caption`.
- Preserved/repaired 2 supported differential drills for seminoma and teratoma patterns.
- Removed unsupported image/staging cards and unsupported Core/STATdx/AJCC-specific claims.
- Added focused RadPrimer-supported cards covering diagnostic clue, modality roles, ultrasound protocol, histology-specific US appearances, Doppler size/flow behavior, CT/PET staging roles, mimics, epidemiology, risk factors, broad stage groups, spread, growing teratoma syndrome, and treatment.
- Added mechanism/trap cards using source-supported histology explanations; one inflammatory mass-effect explanation is explicitly labeled as outside clarification.

## Removed Or Replaced Content
- Rows 9-20: unsupported STATdx/staging image-recognition cards referencing Testicular_Carcinoma_Staging*.jpg not present in metadata or source_package selected images.
- Rows 23-24: differential drills based on unsupported STATdx/staging image stacks.
- Rows 25, 27, 29: burned-out germ cell tumor cards unsupported by visible RadPrimer article/core_evidence.
- Rows 33-40 portions with AJCC pT/N/M/S framework, inguinal-node regionality, and marker S-stage claims unsupported by visible bundle files.
- Rows 43-47 portions with unsupported MRI local invasion role, 8-mm CT threshold, negative PET/NSGCT caveat, and pathologic T-stage assertions.

## Remaining Uncertainties
- The generated download sentinel claimed a larger STATdx/Core synthesis, but those source materials were not auditable in this bundle. They were therefore excluded from corrected cards.
- The actual image files are not present in the bundle folder, but the supported RadPrimer media filenames are preserved exactly as provided in `metadata.json`/`generated_cards.tsv` for Anki media resolution.
