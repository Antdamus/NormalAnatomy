# RadPrimer Card Audit: Stress Fracture, Ankle and Foot

Bundle: `C:/Users/josem.000/NormalAnatomy/radprimer_audit_queue/Stress_Fracture,_Ankle_and_Foot_2026-05-29T02-57-41-653Z`

## Counts

- Original generated cards: 35
- Corrected cards: 37
- TSV columns preserved: 22

## Highest-signal Corrections

- Removed the unsupported Core-only quantitative card asking for the percentage of metatarsal stress fractures in the 2nd/3rd metatarsals. The recovered source package did not contain that Core excerpt or statistic.
- Replaced the repeated "Core + RadPrimer synthesis" summary on every card with a RadPrimer-only source summary, because Core text/pages were not supplied in this audit bundle.
- Rewrote the stress-fracture mechanism card to stay source-supported: stress injury is edema or long-segment periosteal reaction without a line and can progress to an incomplete or complete fracture line. No outside clarification was used.
- Rewrote the nuclear medicine card to remove unsupplied three-phase bone-scan language and add the source-supported pinhole collimation point.
- Repaired the navicular differential card: osteonecrosis is encoded as a possible long-term complication of navicular stress fracture rather than as the primary differential label.
- Added a missing image-based card for image 1, the stress-fracture site map, so all selected images are represented.
- Added missing source-supported high-yield cards for pathologic fracture definition and location-specific pain patterns.
- Preserved strong existing cards on early radiographic pitfalls, MRI plane dependence, low-risk versus high-risk nonunion sites, management, osteomyelitis differentiation, and activity-specific locations.

## Source and Metadata Notes

- The browser-staged bundle was incomplete, so the article source package was recovered from Edge extension storage and placed in the imported queue bundle before audit.
- `metadata.json` had empty selected-image and case arrays after recovery. Image grouping was therefore audited against the `=== IMAGES ===` section in `source_package.txt`, which lists cases 5/6/7, 9/10, 11/12, 13/14, and standalone images 1, 2, 3, 4, 8, 15, and 16.
- The source package contains an internal distal-tibia wording mismatch: the key-facts section says anteromedial distal tibia, while the body, low-risk framework, and captions emphasize posteromedial distal tibia. Corrected cards avoid over-relying on the isolated key-facts wording and encode the body/risk framework.
- No outside literature was used.

## Validation

- `corrected_cards.tsv` preserves 22 columns per row.
- No header row was added.
- No literal tab/newline characters were introduced inside fields.
- Source attribution remains available on the card backs through the summary field.
