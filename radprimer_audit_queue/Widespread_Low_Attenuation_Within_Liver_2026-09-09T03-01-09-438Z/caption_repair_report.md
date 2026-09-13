# Caption repair: Widespread Low Attenuation Within Liver

Only the two caption fields on the 18 image notes were repaired. All 25 non-image notes, every Clinical_Context/ID, the front images, image grouping/order, questions, answers, differentials and repeated summaries are unchanged.

The prior audit incorrectly stripped inline arrow icons and altered caption spacing and wording. The earlier master-source teachingCaption also differed from the original. This repair uses the raw original STATdx caption, verified character-for-character against the source metadata and the audit metadata. It does not use the cleaned teachingCaption or the already damaged generated TSV.

All 23 individual captions now match the original source exactly in each Image_Annotated stackCap, including HTML, spaces, punctuation and arrow tags. Original_Caption contains those same untouched captions in source image order, separated only by <br> for grouped images. There are 29 arrow references in each caption field (58 total across both fields).

All four required original icons (arrow_BS.png, arrow_WC.png, arrow_WO.png, arrow_WS.png) were copied unchanged from the previously repaired Focal Hypervascular Liver Lesion bundle. Its recorded provenance identifies the original Anki collection.media assets; hashes were checked against that record before copying. All 46 diagnostic images were also copied unchanged into this bundle's media folder. No icon was redrawn or substituted. See caption_icon_integrity.json and media_integrity.json.

Use corrected_image_cards_anki_import.tsv for the 18-note image-only update. The complete 43-note corrected exports have also been updated consistently. The TSV alone does not copy media into Anki; the media folder contains every referenced diagnostic image and original arrow icon. No live Anki import or collection write was performed.

The pathology image rules, generated FULL_PROMPT and extension audit instructions were already fixed on September 9 to preserve original caption HTML exactly. This older audit preceded that fix. The local correction helper was also repaired so rerunning it cannot strip captions again; the validator now distinguishes auxiliary icons from diagnostic images and checks raw caption equality.

Completed: 2026-09-10T00:32:53Z. Exact-caption, unchanged-field, TSV-round-trip and media-hash checks passed. Browser preview validation is recorded separately in _codex_review/caption_preview_validation.json after rendering.
