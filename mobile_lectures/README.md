# NormalAnatomy mobile lectures

A private, online lecture library for iPhone Safari and desktop browsers. The
public app contains code and caption UI icons. Reviewed lecture text, original
images, audio, timing, and progress belong in private Supabase storage/database
rows, not GitHub or Vercel's public build output.

## Study workflow

1. Create the lecture in the desktop extension. New lectures automatically enroll
   in phone handoff; existing lectures have **Send to phone library**.
2. Finish the existing organizer and narration review gates. The extension then
   saves the approved narration in Speechify and packages its original images.
3. Keep Edge, Speechify, the desktop processor and the signed-in phone library
   open. The extension verifies the complete Speechify document and requests its
   full MP3 export. The library uploads it, then prepares image timing and spoken
   subtitles automatically. No manual package/audio attachment or cue marking
   is required on the automatic path.
4. Open the library on iPhone, sign in, and use Safari's **Share → Add to Home
   Screen**. Images, captions, transcript, audio, and progress are available
   online. Original plain/annotated image pairs remain separate and ordered.

The handoff uses the existing Speechify download allowance and selected export
voice. It does not buy more quota or change subscriptions. Missing login, an
unsupported voice, quota exhaustion, missing originals, or a changed/incomplete
document holds that lecture with a visible explanation. An uncertain export is
never automatically repeated: its exact completed Edge download is recovered.
Manual package upload and verified audio attachment remain available as recovery.
See the [handoff setup and recovery guide](../edge_radprimer_extension/docs/mobile-lecture-handoff.md).

While signed in, **Account access** lets you set an optional password (at least
12 characters) for signing in on other devices. Enter and confirm it yourself;
never share it in a chat or repository. Supabase's default test email service
has a small sending quota, so keep a signed-in device open if requests become
rate limited. Password sign-in does not change membership or owner access rules.

Manual image navigation works immediately. With the desktop processor installed,
an attached recording is automatically aligned to the exact approved transcript.
The existing desktop source-qualified image-reference matcher supplies the image
identities. Two local DTW alignment passes must agree before the result is saved
to the private library. The phone follows the saved audio clock, including after
seeking or changing playback speed; it needs neither Speechify nor the computer
once processing and sync finish. No per-image marking or timing import is needed.

Automatic cues are explicitly labeled as estimates, not a human listening review.
They are bound to the exact approved lecture, transcript and recording hashes.
Incomplete references, unstable boundaries, decode failures, or mismatched clocks
hold the job. Existing manual drafts and human-checked timing are never replaced
by the automatic queue. Replacing audio clears its previous timing.

### Inspect on phone or tablet

Tap an image or **Study view** for a full-screen workspace. Use **Plain** and
**Annotated** without leaving it, and the arrows to move through the complete
ordered image sequence. Pinch or use **+ / −** to zoom; drag to inspect details,
double-tap to zoom/reset, and use **Fit** to see the entire image. **100%** maps
one source pixel to one CSS pixel. The original files are never resized or
recompressed; zoom does not create additional source detail.

**Image captions** shows or hides the original caption and source link. The choice is
remembered on that device, and captions update with the selected image, including
automatic transitions. They are image captions, not timed narration
subtitles. The same audio player stays available inside study view. Changing an
image manually pauses automatic following; switching annotations does not.

**CC Subtitles** independently shows or hides the spoken narration in the audio
player, including inside Study view. It remembers the choice on that device.
Subtitles use short, automatically timed phrases copied from the exact approved
transcript. They follow the recording clock when seeking or changing playback
speed, clear during pauses, and keep following speech when you browse images
manually. The first use is off; unavailable or mismatched subtitle data cannot be
enabled. These are automatic timings, not a human transcription review.

Portrait tablets use the screen width for images. The full-screen workspace
places captions below the image in phone/tablet portrait and alongside it in
landscape. The audio controls occupy their own space without covering the image.

**Audio & image timing** includes **Mark & next image**, **Go to next unmarked
image**, and **Replay transition** (starting three seconds before the saved cue).
These remain an optional manual workflow for recordings without automatic timing.
The manual verification gate still requires every image in approved order. It is
separate from the automatic evidence contract. Both check the loaded duration.

### Automatic desktop processor

Install the separate local dependency once (it is excluded from Vercel):

```powershell
npm ci --prefix tools/alignment --ignore-scripts --omit=optional --no-audit --no-fund
./tools/alignment/start.ps1
```

Node and `ffmpeg`/`ffprobe` must be on PATH. The first alignment downloads the
engine's eSpeak support package. Audio processing is local: eSpeak formant speech
and dynamic time warping, with no neural transcription model or cloud audio API.

Keep the signed-in desktop library open while jobs are submitted and synced. It
automatically discovers the processor at `127.0.0.1:8774`. The browser may ask for
local-network access once. iPhone/iPad never contact this endpoint. The service
accepts only the exact production origin, configured extension identity and
loopback Host. It accepts no commands, Supabase credentials, or arbitrary remote
URLs. The extension-only handoff endpoint accepts an exact completed MP3 path
strictly inside the real Downloads directory and validates its saved export
receipt and byte count. It runs one alignment job at a
time and retains exact-hash job states in ignored `private/timing-jobs/`. Jobs
continue while the browser is closed, then sync when the desktop library reopens.

To start the processor on future Windows sign-ins, run
`./tools/alignment/install-startup.ps1`. This creates a named current-user Startup
shortcut to the hidden processor launcher; it does not open a terminal window or
launch an AI agent. Remove that shortcut to disable startup.

Some Speechify MP3 exports contain ID3 metadata between audio chunks. The processor
can remove these metadata blocks without re-encoding or removing audio frames,
then requires an error-free decode and consistent playback duration. It retains
the original export in immutable private storage and records the preparation
method, removed metadata count and audio-frame count. Unknown or truncated data
is held rather than discarded. The browser publishes prepared audio and its
timing atomically only if the original recording is still current and no timing
has been added in the meantime. Phones refresh pending timing automatically.

The same retained word evidence automatically produces spoken subtitles. Every
character of the approved narration must be covered in order, and both alignment
passes must agree on each phrase boundary within 0.75 seconds. Completed jobs can
add the derived subtitle sidecar without rerunning alignment or changing their
original evidence. The browser adds subtitles separately to the current audio
metadata with an exact-value conditional update: existing image timing, recording
bytes and playback progress are not overwritten. Restart the local processor
after updating it so already-completed recordings can receive subtitles too.

Speechify's live highlighting alone does not establish timestamps for an exported
MP3. Synthetic desktop wall-clock estimates are not used. Direct speech-mark
capture from the current Speechify reader has not been implemented; the tested
recording alignment supplies the automatic path instead.

## Package a reviewed lecture

From this folder, after `npm ci`:

```powershell
node tools/pack.mjs --snapshot ../lecture_automation_queue/events/EVENT_ID/snapshot.json --media-directory ../lecture_quality_queue/LECTURE_FINGERPRINT --out private/my-lecture.nalecture
```

Alternatively, `--portable path/to/desktop-portable-export.json` accepts a
desktop portable lecture export containing its original media. Use `--out` for
the new package. Existing output is never overwritten.

The packer uses the desktop validators, exact-version approvals, original image
hashes, and all required media variants. It preserves source captions, registry
identities, pair relationships, case order, and review receipts. Incomplete or
changed evidence is rejected. Packaging is not a new educational review and
does not authorize cards or Anki changes.

## Local development and checks

```powershell
npm ci
npm test
npm run dev
npm run build
```

Copy `.env.example` to `.env.local` and set the Supabase URL and **publishable**
key. These are public client configuration; never use a service-role/secret key.
Without them, the app still supports local package preview without uploading.
Local preview and its attached audio last for that browser session; upload the
lecture before attaching audio to keep it in the cloud library.

`npm run test:browser` requires Playwright and an installed Microsoft Edge. The
test launches its own isolated browser and local Vite server. It uses synthetic
lecture/audio fixtures, never live accounts. An ignored
`private/spinal-vascular.nalecture`, when present, adds a real local rendering
check. Screenshots are written to ignored `test-results/`.

The SQL regression test runs the real migration in PGlite with a minimal mock
of Supabase's auth/storage infrastructure. It checks anonymous access, member
isolation, object ownership, and the private bucket. Contract tests check
approval invalidation, source/media integrity, path safety, and timing identity.

`npm run test:viewer` adds full-screen navigation, caption synchronization,
zoom/pan, Edge touch injection, playback continuity, and phone/tablet portrait
and landscape checks. Set `TEST_BROWSER=webkit` to run the same checks in an
installed Playwright WebKit browser (touch injection is Edge-only). On Windows,
the tested WebKit build rejects local `blob:` audio while loading the same MP3
over HTTP successfully. Its media tests therefore serve the identical bytes
from localhost, matching the deployed library's network-media transport; they
do not certify WebKit local-file preview. Set `TEST_AUDIO_FILE` to an optional
private MP3 for this run. `TEST_LAYOUT_ONLY=1` explicitly omits audio/timing
checks and reports that reduced scope. Emulation
does not certify physical iOS gestures, background playback, or lock-screen
behavior. Test browser downloads and screenshots remain outside the public app.

`npm run test:automatic` verifies desktop publication and subsequent phone playback
with synthetic account/services, without manual cue entry/import. It runs in Edge
or WebKit (`TEST_BROWSER=webkit`). `TEST_AUTOMATIC_JOB` optionally points the viewer
suite at a private completed real job; it checks every resulting image/case cue
and the prepared recording duration in local preview. This verifies software
routing, not a human semantic listening audit. Unit tests cover metadata-only MP3
cleanup, full-reference coverage, evidence mismatch, durable deduplication,
failure holds, origin/Host restrictions and preservation of newer/manual work.

## Supabase and Vercel

For a private password account that does not depend on email delivery, the
project owner can use Supabase **Authentication → Users → Add user → Create new
user**. The account holder enters their password privately and submits the form
with **Auto confirm user** checked. This is an administrator action for a known
user; global email-confirmation settings remain enabled. Add that exact account
email to `mobile_members` through the SQL editor before signing in to the app.
If the email already has an account, preserve it and use a different account
address (for Gmail, a `+lectures` alias reaches the same inbox). Do not delete
an existing account or overwrite its password to work around the email quota.
The public app defaults to password sign-in; it does not expose administrator
credentials or a way for visitors to enroll themselves in the private library.

1. Apply `supabase/migrations/202611120001_mobile_lectures.sql` to a dedicated
   Supabase project. It creates the private bucket and member/owner RLS rules.
2. In the SQL editor, add the owner's lowercase email to `mobile_members` using
   an administrator session. Clients cannot add themselves to this allowlist.
3. Deploy this folder as a Vite project on Vercel. Set `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_PUBLISHABLE_KEY` in the build environment. Only `dist/` is
   served. `.vercelignore` excludes private packages, tests, and environment
   files from direct CLI uploads.
4. Set Supabase Authentication's Site URL and allowed redirect URL to the exact
   deployed HTTPS origin. Configure email delivery as required by the project's
   email provider; verify a real sign-in before inviting additional users.
5. Sign in with the allowlisted account and upload a package. Verify signed-out
   visitors cannot read the records or media, then check an authenticated upload
   and playback on an actual iPhone.

GitHub contains application source only. `.gitignore` excludes private lectures,
recordings, environment files, dependencies, and test screenshots. Caption UI
icons in `public/assets/caption-icons/` are copied from the existing extension;
they are not lecture images. `tools/sync-contracts.mjs` refreshes the vendored
desktop contracts and records their SHA-256 provenance. Re-run contract tests
when updating them.

## Image choices and links

Use **Add to cards** under an image or in Study view. Plain and annotated variants
share the same registry ID. **Link images** opens a full-width picker for other
images in the same lecture, including other cases. Saving selects every member;
source atomic groups and source-supported same-patient groups remain indivisible.
Saved source collections (`caseAndComparisonSequences`) and explicit companion
IDs are inherited automatically, alongside desktop manual links included in the
lecture package. The picker labels their origin. **Unlink for cards** removes
optional inherited and learner links while retaining individual selections;
**Restore links & select** reinstates the saved collection and selects its members.
Required atomic groups (including named `atomicGroupIds`), confirmed same-patient
groups, and plain/annotated variants remain intact. Source organization and user
links never establish patient identity or scan chronology. Gallery labels and
the broad singular `atomicGroupId` alone do not imply a card group.

Existing individual selections are preserved during the upgrade: a newly
recognized collection with a mixture of selected/unselected members stays off
until explicitly restored. These exclusions are mutable preferences in
`review.inheritedLinks`, separate from the immutable source and approved plan.

Signed-in choices are saved separately from the reviewed manifest in
`mobile_lectures.card_choices`. Apply migration `202611120002_card_choices.sql`
after the initial migration. Existing member/owner RLS remains unchanged.
Conditional revision updates prevent stale devices overwriting each other; the
foreground library refreshes choices every 15 seconds, or use **Refresh choices**.
Failed writes remain visibly unsaved. Local previews save on that device only.

The desktop extension has **Export choices for phone** and **Import phone choices**.
The library's **Card choices** section has the corresponding import/export controls.
Initial desktop links arrive in the lecture package. Import later desktop choices
to bring subsequent links and objectives into the library. JSON transfers bind the exact approved lecture fingerprint and IDs,
preserve source captions/media through the unchanged registry, merge unrelated
edits, and stop on conflicting edits. Receipt tracking makes repeat imports safe
and supports later removal of a previously transferred link. Transfers contain
selection metadata, not image binaries. Links across different lectures are not
supported. Choices with inherited-link preferences use transfer format v2 so
older extension builds reject them rather than silently losing unlink decisions.
Reload the updated desktop extension before importing these exports. Selection
never generates cards or changes Anki.

Study view uses a compact navigation bar and audio timeline. **Caption** is always
available in the visible top bar beside the smaller Plain/Annotated button;
it controls original image captions independently of spoken **CC** subtitles.
**Tools** contains explicit zoom/fit buttons, playback speed, follow-image controls,
skip controls and the native audio player (including its platform audio options).
Tap the image once or use **Hide** to hide navigation and timeline; tap again or
use **Show** to restore them. **Back 5 seconds, Play/Pause, Forward 5 seconds,
playback speed, Cards and Link remain accessible at the bottom in both modes.**
The shorter Cards/Link labels retain full accessible names and a linked-image
count badge. All controls keep touch targets of at least 44 pixels; phones narrower
than 374 pixels use two rows. The speed selector shares the normal player's
setting and saved progress. The non-scrolling control bars suppress native browser
touch zoom, including rapid skip taps; the image stage retains its own pinch and
double-tap zoom. Native speed selectors use 16px text to avoid focus magnification.
The background page is fixed while the viewer is open, then returns to its saved
scroll position on close. Touching a control cancels a pending image-tap action.
Desktop WebKit tests cover gestures, layout and these browser-zoom safeguards;
they cannot reproduce iOS's native UI zoom behavior on a physical phone.
Spoken subtitles continue to appear
and update when controls are hidden if CC is enabled. Source image captions are
temporarily hidden with the controls and restored with them. Pinch, drag and
double-tap do not toggle controls. Opening Tools never resizes the image; hiding
controls or rotating the device preserves the inspected center when zoomed.

Spoken subtitles are automatically aligned when full Speechify audio is attached
and the desktop processor/library are running. They use a translucent overlay
above the playback controls, do not intercept taps, and never change image size
or reset zoom as phrases change. They can be switched off independently of source
image captions. The existing manual Speechify export/attachment step is unchanged.

## Current limits

### Resuming on another device

Sign into the same account in this web library on both devices. Playback time,
current image and speed are saved while listening (about every five seconds),
on pause, and after seeking, changing speed or manually choosing an image.
Pause before switching devices so the last bookmark can finish syncing.
A newly opened lecture loads the cloud bookmark. An already-open paused lecture
checks when it returns to the foreground and every 15 seconds while visible.
Playing audio is never moved to another device's position mid-sentence.

Reading/restoring a bookmark does not save it again. Conditional timestamp
updates reject stale-device writes, including first-save races. Local caches are
account-scoped; an offline draft can retry only if its original cloud version
is unchanged. When both devices are playing and a conflict occurs, the older
session continues locally without overwriting the newer bookmark; pausing lets
it resume the saved position. Explicitly seeking or playing again starts a new
study action. Existing older app tabs must be refreshed once to use this guard.

Card selections and manually linked groups also sync to the same account and
are checked on foregrounding. The separate desktop extension and Speechify app
do not share this web player's bookmark. Card choices for the extension still
use the documented export/import workflow. Local previews remain device-only.

### Other limitations

- Internet is required. Offline downloads and service-worker caching are not
  implemented.
- Audio is still exported from Speechify and attached once per lecture. Timing
  generation and delivery are automatic after attachment; Speechify export itself
  and mobile package creation/upload are not automated by this processor.
- Cine passages retain their source references and transcript, but video
  playback is not implemented. They cannot pass automatic image-follow timing.
- Audio files are limited to 50 MB, matching the initial private bucket limit.
- Media links expire after two hours; reopening a lecture renews them.
- Browser layout tests emulate a phone in Edge; actual iPhone Safari playback,
  lock-screen behavior, and long-session resumption require device verification.
- Review receipts are validated using the existing local review contract. This
  personal library is not a cryptographic signing service for third-party authors.
