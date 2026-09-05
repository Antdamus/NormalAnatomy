# Master Source Report: Hemorrhagic Ovarian Cyst

Imported bundle: C:\Users\josem.000\NormalAnatomy\master_source_queue\Hemorrhagic_Ovarian_Cyst_2026-08-07T02-20-42-439Z

## Source synthesis
- RadPrimer is present and was used as the canonical hierarchy/backbone.
- `master_source_manifest.json` uses `metadata.json` `canonicalHierarchy` exactly: All Categories > Basic > Ultrasound > Female Pelvis Basic > Hemorrhagic Cyst
- Canonical deck path: `Corebook::Ultrasound::Female Pelvis Basic::Hemorrhagic Cyst::Hemorrhagic Ovarian Cyst`
- STATdx was used as supplemental depth for MR signal variability, CT rupture/sentinel-clot findings, expanded differential detail, and additional image-recognition examples.
- No Core Radiology source text was present in the bundle, so the package does not claim Core support.

## Image evidence review
- Inspected staged image files in `image_evidence/` using `all_image_evidence_contact_sheet.jpg` and `candidate_pair_contact_sheet.jpg`.
- RadPrimer images reviewed: 10.
- STATdx images reviewed: 24.
- Exact duplicates archived by default: 1.
- Selected primary images: 33.

## RadPrimer image coverage gate
| RadPrimer image | Classification | STATdx candidate(s) | Decision |
| --- | --- | --- | --- |
| RP-01 | nearDuplicate | SDX-10, SDX-12, SDX-23 | Keep primary |
| RP-02 | nearDuplicate | SDX-02, SDX-19 | Keep primary |
| RP-03 | conceptualReplacement | SDX-20 | Keep primary |
| RP-04 | notCovered | None | Keep primary |
| RP-05 | nearDuplicate | SDX-06 | Keep primary |
| RP-06 | notCovered | None | Keep primary |
| RP-07 | notCovered | None | Keep primary |
| RP-08 | conceptualReplacement | SDX-21, SDX-22 | Keep primary |
| RP-09 | conceptualReplacement | SDX-21, SDX-22 | Keep primary |
| RP-10 | exactDuplicate | SDX-17 | Keep RadPrimer primary; archive STATdx duplicate |

## Archive rationale
- `SDX-17` is archived because it is the same visual axial T1 fat-suppressed MR image as `RP-10`; the RadPrimer copy remains canonical.
- No other STATdx image was archived. Near duplicates, same-disease examples, conceptual replacements, and modality variants were kept as primary recognition reinforcement.

## Cluster handling
- Kept STATdx images 7-10 together as a same-patient MR/US cluster.
- Kept STATdx images 13-16 together as a same-patient MR/US fluid-fluid and retracting-clot cluster.
- Kept STATdx images 19-20 together as a same-patient rupture/hemoperitoneum cluster.
- Kept STATdx image 18 with RadPrimer image 10 replacing archived STATdx image 17, preserving the T1/T2 MR teaching pair while avoiding duplicate download.
- Kept RadPrimer images 4-5 together as a surgical rupture/hemorrhagic corpus luteum teaching cluster.

## Output files
- `master_source_package.txt`
- `master_source_manifest.json`
- `image_registry.json`
- `master_source_import.json`
- `master_source_report.md`
- `_codex_master_source_done.txt`
