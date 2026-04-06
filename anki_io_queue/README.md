# Image Occlusion Queue Runner

This folder contains a first-pass pipeline for reusing your existing extraction workflow:

1. Your current `input_code.js` extracts article text, image numbers, filenames, and captions.
2. `build_queue.py` converts that extracted text into a queue JSON.
3. The Anki add-on in `anki_addon/` walks through that queue one item at a time while you work in Image Occlusion.

## What This Version Does

It gives you:

* queue generation from your extracted text
* one queue item per extracted image
* stable numbering and caption carry-through
* an Anki queue runner window with:
  * load queue
  * previous
  * next pending
  * copy caption
  * copy image path
  * copy image to clipboard
  * mark added
  * skip
* optional auto-advance when Anki fires a note-added hook
* optional auto-copy of the current image when each queue item loads
* best-effort caption insertion into a common note field after `Add`

## What It Does Not Fully Automate Yet

This first version does **not** directly drive the Image Occlusion add-on internals.

So the current intended workflow is:

1. Open the queue runner in Anki.
2. Load the queue JSON.
3. For the current item:
   * the runner can auto-copy the current image to the clipboard
   * paste/use it inside Image Occlusion
   * use the magic wand
   * adjust masks if needed
   * click `Add`
4. The runner will try to append the caption to a common note field on the added note.
5. If the note-added hook fires in your Anki/Image Occlusion setup, the runner auto-advances.
5. If not, click `Mark Added` manually and it advances.

That means this is already useful, but still a **phase 1** version.

## Queue JSON Builder

Example:

```powershell
python anki_io_queue\build_queue.py extracted.txt queue.json --images-dir C:\path\to\downloaded\images
```

Clipboard mode:

```powershell
python anki_io_queue\build_queue.py --from-clipboard queue.json
```

If you omit the output path in clipboard mode, it defaults to:

```powershell
C:\Users\josem.000\NormalAnatomy\anki_io_queue\queue.json
```

If you just run the file with no arguments at all, it now does the same thing:

```powershell
python anki_io_queue\build_queue.py
```

That means:

* input comes from the clipboard
* output is written to `anki_io_queue\queue.json`

Optional:

```powershell
python anki_io_queue\build_queue.py extracted.txt queue.json --images-dir C:\path\to\downloaded\images --prefer-annotated
```

If `--images-dir` is omitted, the builder will use:

`C:\Users\josem.000\Documents\repository`

when that folder exists.

## Queue Schema

Example item:

```json
{
  "queue_id": "CASE_01:5",
  "article_title": "Rectal Cancer",
  "topic": "Rectal Cancer",
  "block_label": "CASE_01",
  "block_kind": "CASE",
  "block_index": 1,
  "group_numbers": [5, 6],
  "source_number": 5,
  "base_name": "rectalCancer5",
  "image_filename": "rectalCancer5.jpg",
  "annotated_filename": "rectalCancer5_annot.jpg",
  "caption": "Caption text...",
  "image_path": "C:\\path\\rectalCancer5.jpg",
  "annotated_path": "C:\\path\\rectalCancer5_annot.jpg",
  "preferred_path": "C:\\path\\rectalCancer5.jpg",
  "status": "pending",
  "notes": ""
}
```

## Installing The Add-on

1. Open your Anki add-ons folder.
2. Create a new folder for this add-on.
3. Copy `anki_io_queue/anki_addon/__init__.py` into that folder.
4. Restart Anki.
5. Open `Tools -> Image Occlusion Queue Runner`.

## Why This Design

Your existing extractor already solves the hard upstream part:

* image extraction
* stable numbering
* caption capture
* article context
* local image files

So this project focuses only on the downstream queueing loop.

## Likely Next Improvements

Good phase-2 upgrades would be:

* direct Image Occlusion integration if the target add-on API is known
* queue filtering by article or block
* tags/deck metadata
* `back`, `retry`, `bad image`, and `notes` actions
* explicit caption-field configuration
* a packaged add-on folder with config and persistence polish
