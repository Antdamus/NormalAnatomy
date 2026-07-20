# Master Source Synthesis Report: Renal Scar and Pyelonephritis

Generated: 2026-07-16T23:40:17Z
Bundle: Renal_Scar_and_Pyelonephritis_2026-07-16T23-33-14-431Z

## Import

- Imported bundle path: C:\Users\josem.000\NormalAnatomy\master_source_queue\Renal_Scar_and_Pyelonephritis_2026-07-16T23-33-14-431Z
- Latest bundle pointer: C:\Users\josem.000\NormalAnatomy\master_source_queue\_latest_master_source_bundle.txt
- Canonical hierarchy source: metadata.json canonicalHierarchy copied exactly.
- Canonical deck path: Corebook::Nuclear Medicine::Genitourinary Basic::Renal Scar and Pyelonephritis

## Source Comparison

- RadPrimer was used as the canonical hierarchy/backbone.
- STATdx was used for supplemental depth, cleaner image captions, additional differential/normal-variant examples, and preferred exact duplicate counterparts.
- No auditable Core Radiology source was present, so Core-specific support was not asserted.

## Image Gate

Actual image_evidence files were inspected through generated contact sheets before duplicate classification. Caption similarity alone was not used to classify exact duplicates.

RadPrimer coverage counts:

- exactDuplicate: 17
- nearDuplicate: 0
- conceptualReplacement: 4
- notCovered: 1

Coverage decisions:

RP-01 -> SDX-01: exactDuplicate; Same normal adult posterior DMSA renal cortical image.
RP-02 -> SDX-04: exactDuplicate; Same ROI/background DMSA analysis screenshot; numbering differs by source.
RP-03 -> SDX-03: exactDuplicate; Same 12-segment Mattoo/RIVUR reporting diagram.
RP-04 -> SDX-16; SDX-23: conceptualReplacement; Different cortical scar/pyelonephritis examples; RadPrimer image remains selected.
RP-05 -> SDX-05: exactDuplicate; Same bilateral cortical defects/high-grade reflux DMSA SPECT image.
RP-06 -> SDX-06: exactDuplicate; Same DMSA scan with pyelonephritis/scar defects.
RP-07 -> SDX-07: exactDuplicate; Same rounded cyst-related DMSA photopenia image.
RP-08 -> SDX-08: exactDuplicate; Same acute pyelonephritis DMSA SPECT cortical-defect image.
RP-09 -> SDX-09: exactDuplicate; Same hypertrophied column of Bertin 3D DMSA image.
RP-10 -> SDX-10: exactDuplicate; Same reflux hydronephrosis plus cortical scar DMSA SPECT image.
RP-11 -> SDX-11: exactDuplicate; Same transplant glucoheptonate cortical-defect scan.
RP-12 -> SDX-12: exactDuplicate; Same transplant DMSA cortical-thinning scan.
RP-13 -> none: notCovered; Coronal CECT companion explaining the DMSA defect is not present in STATdx.
RP-14 -> SDX-13: exactDuplicate; Same nonfunctioning left kidney/hydronephrosis DMSA image.
RP-15 -> SDX-15: conceptualReplacement; Both teach absent/abnormal FDG renal excretion but are different images and both remain selected.
RP-16 -> SDX-16: conceptualReplacement; Both reinforce DMSA cortical-defect recognition but are different displays/cases.
RP-17 -> SDX-17: exactDuplicate; Same CT/MAG3 renal cyst photopenia composite.
RP-18 -> SDX-18: exactDuplicate; Same CECT/MAG3 acute renal infarct composite.
RP-19 -> SDX-15; SDX-20: conceptualReplacement; Conceptual overlap in FDG excretion/renal dysfunction but different dialysis/native-kidney example.
RP-20 -> SDX-20: exactDuplicate; Same FDG PET/CT transplant uptake/PTLD image.
RP-21 -> SDX-21: exactDuplicate; Same posterior MAG3 large right cortical defect image.
RP-22 -> SDX-22: exactDuplicate; Same MR complex right renal mass/presumed RCC composite.

## Curation Result

Selected primary images (31): SDX-01, SDX-02, SDX-03, SDX-04, SDX-05, SDX-06, SDX-07, SDX-08, SDX-09, SDX-10, SDX-11, SDX-12, SDX-13, SDX-14, SDX-15, SDX-16, SDX-17, SDX-18, SDX-19, SDX-20, SDX-21, SDX-22, SDX-23, SDX-24, SDX-25, SDX-26, RP-04, RP-13, RP-15, RP-16, RP-19

Archive-optional exact duplicates (17): RP-01, RP-02, RP-03, RP-05, RP-06, RP-07, RP-08, RP-09, RP-10, RP-11, RP-12, RP-14, RP-17, RP-18, RP-20, RP-21, RP-22

All STATdx images are selected because they either replace exact RadPrimer duplicates or add supplemental examples. RadPrimer images 4, 13, 15, 16, and 19 remain selected because they are not literal duplicates and support recognition learning.

## Case Clusters

Intentional mixed-source cluster handling:

- RadPrimer images 13-14 form a same-patient hydronephrosis/nonfunctioning-kidney cluster. RadPrimer image 14 is archived only because STATdx image 13 is the same DMSA image and remains selected. RadPrimer image 13, the CT companion, remains selected with STATdx image 13, so the teaching cluster is preserved.

No source case cluster was intentionally discarded. Exact RadPrimer duplicates were archived only when the same visual counterpart remains selected from STATdx.

## Output Files

- master_source_package.txt
- master_source_manifest.json
- image_registry.json
- master_source_import.json
- master_source_report.md
- _codex_master_source_done.txt
