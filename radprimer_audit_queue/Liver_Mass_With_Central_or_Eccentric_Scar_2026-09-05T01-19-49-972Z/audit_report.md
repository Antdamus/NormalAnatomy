# Audit Report

Topic: Liver Mass With Central or Eccentric Scar

## Result
- Generated TSV rows reviewed: 55
- Corrected TSV rows written: 33
- Output schema: 22 columns, no header row in `corrected_cards.tsv`
- Anki import file: `corrected_cards_anki_import.tsv`

## Major Changes
- Preserved all 14 image-recognition UNKNOWN rows and kept the selected case grouping intact.
- Preserved source captions verbatim in the image/caption fields, including original wording and arrow image tags.
- Kept complete image reference names on the back of every image-containing card.
- Replaced the repeated Core-contaminated summary with a RadPrimer-only article summary because `core_evidence.txt` says `NOT_PROVIDED`.
- Removed unsupported Core-only, ultrasound, nuclear-medicine/HIDA, epidemiology, adenoma-management, and adenoma-histology-risk cards that were not auditable from `source_package.txt`.
- Retained or rewrote source-supported CT/MR scar-pattern, differential, mechanism, and report-critical cards as independent TSV rows.

## Prompt/Schema Issues Exposed
- The generator can still claim Core + RadPrimer synthesis even when the audit bundle has no auditable Core evidence block. Future audits should explicitly downgrade those claims to article-only unless Core text is present.
- The article summary field itself should not be treated as bloat merely because it is repeated; it is hidden in the user's Anki UI. It should only be corrected when it is source-contaminated, inaccurate, overcompressed, or missing key article structure.
- Source-supported modality cards worked better after the schema update, but the model still overgenerated unsupported ultrasound and nuclear-medicine cards. Future validation should block modality cards unless the article/source package explicitly contains that modality bucket.

## Remaining Uncertainties
- The audit bundle contains filenames and captions but not the actual image files, so this audit validated image references and captions against the source package rather than re-reviewing image pixels.
- Core Radiology may support some removed claims, but it was not auditable in this bundle. Those claims can be restored only if a future bundle includes captured Core evidence.
