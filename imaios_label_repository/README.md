# IMaios Label Repository

Purpose: keep a local, updateable list of IMaios labels that are actually available in each modality/atlas context.

Use this repository when generating narrative prompts that also need IMaios copy-paste label blocks.
The prompt can include a section titled `IMAIOS LABEL REPOSITORY`; ChatGPT should then use only verified available labels in copy-paste blocks and place unresolved synonyms in a gap-review block.

`module_catalog.json` is the route catalog extracted from the IMaios e-Anatomy directory HTML. The extension copy lives at `edge_radprimer_extension/imaios_module_catalog.json` and is used to open the best matching IMaios module after ChatGPT generates an `imaios-chunk-library` JSON block.

Recommended workflow:

1. Add verified labels to `labels.json`.
2. Include aliases for common medical synonyms, source-package wording, abbreviations, or older names.
3. Record modality or atlas availability whenever the same label is present in only some IMaios contexts.
4. When ChatGPT produces candidate anatomy, compare the candidates against this repository before final use.
5. If a needed structure is missing, add it to `labels.json` after verifying the exact IMaios label.

Extension chunk workflow:

1. Open the relevant IMaios module, such as `CT temporal bone`.
2. In the IMaios Cine panel, click `Copy labels` to copy the labels visible/available in that module.
3. Click `Save labels` to store those labels under the current module in browser localStorage for synonym checks.
4. Copy a chunk manifest from `chunks/` or from a generated ChatGPT response.
5. Click `Import chunks`, select a chunk, then click `Check chunk`.
6. Review the copied check report for exact matches, alias-resolved labels, repository-only labels, and unresolved gaps.
7. Click `Apply chunk` when the selected module and labels look right.

To persist harvested labels outside the browser:

1. Click `Save labels` in the IMaios Cine panel after opening a module.
2. The extension saves the module labels into the live browser cache and extension storage.
3. The extension also writes durable JSON backups under `Downloads\IMAIOSLabelRepository`:
   - `imaios_label_repository_latest.json` is the easiest recovery/import file.
   - `snapshots\imaios_label_repository_<timestamp>.json` protects against accidental overwrites.
4. Click `Export repo` when you want to copy the full repository JSON to the clipboard as well.
5. Optionally merge the latest downloaded JSON into this repository's `labels.json`.

Cache-loss recovery:

1. Open `Downloads\IMAIOSLabelRepository\imaios_label_repository_latest.json`.
2. Copy the entire JSON file.
3. Open any IMaios module with the extension panel loaded.
4. Click `Import labels`.
5. Future ChatGPT/RadPrimer automation can again inject the saved label repository into prompts.

To restore the downloaded backup into this repo for Codex-side work, run `edge_radprimer_extension\tools\import-latest-imaios-label-repository.ps1` from the repository root.

The extension cannot read arbitrary local files directly from this folder. It uses clipboard JSON imports so the workflow still works inside the browser security model.

Module routing:

- Exact `modalityUrl` in a chunk wins.
- If no URL is provided, the extension scores the chunk topic, modality, title, and id against `imaios_module_catalog.json`.
- The catalog includes aliases such as `Temporal bone CT` for `CT temporal bone`, plus module codes and URL slugs.
- If no confident module match exists, the current fallback is `CT temporal bone`; update the catalog or add `modalityUrl` in the chunk JSON for unusual topics.

Per-module labels:

- `labels.json` has a `moduleLabels` object keyed by module key, such as `head-and-neck-ct-temporal-bone`.
- Each module stores its verified/captured labels separately from the global alias table.
- `Check chunk` and `Apply chunk` use saved labels for the current module before falling back to labels visible in the current DOM.
- Full automation across all modules is only as good as what each IMaios module loads into the page. Some modules may require opening anatomy panels, search, login, or manual expansion before every label is visible.

Label entry fields:

```json
{
  "preferredLabel": "Facial canal",
  "aliases": ["Facial nerve canal", "Fallopian canal", "CNVII canal"],
  "modalities": ["CT temporal bone"],
  "regions": ["Temporal bone", "Facial nerve"],
  "status": "verified",
  "notes": "Use this preferred label in IMaios blocks when source text says facial nerve canal."
}
```

Rules:

- `preferredLabel` is the exact copy-paste label to use in IMaios blocks.
- `aliases` are matching aids only; do not output aliases when a preferred label exists.
- `modalities` should name the IMaios modality/atlas where the label was verified.
- `status` should be `verified`, `candidate`, or `unavailable`.
- Keep disease names out of this repository unless IMaios literally has a label for that pathology.
- Chunk manifest labels may remain `candidate` until checked against the exact IMaios module with `Copy labels` and `Check chunk`.
