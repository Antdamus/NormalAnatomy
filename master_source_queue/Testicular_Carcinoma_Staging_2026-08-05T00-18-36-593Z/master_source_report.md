# Master Source Report: Testicular Carcinoma Staging

## Source Decision
- RadPrimer is retained as the canonical hierarchy/backbone because metadata.json marks the RadPrimer breadcrumb as canonical.
- STATdx is retained as the staging-depth source because it provides detailed AJCC/TNM staging, nodal drainage, metastatic/risk staging, restaging, and richer multimodality examples.
- No Core Radiology evidence was supplied in the staged bundle; Core support was not invented.

## Image Coverage Gate
- Visual evidence reviewed: radprimer_contact_sheet.jpg and statdx_contact_sheet_1.jpg through statdx_contact_sheet_3.jpg, generated from image_evidence plain JPG files.
- Exact duplicates found: none.
- Archive-optional duplicate images: none.
- All 57 source images are retained in the primary teaching set.

| RadPrimer image | STATdx coverage | Classification | Decision | Rationale |
|---|---|---|---|---|
| RadPrimer image 1 | SDX-01, SDX-02, SDX-03, SDX-04 | conceptualReplacement | keep primary | RadPrimer graphic teaches mass replacement; STATdx T-stage graphics teach invasion extent rather than the same graphic. |
| RadPrimer image 2 | SDX-08, SDX-09, SDX-14, SDX-15 | nearDuplicate | keep primary | Same seminoma/solid hypoechoic vascular mass teaching need, but different ultrasound images/patients. |
| RadPrimer image 3 | SDX-08, SDX-09, SDX-33 | nearDuplicate | keep primary | Small hypoechoic vascular testicular mass concept is covered, but not by the same image. |
| RadPrimer image 4 | SDX-25, SDX-32, SDX-44 | nearDuplicate | keep primary | Cystic/calcified nonseminomatous tumor and burned-out/microlithiasis examples overlap conceptually, but images are visually distinct. |
| RadPrimer image 5 | SDX-18, SDX-26, SDX-27, SDX-30, SDX-31 | nearDuplicate | keep primary | Tunica/extratesticular invasion and mixed tumor concept overlaps, but the visual examples are different. |
| RadPrimer image 6 | SDX-14, SDX-18, SDX-20, SDX-26, SDX-27 | nearDuplicate | keep primary | Large heterogeneous mass teaching is reinforced by STATdx, but no same image/slice is present. |
| RadPrimer image 7 | SDX-20, SDX-22, SDX-26, SDX-27, SDX-44 | nearDuplicate | keep primary | Ill-defined heterogeneous invasive tumor concept is reinforced, but source images are different. |
| RadPrimer image 8 | SDX-21, SDX-23, SDX-24, SDX-34, SDX-35, SDX-42, SDX-45 | nearDuplicate | keep primary | Retroperitoneal nodal metastasis is extensively covered by STATdx; CT slices/cases are distinct. |

## Case-Cluster Splits
- No source case cluster was intentionally split. Same-patient STATdx clusters were retained as primary images and listed in sourceSelectionPlan.caseClusterGuardrails.

## Output Files
- master_source_package.txt: fused source package for later narrative/card generation.
- master_source_manifest.json: canonical hierarchy, source coverage, and curation plan.
- image_registry.json: all source images with source-qualified IDs, URLs, filenames, and visual evidence links.
- master_source_import.json: direct extension import object; packageText matches master_source_package.txt exactly.
