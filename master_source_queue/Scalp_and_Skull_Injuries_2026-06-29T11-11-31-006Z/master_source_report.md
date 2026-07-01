# Master Source Synthesis Report

Bundle: Scalp_and_Skull_Injuries_2026-06-29T11-11-31-006Z
Created: 2026-06-29T11:24:24Z

## Source Integrity

Status: ok

Article title: Scalp and Skull Injuries
RadPrimer source title: Scalp and Skull Injuries
STATdx source title: Scalp and Skull Injuries

The title was corrected by user instruction. The source packages, metadata, and image evidence are internally consistent for Scalp and Skull Injuries.

## Canonical Hierarchy

Copied exactly from metadata.json canonicalHierarchy:

["All Categories", "Basic", "Neuroradiology", "Brain", "Primary Effects of CNS Trauma", "Scalp and Skull Injuries"]

canonicalDeckPath: Corebook::Neuro::Brain::Primary Effects of CNS Trauma::Scalp and Skull Injuries

## Image Evidence Inspection

image_evidence_manifest.json and image_evidence/ are present. Actual staged image files were inspected for duplicate classification, and evidence hashes/dimensions are carried in image_registry.json.

RadPrimer image count: 10
STATdx image count: 26
Total evidence files: 36

## RadPrimer Coverage By STATdx

- RP-01: exactDuplicate covered by SDX-01. STATdx SDX-01 is the same visual image/screenshot/content as RP-01: same newborn skull/scalp-layer graphic. Use the STATdx copy as the selected primary representative and keep the RadPrimer copy only for audit/recovery.
- RP-02: exactDuplicate covered by SDX-02. STATdx SDX-02 is the same visual image/screenshot/content as RP-02: same newborn bone CT cephalohematoma and linear fracture image. Use the STATdx copy as the selected primary representative and keep the RadPrimer copy only for audit/recovery.
- RP-03: exactDuplicate covered by SDX-03. STATdx SDX-03 is the same visual image/screenshot/content as RP-03: same same-patient NECT cephalohematoma/epidural hematoma image. Use the STATdx copy as the selected primary representative and keep the RadPrimer copy only for audit/recovery.
- RP-04: exactDuplicate covered by SDX-04. STATdx SDX-04 is the same visual image/screenshot/content as RP-04: same infant axial NECT large subgaleal hematoma image. Use the STATdx copy as the selected primary representative and keep the RadPrimer copy only for audit/recovery.
- RP-05: exactDuplicate covered by SDX-05. STATdx SDX-05 is the same visual image/screenshot/content as RP-05: same autopsy exocranial/endocranial skull fracture photograph pair. Use the STATdx copy as the selected primary representative and keep the RadPrimer copy only for audit/recovery.
- RP-06: exactDuplicate covered by SDX-22. STATdx SDX-22 is the same visual image/screenshot/content as RP-06: same top-of-calvarium bone CT diastatic sagittal suture fracture image. Use the STATdx copy as the selected primary representative and keep the RadPrimer copy only for audit/recovery.
- RP-07: exactDuplicate covered by SDX-25. STATdx SDX-25 is the same visual image/screenshot/content as RP-07: same 3D shaded surface display of complex linear/diastatic fractures. Use the STATdx copy as the selected primary representative and keep the RadPrimer copy only for audit/recovery.
- RP-08: exactDuplicate covered by SDX-23. STATdx SDX-23 is the same visual image/screenshot/content as RP-08: same axial NECT brain/bone window depressed hammer fracture image. Use the STATdx copy as the selected primary representative and keep the RadPrimer copy only for audit/recovery.
- RP-09: exactDuplicate covered by SDX-09. STATdx SDX-09 is the same visual image/screenshot/content as RP-09: same axial NECT growing skull fracture with scalloped margins. Use the STATdx copy as the selected primary representative and keep the RadPrimer copy only for audit/recovery.
- RP-10: exactDuplicate covered by SDX-10. STATdx SDX-10 is the same visual image/screenshot/content as RP-10: same same-patient axial T2 MR lobulated CSF collection filling growing fracture. Use the STATdx copy as the selected primary representative and keep the RadPrimer copy only for audit/recovery.

## Image Selection

- selectedPrimaryImageIds: 26 images (SDX-01, SDX-02, SDX-03, SDX-04, SDX-05, SDX-06, SDX-07, SDX-08, SDX-09, SDX-10, SDX-11, SDX-12, SDX-13, SDX-14, SDX-15, SDX-16, SDX-17, SDX-18, SDX-19, SDX-20, SDX-21, SDX-22, SDX-23, SDX-24, SDX-25, SDX-26)
- archiveOptionalImageIds: 10 images (RP-01, RP-02, RP-03, RP-04, RP-05, RP-06, RP-07, RP-08, RP-09, RP-10)
- Archive rationale: every archived RadPrimer image is a true visual duplicate of a selected STATdx image in the actual staged evidence files. No image was archived based on caption similarity alone.
- STATdx supplemental images retained as recognition reinforcement/alternate examples: SDX-06, SDX-07, SDX-08, SDX-11, SDX-12, SDX-13, SDX-14, SDX-15, SDX-16, SDX-17, SDX-18, SDX-19, SDX-20, SDX-21, SDX-24, SDX-26

## Case Cluster Handling

No source case cluster was intentionally split. Selected clusters are intact:

- birthTraumaCephalohematoma: SDX-02, SDX-03; same newborn/same-patient cephalohematoma and intracranial epidural hematoma teaching pair.
- growingSkullFracture: SDX-09, SDX-10; same-patient CT/MR growing skull fracture pair.
- vacuumDeliveryCephalohematomas: SDX-11, SDX-12, SDX-13; same newborn axial/coronal/sagittal cephalohematoma cluster.
- abusiveHeadTraumaSubgaleal: SDX-14, SDX-15; same infant mixed-age subgaleal hematoma T2 cluster.
- sagittalSutureDiastasis: SDX-17, SDX-18; subgaleal hematoma, sagittal suture diastasis, and superior sagittal sinus injury cluster.
- temporalDepressedFracture: SDX-19, SDX-20; same-patient depressed temporal fracture brain/bone window companion pair.
- temporalBoneEpidural: SDX-07, SDX-08; same-patient temporal bone fracture with epidural hematoma/contrecoup SAH companion pair.

## Outputs Written

- master_source_package.txt
- master_source_manifest.json
- image_registry.json
- master_source_import.json
- master_source_report.md
- _codex_master_source_done.txt
