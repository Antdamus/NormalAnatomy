# Pneumoperitoneum Master Source Report

Created: 2026-08-27T02:14:17.254Z
Imported bundle: C:\Users\josem.000\NormalAnatomy\master_source_queue\Pneumoperitoneum_2026-08-27T02-07-53-917Z

## Source Comparison

- RadPrimer was used as the canonical hierarchy/backbone.
- metadata.json canonicalHierarchy was copied exactly into the manifest and import manifest.
- STATdx text substantially overlaps RadPrimer; STATdx was used for supplemental image depth rather than route/hierarchy replacement.
- No auditable Core Radiology source pages were present in this bundle.

## Image Coverage Gate

STATdx fully covers the RadPrimer image set. Every RadPrimer image has a matching STATdx image with the same stable source image ID and matching staged visual evidence appearance. Caption similarity alone was not used for exact duplicate decisions.

Exact duplicate coverage:

- RadPrimer image 1 = STATdx image 1
- RadPrimer image 2 = STATdx image 2
- RadPrimer image 3 = STATdx image 4
- RadPrimer image 4 = STATdx image 5
- RadPrimer image 5 = STATdx image 6
- RadPrimer image 6 = STATdx image 8
- RadPrimer image 7 = STATdx image 9
- RadPrimer image 8 = STATdx image 12
- RadPrimer image 9 = STATdx image 13
- RadPrimer image 10 = STATdx image 14
- RadPrimer image 11 = STATdx image 15
- RadPrimer image 12 = STATdx image 16
- RadPrimer image 13 = STATdx image 17
- RadPrimer image 14 = STATdx image 18

## Selection Outcome

Selected primary images: RP-01, RP-02, RP-03, RP-04, RP-05, RP-06, RP-07, RP-08, RP-09, RP-10, RP-11, RP-12, RP-13, RP-14, SDX-03, SDX-07, SDX-10, SDX-11

Archive-optional duplicates: SDX-01, SDX-02, SDX-04, SDX-05, SDX-06, SDX-08, SDX-09, SDX-12, SDX-13, SDX-14, SDX-15, SDX-16, SDX-17, SDX-18

STATdx images 3, 7, 10, and 11 are visually distinct supplemental examples and remain selected as recognition reinforcement/modality or severity variants.

## Cluster Handling

The postoperative rectal anastomotic leak cluster was preserved atomically: RadPrimer images 3 and 4 are retained together. The equivalent STATdx duplicate cluster, STATdx images 4 and 5, is archived together. No source case cluster was intentionally split.

## Import Readiness

- master_source_package.txt and master_source_import.json packageText are byte-for-byte identical after writing.
- master_source_manifest.json canonicalHierarchy and master_source_import.json manifest.canonicalHierarchy match metadata.json canonicalHierarchy exactly.
- image_registry.json includes all RadPrimer and STATdx source images, including archive-optional duplicate copies.
