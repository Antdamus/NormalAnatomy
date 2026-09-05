# RadPrimer Card Audit Report: Spigelian Hernia

Created: 2026-09-03T02:21:43Z

## Files Reviewed
- `source_package.txt`
- `generated_cards.tsv`
- `metadata.json`
- `audit_instructions.md`
- `core_evidence.txt`

## Summary
- Imported the latest complete audit bundle and confirmed `_latest_radprimer_audit_bundle.txt` points to this Spigelian Hernia folder.
- Preserved the 22-column TSV schema and original column order.
- Wrote `corrected_cards.tsv` as a no-header TSV and `corrected_cards_anki_import.tsv` with Anki import directives for `Corebook::GI::Peritoneum, Mesentery, and Abdominal Wall::Spigelian Hernia`.
- Original generated rows: 23.
- Corrected rows: 28.

## Corrections Made
- Removed unsupported "Core + RadPrimer + STATdx synthesis" source-basis language from every card summary because `core_evidence.txt` is `NOT_PROVIDED` and the source package explicitly says not to fabricate Core support.
- Removed the unsupported gubernacular-development explanation from the pediatric association card. The corrected card keeps the source-supported association with ipsilateral undescended testis and other anterior abdominal wall defects.
- Split the overloaded case-bundled differential drill into a focused Spigelian-vs-ventral/incisional discriminator.
- Added focused, source-supported differential discriminator cards for umbilical hernia, laparoscopy-port hernia, and mass mimics including rectus sheath hematoma/lipoma.
- Added source-supported high-yield cards for hernia contents and adult risk factors.
- Preserved selected image usage and did not introduce archived duplicate image files.
- Repaired image HTML so card references now use the actual filenames listed in `metadata.json` `downloadFiles`, and converted inline arrow-icon image tags to text markers to avoid broken mini-images.

## Source Support Notes
- Core-specific claims were treated as unverified because `core_evidence.txt` says `NOT_PROVIDED`.
- Pediatric undescended testis, omphalocele, bladder exstrophy, and prune belly associations are retained because they are present in `source_package.txt`.
- STATdx-supported supplemental details retained include lipoma/mass mimics, MRI modality variant, unusual appendix/epiploic appendagitis contents, and low-recurrence/repair context in the shared summary.

## Validation
- `corrected_cards.tsv` rows: 28.
- Every corrected TSV row has 22 columns.
- `corrected_cards_anki_import.tsv` contains only the required four import directives followed by the same corrected rows, with no field header row.
- Card image references match the `metadata.json` download filename list.
