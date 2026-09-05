# RadPrimer Card Audit Report: Spermatocele/Epididymal Cyst

## Inputs Reviewed

- `source_package.txt`
- `generated_cards.tsv`
- `metadata.json`
- `audit_instructions.md`
- `core_evidence.txt`

## Audit Outcome

- Corrected output: `corrected_cards.tsv`
- Anki import output: `corrected_cards_anki_import.tsv`
- Rows preserved: 37
- TSV schema preserved: 22 columns, original column order, no header row in `corrected_cards.tsv`

## Key Corrections

- Removed unverified Core attribution from every card summary. `core_evidence.txt` says `CORE_EVIDENCE_STATUS: NOT_PROVIDED`, and `source_package.txt` did not contain auditable Core excerpts. The corrected cards therefore use RadPrimer + STATdx master-source attribution only.
- Rewrote the shared summary to preserve high-yield RadPrimer/STATdx facts while explicitly noting that Core evidence was not auditable in this bundle.
- Corrected the paired MR card answer from a forced `Epididymal cyst` to `Epididymal cyst or spermatocele`, matching the source-caption overlap and avoiding overdiagnosis.
- Corrected the multiseptated epididymal-head case from a forced `Epididymal cyst` to `Epididymal head cyst or spermatocele`, because the source caption explicitly says either entity.
- Removed a residual non-auditable `Core and article` phrase from an image-answer explanation.
- Tightened the spermatocele definition card so it does not imply unsupported broad location language beyond the source-backed classic epididymal-head/efferent-duct framing.

## Cards Kept

- Kept all 14 primary image-recognition cards because the selected image set is represented and captions support the teaching points.
- Kept 4 differential drills; their differential entities are supported by the fused RadPrimer/STATdx source package or by source-described imaging patterns.
- Kept mechanism, boards-trap, epidemiology, ultrasound, CT/MRI, management, palpable-area scanning, rete testis, and size-range cards after provenance cleanup because their facts are source-supported in the fused master source package.

## Core Evidence Handling

`metadata.json` contains a generated download sentinel claiming Core validation, but that is not auditable source evidence. Per the audit instructions and user request, Core-specific claims were treated as unverified unless present in `core_evidence.txt` or `source_package.txt`. No Core-specific cards were retained as Core-derived.

## Remaining Uncertainties

- The bundle did not include actual image binaries in the queue folder, so this audit used the source-qualified captions, metadata image registry, and generated image references rather than direct visual inspection.
- The source package appears to contain a fused RadPrimer/STATdx master-source synthesis rather than raw full article text. Corrections were therefore limited to facts auditable within the exported bundle.
