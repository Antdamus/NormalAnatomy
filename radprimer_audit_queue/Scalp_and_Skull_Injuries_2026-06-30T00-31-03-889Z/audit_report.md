# Card Audit Report - Scalp and Skull Injuries

Bundle: `C:\Users\josem.000\NormalAnatomy\radprimer_audit_queue\Scalp_and_Skull_Injuries_2026-06-30T00-31-03-889Z`
Completed: 2026-06-30T00:33:17.498127+00:00

## Inputs reviewed

- `source_package.txt`
- `generated_cards.tsv`
- `metadata.json`
- `audit_instructions.md`
- `core_evidence.txt`

## Audit outcome

- Original generated TSV rows: 36
- Corrected TSV rows: 39
- TSV schema: preserved at 22 columns per row
- Anki import file: written

## Major corrections

1. Rewrote the shared summary field to clarify source attribution. RadPrimer + STATdx provide the main scalp/skull injury article and image support; Core evidence is captured but limited to pediatric abuse fracture specificity, bone scintigraphy insensitivity for skull fractures, and CT-versus-MRI fracture-imaging context.
2. Kept the generated image-recognition cards because the diagnoses and reasoning match the selected source captions and master-source image registry.
3. Split the overloaded skull-fracture morphology card into separate linear, depressed, elevated, and diastatic fracture cards.
4. Preserved Core-supported cards for isolated linear fracture nonspecificity, complex fracture abuse suspicion, and bone scintigraphy limitation.
5. No outside literature was added.

## Remaining limitations

- Core did not provide a dedicated Scalp and Skull Injuries article matching the RadPrimer/STATdx package, so Core language should remain limited to the facts documented in `core_evidence.txt`.
- Management/complication details were kept only where supported by the fused RadPrimer + STATdx source package or the captured Core evidence.

## Files written

- `corrected_cards.tsv`
- `corrected_cards_anki_import.tsv`
- `audit_report.md`
- `_codex_audit_done.txt`

## Media validation

Corrected TSV image references match the filenames listed in metadata.json downloadFiles. At validation time, the Scalp_and_Skull_Injuries image files were not present in Downloads\RadPrimer or Anki collection.media; stage/copy the topic images before importing if image rendering is needed.
