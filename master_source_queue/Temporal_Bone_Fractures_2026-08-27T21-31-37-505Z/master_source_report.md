# Master Source Synthesis Report: Temporal Bone Fractures

## Inputs Compared
- RadPrimer_source_package.txt
- STATdx_source_package.txt
- RadPrimer_metadata.json
- STATdx_metadata.json
- metadata.json
- master_source_request.md
- image_evidence_manifest.json and staged image_evidence files

## Canonical Routing
- Canonical hierarchy used exactly from metadata.json: All Categories > Basic > Neuroradiology > Head and Neck > Facial Trauma and Other H&N Emergencies > Temporal Bone Fractures
- Canonical deck path: Corebook::Neuro::Head and Neck::Facial Trauma and Other H&N Emergencies::Temporal Bone Fractures
- STATdx breadcrumb was reviewed but not used for routing.

## Text Synthesis
RadPrimer and STATdx contain substantially overlapping article text. RadPrimer is used as the canonical backbone. STATdx is used as supplemental depth for image-specific examples and complications.

## Image Evidence Review
The staged image_evidence files were visually reviewed using contact sheets generated from the actual downloaded files. RadPrimer images 1-10 and STATdx images 1-10 match by stable image ID and visual appearance, so STATdx images 1-10 are exact duplicate archive-optional copies. No RadPrimer image was marked duplicate on caption-only evidence.

## Curation Result
- Selected primary images: 48
- Archive-optional images: 10
- RadPrimer selected primary: 10 of 10
- STATdx selected primary: 38 of 48
- STATdx archive-optional exact duplicates: 10 of 48

## Duplicate Gate
STATdx fully covers the RadPrimer image set. Each RadPrimer image is classified as exact duplicate covered by STATdx, with RadPrimer retained as primary and the STATdx duplicate copy archived.

## Cluster Preservation
Same-patient and adjacent-slice clusters were kept intact in the selected primary set or archived intact only when the duplicate source copy was exact. Distinct STATdx supplemental clusters were retained for recognition reinforcement.

## Generated Files
- master_source_package.txt
- master_source_manifest.json
- image_registry.json
- master_source_import.json
- master_source_report.md
- _codex_master_source_done.txt
