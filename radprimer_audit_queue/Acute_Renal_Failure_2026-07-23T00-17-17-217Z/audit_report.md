# Acute Renal Failure RadPrimer Card Audit

## Source Boundary
- Active bundle: `radprimer_audit_queue\Acute_Renal_Failure_2026-07-23T00-17-17-217Z`
- Source files reviewed: `metadata.json`, `audit_instructions.md`, `core_evidence.txt`, `source_package.txt`, and `generated_cards.tsv`.
- Core evidence status: `NOT_PROVIDED`. The generated sentinel claimed Core validation, but the explicit evidence ledger contains no auditable Core facts. I therefore treated the deck as RadPrimer-only unless a fact appeared in the article/captions.
- Anki target deck: `Corebook::Nuclear Medicine::Genitourinary Basic::Acute Renal Failure`

## Output Summary
- Original deck: 45 rows, 22 columns.
- Corrected deck: 53 rows, 22 columns.
- Removed: 1 unsupported row.
- Added: 9 source-supported high-yield rows.
- Wrote `corrected_cards.tsv`, `corrected_cards_anki_import.tsv`, `_codex_audit_done.txt`, and this report.

## Major Changes
- Replaced the shared summary field on every card with a RadPrimer-only summary and removed uncaptured Core page references.
- Removed the bilateral persistent nephrogram CT card because that CT definition/etiology list was not present in the captured RadPrimer article, selected captions, or Core ledger.
- Relabeled model-inferred image differentials so they no longer imply source-listed or Core-supported differentials.
- Preserved the strong selected-image UNKNOWN cards for ATN, renal vein thrombosis, aortic occlusion, renal artery thromboembolism, bilateral renal infarction, urinoma, normal MAG3, captopril RAS/RVHT, chronic UPJ obstruction, acute obstruction, and rhabdomyolysis.
- Added missing article-supported cards for pyelonephritis, prerenal failure/recovery clue, CRF distinction, bladder outlet obstruction, ectopic/ptotic kidney pitfall, acquisition/processing, radiopharmaceutical QC, renal vein thrombosis causes, and postrenal obstruction causes.
- Labeled physiologic mechanism explanations as outside clarification where the article supported the imaging pattern but did not explicitly spell out the mechanism.

## Remaining Uncertainties
- Core Radiology support was not auditable from this bundle. Any future Core-backed upgrade should supply a non-empty `core_evidence.txt` with exact evidence.
- Some differential-drill distractors remain model-inferred from caption-described patterns; they are explicitly labeled as not formal RadPrimer differential lists.
