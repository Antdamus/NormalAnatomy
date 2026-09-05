# Master Source Report: Nabothian Cyst

## Import
- Imported bundle: C:\Users\josem.000\NormalAnatomy\master_source_queue\Nabothian_Cyst_2026-08-12T21-49-40-747Z
- Latest pointer reviewed: master_source_queue/_latest_master_source_bundle.txt
- Required source files compared: RadPrimer_source_package.txt, STATdx_source_package.txt, RadPrimer_metadata.json, STATdx_metadata.json, metadata.json, and master_source_request.md.
- Image evidence reviewed: image_evidence_manifest.json plus the 19 staged files in image_evidence/.

## Canonical Routing
- canonicalHierarchy copied exactly from metadata.json: All Categories > Basic > Ultrasound > Female Pelvis Basic > Nabothian Cyst
- canonicalDeckPath: Corebook::Ultrasound::Female Pelvis Basic::Nabothian Cyst
- RadPrimer is present, so STATdx breadcrumb routing was not used.

## Image Coverage Gate
- STATdx fully covers RadPrimer image set: no.
- Exact duplicates archived: none.
- Evidence basis: visual review of the staged evidence contact sheet, distinct source image IDs, and unique SHA-256 hashes for all 19 files.

## RadPrimer Coverage Decisions
- RadPrimer image 1: nearDuplicate; covered by STATdx image 2, STATdx image 5, STATdx image 11. Actual evidence files show visually distinct ultrasound screenshots and unique source IDs/hashes. STATdx supplies close alternate examples of clustered/ovoid cervical cysts adjacent to the endocervical canal, but no same image, slice, or screenshot. Keep RadPrimer image 1 primary; use STATdx ultrasound examples as recognition reinforcement.
- RadPrimer image 2: conceptualReplacement; covered by STATdx image 9, STATdx image 10, STATdx image 11. STATdx covers debris/hemorrhagic content and posterior enhancement with different ultrasound cases. Visual evidence and hashes do not support exact duplication. Keep RadPrimer image 2 primary for internal echoes/debris and posterior enhancement; keep the STATdx hemorrhagic pair primary.
- RadPrimer image 3: nearDuplicate; covered by STATdx image 2, STATdx image 5. STATdx has alternate transvaginal ultrasound clusters of anechoic cysts around/within the cervix, but the staged images differ in plane, patient, and appearance; no matching image ID or hash. Keep RadPrimer image 3 primary because multiple cysts obscuring the cervical canal is an important recognition pattern.
- RadPrimer image 4: notCovered; covered by none. STATdx includes simple cervical cyst examples, but no staged STATdx image reproduces the RadPrimer lateral-margin pitfall of a nabothian cyst mimicking an ovarian follicle with explicit need to identify a separate ovary. Keep RadPrimer image 4 primary for the adnexal/ovarian-follicle mimic pitfall.

## Case Cluster Handling
- No source case cluster was intentionally split.
- Preserved clusters: STATdx CT/TVUS pair; STATdx axial T2/postcontrast T1 MRI pair; STATdx transverse US/sagittal T2/coronal oblique T2 deep-stroma cluster; STATdx large hemorrhagic ultrasound/biopsy-confirmed pair; STATdx post-uterine-artery-embolization CT/MR cluster.

## Outputs Written
- master_source_package.txt
- master_source_manifest.json
- image_registry.json
- master_source_import.json
- master_source_report.md
- _codex_master_source_done.txt
