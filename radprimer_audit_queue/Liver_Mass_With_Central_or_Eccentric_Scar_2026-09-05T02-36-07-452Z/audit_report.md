# RadPrimer Card Audit - Liver Mass With Central or Eccentric Scar

## Inputs Audited
- `source_package.txt`
- `generated_cards.tsv`
- `metadata.json`
- `audit_instructions.md`
- `core_evidence.txt`
- Supplemental user-pasted ChatGPT Core validation report attached in Codex

## Core Evidence Handling
The browser-captured bundle originally marked Core as `CLAIMED_BUT_UNSTRUCTURED`, but the user supplied the missing ChatGPT `CORE VALIDATION REPORT`. I normalized that report into `core_evidence.txt` as `CORE_EVIDENCE_STATUS: USED` with `metadata.coreEvidence.recoveredFromUnwrappedReport: true`.

## Output Summary
- Original TSV rows: 45
- Corrected TSV rows: 42
- Removed rows: 26, 30, 35
- Output columns per data row: 22
- Anki import file written: yes

## Main Corrections
- Restored Core-backed high-yield content supported by the recovered report: FNH Eovist/T2/extracellular scar behavior, FNH spoke-wheel/NM support, hemangioma blood-pool and ultrasound behavior, HCC arterial/washout/capsule/vascular invasion, adenoma chemical-shift/NM/>5 cm management pivot, fibrolamellar T1/T2-dark scar, metastasis phase/signal patterns, EHE peripheral target/capsular retraction, and Budd-Chiari regenerative-nodule context.
- Preserved all 9 primary image UNKNOWN cards and kept the image stacks atomic.
- Preserved random non-diagnostic unique IDs in `Clinical_Context`.
- Preserved source captions/readouts verbatim; no caption text was rewritten.
- Added explicit plain and annotated image filename references to the back of every image UNKNOWN card.
- Removed only unsupported generic ultrasound rows for conventional HCC, hepatic adenoma, and hepatic metastases because the recovered report did not explicitly support those sonographic appearances.
- Rewrote selected HCC, adenoma, metastasis, EHE, and hemangioma rows so their answers state a radiology pivot and avoid unsupported DWI/Doppler/pseudocapsule details.

## Residual Notes
- The source package records that direct image downloading was skipped/blocked in this fast run. The TSV preserves authoritative filenames and image tags so a normally downloaded media bundle can import correctly.
- Because the Core report was recovered after initial capture, this audit should be considered valid for card review, but future browser captures should use the exact Core evidence wrapper automatically.
