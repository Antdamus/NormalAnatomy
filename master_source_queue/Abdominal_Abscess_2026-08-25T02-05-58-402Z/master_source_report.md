# Master Source Report: Abdominal Abscess

Created: 2026-08-25T02:15:38Z

## Imported Bundle
- Bundle: C:\Users\josem.000\NormalAnatomy\master_source_queue\Abdominal_Abscess_2026-08-25T02-05-58-402Z
- Sources compared: RadPrimer_source_package.txt, STATdx_source_package.txt, RadPrimer_metadata.json, STATdx_metadata.json, metadata.json, master_source_request.md.
- Image evidence inspected: 37 staged plain image files via contact sheets and full-size checks of candidate duplicate families.

## Canonical Hierarchy
- All Categories > Basic > Gastrointestinal > Peritoneum, Mesentery, and Abdominal Wall > Abdominal Abscess
- Deck path: Corebook::GI::Peritoneum, Mesentery, and Abdominal Wall::Abdominal Abscess
- Routing uses metadata.json canonicalHierarchy exactly.

## RadPrimer Image Coverage By STATdx
- RP-01: conceptualReplacement; related STATdx IDs: SDX-12, SDX-18; STATdx includes postoperative abscess examples, but no exact duplicate of this rounded gas-containing postoperative collection.
- RP-02: exactDuplicate; related STATdx IDs: SDX-11, SDX-17, SDX-12, SDX-18; STATdx images 11 and 17 are the same axial CT slice/content; STATdx images 12 and 18 are adjacent/same-patient reinforcement rather than duplicates.
- RP-03: conceptualReplacement; related STATdx IDs: SDX-05, SDX-06, SDX-10; STATdx has pelvic abscess examples, especially MR/CT pelvic cases, but not the same post-hysterectomy CT image.
- RP-04: conceptualReplacement; related STATdx IDs: SDX-02, SDX-26; STATdx includes drainage catheter follow-up examples, but not this transgluteal drainage image.
- RP-05: conceptualReplacement; related STATdx IDs: SDX-03, SDX-13, SDX-15, SDX-16; STATdx covers perforation-related abscess and gas-forming collections but does not exactly reproduce this free intraperitoneal gas image.
- RP-06: conceptualReplacement; related STATdx IDs: SDX-03, SDX-13, SDX-15, SDX-16; STATdx provides diverticulitis/perforation abscess cases, but this same-patient sigmoid diverticulosis/abscess slice is not duplicated.
- RP-07: conceptualReplacement; related STATdx IDs: SDX-08, SDX-13; STATdx includes gas-forming/retroperitoneal or lesser sac infected collections, but not the ERCP duodenal perforation case.
- RP-08: nearDuplicate; related STATdx IDs: SDX-04; STATdx image 4 is the same GIST mimic teaching concept and likely same case family, but it is a different CT slice/image, so both remain primary.
- RP-09: nearDuplicate; related STATdx IDs: SDX-09, SDX-10; STATdx images 9 and 10 provide tuboovarian abscess ultrasound/CT reinforcement; the ultrasound appearance is visually distinct and not an exact duplicate.
- RP-10: notCovered; related STATdx IDs: none; No STATdx staged image shows the same right psoas/Crohn-related MR abscess teaching point.

## Archived Images
- SDX-11: exact duplicate of RP-02 based on actual staged image evidence; archived.
- SDX-17: exact duplicate of RP-02 based on actual staged image evidence; archived.
- SDX-26: exact duplicate of SDX-02 based on actual staged image evidence; archived.

## Retained Near Duplicates And Conceptual Replacements
- RP-08 and SDX-04: same GIST mimic teaching concept but different CT slice/image; both selected.
- RP-09 with SDX-09/SDX-10: tuboovarian abscess reinforcement across US/CT; all selected.
- SDX-01 and SDX-25: same appendiceal abscess concept/case family but visually distinct enough to keep as recognition reinforcement.

## Case Cluster Splits
- STATdx images 11-12 postoperative abscess: selected SDX-12, RP-02; archived SDX-11. Reason: STATdx image 11 is an exact duplicate of RadPrimer image 2; STATdx image 12 is an adjacent same-patient slice with gas and remains selected.
- STATdx images 17-18 postoperative abscess: selected SDX-18, RP-02; archived SDX-17. Reason: STATdx image 17 is an exact duplicate of RadPrimer image 2; STATdx image 18 is an adjacent same-patient slice and remains selected.
- STATdx images 25-26 appendiceal abscess/drainage: selected SDX-25, SDX-02; archived SDX-26. Reason: STATdx image 26 is an exact duplicate of STATdx image 2; the catheter follow-up context is preserved by selecting STATdx image 2.
- No RadPrimer source case cluster was intentionally split.

## Output Files
- master_source_package.txt
- master_source_manifest.json
- image_registry.json
- master_source_import.json
- master_source_report.md
- _codex_master_source_done.txt
