# Image-caption repair — Focal Hypervascular Liver Lesion

Restored the exact original source captions on all 26 image notes. Only `Image_Annotated` and `Original_Caption` changed. All 38 non-image notes are byte-for-byte unchanged; all IDs, image files, grouping/order and other fields are unchanged.

The prior audit incorrectly deleted 122 inline arrow references. That was an audit error: arrow icons are part of the source captions, not bookkeeping. The repaired fields now match the original generated TSV exactly, and all 40 individual image captions match `metadata.json` `captionOriginal` character-for-character, including HTML, punctuation and spacing.

Use **corrected_image_cards_anki_import.tsv** to update only the 26 image notes in `Corebook::GI::Liver::Focal Hypervascular Liver Lesion`. It retains their original first-field IDs for Anki matching. The full corrected TSV files have also been repaired. No live Anki import was performed.

All seven required original arrow icons already exist in `Anki2/User 1/collection.media`. Their unchanged files were copied into this bundle's `media` folder with all 80 diagnostic files; the latter retain the exact hashes from the prior audit. No image asset was redrawn or substituted. `caption_icon_integrity.json` and `media_integrity.json` record provenance, filenames and hashes.

The extension's audit instructions and audit wake prompt now explicitly require exact original caption HTML, including arrow tags, and separate validation of auxiliary caption media. The pathology image rules and bundled card prompts carry the same requirement. Missing media must be recovered or reported; missing registry entries never authorize stripping captions. The local correction helper and validator have been repaired to enforce this rule. Reload the extension for the updated audit worker instructions to take effect.

Validation passed:

- All 40 source captions match metadata captionOriginal character-for-character, including HTML and spacing
- Image_Annotated and Original_Caption match the original generated fields exactly on all 26 image notes
- Only those two fields changed; all 38 non-image TSV rows are byte-for-byte unchanged
- All note IDs, image filenames, image grouping/order, other answers and summary fields unchanged
- Image-only Anki import has exactly the 26 corrected image notes and the original 22-column schema
- Full TSV and full Anki import have the same 64 rows; quoted TSV and Anki headers verified
- All 202 image references resolve to 80 diagnostic images and seven original caption icons
- All 122 caption icon references restored with their exact original filenames
- All 87 media files decode; all 80 diagnostic hashes match the prior audit; caption icon hashes recorded
- All original input bundle files retain their prior audited SHA-256 hashes
- Preview loads all 80 diagnostic references and 61 inline caption icons at their original 16-pixel size
