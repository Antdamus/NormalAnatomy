# Master Source Report: Liver Mass With Central or Eccentric Scar

## Import
- Imported bundle: C:\Users\josem.000\NormalAnatomy\master_source_queue\Liver_Mass_With_Central_or_Eccentric_Scar_2026-09-03T02-25-21-724Z
- Queue marker read: master_source_queue/_latest_master_source_bundle.txt
- Compared: RadPrimer_source_package.txt, STATdx_source_package.txt, RadPrimer_metadata.json, STATdx_metadata.json, metadata.json, master_source_request.md, image_evidence_manifest.json, and staged image_evidence files.

## Canonical Routing
- canonicalHierarchy copied exactly from metadata.json: All Categories > Basic > Gastrointestinal > Liver > Liver Mass With Central or Eccentric Scar
- canonicalDeckPath: Corebook::GI::Liver::Liver Mass With Central or Eccentric Scar
- STATdx breadcrumb was not used for routing.

## Source Synthesis
- RadPrimer used as canonical hierarchy/backbone and for the explicit differential category structure.
- STATdx used as supplemental image depth and as the curated primary image source because it fully covers the RadPrimer source-image set and adds four distinct images.
- No auditable Core Radiology source was supplied or retrieved, so no Core-specific claims were added.

## Image Coverage Gate
- STATdx fully covers the RadPrimer image set: all 20 RadPrimer images have matching STATdx images with the same stable source image IDs, and visual inspection of staged image_evidence files shows the same source images/slices/screenshots with only source rendering/resolution differences. The curated default download set is therefore STATdx images 1-24, preserving the full STATdx sequence and four additional STATdx-only teaching images; RadPrimer images 1-20 are retained as archive-optional exact duplicates for traceability.
- Evidence basis: image_evidence files were inspected visually; shared stable source image IDs were confirmed in image_evidence_manifest.json; staged file hashes were retained in image_registry.json visualEvidence.sha256.
- RadPrimer image 1: exactDuplicate of STATdx image 1; decision=archiveOptionalDuplicate.
- RadPrimer image 2: exactDuplicate of STATdx image 2; decision=archiveOptionalDuplicate.
- RadPrimer image 3: exactDuplicate of STATdx image 4; decision=archiveOptionalDuplicate.
- RadPrimer image 4: exactDuplicate of STATdx image 5; decision=archiveOptionalDuplicate.
- RadPrimer image 5: exactDuplicate of STATdx image 7; decision=archiveOptionalDuplicate.
- RadPrimer image 6: exactDuplicate of STATdx image 8; decision=archiveOptionalDuplicate.
- RadPrimer image 7: exactDuplicate of STATdx image 9; decision=archiveOptionalDuplicate.
- RadPrimer image 8: exactDuplicate of STATdx image 10; decision=archiveOptionalDuplicate.
- RadPrimer image 9: exactDuplicate of STATdx image 11; decision=archiveOptionalDuplicate.
- RadPrimer image 10: exactDuplicate of STATdx image 12; decision=archiveOptionalDuplicate.
- RadPrimer image 11: exactDuplicate of STATdx image 13; decision=archiveOptionalDuplicate.
- RadPrimer image 12: exactDuplicate of STATdx image 14; decision=archiveOptionalDuplicate.
- RadPrimer image 13: exactDuplicate of STATdx image 16; decision=archiveOptionalDuplicate.
- RadPrimer image 14: exactDuplicate of STATdx image 17; decision=archiveOptionalDuplicate.
- RadPrimer image 15: exactDuplicate of STATdx image 18; decision=archiveOptionalDuplicate.
- RadPrimer image 16: exactDuplicate of STATdx image 19; decision=archiveOptionalDuplicate.
- RadPrimer image 17: exactDuplicate of STATdx image 20; decision=archiveOptionalDuplicate.
- RadPrimer image 18: exactDuplicate of STATdx image 21; decision=archiveOptionalDuplicate.
- RadPrimer image 19: exactDuplicate of STATdx image 22; decision=archiveOptionalDuplicate.
- RadPrimer image 20: exactDuplicate of STATdx image 23; decision=archiveOptionalDuplicate.

## Selected And Archived Images
- selectedPrimaryImageIds: SDX-01, SDX-02, SDX-03, SDX-04, SDX-05, SDX-06, SDX-07, SDX-08, SDX-09, SDX-10, SDX-11, SDX-12, SDX-13, SDX-14, SDX-15, SDX-16, SDX-17, SDX-18, SDX-19, SDX-20, SDX-21, SDX-22, SDX-23, SDX-24
- archiveOptionalImageIds: RP-01, RP-02, RP-03, RP-04, RP-05, RP-06, RP-07, RP-08, RP-09, RP-10, RP-11, RP-12, RP-13, RP-14, RP-15, RP-16, RP-17, RP-18, RP-19, RP-20
- The extension should download only selectedPrimaryImageIds by default using source-qualified STATdx filenames from sourceSelectionPlan.imageDownloadPlan.primaryDownloads.

## Case Cluster Review
- No source case cluster was intentionally split.
- fnh-core: SDX-01, SDX-02, SDX-03. FNH cluster spanning arterial CT/MR enhancement and hepatobiliary delayed behavior of the scar.
- hemangioma-core: SDX-04, SDX-05, SDX-06. Hemangioma cluster showing peripheral nodular enhancement, very bright T2 signal, and fibrotic/calcified scar behavior.
- metastases-same-patient: SDX-11, SDX-12. Same older colon cancer patient: noncontrast calcification and portal venous necrotic/fibrotic metastases should stay together.
- fibrolamellar-core: SDX-13, SDX-14, SDX-15. Fibrolamellar HCC cluster demonstrating calcified scar, MR necrotic scar, left-lobe mass, and nodal/metastatic context.
- cholangiocarcinoma-core: SDX-16, SDX-17. Cholangiocarcinoma cluster pairs obstructive/capsular retraction CT findings with progressive fibrotic MR enhancement.
- ehe-core: SDX-18, SDX-19. Epithelioid hemangioendothelioma CT/MR cluster showing peripheral target lesions and T2 central necrosis/scar.
- budd-chiari-nrh: SDX-20, SDX-21, SDX-22, SDX-23, SDX-24. Budd-Chiari/nodular regenerative hyperplasia cluster including hepatobiliary agent retention, TIPS context, transplant confirmation, and histology correlation.
- RadPrimer duplicate renderings were archived only because each was represented by the same stable source image ID in the selected STATdx set.

## Output Files
- master_source_package.txt
- master_source_manifest.json
- image_registry.json
- master_source_import.json
- master_source_report.md
- _codex_master_source_done.txt
