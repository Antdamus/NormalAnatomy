# Master Source Report: Temporal Bone Fractures

Created: 2026-06-14T17:21:24.914856+00:00

## Import
- Imported newest completed staged bundle from Downloads/RadiologyMasterSource into master_source_queue.
- Queue pointer read from _latest_master_source_bundle.txt.

## Source Comparison
- RadPrimer and STATdx article text are highly overlapping; RadPrimer was used as the canonical hierarchy/backbone.
- STATdx was used for supplemental details about labyrinthine OCV involvement, penetrating/ossicular trauma, CTA/MR complications, pseudofractures, and broader image reinforcement.

## Image Evidence Gate
- image_evidence_manifest.json and image_evidence files were present and inspected.
- Contact sheets were created under _codex_work for audit support.
- All RadPrimer images are covered by visually exact STATdx duplicate copies, but RadPrimer images remain canonical.

| RadPrimer image | STATdx match | Classification | Action |
|---|---|---|---|
| RadPrimer image 1 | STATdx image 48 | exact duplicate | Keep RadPrimer; archive STATdx duplicate copy. |
| RadPrimer image 2 | STATdx image 39 | exact duplicate | Keep RadPrimer; archive STATdx duplicate copy. |
| RadPrimer image 3 | STATdx image 40 | exact duplicate | Keep RadPrimer; archive STATdx duplicate copy. |
| RadPrimer image 4 | STATdx image 41 | exact duplicate | Keep RadPrimer; archive STATdx duplicate copy. |
| RadPrimer image 5 | STATdx image 42 | exact duplicate | Keep RadPrimer; archive STATdx duplicate copy. |
| RadPrimer image 6 | STATdx image 44 | exact duplicate | Keep RadPrimer; archive STATdx duplicate copy. |
| RadPrimer image 7 | STATdx image 43 | exact duplicate | Keep RadPrimer; archive STATdx duplicate copy. |
| RadPrimer image 8 | STATdx image 45 | exact duplicate | Keep RadPrimer; archive STATdx duplicate copy. |
| RadPrimer image 9 | STATdx image 46 | exact duplicate | Keep RadPrimer; archive STATdx duplicate copy. |
| RadPrimer image 10 | STATdx image 47 | exact duplicate | Keep RadPrimer; archive STATdx duplicate copy. |

## Primary And Archive Sets
- selectedPrimaryImageIds: 48 images (RP-01, RP-02, RP-03, RP-04, RP-05, RP-06, RP-07, RP-08, RP-09, RP-10, SDX-01, SDX-02, SDX-03, SDX-04, SDX-05, SDX-06, SDX-07, SDX-08, SDX-09, SDX-10, SDX-11, SDX-12, SDX-13, SDX-14, SDX-15, SDX-16, SDX-17, SDX-18, SDX-19, SDX-20, SDX-21, SDX-22, SDX-23, SDX-24, SDX-25, SDX-26, SDX-27, SDX-28, SDX-29, SDX-30, SDX-31, SDX-32, SDX-33, SDX-34, SDX-35, SDX-36, SDX-37, SDX-38)
- archiveOptionalImageIds: 10 images (SDX-39, SDX-40, SDX-41, SDX-42, SDX-43, SDX-44, SDX-45, SDX-46, SDX-47, SDX-48)
- STATdx images 1-38 remain primary because they are distinct teaching examples, different cases, different projections/modalities, or complication/pseudofracture reinforcement.
- STATdx images 39-48 are archive-only exact duplicate copies of RadPrimer images.

## Case Cluster Splits
- No source case cluster was intentionally split.
- Duplicate STATdx tail copies were archived only where the corresponding RadPrimer image or RadPrimer cluster remains selected, so teaching continuity is preserved.

## Outputs Written
- master_source_package.txt
- master_source_manifest.json
- image_registry.json
- master_source_import.json
- master_source_report.md
- _codex_master_source_done.txt
