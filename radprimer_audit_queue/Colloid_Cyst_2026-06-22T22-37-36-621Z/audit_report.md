# Colloid Cyst Card Audit Report

Bundle: `C:\Users\josem.000\NormalAnatomy\radprimer_audit_queue\Colloid_Cyst_2026-06-22T22-37-36-621Z`
Source basis: Core + RadPrimer/STATdx synthesis.
Core status: `USED`; Core-specific claims were limited to the supplied `core_evidence.txt` facts. Expanded imaging, risk, treatment, and differential details were treated as RadPrimer/STATdx-supported only.

## Input Review

- Imported staged bundle from `Downloads\RadPrimerAudit\Colloid_Cyst_2026-06-22T22-37-36-621Z` using the bundled importer.
- Reviewed `metadata.json`, `audit_instructions.md`, `core_evidence.txt`, `source_package.txt`, and `generated_cards.tsv`.
- Generated TSV input: 33 rows, all 22 columns.
- Anki target deck: `Corebook::Neuro::Brain::Introduction to Brain Neoplasms and Cysts::Colloid Cyst`.

## Corrections Made

- Preserved the original 22-column schema and column order.
- Fixed image filenames in corrected TSV outputs to match the actual downloaded media names in `Downloads\RadPrimer` (removed the erroneous `_image_XX` segment).
- Corrected deck routing to drop RadPrimer UI container crumbs `All Categories` and `Basic`; target now starts at `Corebook::Neuro`.
- Normalized `canonicalDeckPath` in `source_package.txt` so source routing drops `All Categories` and `Basic` before applying the deck root.
- Removed no pure bookkeeping rows; the generated rows were content cards rather than metadata-only notes.
- Cleaned the DWI/nonrestriction unknown card context so it no longer says "intraventricular lesion" on the front.
- Corrected the differential drill wording so the question matches the four listed mimics.
- Split overloaded high-yield cards:
  - MRI signal card split into T1, T2, FLAIR/DWI, and enhancement/apoplexy cards.
  - Stability/enlargement predictor card split into separate stability and enlargement cards.
  - Management/reporting card split into immediate clinician notification and treatment/observation framework cards.
  - Broad differential card split into focused age, subependymoma, neurocysticercosis, vascular mimic, and other intraventricular mimic cards.
- Added one focused location/size card for the >99% foramen of Monro location and mean-size framework from the source package.
- No outside literature was added; therefore no outside clarification labels were needed.

## Output Summary

- Corrected TSV rows: 43
- Corrected TSV columns: 22 on every row
- Anki import file: written
- Encoding: UTF-8 without BOM

## Remaining Notes

- The summary field remains repeated across rows because it is part of the established note type and was already source-grounded.
- Image-recognition rows were preserved because their image stacks match the selected image teaching clusters in `metadata.json` and `source_package.txt`.
