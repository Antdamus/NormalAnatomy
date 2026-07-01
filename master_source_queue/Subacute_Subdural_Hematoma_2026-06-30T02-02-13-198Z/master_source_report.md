# Master Source Report - Subacute Subdural Hematoma

Imported bundle: `master_source_queue\Subacute_Subdural_Hematoma_2026-06-30T02-02-13-198Z`

## Canonical Routing

`master_source_manifest.json` uses metadata.json canonicalHierarchy exactly:

```json
["All Categories", "Basic", "Neuroradiology", "Brain", "Primary Effects of CNS Trauma", "Subacute Subdural Hematoma"]
```

Canonical deck path: `Corebook::Neuro::Brain::Primary Effects of CNS Trauma::Subacute Subdural Hematoma`

## Source Comparison

- RadPrimer and STATdx article text are substantially aligned.
- STATdx adds or clarifies older-adult wording, double-layer DWI wording, SWI/GRE protocol advice, intracranial hypotension image context, DWI examples, pediatric/procedure context, mixed-density rebleeding, septations, and methemoglobin/differing-age MR examples.
- No auditable Core Radiology source was supplied, so Core-specific support is not asserted.

## Image Coverage Gate

- Actual `image_evidence/` files were present and inspected.
- STATdx covers all RadPrimer image teaching needs.
- Exact duplicate RadPrimer images archived: RP-01, RP-02, RP-03, RP-04, RP-05, RP-06, RP-07, RP-08, RP-10.
- RadPrimer image 9 is not an exact duplicate of STATdx image 15; both remain selected.
- Selected primary images: 27 images (SDX-01, SDX-02, SDX-03, SDX-04, SDX-05, SDX-06, SDX-07, SDX-08, SDX-09, SDX-10, SDX-11, SDX-12, SDX-13, SDX-14, SDX-15, SDX-16, SDX-17, SDX-18, SDX-19, SDX-20, SDX-21, SDX-22, SDX-23, SDX-24, SDX-25, SDX-26, RP-09).

## Outputs Written

- master_source_package.txt
- master_source_manifest.json
- image_registry.json
- master_source_import.json
- master_source_report.md
- _codex_master_source_done.txt
