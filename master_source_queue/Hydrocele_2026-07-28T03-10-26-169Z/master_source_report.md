# Master Source Report: Hydrocele

## Import

Imported bundle: `master_source_queue\Hydrocele_2026-07-28T03-10-26-169Z`

Latest pointer read from `master_source_queue/_latest_master_source_bundle.txt` and confirmed to point to this bundle.

## Canonical Routing

`master_source_manifest.json` uses metadata.json canonicalHierarchy exactly:

```json
["All Categories", "Basic", "Ultrasound", "Scrotum Basic", "Hydrocele"]
```

Canonical deck path: `Corebook::Ultrasound::Scrotum Basic::Hydrocele`

STATdx breadcrumbs were not used for routing.

## Source Comparison

- RadPrimer is present and used as the canonical hierarchy/backbone.
- STATdx is present and used for supplemental image depth and source-preferred duplicate image exports.
- The RadPrimer and STATdx article text blocks are identical in this bundle.
- No auditable Core Radiology source was supplied, so no Core-specific claims were asserted.

## Image Evidence Audit

Actual files in `image_evidence/` were inspected with generated contact sheets before exact-duplicate classification. Caption-only similarity was not used.

RadPrimer image coverage by STATdx:

- exactDuplicate: 4
- nearDuplicate: 0
- conceptualReplacement: 0
- notCovered: 0

STATdx exactly covers RadPrimer images 1-4 with matching stable source image IDs and visually identical evidence files. STATdx images 5-11 are distinct supplemental examples and remain selected as primary recognition reinforcement.

## Case Cluster Handling

No source case cluster was intentionally split. Archive decisions only moved whole exact-duplicate RadPrimer counterparts to archive-optional status while preserving selected STATdx counterparts. STATdx image 4 retains its single-image aspiration/sclerotherapy procedure context.

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
- selectedPrimaryImageIds includes STATdx images 1-11.
- archiveOptionalImageIds contains only exact duplicate RadPrimer exports.
- sourceSelectionPlan.imageDownloadPlan is present and source-qualified for extension download routing.
