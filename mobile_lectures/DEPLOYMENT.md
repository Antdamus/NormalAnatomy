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
Optional password setup is available under **Account access** on an already
signed-in member's library. This keeps the verified email and all existing RLS
rules; it does not disable email confirmation or increase the provider's limit.

Initial lecture upload is still pending: the desktop is signed out, and the
owner later reported losing the iPhone session. A fresh email sign-in must wait
for the provider quota to recover. No private lecture or recording has been
uploaded yet. The local MP3 was successfully decoded and tested for playback,
seeking, speed changes, and image browsing; this is not a full listening audit.

Private lecture packages and audio verification records are kept under the
ignored `private/` folder. They are not part of this repository or public app.
Full listening review of exported audio and verified image timing are distinct
from confirming the identity of its approved source text.
