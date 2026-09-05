# Master Source Report: Traumatic Diaphragmatic Rupture

Created: 2026-08-25T02:39:14Z

## Imported Bundle
- Bundle: C:\Users\josem.000\NormalAnatomy\master_source_queue\Traumatic_Diaphragmatic_Rupture_2026-08-25T02-29-42-846Z
- Sources compared: RadPrimer_source_package.txt, STATdx_source_package.txt, RadPrimer_metadata.json, STATdx_metadata.json, metadata.json, master_source_request.md.
- Image evidence inspected: 30 staged plain image files via generated contact sheets and full-size review of candidate duplicate families.

## Canonical Hierarchy
- All Categories > Basic > Gastrointestinal > Peritoneum, Mesentery, and Abdominal Wall > Traumatic Diaphragmatic Rupture
- Deck path: Corebook::GI::Peritoneum, Mesentery, and Abdominal Wall::Traumatic Diaphragmatic Rupture
- Routing uses metadata.json canonicalHierarchy exactly.

## RadPrimer Image Coverage By STATdx
- RadPrimer image 1: exactDuplicate; related STATdx images: STATdx image 1. STATdx image 1 is the same chest radiograph showing the upward-curving NG tube after MVC; archive the STATdx repeat and keep the RadPrimer image as the canonical primary image.
- RadPrimer image 2: exactDuplicate; related STATdx images: STATdx image 2, STATdx image 3, STATdx image 4. STATdx image 2 is the same axial CT slice with fallen viscus and collar signs. STATdx images 3 and 4 are same-patient complementary axial/sagittal CT images and remain selected.
- RadPrimer image 3: exactDuplicate; related STATdx images: STATdx image 15, STATdx image 3. STATdx image 15 is the same axial CT slice/content as RadPrimer image 3, with only source crop/encoding differences. STATdx image 3 is an adjacent same-patient CT image and remains selected.
- RadPrimer image 4: exactDuplicate; related STATdx images: STATdx image 16, STATdx image 4. STATdx image 16 is the same coronal CT/reformatted image of stomach herniation through the left diaphragmatic defect. STATdx image 4 is a different sagittal companion image and remains selected.
- RadPrimer image 5: conceptualReplacement; related STATdx images: STATdx image 19, STATdx image 20. STATdx images 19 and 20 provide a separate radiograph/CT MVC cluster with an NG tube and fallen viscus sign, but they are not the same axial CT image as RadPrimer image 5.
- RadPrimer image 6: exactDuplicate; related STATdx images: STATdx image 9. STATdx image 9 is the same axial CT slice/content after stab wound showing splenic laceration, hemothorax, and subcutaneous emphysema; archive the STATdx repeat.
- RadPrimer image 7: exactDuplicate; related STATdx images: STATdx image 7. STATdx image 7 is the same coronal CT image of left hemidiaphragm defect with colon in the thorax and enteric contrast from colonic perforation; archive the STATdx repeat.
- RadPrimer image 8: nearDuplicate; related STATdx images: STATdx image 10. STATdx image 10 covers the same surgical-error MR teaching point but is a different plane/appearance, so both remain selected for recognition reinforcement.
- RadPrimer image 9: conceptualReplacement; related STATdx images: STATdx image 12, STATdx image 13, STATdx image 17, STATdx image 20. STATdx includes several dependent-viscus/collar-sign CT examples, but none is the same axial CT slice showing the pinched stomach and thoracic abdominal fat from RadPrimer image 9.
- RadPrimer image 10: exactDuplicate; related STATdx images: STATdx image 8. STATdx image 8 is the same coronal CT image of splenic injury, hemothorax, lung contusion, and small diaphragmatic defect; archive the STATdx repeat.

## Archived Images
- SDX-01: Exact duplicate of RadPrimer image 1 based on visual inspection of the staged chest radiograph evidence.
- SDX-02: Exact duplicate of RadPrimer image 2 based on visual inspection of the staged axial CT evidence.
- SDX-07: Exact duplicate of RadPrimer image 7 based on visual inspection of the staged coronal CT evidence.
- SDX-08: Exact duplicate of RadPrimer image 10 based on visual inspection of the staged coronal CT evidence.
- SDX-09: Exact duplicate of RadPrimer image 6 based on visual inspection of the staged axial CT evidence.
- SDX-15: Exact duplicate of RadPrimer image 3 based on visual inspection of the staged axial CT evidence.
- SDX-16: Exact duplicate of RadPrimer image 4 based on visual inspection of the staged coronal CT evidence.

## Retained Near Duplicates And Conceptual Replacements
- RadPrimer image 5 with STATdx images 19 and 20: separate MVC radiograph/CT cluster; not the same slice and retained.
- RadPrimer image 8 with STATdx image 10: same surgical-error MR concept but different plane/appearance; both selected.
- RadPrimer image 9 with STATdx images 12, 13, 17, and 20: related dependent-viscus/collar-sign CT examples; visually distinct and retained.
- STATdx images 3, 4, 5, 6, 10-14, 17, 18, 19, and 20 add adjacent slices, different planes, modality/radiograph examples, or rare mechanism coverage and remain primary.

## Case Cluster Splits
- Opening MVC radiograph and CT fallen-viscus cluster: selected RP-01, RP-02, RP-03, RP-04, SDX-03, SDX-04; archived SDX-01, SDX-02, SDX-15, SDX-16. Reason: archived STATdx images are exact same-image/same-slice repeats of RadPrimer images; adjacent or different-plane STATdx companion views remain selected.
- Penetrating trauma contiguous-injury examples: selected RP-06; archived SDX-09. Reason: STATdx image 9 is the same axial CT slice/content as RadPrimer image 6.
- Colonic herniation with colonic perforation: selected RP-07; archived SDX-07. Reason: STATdx image 7 is the same coronal CT image/content as RadPrimer image 7.
- Splenic injury, hemothorax, lung contusion, small diaphragm defect: selected RP-10; archived SDX-08. Reason: STATdx image 8 is the same coronal CT image/content as RadPrimer image 10.
- No RadPrimer source case cluster was intentionally split in a way that removes unique teaching context.

## Output Files
- master_source_package.txt
- master_source_manifest.json
- image_registry.json
- master_source_import.json
- master_source_report.md
- _codex_master_source_done.txt
