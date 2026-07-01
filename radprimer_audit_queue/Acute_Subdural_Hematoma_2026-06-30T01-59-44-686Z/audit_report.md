# RadPrimer Card Audit Report: Acute Subdural Hematoma

Bundle: `C:\Users\josem.000\NormalAnatomy\radprimer_audit_queue\Acute_Subdural_Hematoma_2026-06-30T01-59-44-686Z`

## Inputs Reviewed

- `source_package.txt`
- `generated_cards.tsv`
- `metadata.json`
- `audit_instructions.md`
- `core_evidence.txt`

## Result

- Original rows: 38
- Corrected rows: 38
- TSV columns preserved: 22
- Added rows: 0
- Removed rows: 0
- Split rows: 0

The generated deck was on-topic and mostly source-supported, so the audit preserved the 38-card structure and focused on provenance and media repairs.

## Corrections Made

- Removed unsupported `Core + RadPrimer + STATdx synthesis` attribution from the repeated summary field. The bundle's `core_evidence.txt` states `CORE_EVIDENCE_STATUS: NOT_PROVIDED`, and the fused source package states that no auditable Core Radiology source was supplied.
- Rewrote the summary field to `RadPrimer + STATdx fused master source and selected image captions`, with an explicit Core status caveat.
- Replaced source-evidence hash image filenames with the actual downloaded Anki media filenames from `metadata.json`/`downloadFiles`.
- Repaired row 16 by removing the unsupported phrase that Core framed the definition.
- Repaired row 19 by replacing a Core-attributed CT attenuation mechanism with source-supported acute SDH density traps: heterogeneous/hypodense hyperacute SDH, coagulopathy/severe anemia isodense SDH, and displacement/mass-effect clues.
- Repaired row 29 by removing the unsupported Core subacute timing statement and keeping only article-supported acute isodense contexts and CT clues.

## Source-Supported High-Yield Coverage Present

- Definition/mechanism: blood in or between inner dural border layer and arachnoid; trauma/bridging vein mechanism; older adult vulnerability.
- CT pattern: crescentic hyperdense extraaxial collection, falx/tentorium extension, suture crossing with dural-attachment limitation.
- Detection traps: wider CT windows, reformats, isodense anemia/coagulopathy, hypodense or mixed hyperacute components.
- Instability/danger: disproportionate swelling, midline shift, spot sign/active extravasation, interval expansion, herniation, obstructed foramen of Monro.
- Differentials/mimics: EDH, hygroma, effusion, empyema, pachymeningopathy, dural tumors, chemical shift artifact.
- Management/outcome pivots: thin isolated falcotentorial SDH low-growth scenario, surgical relevance of thickness/shift/clinical deterioration, high mortality in severe-volume disease.

## Media Validation

- Original distinct image references: 21
- Corrected distinct image references: 21
- Corrected references missing from `metadata.json` `downloadFiles`: 0

Corrected image references now match the staged download filenames, e.g. `SDX-02_STATdx_plain_Acute_Subdural_Hematoma2.jpg`, rather than source evidence filenames such as `SDX-02_STATdx_image_02_plain_4fce1827.jpg`.

## Core Evidence Handling

`core_evidence.txt` status: `NOT_PROVIDED`.

Core-specific claims were treated as unverified unless they were independently present in the RadPrimer/STATdx fused source package. No Core-only cards were retained.

## Output Files

- `corrected_cards.tsv`
- `corrected_cards_anki_import.tsv`
- `audit_report.md`
- `_codex_audit_done.txt`
