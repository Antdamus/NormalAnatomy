# RadPrimer Card Audit Report

Bundle: `radprimer_audit_queue/Traumatic_Aortic_Injury_2026-06-06T15-32-49-268Z`
Topic: Traumatic Aortic Injury
Audit completed: 2026-06-06T11:46:35-04:00

## Inputs Reviewed

- `source_package.txt`
- `generated_cards.tsv`
- `metadata.json`
- `audit_instructions.md`
- `core_evidence.txt`

## Output Files

- `corrected_cards.tsv`
- `corrected_cards_anki_import.tsv`
- `_codex_audit_done.txt`

## Summary

The generated deck was structurally sound and mostly source-faithful. I preserved the six selected image/case groups, the 22-column note schema, the Core + RadPrimer summary field, and the Anki target deck metadata.

Final corrected output contains 36 cards:

- 6 primary image UNKNOWN cards
- 3 image-based differential drills
- 3 definition cards
- 2 mechanism cards
- 3 boards-trap cards
- 3 epidemiology/prognosis cards
- 16 high-yield imaging, grading, treatment, mimic, and outcome cards

## Key Changes

- Replaced unsupported/model-inferred chronic mediastinal opacity differentials with source-listed or source-grounded alternatives:
  - `Fusiform enlargement of the proximal descending aorta`
  - `Atherosclerotic ulceration`
  - `Wide mediastinum or mediastinal opacity of other etiology`
- Updated the chronic post-traumatic pseudoaneurysm differential drill to avoid relying on `calcified mediastinal lymph node`, which was not directly listed in the captured RadPrimer/Core bundle.
- Tightened the TEVAR grade-treatment card so it focuses on repair eligibility by grade/anatomy, then added a separate timing card for urgent vs selected delayed repair.
- Added a dedicated direct-versus-indirect CTA signs card because the source explicitly distinguishes direct wall injury signs from indirect mediastinal/periaortic hemorrhage.
- Added a TEVAR timing card from the RadPrimer treatment section: urgent repair under 24 hours is recommended, while selected delayed repair after 24 hours may decrease mortality by allowing concurrent-injury management and optimization.
- Added a natural-history mortality card to encode the source-stated urgency figures: 85% die at the trauma site, 50% within 24 hours untreated, 22% during resuscitation, 28% during or shortly after repair, and 2% long-term survival.

## Source-Support Notes

- Core-specific claims were retained only when supported by `core_evidence.txt`, including CTA as gold standard/modality of choice, fixed-location injury mechanisms, direct CT signs, minimal aortic injury frequency range, venous-versus-aortic mediastinal hemorrhage discriminator, and chronic pseudoaneurysm calcification/thrombus.
- RadPrimer-specific numeric values were retained from `source_package.txt`, including CTA sensitivity/specificity, radiographic sign percentages, SVS grades, blood pressure/heart rate targets, rupture-risk reduction with blood pressure control, TEVAR/open repair recommendations, and natural-history mortality figures.
- No outside facts were added to the cards.

## Validation

- `generated_cards.tsv`: 33 rows, all with 22 fields.
- `corrected_cards.tsv`: 36 rows, all with 22 fields.
- `corrected_cards_anki_import.tsv`: 4 Anki import directives followed by 36 data rows, all with 22 fields.
- No duplicate or blank `Clinical_Context` identifiers were found in the corrected TSV.

## Remaining Uncertainties

- The audit used the captured source bundle and `core_evidence.txt`; it did not have direct access to the original Core PDF pages beyond the exported Core evidence summary.
- The chronic opacity differential still necessarily stays broad because the RadPrimer article lists general TAI mimics rather than a dedicated differential list for a calcified middle-mediastinal opacity.
