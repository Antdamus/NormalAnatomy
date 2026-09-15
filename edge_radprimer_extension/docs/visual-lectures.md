# Visual lectures

## Select images for future cards

Every source image starts as **Not selected for cards**. During illustrated review
or in the enlarged viewer, toggle **Selected for cards**, and choose an
**Anatomy**, **Pathology**, or **Both** objective. An optional note records what
you want the image to teach. Choosing an image permits consideration for a card;
it never requires one card per image. A short source-supported objective should
survive comparison with the existing card bank before a new card is created.

Plain and annotated versions remain one selection. Declared atomic image groups
and source-validated same-patient cases are selected together; arbitrary visual
comparisons do not imply a linked patient group. The complete lecture and its
source images remain available whatever you choose for cards.

**Review all image choices** shows the full inventory, including archived repeat
occurrences. **Prepare selected images for cards** creates the active master
source for the next card run, with only the selected image IDs, paired media,
objectives and complete source context. Then open the extension popup and run
**Build cards with images**. Preparation does not generate cards, contact Anki,
or send a prompt. Actual card generation uses the existing fresh Corebook
snapshot and source/media audit workflow. A changed selection must be prepared
again; the worker rejects a stale selection.

Choices persist separately from narration and are included in portable copies.
Regenerating the lecture cannot overwrite them. Reload the extension and refresh
open study pages once to load the new controls and storage upgrade.

## Anatomy, pathology, and mixed teaching

The runner offers **Anatomy**, **Pathology**, **Mixed anatomy and pathology** and
**Use master bundle recommendation**. A reviewed master manifest stores
`teachingFramework` with an engine and a reason grounded in whole-article
objectives; new master-source requests require it. Older bundles receive a
clearly identified suggestion from titles/headings. Importing or activating a
bundle selects its recommendation, and you can explicitly choose another engine.

Mixed teaching connects the normal map, protocols and variants to abnormal
appearances, cases and close differentials. Card objectives still stay distinct:
normal localization/recognition versus diagnostic reasoning. Shared output
schema and card-bank checks apply, without automatically doubling card families.
Preparing selected cards recommends a framework from your chosen image roles.

Pancreas Foundations uses **Mixed**. The other five Pancreas bundles use
**Pathology**, with anatomy introduced where it supports case interpretation.

The **Generate visual lecture** workflow replaces the previous narrative action
in both the article runner and extension popup. It works with the current article
or the already imported fused master source. It does not create cards or write to
Anki.

## Use

1. Reload the unpacked extension once after installing this update, then refresh
   open article, ChatGPT and Speechify tabs so their content scripts are current.
2. Open an article. Select **Generate visual lecture** and run it. Existing
   ChatGPT project and Speechify folder settings are used.
3. Explore the map while the explanation is being generated. The map appears
   after the organizer response passes validation; it replaces the spoken opening
   outline. The complete source remains input to the narrator.
4. Press **Play lecture**. Speechify handles the audio. **Follow lecture** changes
   the displayed case only when its actual reader text identifies a case. Choosing
   a pattern, case or enlarged image turns following off; audio can keep playing.
5. Use **Open saved lectures** at the top of the article runner settings (beside
   **Build master source**) or in the extension popup to return to saved topics,
   even after closing the study tab. Select the saved topic; if it needs attention,
   use **Resume unfinished step** on its study page.
   **Save a portable copy** exports the source, map, transcript and currently cached
   original image variants. Import that JSON from the library to restore it.

All generated learning content is English. The organizer chooses branches for
the actual topic: visible patterns, modality/sequence appearances, real examples,
and discriminators. It is an organization map, not an automatically validated
diagnostic decision algorithm. The model receives source text, captions and
registry observations; this workflow does not claim new pixel-level model review.

## Persistence and recovery

If a complete organizer response remains in ChatGPT but no map appears, reload
the updated extension, refresh the study page and choose **Resume unfinished
step**. Resume revalidates a saved complete draft before asking for a replacement.
If the handoff never saved the draft, expand **Recover a finished ChatGPT
response**, paste the response or choose its JSON/text file, and select **Use
this response**. This validates against that lesson's registry and source before
saving; it cannot overwrite an existing map. Then Resume prepares the narration.
ChatGPT now displays validation or connection failures instead of silently ending.

Overview images may be shared across branches when an illustrated case exists
elsewhere in the same lesson. Legacy modality arrays are retained as unassigned
case summaries; per-image labels are recovered only from that image's caption.
When the caption does not specify a usable label, the viewer says **See original
caption for modality** rather than assigning one from another image.

Large lessons prepare narration in passes of up to eight cases or twenty image
references (a case is never split). Each completed pass is saved. Resume retries
only the unfinished pass, and all passes must validate before a single combined
lecture is sent to Speechify. Original source context remains available in each
pass. Multi-article narration uses the full article-qualified image reference;
image 1 in two different articles must not be treated as the same image. Original
HTML caption arrows remain part of narration validation.

Each successful pass opens a fresh ChatGPT conversation for the next case group;
this is a finite progression, not a restart of the lecture. Prompts identify the
section number and total, completion messages report the saved section, and an
error on the study page reports both the paused section and the saved count.

For master bundles, model input contains the complete original article package,
clinical/editorial source context, and the current pass's image captions and
identities. Download hashes, repeated file paths, duplicate registries, and images
outside the current pass are kept in the saved bundle rather than retransmitted.
The organizer still receives every registry image. Existing saved runner envelopes
are unwrapped only after their embedded image IDs and captions match the saved
registry; unrecognized envelopes are preserved in full. This change does not reset
completed narration passes. The Pancreas Foundations regression covers all nine
passes and verifies that each compact request fits the single-message threshold.

Lessons and original image blobs live in the extension's IndexedDB, separately
from the existing source caches and shared Anki download directory. The added
`unlimitedStorage` permission supports complete image libraries. Browser profile
removal, extension uninstall or clearing extension data can remove this local
library; portable copies provide a separate backup. Speechify audio itself is
not included in the copy and still requires Speechify.

Identical source snapshots reopen the existing lesson. A changed source produces
a distinct saved lesson. Failed or partial responses remain as drafts. Resume
retries the unfinished stage, including the validation error in its new prompt.
An interrupted model wait can be resumed after its configured timeout. Tokens
reject late or duplicate results from earlier attempts. A failed Speechify handoff
keeps the map and complete transcript, checks for an existing reader, and attempts
to reuse the uniquely titled saved note before creating one.

Missing or undecodable images are reported, never synthesized. Retry them while
logged into the source. Original captions remain unchanged in the saved registry;
the viewer renders a safe HTML subset and the original packaged arrow icons.
An unavailable icon is named rather than silently omitted. Plain and annotated
variants remain separate; fallback to an available variant is labelled.

The organizer can reconnect to an existing Speechify reader with the original
topic title when a substantial excerpt matches the saved narration. Topic names
and image numbers alone do not establish a match. The reader sample is used only
for identity; case following still uses text at the actual highlighted cursor.
When a case changes, its images are brought into view. An older reader containing
raw JSON can be followed, but **Prepare clean audio** pauses it and sends the saved
spoken explanation to a new, uniquely titled note. It does not regenerate the
organizer or narration. New structured ChatGPT responses bypass the clipboard and
the direct prose-delivery path; only validated spoken text goes to Speechify.

The image loader uses an open, signed-in tab of the matching source before trying
an extension-origin request. It reads images with the page's ordinary same-origin
session and does not extract credentials. Login HTML is rejected, and valid
raster files served with a generic content-type are recognized by their bytes.
Concrete retrieval errors are shown under source provenance. Existing cached
images still work when no source tab is open.

Relationship values use an explicit three-value contract. Equivalent descriptions
of comparisons and single-file composites are normalized without changing image
groups; the original description is retained. Resume can recover a complete saved
map that previously failed only because of one of these descriptions, then start
the narration without regenerating the organizer. Partial model responses are
never recovered as complete maps.

## Implementation boundaries

- `visual-lecture-core.js`: plan/narration contracts, coverage and atomic-group
  validation, source-qualified image references, English prompts and live text
  alignment. A same-patient claim requires an explicit quote from an involved
  image's source caption. These checks validate structure and provenance, not
  every generated medical claim.
- `visual-lecture-worker.js`: capture, asynchronous two-phase ChatGPT generation,
  durable stage transitions, Speechify handoff and title-bound player controls.
- `visual-lecture-store.js`: shared IndexedDB access for the worker and study page.
- `visual-lecture.html`, `.css`, `.js`: pattern overview, case comparisons,
  original images/captions, transcript, library and portable copies.
- `speechify-paster.js`: exposes a small excerpt ending at the real reader cursor,
  idempotent play/pause, and opening/reusing the saved lecture. Existing strict
  singular-image pointer rules remain in force. A recurring image cannot by
  itself select a case: the case must match the live text. Ambiguous or missing
  text holds the current view. No inferred timing drives navigation.

ChatGPT and Speechify web automation still depends on their logged-in web UI and
selectors. Automated local tests cover the contracts, worker transitions,
matching, original images, offline storage, import/export and simulated player
controls; a live end-to-end account run is a separate integration check.

## Checks

```powershell
node --test edge_radprimer_extension/tests/visual-lecture.test.cjs edge_radprimer_extension/tests/visual-lecture-routing.test.cjs
node edge_radprimer_extension/tests/visual-lecture-browser.cjs
node corebook_card_registry/tests/test_routes.cjs
node corebook_card_registry/tests/test_guard.cjs
```

The browser check uses Playwright with Microsoft Edge. It reads six existing
Periportal source images from the repository and uses a deliberately small test
lecture. It does not generate or publish a complete Periportal lecture. Screenshots
and its test portable copy go to the temporary QA directory, or
`VISUAL_LECTURE_QA_DIR` if supplied.

The Speechify handoff uses `/library?folder=…`, normalizing older root folder links. It recognizes both old breadcrumbs and the current `content-header` folder breadcrumb, and opens the current sidebar import menu followed by **Type or Paste Text**. The saved lecture's **Audio destination** allows its folder to be changed independently before retrying.

A newly saved document may expose **Listen** (`compact-player-listen-button`) before the full player appears. This counts as a ready, paused reader. Saving never clicks Listen; **Play lecture** starts it explicitly. Live UI inspection verified the current library route, sidebar import menu, folder breadcrumb, full rich-text paste and Save/Listen controls. Reloading the unpacked extension and testing its organizer page still requires access to Edge's protected extension pages.

When an organizer for the matching Speechify reader is open, automatic source-page focus and source image cues are suppressed. The organizer owns visual following even when paused, browsing with Follow off, or temporarily behind another tab. Playback shortcuts in Speechify control that reader directly; source image/zoom shortcuts do not relay. Ordinary readers, and readers whose organizer has closed, retain source-page behavior. Explicit source-image navigation remains available. Ownership is resolved from open tabs and saved narration on each request, so worker restarts need no global toggle or stale lease.


## Image controls and narration updates

Click an image to open its cached original in the study viewer. Arrows on/off
uses the actual annotated/plain source variants, and reports when only one is
available. A toggles an extra-large view at 250% zoom; R toggles arrows, T captions,
K/L previous/next image, +/− zoom, 0 fit, W reset display, and I invert. Scroll
zooms, drag pans, and Shift-drag or right-drag adjusts brightness/contrast. The
sliders provide the same adjustments directly. P and left/right arrows control
this lecture's audio. Display adjustments never rewrite cached image bytes.

Opening or enlarging an image preserves Follow lecture. When Follow is on, a new
explicit image cue moves the open viewer to that image, including across cases,
without closing it or leaving extra-large mode. Repeated cues preserve current
zoom/display adjustments; new images start centered with neutral display values.
Annotations and caption visibility remain as selected. A clicked image remains
open until the next image cue. The viewer's Follow lecture button (or assigned
key) can pause following for manual inspection and resume at the current cue.

**Hide controls** removes the viewer's top and bottom toolbars to give the image
more room. A small card-selection strip and **Show controls** button remain. Playback,
following and keyboard shortcuts continue, and caption visibility is independent.
Controls stay hidden as the lecture changes images; reopening the viewer shows
them again. Assign an optional **Controls on / off** key in Keyboard shortcuts.

Press **C**, or click **+ Add to cards**, to select the enlarged image. The button
shows a green **✓ For cards** when selected. Press it again to remove the selection.
All unselected images show **Not selected for cards**. These indicators
stay visible with controls hidden and follow whichever image is displayed. The
same saved decision is shown in the image list and included in portable copies.
Plain/annotated versions share one choice, and approved linked groups are saved
together. Selection preserves the group's framework and learning objective,
image view, and playback/follow settings. Failed saves keep the previous decision
and show **Not saved** beside the button. The C shortcut can be reassigned under
**Use image for cards on / off**; an existing custom C assignment takes priority.
There is no image-selection step for lectures. Older saved choices remain compatible;
both previous unselected states display as **Not selected for cards**.

**Keyboard shortcuts** is available in the study toolbar and enlarged image
viewer. Click a key and press a replacement (including modifier combinations),
clear an assignment, or restore defaults, then Save shortcuts. Duplicate keys
are rejected, including the shared +/= zoom key. Choices persist across visual
lectures and open study tabs, with current keys displayed on viewer buttons.
The page includes configurable follow/case navigation and image-opening keys;
brightness and contrast steps can also be assigned. Shortcuts do not run while
typing or editing assignments. Esc remains available to close the top dialog.

New narrations receive the original caption plus its speech-friendly callouts.
The supported WO/WS/WC, BO/BS/BC, and CO/CS/CC codes are verbalized as white,
black, or cyan open/solid/curved arrows. Generation validates each image's local
passage for all supplied marker descriptors; later images cannot satisfy missing
callouts. Unknown markers stay generic, and the prompt forbids invented colors,
locations, or marker-to-finding relationships. Structural checks do not establish
medical accuracy. Previously saved lectures still open without regeneration.

Regenerate lecture lives in the saved study page. It runs only narration against
the existing approved plan, registry and full source; no extraction or map build.
The old narration remains playable during generation and survives invalid or
partial responses. Resume retries that pending narration, including after worker
restart. A validated replacement archives the earlier narration and audio link
under Previous lectures, keeps the map and image cache, and creates a distinct
Speechify title for its new revision. Playback cannot bind a revised narration to
an earlier audio version. The new arrow wording applies when narration is next
generated; existing Speechify text is never silently edited.


Audio regeneration inherits the matching reader's actual folder (including the
previous lecture version) instead of stale runner defaults. Explicit per-lecture
Audio destination choices take precedence and clear unrelated fallback folder
chains. Binding a manually recovered reader remembers its folder for later runs.
The Speechify handoff supports the narrow-window mobile header and bottom Add
sheet, as well as desktop breadcrumbs/sidebar. Retries reuse the lesson's known
work tab while it is still its library/reader; repurposed tabs are left alone.
The workflow returns to the organizer after saving or a recoverable audio error,
with two-step progress and an audio-only retry label.

For a manual Speechify save, use **Copy Speechify title** for the file's Title
field and **Copy lecture text** for its contents. Both read the latest saved
version. Keep the exact versioned title and leave the saved reader open; the
organizer uses that identity to avoid following an older narration. Copying text
also displays the required title, and connection errors explain this recovery.
