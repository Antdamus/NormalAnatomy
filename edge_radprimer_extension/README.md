# RadPrimer Prompt Runner Edge Extension

This unpacked Edge extension replaces the manual console-paste step for RadPrimer article extraction.

**Curriculum source library:** on an organ lesson page, use **Download curriculum
sources** to save Basic, Intermediate, or both under one topic folder. The library
preserves complete articles, references, captions, and both image versions, with
resumable downloads and a report of repeated images across articles. See
[collection and recovery](docs/source-library.md). Reload the extension and
refresh RadPrimer once to activate the button. Version 4 also adds **Add to source
collection** on STATdx article pages, using the existing STATdx extractor and
shared image downloader. Selected supplements live under the same topic folder
with source-labelled image names. Review requests track missing differentials,
more image examples, and deeper coverage; Codex review suggestions can be imported
and linked to the articles you choose.
Version 5 simplifies collection to one **Download to [topic]** button. STATdx
links are added and downloaded together; review notes are optional and collapsed,
and related articles use searchable checkboxes.

**Visual lectures:** choose **Generate visual lecture** to build an English
pattern map first, followed automatically by a lecture using that map and the
full source. The study page saves cases, original images and narration together,
with Speechify playback and live-reader following. The popup also opens the saved
lecture library. See [setup, behavior and recovery](docs/visual-lectures.md).
This replaces the older narrative-only instructions below; card workflows retain
their existing behavior.

## Build packaged prompts

Run this from the repository root whenever you update prompt files:

```powershell
python edge_radprimer_extension\build_prompts.py
```

This copies the current Normal and Pathology prompts into `edge_radprimer_extension/prompts`.

## Install in Edge

1. Open `edge://extensions`.
2. Enable `Developer mode`.
3. Choose `Load unpacked`.
4. Select `C:\Users\josem.000\NormalAnatomy\edge_radprimer_extension`.

## Use

1. Open a RadPrimer article page.
2. Click the extension button.
3. Choose `Pathology / disease` or `Normal anatomy`.
4. Choose the mode.
5. Set image selection:
   - `all`
   - `none`
   - `1,2,5`
6. Optionally set case groups like `1,2; 5,6`.
7. Optionally enable `Open ChatGPT project and fill box`.
8. Click `Extract + copy prompt package`.

The complete prompt package is copied to the clipboard. If image downloads are enabled, selected images are staged under `Downloads\RadPrimer` using the same filename pattern as the old console workflow. Retries preserve existing files. The extension reuses matching completed downloads, then its persistent image cache, and fetches only missing image variants. Source comparison, master-source evidence, card runs and IO queues share this cache. A new bundle can need a local copy under a different filename without fetching the source image again. Plain, annotated and different-resolution URLs remain separate. Status messages distinguish existing files, cached copies and new source downloads. See [image reuse](docs/image-reuse.md).

To mirror images into Anki, start `tools\start-radprimer-anki-watcher.cmd` and leave it open. The watcher copies stable image files from `Downloads\RadPrimer` into `C:\Users\josem.000\AppData\Roaming\Anki2\User 1\collection.media`, matching the manual copy-paste workflow.

If you already ran a prompt and forgot to enable image downloads, use `Download images only` from the popup or the image icon on the RadPrimer page. It forces the image download stage for the current article without opening ChatGPT or Speechify.

For Image Occlusion prep, use `Build IO queue` in the in-page modal or popup. It forces an all-image annotated run, downloads annotated images into `Downloads\RadPrimerIOQueue\images`, writes the extracted package to `Downloads\RadPrimerIOQueue\source_package.txt`, and writes the Anki queue to `Downloads\RadPrimerIOQueue\queue.json`. The Anki add-on can load that default queue directly.

The RadPrimer image lightbox is also enhanced by the extension. Gallery thumbnails receive visible one-based image number badges that match the narrative prompts, and the main image or zoom icon opens a custom viewer with wheel zoom, button zoom, drag-to-pan, double-click zoom toggle, reset, and Escape-to-close.

When ChatGPT project handoff is enabled, the extension opens the configured project URL and fills the composer with:

```text
make sure you do not truncate the text and read the entire message

[full extracted prompt package]
```

It does not submit the message. If ChatGPT changes its composer DOM and automatic filling fails, the full package remains on the clipboard for manual paste.

If `Submit, wait, and copy final response` is enabled, the extension will:

1. Fill the ChatGPT composer.
2. Click the send button.
3. For narrative modes only, wait until the assistant response appears finished or the timeout is reached.
4. For narrative modes only, copy the latest assistant response to the clipboard and optionally send it to Speechify.

For non-narrative card modes, automatic submission stops after the prompt is sent to ChatGPT. If `Auto-group card modes before final run` is enabled and no case map is already supplied, the page button first runs a grouping-only ChatGPT preflight, captures the returned `INCLUDE` / `CASE_MAP`, applies that grouping to the saved settings, and then launches the final card prompt.

If `Capture card audit bundle` is enabled for a card mode, the final card prompt asks ChatGPT to create a downloadable TSV and print the `RADPRIMER_CARD_TSV_DOWNLOAD_READY` sentinel. The extension then clicks the ChatGPT TSV download button, routes that download directly into the audit bundle as `generated_cards.tsv`, and stages the rest of the bundle under `Downloads\RadPrimerAudit`. Each bundle includes:

- `source_package.txt`
- `generated_cards.tsv`
- `core_evidence.txt`
- `metadata.json`
- `audit_instructions.md`

`core_evidence.txt` is captured from a required ChatGPT evidence block. If ChatGPT used Core Radiology from project files or uploaded PDFs that Codex cannot directly see, it must summarize the visible Core source basis, the specific Core facts used, and which cards those facts affected. If no Core content was used or retrievable, the file records that status so the audit can avoid unverifiable Core-only claims.

If `Create Anki import TSV after audit` is enabled, the audit instructions also ask Codex to write `corrected_cards_anki_import.tsv`. That file prepends Anki text-import directives such as `#separator:tab`, `#html:true`, `#notetype:core_rad_notetype_v2`, and `#deck:<target deck>` to the corrected rows. In auto routing mode, the extension reads the RadPrimer breadcrumb, drops the generic `Basic` level, maps common sections such as `Musculoskeletal` to `MSK`, and builds the deck under `Corebook` for pathology runs or `RadprimerNormal` for normal runs. For example, `Basic > Musculoskeletal > Musculoskeletal: Trauma > Introduction to Osseous Trauma > Pelvis Stress Fractures` becomes `Corebook::MSK::Trauma::Introduction to Osseous Trauma::Pelvis Stress Fractures`. Manual routing mode remains available and uses `Manual parent deck + article title`.

Codex automation can import completed bundles directly from `Downloads\RadPrimerAudit` into `C:\Users\josem.000\NormalAnatomy\radprimer_audit_queue` with `tools\import-latest-radprimer-audit-bundle.ps1`. You can also start `tools\start-radprimer-audit-watcher.cmd` and leave it open if you want live mirroring. The local queue lets Codex audit bundles against the original article package and write corrected outputs without extra file-access prompts.

After an audit bundle is saved, the ChatGPT tab replaces the clipboard with a short wake-up message for Codex. Paste that message into this thread when you want the bundle audited; there is no always-on heartbeat required.

The `Build master source` button is a Codex handoff, not a ChatGPT synthesis step. First export comparison sources from the matching RadPrimer and STATdx article pages. The button then stages a paired request bundle under `Downloads\RadiologyMasterSource`, including `RadPrimer_source_package.txt`, `STATdx_source_package.txt`, source metadata, image registries, and `master_source_request.md`, and copies a Codex wake-up message to the clipboard. Codex can import the newest completed request into `C:\Users\josem.000\NormalAnatomy\master_source_queue` with `tools\import-latest-master-source-bundle.ps1` and write `master_source_package.txt`, `master_source_manifest.json`, `image_registry.json`, `master_source_import.json`, `master_source_report.md`, and `_codex_master_source_done.txt` there.

Comparison and master-source bundles also stage unannotated image evidence when URLs are available. Source-comparison exports write a source-specific `*_image_evidence_manifest.json` plus a matching image-evidence folder. Master-source request bundles write `image_evidence_manifest.json` and `image_evidence\RadPrimer` / `image_evidence\STATdx` files. Codex should use these actual image files before calling two images exact duplicates; caption-only similarity is treated as uncertain or near-duplicate, and visually distinct same-pattern images stay in the primary teaching set as recognition reinforcement.

If RadPrimer and STATdx use different article titles for the same topic, set the same `Source pairing key` before exporting each comparison source, for example `aortic-trauma`, `splenic-trauma`, or `Charcot (Neuropathic)`. Comparison exports with the same key land in the same visible folder under `Downloads\RadPrimerSourceComparison\<key>`, while individual filenames still include the source and article title. If no key is set, the extension first tries the normalized article title and then a conservative fuzzy-title match with anatomy/pathology aliases such as `traumatic` -> `trauma`, `aortic` -> `aorta`, and `splenic` -> `spleen`. Ambiguous matches are rejected and the error lists the closest cached candidates so you can set an explicit pairing key.

After Codex finishes the fused source, import `master_source_import.json` from the popup's `Import master source files` control and enable `Use imported RadPrimer + STATdx master source`. Narrative and card runs then use the fused source package instead of the live page extraction, while still preserving the normal prompt format. The master source prompt includes `MASTER IMAGE REGISTRY` and `MASTER SOURCE MANIFEST` blocks so ChatGPT and Codex can distinguish `RP-05`/`RadPrimer image 5` from `SDX-04`/`STATdx image 4`. Audit metadata also keeps `imageRegistry`, `masterImageIds`, and `sourceQualifiedImages`, so mixed-source cards can be traced back to the exact source image.

For a reviewed curriculum with several lectures, import one `master_source_library.json`. The extension stores every complete lecture bundle, activates the library's default lecture, and fills the **Lecture in imported library** menu. Choose a lecture and click **Use selected lecture** before running the visual-schema, narrative, or card workflow. Each bundle still contains whole source articles and its own manifest/image registry; selecting a lecture changes the active master source without re-importing the library. Single `master_source_import.json` imports remain supported.

Curriculum card runs now use an explicit image selection from the illustrated review. Toggle **Selected for cards** or **Not selected for cards** beside each image or in the enlarged viewer, then **Prepare selected images for cards**. All images remain available in the lecture. Only the selected media enters the next card run; saved choices survive narration updates and portable export/import. The runner also offers **Mixed anatomy and pathology** and **Use master bundle recommendation**. Pancreas Foundations recommends Mixed; the other five Pancreas lectures recommend Pathology. See `docs/visual-lectures.md` for the complete review-to-card workflow.

When the Speechify audio pill can identify a source-qualified current image, its jump action is also source-aware. A `RadPrimer image` jump stays in RadPrimer; a `STATdx image` jump focuses an open STATdx article tab and dispatches the image navigation there. Keep the relevant source article tabs open if you want cross-source image jumping during a fused lecture.

This mode is best-effort because ChatGPT's web UI can change. The ChatGPT page also shows a floating status/result box while it waits, clicks the TSV download, and copies the audit wake-up message. Keep the extension popup open when possible. If waiting or scraping fails, the original full prompt package remains on the clipboard.

## Notes

- The extension does not send data anywhere except the active RadPrimer tab and local browser clipboard/downloads.
- If ChatGPT handoff is enabled, the package is also inserted into the configured `https://chatgpt.com/...` page.
- It uses your packaged prompt files. Re-run `build_prompts.py` after editing prompt modules.
- This first version automates extraction, prompt packaging, copying, image downloads, and best-effort ChatGPT project composer filling.

## Avoiding repeated Corebook questions

Corebook card runs now require the updated Anki bridge and a fresh retained-card
snapshot. This covers page-runner, grouped/master-source, popup-copy and Codex
card modes. Narrative/source-comparison/image-only workflows are unaffected.
Keep Anki open. If it cannot be read, generation stops instead of assuming the
collection is empty. Reload this unpacked extension after updating it.

Large-bank comparisons keep every card in the target scope and matching organ
deck labels across specialties. Global caption matches require uncommon terms
within the same caption, so generic caption words do not pull in almost the
entire collection. Large prompts factor out repeated field names and deck paths.
If that layout is still too large, group defaults, identical-ID aliases and a
table of exactly repeated complete Q/A strings provide a second lossless layout.
No questions/answers are shortened and no selected cards are dropped. Comparisons
that still exceed the 350,000-character inline budget are attached as a complete
JSON file to the configured ChatGPT conversation. The prompt requires reading
every full Q/A from that file before drafting and stops if it cannot be read.
The extension waits for the file to finish uploading before sending; failed,
unfinished or missing uploads stop the send. For multipart source prompts, the
file accompanies the final generation message. Deck routing stays the same.
Reload the extension and refresh the ChatGPT page to activate this fallback.
Clipboard and source packages retain the full comparison for local use.

Prompts compare question/answer learning objectives across related topics and
card categories. Current Anki cards are authoritative; generated TSVs are never
recorded as accepted. Removal history prevents previously observed deleted or
revised questions from being recreated automatically. Distinct useful image
examples, caption HTML/icons, atomic groups and repeated summaries are preserved.

Audit bundles include `corebook_snapshot.json` and `corebook_context.txt`, or an
explicit refresh-required status if Anki closed while generation was running.
The audit must refresh again and write `card_overlap_review.json`, then pass
`tools/corebook_card_guard.py validate` before the completion marker. Full setup,
limitations and commands are in `../corebook_card_registry/README.md`.
