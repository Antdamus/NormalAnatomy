# Master Source Report: Testicular Torsion

Created: 2026-07-28T03:29:23Z

## Source comparison
- RadPrimer was used as the canonical hierarchy/backbone.
- STATdx was used as supplemental depth for imaging nuance, viability prediction, CEUS, intermittent torsion, management, differential pitfalls, and case-image clusters.
- No auditable Core Radiology evidence was present, so no Core-specific claims were added.
- Unrelated IMAIOS label repository dumps in the staged source packages were not carried into the master teaching package.

## Canonical hierarchy
["All Categories", "Basic", "Ultrasound", "Scrotum Basic", "Testicular Torsion/Infarction"]

## Image evidence inspection
- Actual files in image_evidence/RadPrimer and image_evidence/STATdx were inspected using labeled contact sheets and pair review sheets.
- Exact duplicate calls were limited to visually identical/same-screenshot pairs, supported by visual evidence and image hashing where applicable.

## RadPrimer coverage by STATdx
- RP-01: exactDuplicate; STATdx matches: SDX-05; selected primary: False.
- RP-02: nearDuplicate; STATdx matches: SDX-21; selected primary: True.
- RP-03: conceptualReplacement; STATdx matches: SDX-01, SDX-03, SDX-11; selected primary: True.
- RP-04: exactDuplicate; STATdx matches: SDX-19; selected primary: False.
- RP-05: nearDuplicate; STATdx matches: SDX-24; selected primary: True.
- RP-06: exactDuplicate; STATdx matches: SDX-17; selected primary: False.
- RP-07: nearDuplicate; STATdx matches: SDX-20; selected primary: True.
- RP-08: nearDuplicate; STATdx matches: SDX-25; selected primary: True.
- RP-09: exactDuplicate; STATdx matches: SDX-16; selected primary: False.
- RP-10: notCovered; STATdx matches: none; selected primary: True.

## Selected primary images
RP-02, RP-03, RP-05, RP-07, RP-08, RP-10, SDX-01, SDX-02, SDX-03, SDX-04, SDX-05, SDX-06, SDX-07, SDX-08, SDX-09, SDX-10, SDX-11, SDX-12, SDX-13, SDX-14, SDX-15, SDX-16, SDX-17, SDX-18, SDX-19, SDX-20, SDX-21, SDX-22, SDX-23, SDX-24, SDX-25

## Archive optional images
RP-01, RP-04, RP-06, RP-09

## Archive rationale
- RP-01: exact duplicate; same torsion graphic by visual evidence; aHash match; STATdx version retained.
- RP-04: exact duplicate; same whirlpool/spectral screenshot by visual evidence; STATdx version has broader labeled frame.
- RP-06: exact duplicate; same right-sided 24-hour avascular heterogeneous testis screenshot by visual evidence; STATdx version retained.
- RP-09: exact duplicate; same partial 180-degree torsion Doppler/spectral screenshot by visual evidence; aHash match; STATdx version retained.

## Case-cluster splits
No source case cluster was intentionally split. Same-patient/follow-up/procedure/comparison clusters retained together: SDX-03/04, SDX-07/08, SDX-09/10, SDX-11/12, SDX-13/14, and SDX-22/23.

## Import readiness
- master_source_import.json packageText exactly matches master_source_package.txt.
- manifest.canonicalHierarchy exactly matches metadata.json canonicalHierarchy.
- sourceSelectionPlan.imageDownloadPlan contains only selected primary images for default download/use.
