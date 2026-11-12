# Deployment

Production: <https://normalanatomy-lectures.vercel.app>

The Vercel project is `normal-anatomy/normalanatomy-lectures` on Hobby. The
dedicated Supabase project is `htcoheyzbstuwuaenxnn` in us-east-1. The migration
in this folder is applied. The bucket is private; membership and owner RLS are
enabled. The production origin is configured as the authentication Site URL
and its exact root URL is allowlisted for redirects.

Application code is on the repository's `codex/mobile-lectures` branch.
Production was deployed with the official Vercel CLI from this app folder.
GitHub automatic deployment is not connected. Existing unrelated working-tree
changes were excluded using a separate deployment worktree.

The public Supabase URL and publishable key are configured as Vercel production
environment variables. No service-role key is required. After the normal local
checks, deploy from a linked app folder with:

```powershell
npx vercel@65.14.0 deploy --prod --scope normal-anatomy
```

Inspect upload inputs with `npx vercel@65.14.0 deploy --dry --json` before a
deployment. Private packages, recordings, source lecture files, and `.env*`
files must remain excluded.

## Verification recorded 2026-11-12

- Seven SQL/contract tests passed, including cross-account isolation and exact
  approval/media checks.
- Isolated mobile browser checks passed for image pairs, navigation, zoom,
  audio attachment, verified timing, manual following override, and caption
  sanitization.
- Synthetic authentication checks passed for email-limit feedback, password
  sign-in, matching-password validation, clearing entered passwords after save,
  checking membership before updating the account password, and preserving the
  signed-in session after a page reload.
- Production returned HTTP 200 with the configured CSP and security headers.
- The live Supabase API rejected anonymous reads of all three application
  tables with HTTP 401/permission denied.
- The owner reported successful sign-in on iPhone. Full device playback and
  lock-screen behavior are separate checks; emulation does not prove them.

The default email provider reached its sending quota during initial setup.
The owner therefore created a separate password account through Supabase's
administrator **Create new user** form, with confirmation applied to that
known user only. Its exact confirmed identity was added to the private member
list. The original account and global email-confirmation settings remain intact.
The app now defaults to password sign-in. Account creation is an administrator
workflow, not public self-enrollment; see the README for the reusable procedure.

The owner completed desktop password sign-in. Two reviewed lectures are now in
the private cloud library: spinal cord/cauda equina/meninges (23 illustrated
cases, with its 56:07 Speechify recording) and spinal arterial supply/venous
drainage (19 illustrated cases, images and transcript only). Live desktop checks
confirmed cloud image loading, plain/annotated switching, audio playback,
progress saving, and session/audio persistence after reload. The local MP3 also
passed decoding, seeking, and playback-speed checks.

Automatic image following remains off: the recording has no verified timing
cues yet. Full listening review, actual iPhone playback and lock-screen behavior
have not been verified. Future lectures and recordings are added explicitly;
this deployment does not automatically synchronize the desktop or Speechify.

Private lecture packages and audio verification records are kept under the
ignored `private/` folder. They are not part of this repository or public app.
Full listening review of exported audio and verified image timing are distinct
from confirming the identity of its approved source text.

## Phone and tablet study view — 2026-11-12

The study viewer now keeps image navigation, plain/annotated switching, captions,
zoom, and the existing audio player together in a full-screen workspace. Pinch,
drag, double-tap, Fit and 100% controls inspect the original-resolution files.
Captions can stay open as the image changes; annotation switches preserve the
inspection position when the raster dimensions match. Tablet portrait uses the
full available width, with a separate caption region that does not cover images.

Nine SQL/contract/geometry tests and the existing browser suite passed. The new
viewer suite passed at 320×568, 390×844, 820×1180, 1180×820 and 844×390. Edge
checks include injected touch gestures. WebKit checks include image controls,
layouts and uninterrupted network-media playback with the actual MP3. The
Windows Playwright WebKit build rejected `blob:` audio; its tests use the same
bytes served over localhost HTTP, matching the deployed network-media path.
WebKit local-file preview, physical iOS gestures and lock-screen playback remain
unverified. Actual source images and the existing MP3 were also rendered locally.

Verified following now updates the open study viewer and its caption. The timing
editor adds mark-and-next, next-unmarked-image and transition-replay controls.
Timing imports must match the loaded recording duration as well as its hash and
the reviewed lecture fingerprint. No source content or completed approvals changed.

Speechify's inspected download flow offered MP3 export but no timestamp export.
The spinal cord recording still has zero verified image cues; automatic following
remains disabled for it. This update does not supply guessed timestamps, timed
narration subtitles, or a full semantic listening audit.
