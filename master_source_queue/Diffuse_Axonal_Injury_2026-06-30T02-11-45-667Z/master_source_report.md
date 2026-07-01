# Master Source Report: Diffuse Axonal Injury

Imported bundle: `C:\Users\josem.000\NormalAnatomy\master_source_queue\Diffuse_Axonal_Injury_2026-06-30T02-11-45-667Z`
Created: 2026-06-30T02:18:20Z

## Inputs Read

- RadPrimer_source_package.txt
- STATdx_source_package.txt
- RadPrimer_metadata.json
- STATdx_metadata.json
- metadata.json
- master_source_request.md
- image_evidence_manifest.json
- image_evidence/ actual files (51 files)

## Canonical Routing

- canonicalHierarchy: All Categories > Basic > Neuroradiology > Brain > Primary Effects of CNS Trauma > Diffuse Axonal Injury
- canonicalDeckPath: Corebook::Neuro::Brain::Primary Effects of CNS Trauma::Diffuse Axonal Injury
- Routing source: metadata.json canonicalHierarchy/canonicalDeckPath, preserving the RadPrimer backbone exactly.

## Image Coverage Gate

STATdx fully covers the RadPrimer image set. Actual image_evidence files were visually inspected before exact duplicate classification. All 10 RadPrimer images map to exact same-slice or same-graphic STATdx counterparts, so all RadPrimer images are archive-optional and all 41 STATdx images are selected primary images.

## Output Files

- master_source_package.txt
- master_source_manifest.json
- image_registry.json
- master_source_import.json
- master_source_report.md
- _codex_master_source_done.txt

## Validation Notes

- packageText in master_source_import.json matches master_source_package.txt.
- master_source_import.json manifest.canonicalHierarchy matches master_source_manifest.json canonicalHierarchy exactly.
- selectedPrimaryImageIds count: 41
- archiveOptionalImageIds count: 10
