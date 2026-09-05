# RadPrimer Card Audit Report: Traumatic Diaphragmatic Rupture

## Bundle
- Imported bundle: C:\Users\josem.000\NormalAnatomy\radprimer_audit_queue\Traumatic_Diaphragmatic_Rupture_2026-08-25T02-57-51-378Z
- Compared: source_package.txt, generated_cards.tsv, metadata.json, audit_instructions.md, and core_evidence.txt.
- Core evidence status: USED AS CORE GAP ONLY. core_evidence.txt explicitly says this is a Core GAP; no Core-derived cards were added.

## Summary
- Input TSV: 48 rows, 22 columns.
- Corrected TSV: 58 rows, 22 columns.
- Image cards retained: 23 diagnosis cards plus 5 image differential drills.
- Anki import file written for note type core_rad_notetype_v2 and deck Corebook::GI::Peritoneum, Mesentery, and Abdominal Wall::Traumatic Diaphragmatic Rupture.

## Major Corrections
- Preserved the no-header 22-column TSV schema and column order.
- Preserved all 23 selected primary image diagnosis cards from metadata.masterImageIds.
- Removed no image rows; no metadata/bookkeeping prompt cards were found.
- Split overloaded cards covering all major CT signs, secondary CT clues, radiographic findings, and complications into focused one-concept cards.
- Added source-supported high-yield cards for direct diaphragmatic defect, dangling diaphragm sign, absent diaphragm sign, collar sign, herniated-organ order, paired thoracoabdominal secondary signs, radiographic NG-tube pattern, hydropneumothorax mimic, intrapericardial herniation, tension gastrothorax, side-specific associated injuries, masking findings, and lateral-versus-frontal blunt mechanism.
- Kept mechanism explanations tied to the RadPrimer + STATdx source package. No outside clarification was added as a verified source fact.

## Removed Or Replaced Cards
- Replaced overloaded card: What CT secondary clues should raise concern for an occult traumatic diaphragmatic rupture?
- Replaced overloaded card: What are the major CT signs of traumatic diaphragmatic rupture?
- Replaced overloaded card: What complications of traumatic diaphragmatic rupture are source-supported?
- Replaced overloaded card: What radiographic findings can suggest traumatic diaphragmatic rupture?

## Remaining Notes
- Core Radiology is treated as a documented gap for this entity; the deck remains RadPrimer + STATdx source-supported.
- Differential drill content remains tied to source-listed differentials and source-described image patterns.
- The repeated summary field was preserved because it is part of the note type, not a bookkeeping card.
