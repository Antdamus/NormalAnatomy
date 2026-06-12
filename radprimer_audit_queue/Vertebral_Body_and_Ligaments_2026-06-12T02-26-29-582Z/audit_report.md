# RadPrimer Card Audit Report

Bundle: `Vertebral_Body_and_Ligaments_2026-06-12T02-26-29-582Z`
Topic: Vertebral Body and Ligaments
Engine/mode: normal/no_pictures

## Inputs Reviewed

- `source_package.txt`: RadPrimer article text and normal-engine rules.
- `generated_cards.tsv`: 23 generated rows, 22 columns each.
- `metadata.json`: no selected images, normal engine, Anki target deck present.
- `audit_instructions.md`: required corrected TSV plus Anki import file.
- `core_evidence.txt`: Core evidence status `NOT_USED`; no Core-specific claims were treated as verified.

## Output Summary

- Original generated rows: 23
- Corrected rows: 36
- TSV schema: preserved at 22 tab-separated columns, no header row.
- Anki import file: created with required import directives and no field header row.
- Outside clarification: none used.

## Highest-Signal Changes

1. Split overloaded regional anatomy cards into smaller one-concept cards.
   - C3-C6 morphology was separated into body/canal/uncinate features versus posterior elements/transverse foramina/spinous-process features.
   - Thoracic morphology was separated into body/canal, posterior-element pattern, and costal-facet/rib-articulation pattern.
   - Lumbar morphology was separated into robust body/pedicle/lamina anchors and lumbar facet-orientation anchors.

2. Split ligament cards so course, attachment, and regional morphology are easier to review.
   - ALL course was separated from ALL attachment/fiber-span layers.
   - PLL course/attachment was separated from regional shape change.
   - Ligamentum flavum course was separated from attachment/regional thickness.
   - Intertransverse, interspinous, supraspinous, and ligamentum nuchae were each kept as distinct localization cards.

3. Preserved structured pathway cards where a pathway is pedagogically useful.
   - The dorsal sacral surface medial-to-lateral landmark card remains intentionally structured because the source itself teaches a landmark sequence.
   - The final vertebral-region synthesis card remains broad by design because it tests the practical regional-recognition framework.

4. Improved Anki import safety.
   - Confirmed every corrected row has a nonempty `Clinical_Context` field.
   - Confirmed every corrected row has exactly 22 columns.
   - Wrote `corrected_cards_anki_import.tsv` with the target deck:
     `RadprimerNormal::Neuro::Spine::Anatomy::Spinal Osseous Structures, Ligaments, and Muscles::Vertebral Body and Ligaments`
   - Rewrote TSV outputs as UTF-8 without BOM to avoid first-field import problems.

## Removed Or Avoided

- No prompt metadata, workflow bookkeeping, or Core audit statements were added as cards.
- No image-based cards were generated because this bundle explicitly had no selected images.
- No Core-specific or outside-source facts were added because `core_evidence.txt` states Core was not used.

## Residual Notes

The corrected deck is intentionally more granular than the generated deck. The expansion reflects card splitting rather than unsupported new material. The topic is anatomy-heavy, so most cards are high-yield normal anatomy and landmark-recognition cards rather than diagnosis or differential cards.