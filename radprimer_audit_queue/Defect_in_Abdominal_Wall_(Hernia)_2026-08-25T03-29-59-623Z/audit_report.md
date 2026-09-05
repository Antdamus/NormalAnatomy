# Card Audit Report: Defect in Abdominal Wall (Hernia)

## Summary
- Imported audit bundle: C:\Users\josem.000\NormalAnatomy\radprimer_audit_queue\Defect_in_Abdominal_Wall_(Hernia)_2026-08-25T03-29-59-623Z
- Reviewed `source_package.txt`, `generated_cards.tsv`, `metadata.json`, `audit_instructions.md`, and `core_evidence.txt`.
- Preserved the 22-column TSV schema and original column order.
- Original generated rows: 33.
- Corrected rows: 47.

## Major Changes
- Kept the valid image diagnosis set for the 14 RadPrimer primary images plus STATdx images 10 and 11.
- Kept the same-patient spermatic-cord liposarcoma MR/US cluster together.
- Added concise source attribution to answer fields where the note type had a visible answer field.
- Replaced two overloaded imaging/systematic-assessment cards with separate CT-first-line, dynamic-US, and complication-assessment cards.
- Added high-yield source-supported cards for ventral subtypes, femoral risk, spigelian location/risk, lumbar hernia, umbilical associations, obturator localization, traumatic hernia, sciatic hernia, perineal hernia, parastomal/repair-site mimics, spermatic-cord tumor mimic, and interparietal hernia.
- Corrected direct/indirect inguinal wording to match auditable Core evidence: indirect is lateral to inferior epigastric vessels; direct is medial through Hesselbach triangle.
- Corrected femoral-vs-inguinal localization wording to emphasize femoral canal/below inguinal ligament, medial femoral-vein relationship, and femoral-vein compression.
- Removed a text encoding artifact in the Richter hernia mechanism card.

## Core Evidence Handling
- Core-specific claims were retained only where supported by `core_evidence.txt`: external hernia/groin epidemiology, direct/indirect inguinal vessel relationship, incarceration, strangulation, Richter hernia, obturator localization, femoral canal/vein compression, and spigelian semilunar-line location.
- Lumbar, traumatic, umbilical, sciatic, perineal, fistula, liposarcoma, abscess, and abdominal-wall metastasis details were treated as RadPrimer/STATdx-derived rather than Core-derived.

## Remaining Uncertainties
- No additional Core pages beyond the captured `core_evidence.txt` were used.
- The corrected file keeps the extension's sparse 22-column card layout; no field reordering or header row was added.

## Outputs
- `corrected_cards.tsv`
- `corrected_cards_anki_import.tsv`
- `_codex_audit_done.txt`

## Media Reference Repair
- Rechecked image references after import: the generated/corrected cards used short hash filenames such as `RP-01_RadPrimer_plain_3583367b.jpg`, but `metadata.json` and the downloaded files in `Downloads\RadPrimer` use long source-qualified filenames such as `RP-01_RadPrimer_plain_Defect_in_Abdominal_Wall_(Hernia)1.jpg`.
- Updated `corrected_cards.tsv` and `corrected_cards_anki_import.tsv` so all 32 image references match `metadata.json` download filenames.
