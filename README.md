# NormalAnatomy

Code, reusable prompts, and documentation for a personal radiology study workflow.
The browser extension is documented in [edge_radprimer_extension/README.md](edge_radprimer_extension/README.md).

## Local educational material

Downloaded articles, medical images, source bundles, review reports, generated
cards, Anki snapshots, and media caches are personal study material. They are
excluded from Git. Keep them on your own computer; do not force-add ignored files.
Removing a file from Git tracking does not delete the local copy.

This source checkout does not supply study content or downloaded image assets.
Restore your own authorized assets locally when using image-dependent features,
including the optional skull locator and original caption icons.

## Checks

```powershell
node --test edge_radprimer_extension/tests/*.test.cjs corebook_card_registry/tests/test_*.cjs
```

Tests using local source bundles or recovered lecture responses explicitly skip
when those private fixtures are absent. They run in the study workspace where
the original files are available. Browser tests require Playwright and Edge;
the illustrated-lecture browser check also needs local image fixtures.

Before publishing, inspect staged files and verify that no ignored study files
are still tracked:

```powershell
git diff --cached --name-only
git ls-files -ci --exclude-standard
```

The second command should return no files. A code-only current tree does not
remove content from older published commits; historical cleanup is a separate
operation.
