# Master Source Report: Colloid Cyst

Created: 2026-06-22T17:25:05Z

## Import

- Imported bundle: `C:\Users\josem.000\NormalAnatomy\master_source_queue\Colloid_Cyst_2026-06-22T17-17-47-345Z`
- Queue pointer: `master_source_queue\_latest_master_source_bundle.txt`
- Source files read: `RadPrimer_source_package.txt`, `STATdx_source_package.txt`, `RadPrimer_metadata.json`, `STATdx_metadata.json`, `metadata.json`, `master_source_request.md`

## Canonical Routing

- Canonical hierarchy was copied exactly from `metadata.json`:
  - All Categories > Basic > Neuroradiology > Brain > Introduction to Brain Neoplasms and Cysts > Colloid Cyst
- Canonical deck path: `RadprimerNormal::All Categories::Neuro::Brain::Introduction to Brain Neoplasms and Cysts::Colloid Cyst`
- STATdx breadcrumb was used only as source context, not as routing hierarchy.

## Evidence Review

- `image_evidence_manifest.json` and `image_evidence/` were present.
- Actual evidence images inspected using generated contact sheets:
  - `_codex_radprimer_contact_sheet.jpg`
  - `_codex_statdx_contact_sheet.jpg`
- SHA-256 hashes were checked for all evidence files; no RadPrimer/STATdx pair was byte-identical and source image IDs differed, so exact-duplicate calls rely on visual evidence review plus case/order/caption corroboration, not captions alone.

## RadPrimer Coverage By STATdx

| RadPrimer | Classification | STATdx coverage | Decision |
| --- | --- | --- | --- |
| RP-01 | exactDuplicate | SDX-01 | Visual evidence shows the same axial graphic/schematic in both sources; STATdx copy is retained for download while RadPrimer remains the hierarchy source. |
| RP-02 | exactDuplicate | SDX-02 | Visual evidence shows the same gross pathology photograph in both sources; source caption and courtesy note also match. |
| RP-03 | exactDuplicate | SDX-30 | Visual evidence shows the same axial NECT same-patient/same-slice example as the late STATdx duplicate; both captions describe the 65-year-old thunderclap headache case. |
| RP-04 | exactDuplicate | SDX-31 | Visual evidence shows the same sagittal T2 same-patient companion image as the late STATdx duplicate; this preserves the RP-03/RP-04 case pair through STATdx images 30-31. |
| RP-05 | exactDuplicate | SDX-05 | Visual evidence shows the same axial T1 blood-fluid-level image in the apoplexy/intracystic hemorrhage cluster. |
| RP-06 | exactDuplicate | SDX-27 | Visual evidence shows the same axial T2 blood-fluid-level image in the apoplexy/intracystic hemorrhage cluster; STATdx positions it later in the article. |
| RP-07 | notCovered |  | No STATdx evidence image is the same thin-section T2-space slice showing fornices draped around the mass. It is retained as RadPrimer-only recognition reinforcement within the apoplexy cluster. |
| RP-08 | exactDuplicate | SDX-06 | Visual evidence shows the same axial FLAIR apoplexy/inflammatory-change image; STATdx copy is retained as the primary download representative. |
| RP-09 | exactDuplicate | SDX-28 | Visual evidence shows the same axial postcontrast rim-enhancement image in the apoplexy cluster. |
| RP-10 | exactDuplicate | SDX-29 | Visual evidence shows the same coronal postcontrast rim-enhancement image in the apoplexy cluster. |


## Selection Summary

- Selected primary images: 32
- Archive optional images: 9
- RadPrimer retained: RadPrimer image 7
- STATdx retained: STATdx images 1-31
- Archive optional duplicates: RadPrimer images 1-6 and 8-10

## Cluster Split Review

No source case cluster was intentionally split. Exact duplicate substitutions keep companion context by replacing RadPrimer images 3-4 with STATdx images 30-31 and RadPrimer images 5-6/8-10 with STATdx images 5/27/6/28/29 while retaining RadPrimer image 7 as the uncovered companion image in the apoplexy cluster.

## Outputs

- `master_source_package.txt`
- `master_source_manifest.json`
- `image_registry.json`
- `master_source_import.json`
- `master_source_report.md`
- `_codex_master_source_done.txt`
