# RadPrimer Card Audit - Liver Mass With Central or Eccentric Scar

## Inputs Audited
- `source_package.txt`
- `generated_cards.tsv`
- `metadata.json`
- `audit_instructions.md`
- `core_evidence.txt`

## Core Evidence Handling
`core_evidence.txt` was captured correctly in this bundle as `CORE_EVIDENCE_STATUS: USED`. The metadata reports `provided: true` and `recoveredFromUnwrappedReport: false`, so this run no longer has the previous Core-capture failure.

## Output Summary
- Original TSV rows: 55
- Corrected TSV rows: 54
- Removed rows: Q00000000028
- Output columns per data row: 22
- Anki import file written: yes

## Main Corrections
- Added explicit `Image 1/1` front labels to the four single-image UNKNOWN cards so every image card has visible scroll/position labeling.
- Preserved all 24 selected STATdx images across the 11 UNKNOWN cards.
- Preserved exact source captions in `Image_Annotated` stack captions and `Original_Caption`.
- Preserved complete image references in separate `imgRef` blocks and back-side reference text.
- Removed one standalone differential-tier High-Yield card because it duplicated the UNKNOWN-card differential role rather than testing a specific imaging discriminator.
- Rewrote learner-facing questions/answers that used audit/provenance wording such as `source-supported`, `Core description`, `Core-listed`, and `fused source`.
- Revised the chronic Budd-Chiari morphology card to keep it focused on chronic outflow-obstruction morphology and regenerative nodules.

## Quality Assessment
This generation is substantially better than the prior failed versions: it has auditable Core evidence, complete image coverage, useful modality-specific High-Yield cards, report-pivot cards, and no metadata/bookkeeping cards. The remaining systematic issue was wording: the model copied internal audit language into visible card text. The prompt should explicitly ban learner-facing provenance phrases while still requiring source support internally.

## Prompt Adjustment Recommended
Implemented after this audit:
- Require `Image 1/1` labels for single-image UNKNOWN cards.
- Ban provenance/audit wording from learner-facing card fronts and answers.
- Keep source/provenance wording only in summary/source-basis, `core_evidence.txt`, audit reports, and reference fields.

## Post-Audit Repair Addendum
- Replaced all sequential `Q000000000xx` Clinical_Context IDs with random-looking 12-character alphanumeric IDs.
- Verified `corrected_cards.tsv` remains 54 rows x 22 columns after ID repair.
- Rebuilt `corrected_cards_anki_import.tsv` from the repaired TSV.
- Confirmed the installed `core_rad_notetype_v2` Differential Drill template is currently gated by `Differentials`; this causes unwanted Differential Drill sibling cards from UNKNOWN notes. The note type should be patched so Differential Drill is gated by `Differential_Q`, and UNKNOWN backs should render `Differentials`.
- Copied 48 existing liver-scar image files into Anki media under the hash-style filenames referenced by this TSV, repairing the broken image references for this imported batch.
