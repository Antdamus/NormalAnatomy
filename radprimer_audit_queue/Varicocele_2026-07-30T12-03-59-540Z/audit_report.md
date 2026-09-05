# Card Audit Report: Varicocele

Bundle: C:\Users\josem.000\NormalAnatomy\radprimer_audit_queue\Varicocele_2026-07-30T12-03-59-540Z
Created: 2026-07-30T12:06:56Z

## Files reviewed
- source_package.txt
- generated_cards.tsv
- metadata.json
- audit_instructions.md
- core_evidence.txt

## Major finding
- `generated_cards.tsv` was not a generated card deck. It contained an 11-column image-download/image-registry table with 22 image rows plus a header, while the requested card schema is 22 columns per card row.
- Because the staged card file was bookkeeping/image metadata, all generated rows were removed from the corrected card output and replaced with source-supported card rows using the note-type field order specified in `source_package.txt`.

## Core evidence handling
- `core_evidence.txt` reports `CORE_EVIDENCE_STATUS: NOT_PROVIDED`.
- `metadata.json` contained a download sentinel claiming Core validation was used, but no auditable Core text was present in `core_evidence.txt` or the visible fused source package.
- The corrected cards therefore omit Core-specific claims and label the clinical context as RadPrimer + STATdx master source with Core evidence not provided.

## Corrected deck summary
- Corrected cards written: 49
- TSV schema: 22 columns, original field order preserved, no header row in `corrected_cards.tsv`.
- Anki import file created with directives for `core_rad_notetype_v2` and `Corebook::Ultrasound::Scrotum Basic::Varicocele`.
- Final Tags column preserved and left blank for every row.

## Content changes
- Added source-supported cards for definition, diagnostic ultrasound clue, 3 mm threshold, Valsalva maneuver, Doppler reflux direction/duration, laterality, infertility relevance, clinical grading, MRI appearance, venography, mechanisms, secondary causes, treatment pivots, and common pitfalls.
- Added differential cards for hernia, epididymitis, tubular ectasia of rete testis/intratesticular varicocele, cystic mimics, torsion, and rare vascular lesions where supported by the source package.
- Added one image-recognition card for each selected primary image, preserving RadPrimer/STATdx labels and the atomic STATdx clusters 1-2, 7-9, 10-12, and 14-16.
- No outside clarification or external literature was added.

## Validation
- `corrected_cards.tsv` has 49 physical rows and every row has exactly 22 tab-separated fields.
- `corrected_cards_anki_import.tsv` has the required four Anki import directives followed by the same corrected rows and no field header row.
- Non-UNKNOWN image rows keep the Question field blank.
- Clinical_Context is populated for every row.
