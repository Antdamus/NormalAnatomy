# Card Audit Report: Liver Mass With Central or Eccentric Scar

## Bundle
- Imported bundle: C:\Users\josem.000\NormalAnatomy\radprimer_audit_queue\Liver_Mass_With_Central_or_Eccentric_Scar_2026-09-04T04-53-50-213Z
- Compared: source_package.txt, generated_cards.tsv, metadata.json, audit_instructions.md, and core_evidence.txt.
- Core evidence status: NOT_PROVIDED. Core-only claims were treated as unverified unless directly supported by source_package.txt.

## Main Corrections
- Preserved the 22-column TSV schema and original column order.
- Kept 40 corrected rows with no metadata/bookkeeping cards.
- Preserved selected STATdx image filenames, annotated image stacks, exact source captions, and grouped image clusters for the image-recognition cards.
- Replaced unsupported Core-specific high-yield cards, including Core percentage/profile/management/nuclear medicine/ultrasound claims, with RadPrimer/STATdx-supported cards.
- Removed Core attribution from card summaries and image-card explanations; summaries now state RadPrimer + STATdx master source and note that Core evidence was not provided.
- Reworked HCC, adenoma, FNH, hemangioma, cholangiocarcinoma, and Budd-Chiari/NRH mechanism/trap cards to avoid unsupported Core language.
- Labeled limited non-source histology/mechanism clarification explicitly as outside clarification where it helps explain FNH, hemangioma, and adenoma behavior.

## Added Or Replaced High-Yield Coverage
- Differential category structure: common, less common, rare but important.
- Diagnostic framework: true scar versus necrosis/hemorrhage/fat/fibrosis, calcification, enhancement, multiplicity, and associated findings.
- Source-supported discriminators for FNH, giant hemangioma, conventional HCC, adenoma, metastases, fibrolamellar HCC, cholangiocarcinoma, epithelioid hemangioendothelioma, and large regenerative nodules/NRH.
- Cluster-specific teaching points for colon-cancer metastases and Budd-Chiari/NRH pathology correlation.

## Remaining Limits
- core_evidence.txt explicitly says no auditable Core evidence was captured, so no Core-derived claims were retained as verified.
- No external literature search was performed; outside clarification is limited to labeled mechanism/histology explanation inside the affected cards.

## Outputs
- corrected_cards.tsv
- corrected_cards_anki_import.tsv
- audit_report.md
- _codex_audit_done.txt

## Image Filename Repair
- Corrected image src filenames in corrected_cards.tsv and corrected_cards_anki_import.tsv to match metadata.json downloadFiles exactly.
- Replaced short-hash filenames such as SDX-01_STATdx_plain_83eccf99.jpg with bundle media names such as SDX-01_STATdx_plain_Liver_Mass_With_Central_or_Eccentric_Scar1.jpg.
