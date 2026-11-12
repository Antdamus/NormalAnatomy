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
- Production returned HTTP 200 with the configured CSP and security headers.
- The live Supabase API rejected anonymous reads of all three application
  tables with HTTP 401/permission denied.
- The owner reported successful sign-in on iPhone. Full device playback and
  lock-screen behavior are separate checks; emulation does not prove them.

Private lecture packages and audio verification records are kept under the
ignored `private/` folder. They are not part of this repository or public app.
Full listening review of exported audio and verified image timing are distinct
from confirming the identity of its approved source text.
