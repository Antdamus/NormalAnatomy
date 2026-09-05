# RadPrimer Card Audit Report: Abdominal Calcifications

Created: 2026-08-25T03:13:00Z

## Bundle
- Bundle: C:\Users\josem.000\NormalAnatomy\radprimer_audit_queue\Abdominal_Calcifications_2026-08-25T03-06-58-114Z
- Compared: source_package.txt, generated_cards.tsv, metadata.json, audit_instructions.md, and core_evidence.txt.
- Core evidence status: USED. Core-specific claims were kept only when supported by core_evidence.txt or source_package.txt.

## Output Summary
- Generated cards reviewed: 84
- Corrected cards written: 100
- Removed overloaded cards: 2
- Added source-supported high-yield cards: 18
- TSV columns preserved: 22
- Anki import target: Corebook::GI::Peritoneum, Mesentery, and Abdominal Wall::Abdominal Calcifications

## Major Corrections
- Replaced the long repeated master-summary field with a compact audited summary and source basis.
- Normalized broken display characters and non-ASCII punctuation in the corrected export, including Monckeberg wording.
- Replaced generic image-card mini-differentials with image-specific diagnostic pivots for the 55 selected primary images.
- Changed STATdx image 52 and STATdx image 54 prompts from generic "most likely diagnosis" to source-supported pattern questions.
- Removed unsupported explicit Core wording from the pancreatic-region discriminator; the corrected card labels it as a source-supported teaching pivot rather than a direct Core warning.
- Tightened the solid-mass calcification mechanism card to stay within source-supported mechanisms.
- Removed the overloaded pelvic morphology card and split it into focused phlebolith, fibroid, dermoid, bladder stone, and vascular aneurysm cards.
- Removed the overloaded peritoneal/mesenteric fibroinflammatory card and split it into separate sclerosing peritonitis and sclerosing mesenteritis cards.

## Added Coverage
- Gallstone radiographic visibility and composition.
- Dropped gallstones after laparoscopic cholecystectomy.
- Porcelain gallbladder malignancy-risk caution.
- Calcified primary hepatic masses.
- Cystic pancreatic mass calcification patterns.
- CT versus radiographic visibility of urinary stones.
- Renal cyst calcification risk morphology.
- Vas deferens calcification pattern.
- Connective-tissue calcinosis syndromes.
- Pseudomyxoma peritonei versus lymphangioma calcification patterns.
- Pelvic morphology cards for phleboliths, fibroids, dermoids, bladder calculi, and vascular aneurysm.
- Separate sclerosing peritonitis and sclerosing mesenteritis cards.
- Core-supported cortical nephrocalcinosis concept.

## Removed Cards
- Row 82 (C096F7CA57B1): removed/split overloaded prompt: What named pelvic calcification morphologies are especially useful?
- Row 83 (D633033877DC): removed/split overloaded prompt: What patterns suggest chronic fibroinflammatory peritoneal or mesenteric disease?

## Remaining Uncertainties
- No external literature was added.
- No generated cards or corrected cards rely on Core pages beyond the visible core_evidence.txt/source_package.txt support.
- Source images were audited against metadata-selected primary images; archived duplicate STATdx images were not reintroduced as new image cards.

## Files Written
- corrected_cards.tsv
- corrected_cards_anki_import.tsv
- audit_report.md
- _codex_audit_done.txt

## Media Filename Repair
- Repaired after user report: front/plain image fields now use metadata.downloadFiles copied media filenames, e.g. `SDX-23_STATdx_plain_SDX-23_STATdx_image_23_plain_c77ab050.jpg`, instead of the shorter registry filename.
- Annotated/back image filenames were checked against metadata.downloadFiles as well.
