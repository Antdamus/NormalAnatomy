# Image reuse

Source-comparison evidence, master-source evidence, card images and IO images use
`image-download-cache.js`. A retry no longer clears `Downloads/RadPrimer` or the
IO folder. Queue and prompt contents still come from the current selection.

The cache identifies a rendition by its full source URL, including size and
annotation parameters. It validates and retains the original image bytes in
IndexedDB before saving a destination file, so an interrupted local write does
not require another source fetch. Stored blobs are checked against their SHA-256
and decoded before reuse. Sign-in HTML and damaged images fail validation.

At an existing destination, the latest matching browser download must be
complete, present and nonempty. Its source must match, either through the
original direct download URL or through a saved receipt with the download ID
and byte size. This check relies on Edge's download metadata; it is not a fresh
checksum of the destination file. Chromium's `exists` field can update after
the search returns ([downloads API](https://developer.chrome.com/docs/extensions/reference/api/downloads#type-DownloadItem)).
When a destination must be recreated, its bytes come from the validated cache.

Master-source evidence normally contains the plain rendition of every source
image, with annotated evidence used only when plain is unavailable. A later
card run may need annotated renditions as well. Those are fetched once when
missing. New bundle folders and Anki-facing filenames require local copies.

## Existing bundles

Older downloads with matching browser history are adopted automatically. When
that history is gone, existing master-source files and exact source-qualified
downloads can be imported into the optional private extension seed cache:

```powershell
python tools/seed_radprimer_image_cache.py --bundle <master-source-bundle>
```

The Python environment must include Pillow. The utility reads the bundle's
`master_source_import.json`, verifies evidence checksums when supplied, fully
decodes candidate images, and copies unchanged bytes into
`edge_radprimer_extension/local-image-cache/`. It makes no network requests and
does not change source files or Anki. The seed folder is ignored by Git and is
not a web-accessible extension resource. Reload the extension after seeding.
The extension migrates a seeded rendition into IndexedDB on first use.

Run `node --test edge_radprimer_extension/tests/image-download-cache.test.cjs`
for cache, retry, corruption, variant and routing checks. The optional browser
test also exercises real IndexedDB persistence and browser image decoding:
`node edge_radprimer_extension/tests/image-cache-browser.cjs` (requires Playwright).
