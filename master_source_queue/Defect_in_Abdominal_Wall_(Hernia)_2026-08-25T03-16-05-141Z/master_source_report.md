# Master Source Synthesis Report

## Bundle
- Imported bundle: C:\Users\josem.000\NormalAnatomy\master_source_queue\Defect_in_Abdominal_Wall_(Hernia)_2026-08-25T03-16-05-141Z
- Article: Defect in Abdominal Wall (Hernia)
- Created: 2026-08-25T03:21:58Z
- Canonical hierarchy: All Categories > Basic > Gastrointestinal > Peritoneum, Mesentery, and Abdominal Wall > Defect in Abdominal Wall (Hernia)
- Canonical deck path: Corebook::GI::Peritoneum, Mesentery, and Abdominal Wall::Defect in Abdominal Wall (Hernia)

## Source Comparison
- RadPrimer was used as the canonical backbone because it supplies the canonical hierarchy and formal differential structure.
- STATdx was used as supplemental depth for duplicate coverage confirmation plus abdominal wall abscess and abdominal wall metastasis mimic examples.
- STATdx breadcrumbs were not used for routing.

## Image Coverage Gate
- RadPrimer images inspected: 14.
- STATdx images inspected: 16.
- Actual staged image_evidence files were visually reviewed via the bundle image evidence, with stable source image IDs used for exact duplicate calls.
- STATdx fully covers the RadPrimer image set: all 14 RadPrimer images have exact STATdx duplicate renderings by the same stable source image ID and visual match.
- Selected primary images: RP-01, RP-02, RP-03, RP-04, RP-05, RP-06, RP-07, RP-08, RP-09, RP-10, RP-11, RP-12, RP-13, RP-14, SDX-10, SDX-11.
- Archive-optional duplicate images: SDX-01, SDX-02, SDX-03, SDX-04, SDX-05, SDX-06, SDX-07, SDX-08, SDX-09, SDX-12, SDX-13, SDX-14, SDX-15, SDX-16.

## RadPrimer Coverage By STATdx
- RadPrimer image 1: exactDuplicate; related STATdx images: STATdx image 1. STATdx contains the same stable source image ID and staged image_evidence visual review confirms the same image/slice rendering; the RadPrimer image remains selected as the canonical primary image and the matching STATdx rendering is archive-optional.
- RadPrimer image 2: exactDuplicate; related STATdx images: STATdx image 2. STATdx contains the same stable source image ID and staged image_evidence visual review confirms the same image/slice rendering; the RadPrimer image remains selected as the canonical primary image and the matching STATdx rendering is archive-optional.
- RadPrimer image 3: exactDuplicate; related STATdx images: STATdx image 3. STATdx contains the same stable source image ID and staged image_evidence visual review confirms the same image/slice rendering; the RadPrimer image remains selected as the canonical primary image and the matching STATdx rendering is archive-optional.
- RadPrimer image 4: exactDuplicate; related STATdx images: STATdx image 4. STATdx contains the same stable source image ID and staged image_evidence visual review confirms the same image/slice rendering; the RadPrimer image remains selected as the canonical primary image and the matching STATdx rendering is archive-optional.
- RadPrimer image 5: exactDuplicate; related STATdx images: STATdx image 5. STATdx contains the same stable source image ID and staged image_evidence visual review confirms the same image/slice rendering; the RadPrimer image remains selected as the canonical primary image and the matching STATdx rendering is archive-optional.
- RadPrimer image 6: exactDuplicate; related STATdx images: STATdx image 6. STATdx contains the same stable source image ID and staged image_evidence visual review confirms the same image/slice rendering; the RadPrimer image remains selected as the canonical primary image and the matching STATdx rendering is archive-optional.
- RadPrimer image 7: exactDuplicate; related STATdx images: STATdx image 7. STATdx contains the same stable source image ID and staged image_evidence visual review confirms the same image/slice rendering; the RadPrimer image remains selected as the canonical primary image and the matching STATdx rendering is archive-optional.
- RadPrimer image 8: exactDuplicate; related STATdx images: STATdx image 8. STATdx contains the same stable source image ID and staged image_evidence visual review confirms the same image/slice rendering; the RadPrimer image remains selected as the canonical primary image and the matching STATdx rendering is archive-optional.
- RadPrimer image 9: exactDuplicate; related STATdx images: STATdx image 9. STATdx contains the same stable source image ID and staged image_evidence visual review confirms the same image/slice rendering; the RadPrimer image remains selected as the canonical primary image and the matching STATdx rendering is archive-optional.
- RadPrimer image 10: exactDuplicate; related STATdx images: STATdx image 12. STATdx contains the same stable source image ID and staged image_evidence visual review confirms the same image/slice rendering; the RadPrimer image remains selected as the canonical primary image and the matching STATdx rendering is archive-optional.
- RadPrimer image 11: exactDuplicate; related STATdx images: STATdx image 13. STATdx contains the same stable source image ID and staged image_evidence visual review confirms the same image/slice rendering; the RadPrimer image remains selected as the canonical primary image and the matching STATdx rendering is archive-optional.
- RadPrimer image 12: exactDuplicate; related STATdx images: STATdx image 14. STATdx contains the same stable source image ID and staged image_evidence visual review confirms the same image/slice rendering; the RadPrimer image remains selected as the canonical primary image and the matching STATdx rendering is archive-optional.
- RadPrimer image 13: exactDuplicate; related STATdx images: STATdx image 15. STATdx contains the same stable source image ID and staged image_evidence visual review confirms the same image/slice rendering; the RadPrimer image remains selected as the canonical primary image and the matching STATdx rendering is archive-optional.
- RadPrimer image 14: exactDuplicate; related STATdx images: STATdx image 16. STATdx contains the same stable source image ID and staged image_evidence visual review confirms the same image/slice rendering; the RadPrimer image remains selected as the canonical primary image and the matching STATdx rendering is archive-optional.

## Supplemental STATdx Images Kept
- STATdx image 10: abdominal wall abscess adjacent to incisional hernia repair; selected as a subcutaneous abscess/repair complication mimic.
- STATdx image 11: partly calcified abdominal wall mass adjacent to colostomy from metastatic colonic carcinoma; selected as an abdominal wall neoplasm/metastasis mimic.

## Case Cluster Guardrails
- No source case cluster was intentionally split.
- RadPrimer images 13 and 14 are a same-patient MR/US spermatic cord liposarcoma mimic cluster and remain selected together.
- Only STATdx exact duplicate renderings were archived; RadPrimer canonical images and STATdx-only mimic examples remain selected.

## Output Files
- master_source_package.txt
- master_source_manifest.json
- image_registry.json
- master_source_import.json
- master_source_report.md
- _codex_master_source_done.txt
