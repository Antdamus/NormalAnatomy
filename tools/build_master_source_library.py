#!/usr/bin/env python3
"""Build a validated multi-lecture master-source library from a reviewed collection."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> str:
    text = json.dumps(value, ensure_ascii=False, indent=2) + "\n"
    path.write_text(text, encoding="utf-8")
    return text


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def safe_name(value: str) -> str:
    text = re.sub(r"[^A-Za-z0-9._-]+", "_", value.strip()).strip("._")
    return text or "bundle"


def source_prefix(source_kind: str) -> str:
    return "SDX" if source_kind.lower() == "statdx" else "RP"


def master_image_id(alias: str, source_kind: str, number: int) -> str:
    return f"{source_prefix(source_kind)}-{alias}-{number:03d}"


def split_image_ref(value: str) -> tuple[str, int]:
    alias, number = str(value).split(":", 1)
    return alias, int(number)


def copy_file_evidence(file_info: Any) -> dict[str, Any]:
    if not isinstance(file_info, dict):
        return {}
    keys = ("status", "filename", "relativePath", "sha256", "pixelHash", "width", "height", "mime", "bytes")
    return {key: file_info.get(key) for key in keys if file_info.get(key) is not None}


def build_registry_entry(
    image: dict[str, Any],
    article: dict[str, Any],
    inventory_article: dict[str, Any],
    plan: dict[str, Any],
    archive_by_ref: dict[str, dict[str, str]],
    aliases: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    alias = inventory_article["alias"]
    source_kind = inventory_article["source"]
    number = int(image["number"])
    ref = f"{alias}:{number}"
    mid = master_image_id(alias, source_kind, number)
    duplicate = archive_by_ref.get(ref)
    plain = copy_file_evidence((image.get("files") or {}).get("plain"))
    annotated = copy_file_evidence((image.get("files") or {}).get("annotated"))
    original_caption = str(image.get("captionText") or image.get("rawCaption") or "").strip()
    teaching_caption = str((plan.get("captionCorrections") or {}).get(ref) or original_caption).strip()
    entry: dict[str, Any] = {
        "masterImageId": mid,
        "sourceKind": source_kind,
        "sourceLabel": f"{'STATdx' if source_kind == 'statdx' else 'RadPrimer'} — {article['title']}",
        "sourceArticleAlias": alias,
        "sourceArticleId": article["id"],
        "sourceArticleTitle": article["title"],
        "sourceArticleUrl": article.get("url", ""),
        "sourceFolder": article.get("folder", ""),
        "sourceImageId": image.get("id", ""),
        "sourceImageNumber": number,
        "group": image.get("group", ""),
        "groupId": image.get("groupId", ""),
        "groupImageNumber": image.get("groupImageNumber", ""),
        "caption": teaching_caption,
        "captionOriginal": original_caption,
        "captionHtml": image.get("captionHtml", ""),
        "plainUrl": image.get("plainUrl", ""),
        "annotatedUrl": image.get("annotatedUrl", ""),
        "plainFilename": Path(plain.get("relativePath") or plain.get("filename") or f"{mid}-plain.jpg").name,
        "annotatedFilename": Path(annotated.get("relativePath") or annotated.get("filename") or f"{mid}-annotated.jpg").name,
        "plainFile": plain,
        "annotatedFile": annotated,
        "downloadRecommendation": "archiveOptionalDuplicate" if duplicate else "primaryTeachingSet",
        "usedFor": ["lecture", "visual-schema", "cards"],
    }
    if teaching_caption != original_caption:
        entry["captionEditoriallyUpdated"] = True
        entry["captionUpdateReason"] = "Medical terminology/anatomy correction from the completed source review."
    if duplicate:
        keep_alias, keep_number = split_image_ref(duplicate["keep"])
        keep_source = aliases[keep_alias]["source"]
        entry["duplicateOf"] = master_image_id(keep_alias, keep_source, keep_number)
        entry["archiveReason"] = duplicate["reason"]
        entry["duplicateEvidence"] = "Exact file/content comparison documented in the completed source review; caption similarity alone was not used."
    return entry


def build_package_text(
    lecture: dict[str, Any],
    sources: list[dict[str, Any]],
    article_texts: list[tuple[dict[str, Any], str]],
    registry: list[dict[str, Any]],
    created_at: str,
    collection_root: Path,
) -> str:
    lines = [
        "MASTER SOURCE LECTURE BUNDLE",
        f"Created: {created_at}",
        f"Collection: gastrointestinal / pancreas",
        f"Source collection: {collection_root}",
        f"Lecture bundle ID: {lecture['bundleId']}",
        f"Lecture title: {lecture['title']}",
        "",
        "USE AND PROVENANCE",
        "This is an editorial container for whole downloaded articles. Source text is retained article by article below; editorial updates take precedence for teaching synthesis but do not rewrite or delete the archived originals.",
        "The complete source-qualified image catalog is in image_registry.json. Different slices, phases, modalities, views, and meaningful annotations remain. Plain/annotated variants stay paired within one registry entry.",
        "Only reviewed exact repeats are marked archiveOptionalDuplicate. Their source captions and file evidence remain in the registry.",
        "Related-article links are leads only and are not source content unless the article appears in the source list below.",
        "",
        "LECTURE RATIONALE",
        lecture["rationale"],
        "",
        "COVERAGE",
        lecture["coverage"],
        "",
        "LEARNING OBJECTIVES",
    ]
    lines.extend(f"{index}. {objective}" for index, objective in enumerate(lecture["learningObjectives"], 1))
    framework = lecture["teachingFramework"]
    lines.extend(["", "RECOMMENDED TEACHING FRAMEWORK", framework["engine"], framework["reason"],
                  "Card media requires explicit learner selection during illustrated review. Availability in this lecture does not imply a card should be created."])
    lines.extend(["", "EDITORIAL AND MEDICAL UPDATES"])
    lines.extend(f"- {item}" for item in lecture.get("editorialCorrections", []))
    lines.extend(["", "SOURCE ARTICLES (WHOLE-ARTICLE COMBINATION)"])
    for index, source in enumerate(sources, 1):
        lines.append(
            f"{index}. {source['title']} — {source['id']} — {source['sourceLabel']} — {source['imageCount']} images"
        )
    lines.extend(["", "FULL SOURCE TEXT"])
    for source, text in article_texts:
        lines.extend(
            [
                "",
                "=" * 88,
                f"SOURCE ARTICLE {source['alias']}: {source['title']}",
                f"Article ID: {source['id']}",
                f"Source: {source['sourceLabel']}",
                f"URL: {source['url']}",
                f"Collection folder: {source['folder']}",
                f"Memberships: {json.dumps(source['memberships'], ensure_ascii=False)}",
                f"Headings: {' | '.join(source['headings'])}",
                "BEGIN RETAINED ARTICLE TEXT",
                text.rstrip(),
                "END RETAINED ARTICLE TEXT",
            ]
        )
    lines.extend(
        [
            "",
            "=" * 88,
            "IMAGE CATALOG SUMMARY",
            f"Registry occurrences: {len(registry)}",
            f"Primary teaching occurrences: {sum(i['downloadRecommendation'] == 'primaryTeachingSet' for i in registry)}",
            f"Archive-optional exact repeats: {sum(i['downloadRecommendation'] == 'archiveOptionalDuplicate' for i in registry)}",
            "See image_registry.json for every complete caption, source ID, URL, local file evidence, and paired plain/annotated filenames.",
        ]
    )
    return "\n".join(lines).rstrip() + "\n"


def source_record(
    article: dict[str, Any],
    source: dict[str, Any],
    inventory_article: dict[str, Any],
    collection_root: Path,
) -> dict[str, Any]:
    return {
        "alias": inventory_article["alias"],
        "id": article["id"],
        "title": article["title"],
        "sourceKind": inventory_article["source"],
        "sourceLabel": "STATdx" if inventory_article["source"] == "statdx" else "RadPrimer",
        "url": article.get("url", ""),
        "folder": article.get("folder", ""),
        "absoluteFolder": str(collection_root / article.get("folder", "")),
        "memberships": article.get("memberships", []),
        "authors": source.get("authors", []),
        "headings": [item.get("text", "") for item in source.get("headings", []) if item.get("text")],
        "imageCount": len(article.get("images", [])),
        "addedFor": inventory_article.get("addedFor", []),
        "relatedArticles": inventory_article.get("relatedArticles", []),
        "contentFiles": {
            "sourceJson": f"{article.get('folder', '')}/source.json",
            "articleText": f"{article.get('folder', '')}/article.txt",
            "articleHtml": f"{article.get('folder', '')}/article.html",
            "imagesJson": f"{article.get('folder', '')}/images.json",
        },
    }


def validate_source_files(collection_root: Path, article: dict[str, Any]) -> list[str]:
    missing = []
    folder = collection_root / article.get("folder", "")
    for name in ("source.json", "article.txt", "article.html", "images.json"):
        if not (folder / name).is_file():
            missing.append(str(folder / name))
    for image in article.get("images", []):
        for variant in ("plain", "annotated"):
            info = (image.get("files") or {}).get(variant) or {}
            rel = info.get("relativePath")
            if not rel or not (collection_root / rel).is_file():
                missing.append(str(collection_root / (rel or f"[missing {variant} path]")))
    return missing


def build_library(collection_root: Path, plan_path: Path, output_root: Path) -> dict[str, Any]:
    collection = read_json(collection_root / "collection.json")
    plan = read_json(plan_path)
    inventory_path = plan_path.parent / "inventory.json"
    inventory = read_json(inventory_path)
    if plan.get("version") != 1:
        raise ValueError("Only master bundle plan version 1 is supported.")
    if plan.get("collectionKey") != "gastrointestinal / pancreas":
        raise ValueError("Plan collectionKey must be gastrointestinal / pancreas.")
    if collection.get("status") != "complete":
        raise ValueError(f"Collection is not complete: {collection.get('status')!r}")

    inventory_articles = inventory.get("articles", [])
    aliases = {item["alias"]: item for item in inventory_articles}
    articles_by_id = collection.get("articles", {})
    planned_ids = [item["id"] for lecture in plan["lectures"] for item in lecture["articles"]]
    collection_ids = list(articles_by_id)
    if len(planned_ids) != len(set(planned_ids)):
        raise ValueError("An article is assigned to more than one lecture.")
    if set(planned_ids) != set(collection_ids):
        missing = sorted(set(collection_ids) - set(planned_ids))
        extra = sorted(set(planned_ids) - set(collection_ids))
        raise ValueError(f"Article assignment mismatch. missing={missing}; extra={extra}")

    archive_by_ref = {item["archive"]: item for item in plan.get("archiveDuplicates", [])}
    all_valid_refs = {
        f"{item['alias']}:{number}"
        for item in inventory_articles
        for number in range(1, int(item["images"]) + 1)
    }
    for item in plan.get("archiveDuplicates", []):
        if item["archive"] not in all_valid_refs or item["keep"] not in all_valid_refs:
            raise ValueError(f"Invalid exact-repeat mapping: {item}")

    output_root.mkdir(parents=True, exist_ok=True)
    created_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    library_bundles: list[dict[str, Any]] = []
    bundle_summaries: list[dict[str, Any]] = []
    inspected_files: list[str] = []
    missing_files: list[str] = []
    global_image_ids: set[str] = set()
    present_image_variant_files = 0

    for sequence, lecture in enumerate(plan["lectures"], 1):
        folder = output_root / f"{sequence:02d}_{safe_name(lecture['bundleId'])}"
        folder.mkdir(exist_ok=True)
        framework = lecture.get("teachingFramework")
        if not framework or framework.get("engine") not in ("normal", "pathology", "mixed"):
            raise ValueError(f"Review the teaching framework for {lecture['bundleId']} before building.")
        sources: list[dict[str, Any]] = []
        article_texts: list[tuple[dict[str, Any], str]] = []
        registry: list[dict[str, Any]] = []
        for expected in lecture["articles"]:
            article = articles_by_id.get(expected["id"])
            if not article:
                raise ValueError(f"Missing collection article {expected['id']}")
            inv = aliases.get(expected["alias"])
            if not inv or inv["id"] != expected["id"]:
                raise ValueError(f"Inventory mismatch for {expected['alias']}")
            if article["title"] != expected["title"]:
                raise ValueError(f"Title mismatch for {expected['alias']}: {article['title']!r}")
            article_folder = collection_root / article["folder"]
            source = read_json(article_folder / "source.json")
            text = (article_folder / "article.txt").read_text(encoding="utf-8")
            record = source_record(article, source, inv, collection_root)
            record["teachingRole"] = lecture.get("articleTeachingRoles", {}).get(inv["alias"], framework["engine"])
            sources.append(record)
            article_texts.append((record, text))
            inspected_files.extend(str(article_folder / name) for name in ("source.json", "article.txt", "article.html", "images.json"))
            missing_files.extend(validate_source_files(collection_root, article))
            for image in article.get("images", []):
                entry = build_registry_entry(image, article, inv, plan, archive_by_ref, aliases)
                entry["teachingRole"] = record["teachingRole"]
                for variant_key in ("plainFile", "annotatedFile"):
                    relative_path = entry.get(variant_key, {}).get("relativePath")
                    if relative_path and (collection_root / relative_path).is_file():
                        present_image_variant_files += 1
                if entry["masterImageId"] in global_image_ids:
                    raise ValueError(f"Duplicate master image ID: {entry['masterImageId']}")
                global_image_ids.add(entry["masterImageId"])
                registry.append(entry)

        selected_ids = [i["masterImageId"] for i in registry if i["downloadRecommendation"] == "primaryTeachingSet"]
        archive_ids = [i["masterImageId"] for i in registry if i["downloadRecommendation"] == "archiveOptionalDuplicate"]
        package_text = build_package_text(lecture, sources, article_texts, registry, created_at, collection_root)
        registry_text = json.dumps(registry, ensure_ascii=False, indent=2) + "\n"
        source_selection_plan = {
            "articlePolicy": "whole-article combination",
            "articleOrder": [source["id"] for source in sources],
            "imagePolicy": "Retain distinct slices, phases, views, modalities, and meaningful annotations; keep plain/annotated pairs; archive only reviewed exact repeats.",
            "duplicateEvidencePolicy": "image-overlap.json is candidate evidence only; exact-repeat decisions came from actual-file comparison documented in the completed review.",
            "imageDownloadPlan": {
                "primaryTeachingSet": {lecture["bundleId"]: selected_ids},
                "archiveOptionalDuplicates": {lecture["bundleId"]: archive_ids},
            },
        }
        manifest = {
            "version": 1,
            "bundleId": lecture["bundleId"],
            "librarySequence": sequence,
            "libraryTitle": plan["libraryTitle"],
            "collectionKey": plan["collectionKey"],
            "articleTitle": lecture["title"],
            "sourceLabel": f"{plan['libraryTitle']} — lecture {sequence} of {len(plan['lectures'])}",
            "createdAt": created_at,
            "canonicalHierarchy": ["All Categories", "Gastrointestinal", "Pancreas", lecture["title"]],
            "canonicalDeckPath": f"Corebook::GI::Pancreas::{lecture['deckSuffix']}",
            "rationale": lecture["rationale"],
            "teachingFramework": framework,
            "cardSelectionRequired": True,
            "coverage": lecture["coverage"],
            "learningObjectives": lecture["learningObjectives"],
            "editorialCorrections": lecture.get("editorialCorrections", []),
            "sources": sources,
            "sourceArticleIds": [source["id"] for source in sources],
            "sourceArticleCount": len(sources),
            "imageCount": len(registry),
            "selectedPrimaryImageIds": selected_ids,
            "archiveOptionalImageIds": archive_ids,
            "sourceSelectionPlan": source_selection_plan,
            "unavailableOrUninspected": [
                "STATdx relatedArticles links that are not separate entries in this 27-article collection were not downloaded or inspected.",
                "The two downloaded STATdx articles have blank addedFor fields and no recorded study-pack membership; those reasons cannot be reconstructed from the collection.",
            ],
            "packageSha256": sha256_text(package_text),
            "imageRegistrySha256": sha256_text(registry_text),
        }
        import_object = {
            "version": 1,
            "bundleId": lecture["bundleId"],
            "librarySequence": sequence,
            "libraryTitle": plan["libraryTitle"],
            "collectionKey": plan["collectionKey"],
            "sourceLabel": manifest["sourceLabel"],
            "teachingFramework": framework,
            "articleTitle": lecture["title"],
            "createdAt": created_at,
            "packageText": package_text,
            "manifest": manifest,
            "imageRegistry": registry,
            "sourceSelectionPlan": source_selection_plan,
            "selectedPrimaryImageIds": selected_ids,
            "archiveOptionalImageIds": archive_ids,
        }
        (folder / "master_source_package.txt").write_text(package_text, encoding="utf-8")
        write_json(folder / "image_registry.json", registry)
        write_json(folder / "master_source_manifest.json", manifest)
        write_json(folder / "master_source_import.json", import_object)
        report = "\n".join(
            [
                f"# {lecture['title']}",
                "",
                f"- Bundle ID: `{lecture['bundleId']}`",
                f"- Whole source articles: {len(sources)}",
                f"- Image occurrences retained in registry: {len(registry)}",
                f"- Primary teaching occurrences: {len(selected_ids)}",
                f"- Archive-optional exact repeats: {len(archive_ids)}",
                f"- Package SHA-256: `{manifest['packageSha256']}`",
                f"- Registry SHA-256: `{manifest['imageRegistrySha256']}`",
                "",
                "All source articles remain in their original collection folders. This bundle contains source text and metadata references; it does not delete or alter source files.",
                "",
            ]
        )
        (folder / "master_source_report.md").write_text(report, encoding="utf-8")
        (folder / "_codex_master_source_done.txt").write_text(
            "\n".join(
                [
                    "masterSourceReady=true",
                    f"createdAt={created_at}",
                    f"bundleId={lecture['bundleId']}",
                    f"articleTitle={lecture['title']}",
                    f"sourceArticleCount={len(sources)}",
                    f"imageCount={len(registry)}",
                    f"packageSha256={manifest['packageSha256']}",
                    f"imageRegistrySha256={manifest['imageRegistrySha256']}",
                    "",
                ]
            ),
            encoding="utf-8",
        )
        library_bundles.append(import_object)
        bundle_summaries.append(
            {
                "bundleId": lecture["bundleId"],
                "sequence": sequence,
                "title": lecture["title"],
                "sourceArticleCount": len(sources),
                "teachingFramework": framework,
                "sourceArticleIds": [source["id"] for source in sources],
                "imageCount": len(registry),
                "primaryImageCount": len(selected_ids),
                "archiveOptionalImageCount": len(archive_ids),
                "folder": folder.name,
            }
        )

    expected_image_count = sum(int(item["images"]) for item in inventory_articles)
    actual_image_count = sum(item["imageCount"] for item in bundle_summaries)
    errors: list[str] = []
    if missing_files:
        errors.append(f"Missing required source/media files: {len(missing_files)}")
    if actual_image_count != expected_image_count:
        errors.append(f"Image occurrence mismatch: expected {expected_image_count}, got {actual_image_count}")
    if len(global_image_ids) != actual_image_count:
        errors.append("Master image IDs are not globally unique.")
    library = {
        "version": 1,
        "collectionKey": plan["collectionKey"],
        "libraryTitle": plan["libraryTitle"],
        "createdAt": created_at,
        "activeBundleId": plan["activeBundleId"],
        "bundleSummaries": bundle_summaries,
        "bundles": library_bundles,
    }
    library_text = write_json(output_root / "master_source_library.json", library)
    validation = {
        "version": 1,
        "status": "passed" if not errors else "failed",
        "validatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "collectionStatus": collection.get("status"),
        "collectionArticleCount": len(collection_ids),
        "assignedArticleCount": len(planned_ids),
        "lectureCount": len(bundle_summaries),
        "expectedImageOccurrences": expected_image_count,
        "registryImageOccurrences": actual_image_count,
        "expectedPairedImageVariantFiles": expected_image_count * 2,
        "pairedImageVariantFilesPresent": present_image_variant_files,
        "primaryTeachingOccurrences": sum(item["primaryImageCount"] for item in bundle_summaries),
        "archiveOptionalExactRepeats": sum(item["archiveOptionalImageCount"] for item in bundle_summaries),
        "requiredArticleFilesInspected": len(inspected_files),
        "missingSourceOrMediaFiles": missing_files,
        "librarySha256": sha256_text(library_text),
        "errors": errors,
        "bundles": bundle_summaries,
    }
    write_json(output_root / "library-validation.json", validation)
    readme_lines = [
        f"# {plan['libraryTitle']}",
        "",
        "Reload the updated extension and import `master_source_library.json`. Select a lecture, click **Use selected lecture**, and leave **Use master bundle recommendation** selected. Generate or open its illustrated lecture.",
        "",
        "During illustrated review choose **Use for cards**, **Lecture only**, or **Decide later** for each image, with an Anatomy, Pathology, or Both objective. Nothing is selected for cards by default. Click **Prepare selected images for cards**, then run **Build cards with images** from the extension popup. The actual card run checks the current retained-card bank; preparation only stages your selection.",
        "",
        "Each numbered folder is also a standalone master-source bundle and can be imported with its own `master_source_import.json`.",
        "",
        "## Lectures",
        "",
    ]
    for item in bundle_summaries:
        readme_lines.append(
            f"{item['sequence']}. **{item['title']}** — {item['sourceArticleCount']} whole articles, {item['imageCount']} image occurrences ({item['archiveOptionalImageCount']} exact repeats archive-optional). Recommended framework: **{item['teachingFramework']['engine']}**."
        )
    readme_lines.extend(
        [
            "",
            "## Validation",
            "",
            f"Status: **{validation['status']}**. All {validation['assignedArticleCount']} collection articles are assigned exactly once across six lectures; all {validation['registryImageOccurrences']} image occurrences remain in a registry.",
            "",
            "The original source collection was read only and remains unchanged.",
            "",
        ]
    )
    (output_root / "README.md").write_text("\n".join(readme_lines), encoding="utf-8")
    (output_root / "_codex_master_source_library_done.txt").write_text(
        "\n".join(
            [
                "masterSourceLibraryReady=true",
                f"createdAt={created_at}",
                f"libraryTitle={plan['libraryTitle']}",
                f"lectureCount={len(bundle_summaries)}",
                f"articleCount={len(planned_ids)}",
                f"imageCount={actual_image_count}",
                f"librarySha256={validation['librarySha256']}",
                "",
            ]
        ),
        encoding="utf-8",
    )
    if errors:
        raise RuntimeError("Library validation failed: " + "; ".join(errors))
    return validation


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--collection", type=Path, required=True)
    parser.add_argument("--plan", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    validation = build_library(args.collection.resolve(), args.plan.resolve(), args.output.resolve())
    print(json.dumps(validation, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
