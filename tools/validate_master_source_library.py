#!/usr/bin/env python3
"""Validate hashes, whole-article assignment, captions, and image selection in a master-source library."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


def digest(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("library", type=Path)
    parser.add_argument("--collection", type=Path)
    args = parser.parse_args()
    library = json.loads(args.library.read_text(encoding="utf-8"))
    assert library.get("version") == 1
    bundles = library.get("bundles") or []
    assert bundles, "No lecture bundles"
    bundle_ids = [bundle["bundleId"] for bundle in bundles]
    assert len(bundle_ids) == len(set(bundle_ids)), "Duplicate bundle IDs"
    assert library.get("activeBundleId") in set(bundle_ids), "Unknown active bundle ID"

    article_ids: list[str] = []
    image_ids: set[str] = set()
    duplicate_targets: list[str] = []
    registry_count = 0
    selected_count = 0
    archive_count = 0
    missing_captions: list[str] = []
    missing_media: list[str] = []
    for bundle in bundles:
        manifest = bundle["manifest"]
        registry = bundle["imageRegistry"]
        package_text = bundle["packageText"]
        registry_text = json.dumps(registry, ensure_ascii=False, indent=2) + "\n"
        assert digest(package_text) == manifest["packageSha256"], f"Package hash mismatch: {bundle['bundleId']}"
        assert digest(registry_text) == manifest["imageRegistrySha256"], f"Registry hash mismatch: {bundle['bundleId']}"
        selected = set(bundle["selectedPrimaryImageIds"])
        archived = set(bundle["archiveOptionalImageIds"])
        registry_ids = {entry["masterImageId"] for entry in registry}
        assert selected.isdisjoint(archived), f"Selected/archive overlap: {bundle['bundleId']}"
        assert selected | archived == registry_ids, f"Unclassified images: {bundle['bundleId']}"
        assert len(registry_ids) == len(registry), f"Duplicate image ID inside {bundle['bundleId']}"
        article_ids.extend(manifest["sourceArticleIds"])
        registry_count += len(registry)
        selected_count += len(selected)
        archive_count += len(archived)
        for entry in registry:
            assert entry["masterImageId"] not in image_ids, f"Duplicate global image ID: {entry['masterImageId']}"
            image_ids.add(entry["masterImageId"])
            if not entry.get("captionOriginal") or not entry.get("captionHtml"):
                missing_captions.append(entry["masterImageId"])
            if entry.get("duplicateOf"):
                duplicate_targets.append(entry["duplicateOf"])
            if args.collection:
                for key in ("plainFile", "annotatedFile"):
                    rel = (entry.get(key) or {}).get("relativePath")
                    if not rel or not (args.collection / rel).is_file():
                        missing_media.append(f"{entry['masterImageId']}:{key}")

    assert len(article_ids) == len(set(article_ids)), "A source article appears in multiple lectures"
    assert registry_count == len(image_ids), "Global registry image IDs are not unique"
    assert not missing_captions, f"Missing complete captions: {missing_captions}"
    assert set(duplicate_targets) <= image_ids, "An archive entry points to an unavailable final image"
    assert not missing_media, f"Missing paired image files: {missing_media}"
    if args.collection:
        collection = json.loads((args.collection / "collection.json").read_text(encoding="utf-8"))
        assert collection.get("status") == "complete", "Source collection is not complete"
        assert set(article_ids) == set(collection.get("articles", {})), "Library does not cover each collection article once"

    print(
        json.dumps(
            {
                "status": "passed",
                "lectures": len(bundles),
                "wholeArticles": len(article_ids),
                "imageOccurrences": registry_count,
                "completeCaptions": registry_count - len(missing_captions),
                "pairedImageVariantFiles": registry_count * 2 - len(missing_media),
                "primaryTeachingOccurrences": selected_count,
                "archiveOptionalExactRepeats": archive_count,
                "duplicateTargetsResolved": len(duplicate_targets),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
