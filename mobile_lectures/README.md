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

Manual image navigation works immediately. Automatic following requires timing
cues checked against the exact recording: listen, select each image, mark its
start, and verify the complete sequence. Timing backups are tied to both the
lecture fingerprint and audio hash. No timing is guessed from word counts.
Replacing audio clears its previous timing.

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

## Supabase and Vercel

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
- Audio is exported from Speechify and attached once per lecture. There is no
  automatic Speechify export or word-highlight timing capture yet.
- Cine passages retain their source references and transcript, but video
  playback is not implemented. They cannot pass automatic image-follow timing.
- Audio files are limited to 50 MB, matching the initial private bucket limit.
- Media links expire after two hours; reopening a lecture renews them.
- Browser layout tests emulate a phone in Edge; actual iPhone Safari playback,
  lock-screen behavior, and long-session resumption require device verification.
- Review receipts are validated using the existing local review contract. This
  personal library is not a cryptographic signing service for third-party authors.
