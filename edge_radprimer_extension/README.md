# RadPrimer Prompt Runner Edge Extension

This unpacked Edge extension replaces the manual console-paste step for RadPrimer article extraction.

## Build packaged prompts

Run this from the repository root whenever you update prompt files:

```powershell
python edge_radprimer_extension\build_prompts.py
```

This copies the current Normal and Pathology prompts into `edge_radprimer_extension/prompts`.

## Install in Edge

1. Open `edge://extensions`.
2. Enable `Developer mode`.
3. Choose `Load unpacked`.
4. Select `C:\Users\josem.000\NormalAnatomy\edge_radprimer_extension`.

## Use

1. Open a RadPrimer article page.
2. Click the extension button.
3. Choose `Pathology / disease` or `Normal anatomy`.
4. Choose the mode.
5. Set image selection:
   - `all`
   - `none`
   - `1,2,5`
6. Optionally set case groups like `1,2; 5,6`.
7. Optionally enable `Open ChatGPT project and fill box`.
8. Click `Extract + copy prompt package`.

The complete prompt package is copied to the clipboard. If image downloads are enabled, selected images are downloaded using the same filename pattern as the old console workflow.

When ChatGPT project handoff is enabled, the extension opens the configured project URL and fills the composer with:

```text
make sure you do not truncate the text and read the entire message

[full extracted prompt package]
```

It does not submit the message. If ChatGPT changes its composer DOM and automatic filling fails, the full package remains on the clipboard for manual paste.

If `Submit, wait, and copy final response` is enabled, the extension will:

1. Fill the ChatGPT composer.
2. Click the send button.
3. For narrative modes only, wait until the assistant response appears finished or the timeout is reached.
4. For narrative modes only, copy the latest assistant response to the clipboard and optionally send it to Speechify.

For non-narrative card modes, automatic submission stops after the prompt is sent to ChatGPT. If `Auto-group card modes before final run` is enabled and no case map is already supplied, the page button first runs a grouping-only ChatGPT preflight, captures the returned `INCLUDE` / `CASE_MAP`, applies that grouping to the saved settings, and then launches the final card prompt.

This mode is best-effort because ChatGPT's web UI can change. The ChatGPT page also shows a floating result box with status, final text, Copy again, Download .txt, and Close buttons. Keep the extension popup open when possible, but the ChatGPT page itself now also tries to copy the final response and display it in the overlay. If waiting or scraping fails, the original full prompt package remains on the clipboard.

## Notes

- The extension does not send data anywhere except the active RadPrimer tab and local browser clipboard/downloads.
- If ChatGPT handoff is enabled, the package is also inserted into the configured `https://chatgpt.com/...` page.
- It uses your packaged prompt files. Re-run `build_prompts.py` after editing prompt modules.
- This first version automates extraction, prompt packaging, copying, image downloads, and best-effort ChatGPT project composer filling.
