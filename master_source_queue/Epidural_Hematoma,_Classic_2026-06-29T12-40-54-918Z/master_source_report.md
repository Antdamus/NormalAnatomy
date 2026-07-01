# Master Source Report: Epidural Hematoma, Classic

## Import

- Imported bundle: C:\Users\josem.000\NormalAnatomy\master_source_queue\Epidural_Hematoma,_Classic_2026-06-29T12-40-54-918Z
- Queue pointer: master_source_queue/_latest_master_source_bundle.txt
- Required source files read: RadPrimer_source_package.txt, STATdx_source_package.txt, RadPrimer_metadata.json, STATdx_metadata.json, metadata.json, master_source_request.md.
- Image evidence present: yes; 37 copied evidence files were present and inspected via contact sheets plus file-derived visual fingerprints.

## Canonical Hierarchy

`master_source_manifest.json` uses metadata.json canonicalHierarchy exactly:

```json
["All Categories", "Basic", "Neuroradiology", "Brain", "Primary Effects of CNS Trauma", "Epidural Hematoma, Classic"]
```

Canonical deck path: `Corebook::Neuro::Brain::Primary Effects of CNS Trauma::Epidural Hematoma, Classic`

## Image Coverage Gate

STATdx fully covers the RadPrimer image set. Each RadPrimer image was mapped to an actual same-screenshot STATdx evidence file before any exact duplicate decision was made. Captions alone were not used.

| RadPrimer image | STATdx coverage | Classification | Action |
|---|---|---|---|
| RadPrimer image 1 | STATdx image 1 | exact duplicate | Archive RP-01; keep SDX-01 primary |
| RadPrimer image 2 | STATdx image 2 | exact duplicate | Archive RP-02; keep SDX-02 primary |
| RadPrimer image 3 | STATdx image 3 | exact duplicate | Archive RP-03; keep SDX-03 primary |
| RadPrimer image 4 | STATdx image 4 | exact duplicate | Archive RP-04; keep SDX-04 primary |
| RadPrimer image 5 | STATdx image 22 | exact duplicate | Archive RP-05; keep SDX-22 primary |
| RadPrimer image 6 | STATdx image 21 | exact duplicate | Archive RP-06; keep SDX-21 primary |
| RadPrimer image 7 | STATdx image 5 | exact duplicate | Archive RP-07; keep SDX-05 primary |
| RadPrimer image 8 | STATdx image 6 | exact duplicate | Archive RP-08; keep SDX-06 primary |
| RadPrimer image 9 | STATdx image 25 | exact duplicate | Archive RP-09; keep SDX-25 primary |
| RadPrimer image 10 | STATdx image 26 | exact duplicate | Archive RP-10; keep SDX-26 primary |


No RadPrimer images were labeled near duplicate, conceptual replacement, or not covered.

## Case Cluster Handling

No source case cluster was intentionally split. Whole RadPrimer clusters were replaced only when the whole cluster had same-screenshot STATdx counterparts:

- Left temporal fracture/EDH: RadPrimer images 2-4 -> STATdx images 2-4.
- Right pterion fracture/small EDH: RadPrimer images 5-6 -> STATdx images 22 and 21.
- Observation then 3-hour deterioration: RadPrimer images 7-8 -> STATdx images 5-6.
- Nonoperative/follow-up case: RadPrimer images 9-10 -> STATdx images 25-26.

## Source Selection

- RadPrimer: canonical hierarchy/backbone and source-article structure.
- STATdx: supplemental depth, richer captions, additional modality/stage/severity examples, and primary higher-resolution image representatives.
- Core Radiology: not used; no auditable Core evidence was included in the request bundle.

## Outputs

- master_source_package.txt
- master_source_manifest.json
- image_registry.json
- master_source_import.json
- master_source_report.md
- _codex_master_source_done.txt
