# Master Source Report: Cystic Hepatic Mass

## Import
- Imported bundle: C:\Users\josem.000\NormalAnatomy\master_source_queue\Cystic_Hepatic_Mass_2026-09-04T11-29-34-249Z
- Queue marker read: master_source_queue/_latest_master_source_bundle.txt
- Compared: RadPrimer_source_package.txt, STATdx_source_package.txt, RadPrimer_metadata.json, STATdx_metadata.json, metadata.json, master_source_request.md, image_evidence_manifest.json, and staged image_evidence files.

## Canonical Routing
- canonicalHierarchy copied exactly from metadata.json: All Categories > Basic > Gastrointestinal > Liver > Cystic Hepatic Mass
- canonicalDeckPath: Corebook::GI::Liver::Cystic Hepatic Mass
- STATdx breadcrumb was not used for routing.

## Source Synthesis
- RadPrimer used as canonical hierarchy/backbone and for the explicit differential category structure.
- STATdx used as supplemental image depth and as the curated primary image source because it fully covers the RadPrimer source-image set and adds six distinct images.
- No auditable Core Radiology source was supplied or retrieved, so no Core-specific claims were added.

## Image Coverage Gate
- STATdx fully covers the RadPrimer image set: all 16 RadPrimer images have matching STATdx images with the same stable source image IDs, and visual inspection of staged image_evidence files/contact sheet shows the same source images/slices/screenshots with only source rendering/resolution differences. The curated default download set is therefore STATdx images 1-22, preserving the full STATdx sequence and 6 additional STATdx-only teaching images; RadPrimer images 1-16 are retained as archive-optional exact duplicates for traceability.
- Evidence basis: image_evidence files were inspected visually using _codex_visual_contact_sheet.jpg; shared stable source image IDs were confirmed in image_evidence_manifest.json; staged file hashes were retained in image_registry.json visualEvidence.sha256.
- RadPrimer image 1: exactDuplicate of STATdx image 1; decision=archiveOptionalDuplicate.
- RadPrimer image 2: exactDuplicate of STATdx image 4; decision=archiveOptionalDuplicate.
- RadPrimer image 3: exactDuplicate of STATdx image 5; decision=archiveOptionalDuplicate.
- RadPrimer image 4: exactDuplicate of STATdx image 6; decision=archiveOptionalDuplicate.
- RadPrimer image 5: exactDuplicate of STATdx image 7; decision=archiveOptionalDuplicate.
- RadPrimer image 6: exactDuplicate of STATdx image 8; decision=archiveOptionalDuplicate.
- RadPrimer image 7: exactDuplicate of STATdx image 9; decision=archiveOptionalDuplicate.
- RadPrimer image 8: exactDuplicate of STATdx image 12; decision=archiveOptionalDuplicate.
- RadPrimer image 9: exactDuplicate of STATdx image 13; decision=archiveOptionalDuplicate.
- RadPrimer image 10: exactDuplicate of STATdx image 16; decision=archiveOptionalDuplicate.
- RadPrimer image 11: exactDuplicate of STATdx image 17; decision=archiveOptionalDuplicate.
- RadPrimer image 12: exactDuplicate of STATdx image 18; decision=archiveOptionalDuplicate.
- RadPrimer image 13: exactDuplicate of STATdx image 19; decision=archiveOptionalDuplicate.
- RadPrimer image 14: exactDuplicate of STATdx image 20; decision=archiveOptionalDuplicate.
- RadPrimer image 15: exactDuplicate of STATdx image 21; decision=archiveOptionalDuplicate.
- RadPrimer image 16: exactDuplicate of STATdx image 22; decision=archiveOptionalDuplicate.

## Selected And Archived Images
- selectedPrimaryImageIds: SDX-01, SDX-02, SDX-03, SDX-04, SDX-05, SDX-06, SDX-07, SDX-08, SDX-09, SDX-10, SDX-11, SDX-12, SDX-13, SDX-14, SDX-15, SDX-16, SDX-17, SDX-18, SDX-19, SDX-20, SDX-21, SDX-22
- archiveOptionalImageIds: RP-01, RP-02, RP-03, RP-04, RP-05, RP-06, RP-07, RP-08, RP-09, RP-10, RP-11, RP-12, RP-13, RP-14, RP-15, RP-16
- STATdx-only selected images: SDX-02, SDX-03, SDX-10, SDX-11, SDX-14, SDX-15.
- The extension should download only selectedPrimaryImageIds by default using source-qualified STATdx filenames from sourceSelectionPlan.imageDownloadPlan.primaryDownloads.

## Case Cluster Review
- No source case cluster was intentionally split.
- simple-cyst-spectrum: SDX-01, SDX-02, SDX-03. Simple hepatic cyst spectrum: uncomplicated water-density cyst, unusually large obstructing cyst, and hemorrhagic/complex T2 cyst appearance.
- polycystic-liver-disease: SDX-04. Innumerable water-attenuation cysts with hepatomegaly; few renal cysts and normal renal function in caption keep diagnosis nuanced.
- biliary-hamartomas-multimodality: SDX-06, SDX-07, SDX-08. CT, US, and MRCP examples of biliary hamartomas should remain together as multimodality recognition reinforcement.
- gist-treatment-follow-up: SDX-10, SDX-11. STATdx-only gastric GIST metastasis pair shows pretreatment solid metastasis and post-Gleevec cystic necrosis; preserve as an atomic follow-up/treatment-response cluster.
- posttraumatic-biloma-seroma: SDX-13. Trauma-history biloma/seroma example depends on interval context and comparison with prior CT scans.
- transplant-biloma-hat: SDX-14, SDX-15. STATdx-only transplant biloma examples both teach hepatic artery thrombosis with biliary necrosis/peribiliary fluid and should remain together.
- hydatid-cyst: SDX-17. Large multiseptate cysts with daughter cysts/scolices and endemic/immigrant context.
- biliary-neoplasm-spectrum: SDX-18, SDX-19. Biliary cystadenoma/carcinoma and biliary IPMN/cholangiocarcinoma concern both hinge on enhancing wall/septa, duct communication, or nodularity.
- rare-primary-and-congenital: SDX-20, SDX-21, SDX-22. Caroli disease central-dot sign, undifferentiated hepatic sarcoma, and ciliated hepatic foregut cyst cover key less-common mimics that should remain selected.
- RadPrimer duplicate renderings were archived only because each was represented by the same stable source image ID in the selected STATdx set.

## Output Files
- master_source_package.txt
- master_source_manifest.json
- image_registry.json
- master_source_import.json
- master_source_report.md
- _codex_master_source_done.txt
