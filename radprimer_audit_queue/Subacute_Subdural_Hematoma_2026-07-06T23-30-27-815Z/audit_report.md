# RadPrimer Card Audit Report

Bundle: `C:\Users\josem.000\NormalAnatomy\radprimer_audit_queue\Subacute_Subdural_Hematoma_2026-07-06T23-30-27-815Z`
Topic: Subacute Subdural Hematoma
Deck target: `Corebook::Neuro::Brain::Primary Effects of CNS Trauma::Subacute Subdural Hematoma`

## Files checked

- `metadata.json`
- `audit_instructions.md`
- `core_evidence.txt`
- `source_package.txt`
- `generated_cards.tsv`

## Source handling

- Used the fused RadPrimer + STATdx master source as the main article source.
- Treated Core evidence as limited to the explicit `core_evidence.txt` ledger: crescentic extraaxial SDH beneath dura, crossing cranial sutures, subacute isodense SDH around 1-3 weeks, and CT clues of mass effect/white-matter buckling/apparently thickened cortex.
- Noted an internal tension: `source_package.txt` says no auditable Core source was supplied in the master-source section, while `core_evidence.txt` and `metadata.json` mark Core as `USED`. The corrected deck only retains Core-specific claims present in `core_evidence.txt`.
- No outside literature was added.

## Main corrections

- Preserved the exact 22-column schema and column order.
- Replaced the repeated full-deck mega-summary on every row with a compact source-scoped summary.
- Added missing selected-image teaching coverage for STATdx image 1 mechanism graphic and STATdx image 2 CT-density evolution graph.
- Added a focused membrane/pathology mechanism card covering granulation tissue, resorbing blood products, outer membrane rebleeding, inner membrane liquefaction, and the source-stated delayed hypersensitivity/neomembrane concept.
- Removed the low-yield male-predominance card because it did not materially improve diagnosis, reporting, risk, or mechanism training compared with the higher-yield imaging cards.
- Converted the DWI/unstable outer-rim row from a differential drill into a high-yield image card; "unstable subdural membrane" is a risk/membrane clue, not a differential diagnosis.
- Tightened image diagnosis backs to emphasize the specific source-supported discriminator for each image instead of repeating the whole article on every card.
- Removed the unsupported broad Core phrasing from summaries and kept only the Core facts directly auditable in the bundle.

## Output validation

- `corrected_cards.tsv`: 53 rows, 22 columns each, UTF-8 without BOM, no header row.
- `corrected_cards_anki_import.tsv`: Anki directives prepended, no field-header row after directives.
- `audit_report.md` and `_codex_audit_done.txt` written in this bundle folder.
