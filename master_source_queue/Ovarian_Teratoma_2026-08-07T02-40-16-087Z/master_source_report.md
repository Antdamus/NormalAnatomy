# Master Source Report: Ovarian Teratoma

Imported bundle: C:\Users\josem.000\NormalAnatomy\master_source_queue\Ovarian_Teratoma_2026-08-07T02-40-16-087Z

## Source synthesis
- RadPrimer is present and was used as the canonical hierarchy/backbone.
- `master_source_manifest.json` uses `metadata.json` `canonicalHierarchy` exactly: All Categories > Basic > Ultrasound > Female Pelvis Basic > Ovarian Teratoma
- Canonical deck path: `Corebook::Ultrasound::Female Pelvis Basic::Ovarian Teratoma`
- STATdx was used as supplemental depth for additional image examples, CT/MR variants, torsion/inflammatory complications, bilateral disease, and gross pathology correlation.
- No Core Radiology source text was present in the bundle, so the package does not claim Core support.

## Image evidence review
- Inspected staged image files in `image_evidence/` using `all_image_evidence_contact_sheet.jpg` and `candidate_pair_contact_sheet.jpg`.
- RadPrimer images reviewed: 10.
- STATdx images reviewed: 29.
- Exact duplicates archived by default: 10.
- Selected primary images: 29.

## RadPrimer image coverage gate
| RadPrimer image | Classification | STATdx candidate(s) | Decision |
| --- | --- | --- | --- |
| RP-01 | exactDuplicate | SDX-01 | Keep RadPrimer primary; archive STATdx duplicate |
| RP-02 | exactDuplicate | SDX-02 | Keep RadPrimer primary; archive STATdx duplicate |
| RP-03 | exactDuplicate | SDX-03 | Keep RadPrimer primary; archive STATdx duplicate |
| RP-04 | exactDuplicate | SDX-04 | Keep RadPrimer primary; archive STATdx duplicate |
| RP-05 | exactDuplicate | SDX-05 | Keep RadPrimer primary; archive STATdx duplicate |
| RP-06 | exactDuplicate | SDX-06 | Keep RadPrimer primary; archive STATdx duplicate |
| RP-07 | exactDuplicate | SDX-07 | Keep RadPrimer primary; archive STATdx duplicate |
| RP-08 | exactDuplicate | SDX-08 | Keep RadPrimer primary; archive STATdx duplicate |
| RP-09 | exactDuplicate | SDX-09 | Keep RadPrimer primary; archive STATdx duplicate |
| RP-10 | exactDuplicate | SDX-10 | Keep RadPrimer primary; archive STATdx duplicate |

## Archive rationale
- `SDX-01` through `SDX-10` are archived because they are exact duplicate/resolution variants of `RP-01` through `RP-10`.
- Exact duplicate decisions are supported by same stable source image IDs and direct visual inspection of staged evidence files. File hashes differ because the RadPrimer evidence files are 900x900 and the STATdx evidence files are 1000x1000 source renderings.
- No STATdx image from 11-29 was archived. They remain selected as additional cases, modality variants, complication examples, same-patient companion images, or gross pathology correlations.

## Cluster handling
- Kept RadPrimer images 8-10 together as the ultrasound-to-MR characterization cluster.
- Kept STATdx images 13-14 together as CT fat/calcium and complex-architecture examples.
- Kept STATdx images 19-20 together as corresponding transabdominal/transvaginal ultrasound views.
- Kept STATdx images 21-23 together as a same-patient MR sequence cluster.
- Kept STATdx images 25-26 together as a same-patient CT bilateral dermoid cluster.
- The only intentional split is archiving STATdx images 1-10 while retaining their RadPrimer equivalents; this is safe because each archived image has an exact retained canonical duplicate.

## Output files
- `master_source_package.txt`
- `master_source_manifest.json`
- `image_registry.json`
- `master_source_import.json`
- `master_source_report.md`
- `_codex_master_source_done.txt`
