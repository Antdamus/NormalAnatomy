# Card Audit Report: Testicular Torsion

Created: 2026-07-30T10:57:40Z
Imported bundle: C:\Users\josem.000\NormalAnatomy\radprimer_audit_queue\Testicular_Torsion_2026-07-30T10-55-24-225Z

## Inputs reviewed
- source_package.txt
- generated_cards.tsv
- metadata.json
- audit_instructions.md
- core_evidence.txt

## Source gate
- Core evidence status: NOT_PROVIDED.
- Corrected cards are treated as RadPrimer + STATdx fused master-source cards only.
- Removed unverified Core Radiology page/source claims from every card summary field.

## TSV audit
- Input rows: 59
- Input column count: 22 columns on every row.
- Corrected rows: 66
- Corrected column count: 22 columns on every row.
- Anki import wrapper written because metadata.json contains an Anki target deck and note type.

## High-signal repairs
- Replaced repeated "Core + RadPrimer + STATdx" summary/provenance block with a source-accurate RadPrimer + STATdx summary and explicit Core-not-provided limitation.
- Preserved selected image case cards and same-patient image clusters from metadata.json.
- Narrowed overloaded high-yield cards covering first-line US, operative management, and anatomic subtype framework.
- Repaired the focal infarction differential card to use source-supported "testicular tumor" wording rather than unsupported hypovascular tumor phrasing.
- Added 7 source-supported high-yield cards: Doppler low-flow settings, side-to-side comparison, contralateral orchiopexy rationale, torsion vs non-cord infarction discriminator, peripheral-flow pitfall, testicular patching/fragmentation mechanism, and post-detorsion hyperemia trap.

## Removed cards
- No whole rows were removed as metadata/bookkeeping cards; the detected bookkeeping problem was provenance text embedded in the repeated summary field, which was corrected globally.

## Remaining limitations
- core_evidence.txt explicitly states Core evidence was not captured, so no Core-specific claim should be considered verified from this corrected deck.
- Differential lists were retained only where supported by RadPrimer/STATdx or by the existing caption-grounded differential-drill structure; no external literature was added.
