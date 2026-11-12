# NormalAnatomy mobile lectures

A private, online lecture library for iPhone Safari and desktop browsers. The
public app contains code and caption UI icons. Reviewed lecture text, original
images, audio, timing, and progress belong in private Supabase storage/database
rows, not GitHub or Vercel's public build output.

## Study workflow

1. Finish the existing organizer and narration review gates on the desktop.
2. Package that exact approved lecture with the command below.
3. Sign in to the phone library using an allowlisted email. On the computer,
   choose **Add reviewed lecture** and select the `.nalecture` file.
4. Export the full document audio from Speechify. Open **Audio & image timing**,
   check the recording against the approved narration, and attach its MP3.
5. Open the library on iPhone, sign in, and use Safari's **Share → Add to Home
   Screen**. Images, captions, transcript, audio, and progress are available
   online. Original plain/annotated image pairs remain separate and ordered.

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

**Captions** shows or hides the original caption and source link. The choice is
remembered on that device, and captions update with the selected image, including
automatic transitions. They are image captions, not timed narration
subtitles. The same audio player stays available inside study view. Changing an
image manually pauses automatic following; switching annotations does not.

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
accepts only the exact production origin and loopback Host; it accepts no paths,
commands, Supabase credentials, or arbitrary remote URLs. It runs one job at a
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

## Current limits

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
