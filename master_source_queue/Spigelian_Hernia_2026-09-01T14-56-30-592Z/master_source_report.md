# Master Source Report: Spigelian Hernia

Created: 2026-09-01T15:03:59Z

## Source Review
- Imported bundle from the staged browser bundle into `master_source_queue` and confirmed `_latest_master_source_bundle.txt` points to this Spigelian Hernia folder.
- Compared `RadPrimer_source_package.txt`, `STATdx_source_package.txt`, `RadPrimer_metadata.json`, `STATdx_metadata.json`, `metadata.json`, and `master_source_request.md`.
- Used RadPrimer/metadata canonical hierarchy exactly for deck routing: All Categories > Basic > Gastrointestinal > Peritoneum, Mesentery, and Abdominal Wall > Spigelian Hernia.
- No auditable Core Radiology source was supplied or retrieved, so the master source does not claim Core support.

## Image Evidence Review
- Inspected staged `image_evidence` files before duplicate classification.
- SHA-256 hashes were retained in `image_registry.json` visualEvidence fields for auditability; file hashes are not identical across providers, so exact duplicate calls are based on visual same-slice review rather than caption similarity alone.
- STATdx does not fully cover the RadPrimer image set as exact duplicates.

## RadPrimer Image Coverage By STATdx
| RadPrimer image | Classification | Related STATdx image(s) | Decision |
|---|---|---|---|
| RadPrimer image 1 | conceptualReplacement | STATdx image 3; STATdx image 7; STATdx image 8 | selectedPrimary |
| RadPrimer image 2 | exactDuplicate | STATdx image 5 | selectedPrimary |
| RadPrimer image 3 | exactDuplicate | STATdx image 2 | selectedPrimary |
| RadPrimer image 4 | nearDuplicate | STATdx image 4 | selectedPrimary |

## Selected Primary Images
- RadPrimer image 1
- RadPrimer image 2
- RadPrimer image 3
- RadPrimer image 4
- STATdx image 1
- STATdx image 3
- STATdx image 4
- STATdx image 6
- STATdx image 7
- STATdx image 8
- STATdx image 9
- STATdx image 10
- STATdx image 11
- STATdx image 12
- STATdx image 13

## Archive-Optional Images
- STATdx image 2: Exact duplicate of RadPrimer image 3 based on visual inspection of the staged NECT evidence files; archived as the duplicate STATdx rendering.
- STATdx image 5: Exact duplicate of RadPrimer image 2 based on visual inspection of the staged CECT evidence files; archived as the duplicate STATdx rendering.

## Case Cluster Handling
- No source case cluster was intentionally split.
- Adjacent-slice/same-patient or same-complication clusters were retained when not exact duplicates.
- Archived images are isolated duplicate renderings only, not partial removals from retained teaching clusters.

## Output Files
- `master_source_package.txt`
- `master_source_manifest.json`
- `image_registry.json`
- `master_source_import.json`
- `master_source_report.md`
- `_codex_master_source_done.txt`

