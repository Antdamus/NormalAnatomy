# Master Source Report: Hydronephrosis

## Import

Imported bundle: `master_source_queue\Hydronephrosis_2026-07-24T02-11-00-882Z`

Latest pointer read from `master_source_queue/_latest_master_source_bundle.txt` and confirmed to point to this bundle.

## Canonical Routing

`master_source_manifest.json` uses metadata.json canonicalHierarchy exactly:

```json
["All Categories", "Basic", "Nuclear Medicine", "Genitourinary Basic", "Hydronephrosis"]
```

Canonical deck path: `Corebook::Nuclear Medicine::Genitourinary Basic::Hydronephrosis`

STATdx breadcrumbs were not used for routing.

## Source Comparison

- RadPrimer is present and used as the canonical hierarchy/backbone.
- STATdx is present and used for supplemental detail, stronger duplicate image exports, and additional examples.
- No auditable Core Radiology source was supplied, so no Core-specific claims were asserted.

## Image Evidence Audit

Actual files in `image_evidence/` were inspected with generated contact sheets before exact-duplicate classification. Caption-only similarity was not used.

RadPrimer image coverage by STATdx:

- exactDuplicate: 20
- nearDuplicate: 0
- conceptualReplacement: 0
- notCovered: 2

STATdx exactly covers RadPrimer images 1-12 and 15-22. RadPrimer images 13-14 are not covered and remain selected as a unique same-patient bone-scan/CT correlation cluster.

## Case Cluster Handling

No source case cluster was intentionally split. Archive decisions only moved whole exact-duplicate RadPrimer counterparts to archive-optional status while preserving selected STATdx counterparts. RadPrimer images 13-14 remain together as primary. STATdx images 10-11 remain together as a supplemental same-patient cluster.

## Outputs Written

- master_source_package.txt
- master_source_manifest.json
- image_registry.json
- master_source_import.json
- master_source_report.md
- _codex_master_source_done.txt

## Verification

- master_source_manifest.json canonicalHierarchy equals metadata.json canonicalHierarchy exactly.
- master_source_import.json manifest.canonicalHierarchy equals master_source_manifest.json canonicalHierarchy exactly.
- master_source_import.json packageText equals master_source_package.txt exactly.
- selectedPrimaryImageIds includes STATdx images 1-24 plus RadPrimer images 13-14.
- archiveOptionalImageIds contains only exact duplicate RadPrimer exports.
- sourceSelectionPlan.imageDownloadPlan is present and source-qualified for extension download routing.
