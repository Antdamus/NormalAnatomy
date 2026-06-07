# Master Source Report: Neuropathic (Charcot) Arthropathy

## Source Decision
RadPrimer is used as the canonical hierarchy/backbone because it provides the clean study-path hierarchy and a concise board-style structure. STATdx is used as supplemental depth for staging/classification, management/prognosis, and substantially broader visual reinforcement.

## Image Evidence Gate
Actual downloaded image_evidence files were inspected using contact sheets and candidate side-by-side comparisons. Caption similarity alone was not used for exact duplicate classification.

- RadPrimer images: 22
- STATdx images: 36
- Selected primary images: 42
- Archive optional duplicates: 16

## RadPrimer Image Coverage by STATdx
- RP-01: exactDuplicate; matches SDX-23; Keep RadPrimer image 1; archive STATdx duplicate.
- RP-02: exactDuplicate; matches SDX-19; Keep RadPrimer image 2; archive STATdx duplicate.
- RP-03: exactDuplicate; matches SDX-20; Keep RadPrimer image 3; archive STATdx duplicate.
- RP-04: exactDuplicate; matches SDX-22; Keep RadPrimer image 4; archive duplicate STATdx image 22; select STATdx image 21 as a nonduplicate adjacent-slice supplement.
- RP-05: conceptualReplacement; matches SDX-01, SDX-34, SDX-35; Keep RadPrimer image 5 and select STATdx diabetic foot alternatives for recognition reinforcement.
- RP-06: conceptualReplacement; matches SDX-03, SDX-04, SDX-36; Keep RadPrimer image 6 and select distinct STATdx CT views for modality reinforcement.
- RP-07: exactDuplicate; matches SDX-15; Keep RadPrimer image 7; archive STATdx duplicate.
- RP-08: exactDuplicate; matches SDX-16; Keep RadPrimer image 8; archive STATdx duplicate.
- RP-09: notCovered; matches none; Keep; no STATdx duplicate or equivalent fluid-collection/biopsy-negative MR example.
- RP-10: notCovered; matches none; Keep; no STATdx duplicate or equivalent axial MR tendon-sheath/fluid example.
- RP-11: exactDuplicate; matches SDX-05; Keep RadPrimer image 11; archive STATdx duplicate.
- RP-12: exactDuplicate; matches SDX-06; Keep RadPrimer image 12; archive STATdx duplicate.
- RP-13: exactDuplicate; matches SDX-11; Keep RadPrimer image 13; archive STATdx duplicate.
- RP-14: exactDuplicate; matches SDX-12; Keep RadPrimer image 14; archive STATdx duplicate.
- RP-15: exactDuplicate; matches SDX-09; Keep RadPrimer image 15; archive STATdx duplicate.
- RP-16: exactDuplicate; matches SDX-10; Keep RadPrimer image 16; archive STATdx duplicate.
- RP-17: nearDuplicate; matches SDX-07; Keep both. Same disease/etiology concept but visually distinct knee examples; not the same screenshot.
- RP-18: exactDuplicate; matches SDX-08; Keep RadPrimer image 18; archive STATdx duplicate.
- RP-19: exactDuplicate; matches SDX-24; Keep RadPrimer image 19; archive STATdx duplicate.
- RP-20: exactDuplicate; matches SDX-25; Keep RadPrimer image 20; archive STATdx duplicate.
- RP-21: exactDuplicate; matches SDX-26; Keep RadPrimer image 21; archive STATdx duplicate.
- RP-22: notCovered; matches none; Keep; STATdx does not duplicate the cirrhosis/etiology CT context image.

## Selected STATdx Supplemental Images
- SDX-01 to SDX-04: atomic hypertrophic diabetic foot/Lisfranc radiograph-plus-CT cluster.
- SDX-07: visually distinct hypertrophic knee example; kept despite conceptual overlap with RadPrimer knee images.
- SDX-13 to SDX-14: tabes/syphilis hip examples not covered by RadPrimer.
- SDX-17: wrist Charcot example not covered by RadPrimer.
- SDX-18, SDX-27, SDX-31: shoulder MRI/radiograph/CT variants that add modality and mimic reinforcement beyond the RadPrimer shoulder radiograph/syrinx pair.
- SDX-21: adjacent-slice diabetic foot MRI supplement showing sinus tract/enhancement; retained while duplicate SDX-19, SDX-20, and SDX-22 are archived because RadPrimer equivalents are selected.
- SDX-28 to SDX-30 and SDX-32 to SDX-36: additional diabetic foot/ankle variants retained for recognition reinforcement, including chronic hindfoot/midfoot, atrophic Chopart, Lisfranc dislocation, and CT confirmation.
- SDX-33: acquired-syphilis knee with effusion/debris decompression, a high-yield mechanism/mimic visual.

## Case Cluster Guardrails
The only intentional cross-source cluster merge is the diabetic foot MRI cluster: RadPrimer images 2-4 are selected and STATdx image 21 is added as a nonduplicate adjacent slice, while STATdx images 19, 20, and 22 are archived as exact duplicates of the selected RadPrimer images. No other source case cluster was intentionally split.

## Files Written
- master_source_package.txt
- master_source_manifest.json
- image_registry.json
- master_source_import.json
- master_source_report.md
- _codex_master_source_done.txt

## No Outside Sources
No outside literature was used. All text and image decisions were based on the provided RadPrimer/STATdx source packages, metadata, and staged image_evidence files.
