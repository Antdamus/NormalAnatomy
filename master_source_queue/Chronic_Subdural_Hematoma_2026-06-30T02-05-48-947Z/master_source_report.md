# Master Source Report: Chronic Subdural Hematoma
Imported bundle: `C:\Users\josem.000\NormalAnatomy\master_source_queue\Chronic_Subdural_Hematoma_2026-06-30T02-05-48-947Z`
## Inputs Compared
- RadPrimer_source_package.txt
- STATdx_source_package.txt
- RadPrimer_metadata.json
- STATdx_metadata.json
- metadata.json
- master_source_request.md
- image_evidence_manifest.json and image_evidence/ actual JPG files
## Canonical Routing
The manifest canonicalHierarchy was copied exactly from metadata.json: ["All Categories", "Basic", "Neuroradiology", "Brain", "Primary Effects of CNS Trauma", "Chronic Subdural Hematoma"]

Canonical deck path: `Corebook::Neuro::Brain::Primary Effects of CNS Trauma::Chronic Subdural Hematoma`
## Image Coverage Gate
STATdx does not fully cover the RadPrimer image set: 20 RadPrimer images have same-image STATdx exports, RadPrimer image 10 has only conceptual calcified/ossified replacements, and RadPrimer image 15 is not covered. Exact duplicate calls were based on actual image_evidence files plus visual/perceptual-hash inspection, not captions alone.
| RadPrimer | Status | STATdx match | Action |
|---|---|---|---|
| RP-01 | exactDuplicate | SDX-01 | keep RadPrimer primary; archive matching STATdx duplicate |
| RP-02 | exactDuplicate | SDX-02 | keep RadPrimer primary; archive matching STATdx duplicate |
| RP-03 | exactDuplicate | SDX-03 | keep RadPrimer primary; archive matching STATdx duplicate |
| RP-04 | exactDuplicate | SDX-04 | keep RadPrimer primary; archive matching STATdx duplicate |
| RP-05 | exactDuplicate | SDX-19 | keep RadPrimer primary; archive matching STATdx duplicate |
| RP-06 | exactDuplicate | SDX-20 | keep RadPrimer primary; archive matching STATdx duplicate |
| RP-07 | exactDuplicate | SDX-21 | keep RadPrimer primary; archive matching STATdx duplicate |
| RP-08 | exactDuplicate | SDX-22 | keep RadPrimer primary; archive matching STATdx duplicate |
| RP-09 | exactDuplicate | SDX-17 | keep RadPrimer primary; archive matching STATdx duplicate |
| RP-10 | conceptualReplacement | SDX-18, SDX-36 | keep RadPrimer primary |
| RP-11 | exactDuplicate | SDX-13 | keep RadPrimer primary; archive matching STATdx duplicate |
| RP-12 | exactDuplicate | SDX-11 | keep RadPrimer primary; archive matching STATdx duplicate |
| RP-13 | exactDuplicate | SDX-12 | keep RadPrimer primary; archive matching STATdx duplicate |
| RP-14 | exactDuplicate | SDX-14 | keep RadPrimer primary; archive matching STATdx duplicate |
| RP-15 | notCovered | - | keep RadPrimer primary |
| RP-16 | exactDuplicate | SDX-15 | keep RadPrimer primary; archive matching STATdx duplicate |
| RP-17 | exactDuplicate | SDX-30 | keep RadPrimer primary; archive matching STATdx duplicate |
| RP-18 | exactDuplicate | SDX-31 | keep RadPrimer primary; archive matching STATdx duplicate |
| RP-19 | exactDuplicate | SDX-32 | keep RadPrimer primary; archive matching STATdx duplicate |
| RP-20 | exactDuplicate | SDX-33 | keep RadPrimer primary; archive matching STATdx duplicate |
| RP-21 | exactDuplicate | SDX-28 | keep RadPrimer primary; archive matching STATdx duplicate |
| RP-22 | exactDuplicate | SDX-29 | keep RadPrimer primary; archive matching STATdx duplicate |

## Image Selection
Selected primary images: 38 (22 RadPrimer backbone + 16 STATdx supplemental).

Archive optional duplicates: 20 STATdx same-image exports.

No source case cluster was intentionally split. RP-15 remains selected to keep the MMA embolization follow-up sequence intact because STATdx does not include the 6-week timepoint.

## STATdx Supplemental Additions
- Delayed contrast diffusion and follow-up clearing/septation case.
- Expanded MR sequence reinforcement for loculated chronic right SDH.
- Coiled middle meningeal artery example after prior bilateral embolization.
- Additional calcified/ossified chronic SDH examples.
- Dural thickening/enhancement example.
- Additional mixed SDH CT/MR examples and recurrence risk factors.

## Outputs Written
- master_source_package.txt
- master_source_manifest.json
- image_registry.json
- master_source_import.json
- master_source_report.md
- _codex_master_source_done.txt
