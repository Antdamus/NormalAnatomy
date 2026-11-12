# Automatic phone-library handoff

New lectures enroll automatically (`settings.lectureMobileHandoff !== false`).
An older lecture can enroll with **Send to phone library**. Both exact-version
educational approvals remain mandatory. No review, model, card or Anki operation
is added by this feature.

## One-time activation

1. Update/reload RadPrimer Prompt Runner after active lecture generation finishes,
   then refresh the saved lecture page. The update adds access to the existing
   local processor at `http://127.0.0.1:8774/`.
2. Configure `mobile_lectures/private/handoff-config.json` with the destination
   Supabase user UUID: `{"ownerId":"the-existing-private-library-user-uuid"}`.
   This is an account identity, not a token or password. Changing it does not
   migrate pending jobs to another account. `downloadsDirectory` can optionally
   name the user's actual Downloads folder; paths outside it are rejected.
3. Restart the idle local processor using `mobile_lectures/tools/alignment/start.ps1`.
   Its existing current-user Startup shortcut continues to use that launcher.
4. Refresh and keep the signed-in desktop phone library open. Its **Automatic
   lecture handoff** panel shows the processor/account connection and has
   **Sync desktop lectures** for an immediate check.

Keep Speechify and the desktop browser available until the handoff and timing
finish. Thereafter the phone needs only internet and the same library account.

## Pipeline and retained evidence

The worker exports only the approved saved version, from cached original images.
The local packer revalidates approvals, combined transcript versus narration
sections, source/media identities, all paired variants and any initial card
choices. It saves an immutable `.nalecture` in ignored `private/handoff-jobs/`.
The existing library account accepts the package first. An existing recording
completes the handoff without requesting another Speechify export.

For a recording that is missing, the extension opens only the saved Speechify
reader, verifies its title and URL, walks every virtualized text window in order,
and compares the complete text with the approved narration (whitespace normalized
only). It uses the observed **More options → Download File → Continue → Download
File** flow and the currently selected export voice. Preparing the confirmation
screen does not consume quota; the final click is saved durably before execution.
This uses existing download allowance and never purchases an upgrade.

Downloads must match the exact document/title, Speechify blob origin, start time,
and referrer when supplied. More than one candidate holds the job. The worker
waits for Edge's complete download state; the local service accepts only a real
MP3 file under the configured Downloads directory, checks its exact byte count,
and computes its immutable hash. Its receipt records full-text matching, voice,
document, transcript hash, download ID and completion time. This is automated
export provenance, not a human listening review.

Only the signed-in production library uploads. The local processor receives no
Supabase token/password. Publication is account-bound and idempotent. New audio
is written only while audio and timing are both empty; existing audio, manual
timing, progress and card selections win concurrent races. The existing two-pass
alignment and subtitle checks run unchanged afterward.

## Holds and recovery

- Missing processor retries automatically. Missing media, login, changed UI,
  altered text, unsupported voices or exhausted quota are shown on the saved
  lecture page. Correct the cause, then use **Retry phone handoff**.
- An interrupted or uncertain export never triggers another quota-consuming
  click. Resume the exact Edge download. The durable job can recover that same
  file after worker/browser restarts. Ambiguous downloads require explicit
  investigation; never choose the newest file solely by date.
- **Stop automatic handoff** stops further extension work for that lesson.
  Already queued library uploads can finish; uploaded private content remains.
- Closing the desktop library pauses cloud publication. Reopening it resumes the
  queue without changing the phone's bookmark or existing selections.
- Cine timing remains unsupported by the current mobile alignment validator.
  Keep its existing hold; do not approve guessed cine transitions.

These endpoints preserve origin and loopback Host checks. Only the configured
extension stages packages/download receipts; only the production website
acknowledges publication. Browser-generated exports outside Downloads need the
existing manual, verified audio attachment workflow.

## Tests

Run `npm test`, `npm run test:handoff` and `npm run test:automatic` in
`mobile_lectures`. `TEST_BROWSER=webkit` tests the phone client in WebKit.
Extension regressions are `tests/lecture-mobile*.test.cjs` and
`tests/speechify-mobile-export-browser.cjs`. All browser tests use isolated
synthetic fixtures, no real account or download allowance. Physical iOS and the
current live Speechify export are separate verification steps.
