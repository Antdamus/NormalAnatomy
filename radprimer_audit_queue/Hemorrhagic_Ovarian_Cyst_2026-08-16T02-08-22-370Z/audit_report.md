# RadPrimer Card Audit Report: Hemorrhagic Ovarian Cyst

Bundle: `C:\Users\josem.000\NormalAnatomy\radprimer_audit_queue\Hemorrhagic_Ovarian_Cyst_2026-08-16T02-08-22-370Z`
Audit date: 2026-08-16

## Source Review

- Reviewed `source_package.txt`, `generated_cards.tsv`, `metadata.json`, `audit_instructions.md`, and `core_evidence.txt`.
- `core_evidence.txt` reports `CORE_EVIDENCE_STATUS: NOT_PROVIDED`; the fused source package also states that Core evidence was requested but not supplied.
- The generated download sentinel in `metadata.json` conflicts with the captured evidence by claiming Core validation passed. The corrected deck treats Core-specific claims as unaudited and does not use Core as a source basis.
- The auditable medical source basis is the fused RadPrimer + STATdx source package.

## Corrections Made

- Preserved the 22-column TSV schema and original column order.
- Kept 44 cards: 24 primary image-recognition cards, 3 differential drills, 1 definition card, 2 mechanism cards, 2 boards-trap cards, and 12 high-yield/definition-style cards.
- Replaced the repeated back-of-card summary on every row with a RadPrimer + STATdx-only audited summary.
- Removed unsupported Core provenance phrases, including `Core + RadPrimer + STATdx synthesis`, `full relevant Core coverage`, and `Core describes/emphasizes` wording.
- Rewrote the intracystic clot pitfall card so the discriminator is source-supported without claiming Core support.
- Kept the torsion Doppler mechanism card but explicitly labeled the dual-blood-supply explanation as outside clarification and embedded a stable NCBI Bookshelf source link in the mechanism field.
- Tightened the four-pattern ultrasound high-yield card and the solid-appearing-material Doppler card to keep one dominant retrieval target.

## Image And Card Coverage

- All 33 selected primary images are represented through the 24 image-recognition rows, respecting the source-described same-patient clusters.
- STATdx image 17 remains excluded as an archived exact duplicate of RadPrimer image 10, while STATdx image 18 remains represented as the T2 companion image.
- No metadata/bookkeeping-only cards were retained or added.

## Remaining Uncertainties

- No Core Radiology facts can be independently verified from this bundle. Any future Core-specific edits should require a bundle with direct Core excerpts or a populated `core_evidence.txt`.
- The corrected deck uses one external clarification only: the mechanism for preserved Doppler flow in torsion. It is labeled inside the card content as required.

## Output Files

- `corrected_cards.tsv`: clean 22-column corrected deck with no header row.
- `corrected_cards_anki_import.tsv`: Anki import file with required import directives for `Corebook::Ultrasound::Female Pelvis Basic::Hemorrhagic Cyst::Hemorrhagic Ovarian Cyst`.
- `_codex_audit_done.txt`: completion sentinel.
