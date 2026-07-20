# Master Source Synthesis Report: Bone Neoplasms

Bundle: `Bone_Neoplasms_2026-07-14T00-54-42-728Z`
Created: 2026-07-14T01:01:41Z

## Inputs Compared

- RadPrimer_source_package.txt
- STATdx_source_package.txt
- RadPrimer_metadata.json
- STATdx_metadata.json
- metadata.json
- master_source_request.md
- image_evidence_manifest.json and 44 downloaded image_evidence files

## Canonical Routing

Used metadata.json canonicalHierarchy exactly:
`All Categories > Intermediate > Nuclear Medicine > Oncologic Intermediate > Bone Neoplasms`

Canonical deck path:
`Corebook::Intermediate::Nuclear Medicine::Oncologic Intermediate::Bone Neoplasms`

STATdx breadcrumbs were not used for routing.

## Image Gate

- RadPrimer images: 22
- STATdx images: 22
- Exact duplicate RadPrimer images archived: 19
- Conceptual replacement RadPrimer images kept primary: 2
- Not-covered RadPrimer images kept primary: 1
- Near duplicates: 0

The exact-duplicate decisions were based on visual inspection of actual staged evidence files. Cross-source binary hashes differed, so caption similarity alone was not used as proof.

## Primary Download Set

Selected primary image IDs:
SDX-01, SDX-02, SDX-03, SDX-04, SDX-05, SDX-06, SDX-07, SDX-08, SDX-09, SDX-10, SDX-11, SDX-12, SDX-13, SDX-14, SDX-15, SDX-16, SDX-17, SDX-18, SDX-19, SDX-20, SDX-21, SDX-22, RP-03, RP-04, RP-21

Archive-optional IDs:
RP-01, RP-02, RP-05, RP-06, RP-07, RP-08, RP-09, RP-10, RP-11, RP-12, RP-13, RP-14, RP-15, RP-16, RP-17, RP-18, RP-19, RP-20, RP-22

## Case Cluster Splits

No source case cluster was intentionally split. The scapular osteosarcoma localization cluster is kept as RadPrimer images 3 and 4 plus STATdx image 22 because STATdx image 22 is a composite rather than a same standalone duplicate. Same-patient and multimodality pairs are otherwise replaced only as whole equivalent pairs when exact visual counterparts exist.

## Output Files

- master_source_package.txt
- master_source_manifest.json
- image_registry.json
- master_source_import.json
- master_source_report.md
- _codex_master_source_done.txt
