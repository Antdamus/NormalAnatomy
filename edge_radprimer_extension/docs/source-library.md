# Curriculum source library

The **Download curriculum sources** button appears on RadPrimer organ lesson
pages. This is an archival download and review handoff. It does not create cards,
generate lectures, send article content to another service, or change progress
and bookmarks in RadPrimer.

## Activate and collect

1. Reload the unpacked **RadPrimer Prompt Runner** extension in Edge, then refresh
   the RadPrimer lesson page.
2. Click **Download curriculum sources** below the topic heading.
3. Choose **Basic**, **Intermediate**, or both. The collector follows the site's
   curriculum links and matches the complete specialty/topic breadcrumb. It
   rejects missing or ambiguous matches. A matching lesson URL can also be added
   manually.
4. Click **Download to [topic]** (for example, **Download to Pancreas**) and keep the collection tab open.
5. Use **Show folder** to open the result. Once complete, **Copy review request**
   prepares a local Codex handoff for whole-article combination recommendations.

Existing article, ChatGPT and Speechify runs should finish before reloading the
extension. No new permissions are required by this feature.

## Add selected STATdx sources (version 5)

On a STATdx article, click **Add to source collection**. Choose an existing organ
collection, such as Pancreas. Check the filled-in link or paste up to 20 article
links, one per line, under **STATdx articles**. Click **Download to Pancreas**.
This single action adds the articles and downloads their text, captions and both
image versions. No notes or related-article selections are required.

**Add a note or connect related articles (optional)** is collapsed by default.
Open it to record a reason, lesson/group name, or saved review suggestion. A
searchable checkbox list lets you connect archived articles for a later comparison.
RadPrimer curricula are collapsed when entering from STATdx, and expanded when
entering from a RadPrimer lesson. The download summary states exactly which
curricula, links and saved STATdx selections are included. Progress and errors
appear beside the download button. Retry uses the same button and saved work.

**Download options** holds the optional source-text refresh. **Review suggestions
· for later** holds the gap tracker and review imports. These are not required
to download an article.

This calls the existing `statdx-content-extractor.js` through its new
`SOURCE_LIBRARY_STATDX_CAPTURE` handler. Its title, breadcrumb, Caption-view,
image ordering and full-size URL helpers are shared with the existing prompt
exporter. The source-library mode also preserves original HTML and captions,
without the prompt exporter's Anki filename rewrites. Image downloads use the
same shared cache and filename routing as the other extension workflows.

The selected article's linked references and cases are included. Cases retain
expanded history, descriptions, authors and local image order; shared case
descriptions are explicitly labelled as case captions. Anatomy/DDx tabs that
list other articles are saved as related-article catalogs, not mistaken for
images belonging to this article. Those articles are not recursively downloaded.
Native gallery/case/reference counts are checked when exposed; missing content
is flagged. When no native gallery total is exposed in Caption view, the saved
count basis says so. STATdx uses the existing extractor's size=1000, quality=90
plain and annotated image routes.

STATdx archives live in `STATdx/<article title>--<id>/` within the same topic
folder. Image names use `STATdx - <title> - 001 - unannotated.jpg` and
`STATdx - <title> - 001 - annotated.jpg`. Combined sections have sequential
numbers; source section and original section/case numbers remain in images.json.
Archive IDs use `statdx:<native ID>` so identical native IDs in RadPrimer and
STATdx never overwrite one another. Exact byte/pixel matching still crosses
both sources; source ID matching stays within its originating source.

## Review requests and coverage gaps

**Copy review request** asks Codex to review actual text and images, propose
whole-article packs, and produce `combination-recommendations.md`,
`coverage-review.md`, and an importable `review-needs.json`. This does not run a
clinical review automatically. Suggestions should name concrete missing examples
or similar-looking differentials, with reasons and useful STATdx search terms.
It does not assume those topics or images are available in STATdx.

Use **Import review requests from Codex**, or **Record a review request** for
your own notes. Each request can link to supplemental articles. The screen
distinguishes **Looking for sources**, **Sources queued**, **Ready for review**,
**Reviewed**, and **Not needed**. Downloading an article never marks a request
reviewed automatically. **Add a source** fills its reason and pack into the
STATdx form. You can copy search terms and open STATdx to investigate.

Import format (the collection key and article IDs must match collection.json):

```json
{
  "version": 1,
  "collectionKey": "gastrointestinal / pancreas",
  "needs": [{
    "id": "stable-request-id",
    "kind": "more-images",
    "title": "Specific topic or example",
    "reason": "The concrete gap identified in the reviewed sources",
    "pack": "Proposed study pack",
    "searchTerms": "Terms to search in STATdx",
    "relatedArticleIds": []
  }]
}
```

Supported kinds: `more-images`, `missing-differential`, `deeper-coverage`,
`other`. Up to 100 requests can be imported per file. Stable IDs update existing
requests; unchanged requests retain their review state. The collector exports
current state as `review-tracker.json` and readable `review-tracker.html`.
It never overwrites `review-needs.json`, coverage notes, or recommendations.
Queue edits, review imports and downloads share the same collection write lock.

## Folder layout

For the pancreas, the default destination is
`Downloads/RadPrimerLibrary/Gastrointestinal/Pancreas/`:

```text
index.html                     offline collection overview
collection.json                article status, curriculum membership, file inventory
image-overlap.html / .json      cross-article exact-match candidates
review-request.md              instructions for a subsequent editorial review
review-tracker.html / .json     coverage requests, linked sources, review status
Basic/<article title>--<id>/
  article.html                 full article, references, linked image-pair gallery
  article.txt                  full readable article text, including references
  source.json                  original source HTML, clean HTML, metadata, captions
  images.json                  ordered source images, original IDs, file paths/hashes
  images/
    <article title> - 001 - unannotated.jpg
    <article title> - 001 - annotated.jpg
    <article title> - 002 - unannotated.jpg
    <article title> - 002 - annotated.jpg
Intermediate/<article title>--<id>/
  ...
STATdx/<article title>--<id>/
  ...                          supplemental article with source-labelled images
_resources/                    caption arrow icons and inline source images
```

Each article's image filenames include its title, zero-padded original gallery
number, and annotation version. Long titles are shortened in filenames only.
An image used by multiple articles has a named file in each article's folder;
the source cache reuses the downloaded bytes, and the overlap report still
tracks matching original IDs and hashes across articles. Every occurrence,
caption, diagnosis group, original number and membership is retained. An article
listed in both levels is archived once and linked from both curriculum lists.
Adding Intermediate later extends the same topic folder. Archived articles are
not deleted when a curriculum changes. Shared files are referenced by relative
paths, so move/copy the **entire topic folder** together.

Version 3 upgrades older browser checkpoints to this naming on the next run.
Existing exported files can also be organized locally while the collection stays
paused, without contacting RadPrimer:

```powershell
node edge_radprimer_extension/tools/organize-source-library.cjs "<topic folder>"
node edge_radprimer_extension/tools/organize-source-library.cjs "<topic folder>" --apply
```

The first command previews the changes. Applying verifies image hashes, updates
the article links and inventories, and preserves the old layout under
`_backup_before_image_rename`. It leaves incomplete articles incomplete.

## Completeness and recovery

The collector preserves source HTML in inert JSON and exports sanitized,
script-free HTML for offline reading. References are retained independently of
the existing prompt extractor. It validates the gallery count against the page's
reported total and flags missing IDs/captions. Both xlarge image variants exposed
by RadPrimer are requested. Unsupported/unavailable variants are reported, never
synthesized or silently substituted.

Source image bytes are validated by the shared cache, including raster decoding
and SHA-256. The overlap inventory also includes hashes of decoded pixels.
Source IDs, exact bytes and exact pixels are distinct matching bases. Crops,
recompression and different views may require visual review; a report with no
exact matches is not a claim that no visual duplicates exist. No images are
removed from the source archive by the report.

Progress is checkpointed in the extension's IndexedDB. **Pause** finishes the
current file, saves partial article/index files, and closes only the collector's
own source tab. Starting again retries incomplete work. Reopening from the same
topic reloads its checkpoint. Complete files are checked against Edge download
records and reused; missing local files are restored through the image cache.
This existence/size check is based on browser download metadata, not a fresh
checksum read of every destination file. Clearing extension data removes the
checkpoint/cache but does not remove the exported folder.

**Refresh saved article text** re-reads the source page. It preserves downloaded
image reuse by source URL; it is not a forced cache purge. Files generated by the
collector use deterministic names and are overwritten during refreshed exports.
Keep manual notes and combination recommendations in separate files, such as
`combination-recommendations.md`, which the collector never writes.

`collection.json` and the overview explicitly distinguish collecting, paused,
complete and needs-attention states. Full text/media export failures prevent an
article from being marked complete. A global Web Lock prevents two collection
tabs from writing the library at once. Temporary source tabs are independent of
the user's existing RadPrimer tab.

## Validation

```powershell
node --test edge_radprimer_extension/tests/source-library.test.cjs edge_radprimer_extension/tests/source-library-worker.test.cjs edge_radprimer_extension/tests/image-download-cache.test.cjs
node --test edge_radprimer_extension/tests/source-library-organize.test.cjs
node edge_radprimer_extension/tests/source-library-browser.cjs
node edge_radprimer_extension/tests/source-library-workflow.cjs
node edge_radprimer_extension/tests/statdx-library-browser.cjs
node edge_radprimer_extension/tests/image-cache-browser.cjs
```

Browser tests require Playwright (the bundled runtime's node_modules can be set
as NODE_PATH). They use isolated fixtures and no live account. Coverage includes
full references/tables/captions, gallery completeness, two-level discovery,
source membership, reuse across articles, interrupted downloads, reload recovery,
missing-file repair, filename routing and repair, pause/resume, and desktop/mobile layout.

To independently verify exported files against their recorded hashes, gallery
counts, captions and offline links (read-only):

```powershell
node edge_radprimer_extension/tools/verify-source-library.cjs "C:\Users\josem.000\Downloads\RadPrimerLibrary\Gastrointestinal\Pancreas"
```
