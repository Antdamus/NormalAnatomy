import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path


BUNDLE = Path(__file__).resolve().parents[1]


def read_json(name):
    return json.loads((BUNDLE / name).read_text(encoding="utf-8"))


def clean_caption(text):
    return " ".join((text or "").split())


def target_filename(entry, annotated=False):
    prefix = entry["masterImageId"]
    source = entry["sourceLabel"]
    stem = (entry.get("imageId") or prefix).split("-")[0]
    kind = "annotated" if annotated else "plain"
    return f"{prefix}_{source}_{kind}_{stem}.jpg"


metadata = read_json("metadata.json")
rp_meta = read_json("RadPrimer_metadata.json")
sdx_meta = read_json("STATdx_metadata.json")

rp_images = rp_meta["imageRegistry"]
sdx_images = sdx_meta["imageRegistry"]
all_images = rp_images + sdx_images
by_id = {image["masterImageId"]: image for image in all_images}

selected_primary_ids = [
    "RP-01",
    "RP-02",
    "RP-03",
    "RP-04",
    "SDX-01",
    "SDX-03",
    "SDX-04",
    "SDX-06",
    "SDX-07",
    "SDX-08",
    "SDX-09",
    "SDX-10",
    "SDX-11",
    "SDX-12",
    "SDX-13",
]
archive_optional_ids = ["SDX-02", "SDX-05"]

classification = {
    "RP-01": {
        "classification": "conceptualReplacement",
        "related": ["SDX-03", "SDX-07", "SDX-08"],
        "notes": (
            "STATdx includes colon-containing Spigelian hernia examples, but visual review "
            "shows no same-slice or same-screenshot match for the RadPrimer image. The "
            "RadPrimer image remains primary because it best demonstrates the intermuscular "
            "course deep to the external oblique layer."
        ),
    },
    "RP-02": {
        "classification": "exactDuplicate",
        "related": ["SDX-05"],
        "notes": (
            "Visual review of staged image_evidence files shows the same CT slice/screenshot "
            "with only source rendering/crop differences. The RadPrimer image remains the "
            "canonical primary image; the matching STATdx rendering is archive-optional."
        ),
    },
    "RP-03": {
        "classification": "exactDuplicate",
        "related": ["SDX-02"],
        "notes": (
            "Visual review of staged image_evidence files shows the same NECT slice/screenshot. "
            "The RadPrimer image remains the canonical primary image; the matching STATdx "
            "rendering is archive-optional."
        ),
    },
    "RP-04": {
        "classification": "nearDuplicate",
        "related": ["SDX-04"],
        "notes": (
            "Both images show the same obstructing Spigelian hernia teaching point and likely "
            "the same case, but the staged evidence shows a different adjacent slice/crop. "
            "Because it is not a literal same-slice duplicate, both images remain primary as "
            "an atomic obstruction cluster."
        ),
    },
}

used_for = {
    "RP-01": [
        "canonicalRadPrimerBackbone",
        "intermuscularSpigelianHernia",
        "colonContainingHernia",
        "externalObliqueCover",
        "axialCECT",
    ],
    "RP-02": [
        "canonicalRadPrimerBackbone",
        "spigelianAponeurosisDefect",
        "externalObliqueCover",
        "samePatientCaudalSlice",
        "axialCECT",
    ],
    "RP-03": [
        "canonicalRadPrimerBackbone",
        "smallLeftLowerQuadrantHernia",
        "externalObliqueCover",
        "axialNECT",
    ],
    "RP-04": [
        "canonicalRadPrimerBackbone",
        "smallBowelObstruction",
        "incarcerationRisk",
        "adjacentSliceCluster",
        "axialCECT",
    ],
    "SDX-01": [
        "partialSmallBowelObstruction",
        "surgeryConfirmed",
        "alternateExample",
        "recognitionReinforcement",
        "axialCECT",
    ],
    "SDX-02": [],
    "SDX-03": [
        "incidentalSpigelianHernia",
        "ascendingColonContainingHernia",
        "noObstruction",
        "aneurysmContext",
        "samePatientCluster",
        "recognitionReinforcement",
        "axialNECT",
    ],
    "SDX-04": [
        "smallBowelObstruction",
        "adjacentSliceCluster",
        "nearDuplicateReinforcement",
        "recognitionReinforcement",
        "axialCECT",
    ],
    "SDX-05": [],
    "SDX-06": [
        "simpleLeftSpigelianHernia",
        "alternateExample",
        "recognitionReinforcement",
        "axialCECT",
    ],
    "SDX-07": [
        "largeIntestineContainingHernia",
        "alternateExample",
        "recognitionReinforcement",
        "axialNECT",
    ],
    "SDX-08": [
        "incidentalSpigelianHernia",
        "ascendingColonContainingHernia",
        "noObstruction",
        "aneurysmContext",
        "samePatientCluster",
        "recognitionReinforcement",
        "axialNECT",
    ],
    "SDX-09": [
        "appendixInSpigelianHernia",
        "inflamedAppendix",
        "rareContent",
        "samePatientCluster",
        "recognitionReinforcement",
        "axialCECT",
    ],
    "SDX-10": [
        "appendixInSpigelianHernia",
        "inflamedAppendix",
        "rareContent",
        "samePatientCluster",
        "recognitionReinforcement",
        "axialCECT",
    ],
    "SDX-11": [
        "MRModalityVariant",
        "leftLowerQuadrantHernia",
        "externalObliqueCover",
        "recognitionReinforcement",
        "axialT2MR",
    ],
    "SDX-12": [
        "epiploicAppendagitisInHernia",
        "fatContainingLesion",
        "samePatientCluster",
        "complicationVariant",
        "recognitionReinforcement",
        "axialCECT",
    ],
    "SDX-13": [
        "epiploicAppendagitisInHernia",
        "fatContainingLesion",
        "samePatientCluster",
        "complicationVariant",
        "recognitionReinforcement",
        "axialCECT",
    ],
}

duplicate_notes = {
    "SDX-02": "Exact duplicate of RadPrimer image 3 based on visual inspection of the staged NECT evidence files; archived as the duplicate STATdx rendering.",
    "SDX-05": "Exact duplicate of RadPrimer image 2 based on visual inspection of the staged CECT evidence files; archived as the duplicate STATdx rendering.",
}


def evidence_hash(entry):
    evidence = entry.get("visualEvidence") or {}
    rel = evidence.get("evidenceFilename")
    if not rel:
        return None
    path = BUNDLE / rel
    if not path.exists():
        return None
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def enrich_image(entry):
    mid = entry["masterImageId"]
    evidence = dict(entry.get("visualEvidence") or {})
    sha = evidence_hash(entry)
    if sha:
        evidence["sha256"] = sha
    item = {
        "masterImageId": mid,
        "displayLabel": f'{entry["sourceLabel"]} image {entry["sourceImageNumber"]}',
        "sourceKind": entry["sourceKind"],
        "sourceLabel": entry["sourceLabel"],
        "sourceImageNumber": entry["sourceImageNumber"],
        "imageId": entry.get("imageId", ""),
        "baseName": entry.get("baseName", ""),
        "caption": clean_caption(entry.get("caption", "")),
        "usedFor": used_for.get(mid, []),
        "downloadRecommendation": "archiveOptionalDuplicate"
        if mid in archive_optional_ids
        else "primaryTeachingSet",
        "plainFilename": entry.get("plainFilename", ""),
        "annotatedFilename": entry.get("annotatedFilename", ""),
        "plainUrl": entry.get("plainUrl", ""),
        "annotatedUrl": entry.get("annotatedUrl", ""),
        "targetPlainFilename": target_filename(entry, annotated=False),
        "targetAnnotatedFilename": target_filename(entry, annotated=True),
        "visualEvidence": evidence,
    }
    if mid in archive_optional_ids:
        item["archiveReason"] = duplicate_notes[mid]
        item["duplicateStatus"] = "exactDuplicate"
        item["duplicateOf"] = "RP-03" if mid == "SDX-02" else "RP-02"
    elif mid == "SDX-04":
        item["duplicateStatus"] = "nearDuplicate"
        item["relatedImageIds"] = ["RP-04"]
    elif mid in ["SDX-03", "SDX-08"]:
        item["relatedImageIds"] = ["SDX-03", "SDX-08"]
        item["clusterNote"] = "STATdx same-patient incidental ascending-colon/aneurysm cluster; retained together."
    elif mid in ["SDX-09", "SDX-10"]:
        item["relatedImageIds"] = ["SDX-09", "SDX-10"]
        item["clusterNote"] = "STATdx appendix-within-Spigelian-hernia cluster; retained together."
    elif mid in ["SDX-12", "SDX-13"]:
        item["relatedImageIds"] = ["SDX-12", "SDX-13"]
        item["clusterNote"] = "STATdx epiploic-appendagitis-within-hernia cluster; retained together."
    return item


image_registry = [enrich_image(image) for image in all_images]


def display(mid):
    image = by_id[mid]
    return f'{image["sourceLabel"]} image {image["sourceImageNumber"]}'


coverage_rows = []
for rp_id in ["RP-01", "RP-02", "RP-03", "RP-04"]:
    row = classification[rp_id]
    coverage_rows.append(
        {
            "radPrimerImageId": rp_id,
            "radPrimerImageLabel": display(rp_id),
            "classification": row["classification"],
            "relatedSTATdxImageIds": row["related"],
            "relatedSTATdxImageLabels": [display(mid) for mid in row["related"]],
            "decision": "selectedPrimary",
            "notes": row["notes"],
        }
    )

primary_downloads = [
    {
        "masterImageId": image["masterImageId"],
        "displayLabel": image["displayLabel"],
        "sourceKind": image["sourceKind"],
        "sourceLabel": image["sourceLabel"],
        "sourceImageNumber": image["sourceImageNumber"],
        "plainUrl": image.get("plainUrl", ""),
        "annotatedUrl": image.get("annotatedUrl", ""),
        "targetPlainFilename": image["targetPlainFilename"],
        "targetAnnotatedFilename": image["targetAnnotatedFilename"],
    }
    for image in image_registry
    if image["masterImageId"] in selected_primary_ids
]

archive_downloads = [
    {
        "masterImageId": image["masterImageId"],
        "displayLabel": image["displayLabel"],
        "duplicateOf": image.get("duplicateOf", ""),
        "reason": image.get("archiveReason", ""),
        "targetPlainFilename": image["targetPlainFilename"],
        "targetAnnotatedFilename": image["targetAnnotatedFilename"],
    }
    for image in image_registry
    if image["masterImageId"] in archive_optional_ids
]

canonical_hierarchy = metadata["canonicalHierarchy"]
canonical_deck_path = metadata.get("canonicalDeckPath", "")

source_selection_plan = {
    "textBackbone": (
        "Use RadPrimer as the canonical hierarchy/backbone and preserve its article ordering. "
        "Use STATdx as supplemental depth where it adds differential nuance, recurrence/side "
        "notes, stronger captions, modality variants, or additional complication examples."
    ),
    "radPrimerKeep": [
        "canonical hierarchy from metadata.json canonicalHierarchy",
        "RadPrimer breadcrumb/deck routing",
        "core terminology and definition",
        "location/anatomic mechanism and CT/US imaging checklist",
        "all RadPrimer images as the canonical primary backbone",
    ],
    "statDxKeep": [
        "supplemental differential items: subcutaneous/intramuscular lipoma and fluid collection/hematoma mimics",
        "minor clinical nuance: possible slight left-sided predominance and low recurrence after mesh repair",
        "STATdx-only or nonduplicate images showing partial obstruction, incidental colon-containing cases, rare appendix and epiploic appendagitis contents, and MR modality variant",
        "caption details when they add surgical confirmation or complication context",
    ],
    "downweightOrSkip": [
        "STATdx breadcrumb/deck routing",
        "STATdx image 2 because it is an exact duplicate of RadPrimer image 3",
        "STATdx image 5 because it is an exact duplicate of RadPrimer image 2",
        "unsupported Core Radiology claims; no auditable Core source was supplied or retrieved in this bundle",
    ],
    "primaryImageDownloadUseSet": selected_primary_ids,
    "archiveDuplicateImageIds": archive_optional_ids,
    "imageDownloadPlan": {
        "downloadOnly": "selectedPrimaryImageIds",
        "primaryDownloads": primary_downloads,
        "archiveOptionalDuplicates": archive_downloads,
        "filenamePolicy": "Use source-qualified filenames with RP/SDX traceability IDs for downloads; use clean labels such as RadPrimer image 3 in narrative prose.",
    },
    "imageCurationPolicy": (
        "Exact duplicates may be archived. Near duplicates, adjacent slices, alternate same-disease examples, "
        "conceptual replacements, and modality variants remain selected as recognition reinforcement unless "
        "visually identical or unusable."
    ),
    "duplicateEvidencePolicy": (
        "ExactDuplicate decisions require visual evidence from image_evidence files, same stable source image ID, "
        "image hashes, or explicit manual/source confirmation. Caption-only or topic-only similarity is marked "
        "nearDuplicate or conceptualReplacement and kept primary."
    ),
    "caseClusterGuardrails": {
        "policy": "Treat same-patient, follow-up, procedure, adjacent-slice, comparison-view, and time-lapse clusters as atomic teaching units.",
        "intentionalSplits": [],
        "retainedClusters": [
            "RadPrimer images 1 and 2: same patient at different axial levels; retained together.",
            "RadPrimer image 4 and STATdx image 4: obstruction case/adjacent-slice cluster; retained together because it is not exact duplicate evidence.",
            "STATdx images 3 and 8: incidental ascending-colon Spigelian hernia with aneurysm context; retained together.",
            "STATdx images 9 and 10: appendix within Spigelian hernia cluster; retained together.",
            "STATdx images 12 and 13: epiploic appendagitis within Spigelian hernia cluster; retained together.",
        ],
        "splitReport": "No source case cluster was intentionally split. Only isolated cross-source duplicate renderings were archived.",
    },
    "generatorInstructions": [
        "Do not generate cards or a lecture during this synthesis step.",
        "Use source-qualified image labels in human-facing prose, such as RadPrimer image 2 and STATdx image 11.",
        "Keep RP-02 and SDX-05 style IDs in registry, filenames, manifest, and traceability fields.",
        "Use canonicalHierarchy exactly as copied from metadata.json for deckPath and any IMAIOS breadcrumb routing.",
    ],
}

manifest = {
    "articleTitle": metadata["articleTitle"],
    "canonicalHierarchy": canonical_hierarchy,
    "canonicalHierarchySource": "metadata.json canonicalHierarchy",
    "canonicalDeckPath": canonical_deck_path,
    "sourcePriority": ["RadPrimer canonical", "STATdx supplemental"],
    "sourceCoverage": {
        "textCoverage": (
            "RadPrimer and STATdx substantially overlap. RadPrimer is the canonical article backbone; STATdx "
            "adds supplemental differential nuance, recurrence/side notes, and expanded image examples."
        ),
        "imageCoverageSummary": (
            "STATdx does not fully cover the RadPrimer image set as exact duplicates. Visual review of staged "
            "image_evidence files shows exact duplicate coverage for RadPrimer images 2 and 3 only; RadPrimer "
            "image 4 has a near-duplicate/adjacent-slice STATdx companion; RadPrimer image 1 has conceptual "
            "STATdx reinforcement but no same-slice duplicate. All RadPrimer images remain selected primary."
        ),
        "radPrimerImageCoverageBySTATdx": coverage_rows,
    },
    "imageCountBySource": {
        "RadPrimer": len(rp_images),
        "STATdx": len(sdx_images),
        "selectedPrimary": len(selected_primary_ids),
        "archiveOptional": len(archive_optional_ids),
    },
    "sourceAttributionRules": {
        "Both": "supported by both RadPrimer and STATdx source packages",
        "RadPrimer": "RadPrimer-only or RadPrimer-preferred canonical detail",
        "STATdx": "supplemental STATdx image example, caption detail, modality variant, or differential nuance",
    },
    "selectedPrimaryImageIds": selected_primary_ids,
    "archiveOptionalImageIds": archive_optional_ids,
    "sourceSelectionPlan": source_selection_plan,
}

package_lines = [
    "=== MASTER SOURCE PACKAGE ===",
    "TITLE: Spigelian Hernia",
    "SOURCE SYNTHESIS: RadPrimer canonical backbone with STATdx supplemental depth",
    "",
    "=== CANONICAL HIERARCHY ===",
    " > ".join(canonical_hierarchy),
    f"Canonical deck path: {canonical_deck_path}",
    "Routing note: canonicalHierarchy is copied exactly from metadata.json; STATdx breadcrumbs were not used for deck routing.",
    "",
    "=== SOURCE ATTRIBUTION RULES ===",
    "- [Both] = supported by both RadPrimer and STATdx source packages.",
    "- [RadPrimer] = RadPrimer-only or RadPrimer-preferred canonical detail.",
    "- [STATdx] = supplemental STATdx image example, caption detail, modality variant, or differential nuance.",
    "",
    "=== IMAGE COVERAGE GATE ===",
    manifest["sourceCoverage"]["imageCoverageSummary"],
]
for row in coverage_rows:
    related = ", ".join(row["relatedSTATdxImageLabels"]) or "none"
    package_lines.append(
        f'- {row["radPrimerImageLabel"]}: {row["classification"]}; related STATdx images: {related}. {row["notes"]}'
    )

package_lines.extend(
    [
        "",
        "=== KEY FACTS ===",
        "- [Both] Spigelian hernia is a hernia through a defect in the aponeurosis of the internal oblique and transversus abdominis muscles, also called the Spigelian aponeurosis.",
        "- [Both] The sac typically lies along the lateral margin of the rectus abdominis, inferior and lateral to the umbilicus, near the arcuate line.",
        "- [Both] The external oblique aponeurosis and muscle usually remain intact over the sac, so most Spigelian hernias are interstitial/interparietal rather than visibly subcutaneous.",
        "- [Both] About 90% occur within the Spigelian belt of Spangen, a 6-cm transverse band above the line joining the anterior superior iliac spines.",
        "- [Both] Common contents include greater omentum, small bowel, or colon; rare contents include appendix, bladder, and other abdominal or pelvic structures.",
        "- [Both] Most defects are small, often < 2 cm, creating a narrow neck with high incarceration and strangulation risk.",
        "- [RadPrimer] Spigelian hernia accounts for 1-2% of anterior abdominal hernias.",
        "- [STATdx] May show slight left-sided predominance, although the reason is uncertain.",
        "",
        "=== TERMINOLOGY ===",
        "- [Both] Abbreviation: SH.",
        "- [Both] Synonyms: lateral ventral hernia, anterolateral hernia, hernia through conjoint tendon.",
        "- [Both] Interstitial/interparietal Spigelian hernia is located among abdominal wall muscle layers and accounts for the great majority of cases.",
        "- [Both] Subcutaneous Spigelian hernia crosses the major oblique aponeurosis and becomes superficial; this is rare.",
        "",
        "=== IMAGING ===",
        "- [Both] Best diagnostic clue: hernia lateral to the rectus muscle, caudal/lateral to the umbilicus, covered by intact external oblique muscle or fascia.",
        "- [Both] CT shows the defect in the transversus abdominis/internal oblique aponeurosis, herniation of omentum and/or bowel, and any obstruction or ischemic complication.",
        "- [Both] CECT is the best imaging tool when the question is acute pain, obstruction, incarceration, strangulation, or surgical planning.",
        "- [Both] Ultrasound can evaluate the linea semilunaris dynamically; cough/Valsalva and targeted scanning from the lateral rectus margin inferiorly can increase conspicuity.",
        "- [RadPrimer] Identification of the inferior epigastric artery while scanning inferior from the umbilicus can help localize the relevant abdominal wall anatomy.",
        "- [STATdx] MRI may show the same anatomic relationship and is useful as a modality variant when incidentally encountered.",
        "",
        "=== DIFFERENTIAL DIAGNOSIS ===",
        "- [Both] Ventral hernia: usually through the midline aponeurosis; off-midline incisional hernias can mimic Spigelian hernia but lack an intact external oblique layer over the sac.",
        "- [Both] Umbilical hernia: bowel, fat, or ascites protrudes through a midline umbilical defect, while Spigelian hernia is inferior/lateral to the umbilicus.",
        "- [Both] Laparoscopy port hernia: usually a smaller defect and may be medial or lateral to the classic Spigelian site.",
        "- [Both] Rectus sheath hematoma: cylindrical heterogeneous mass within the sheath without a true fascial defect or hernia; CT should distinguish it.",
        "- [STATdx] Subcutaneous or intramuscular lipoma can mimic a wall mass but should be separable from hernia on CT because there is no true fascial defect or bowel/omentum-containing sac.",
        "- [STATdx] Subcutaneous masses, fluid collections, or hematoma are broader nonhernia mimics to keep in mind when a palpable wall abnormality is present.",
        "",
        "=== PATHOLOGY AND RISK FACTORS ===",
        "- [Both] Etiology is probably multifactorial, including congenital weakness of the Spigelian fascia and acquired weakness in adults.",
        "- [Both] The abdominal wall is intrinsically weak near the arcuate line because of absent posterior rectus sheath support.",
        "- [Both] Children usually have congenital defects; adults usually have acquired defects.",
        "- [Both] Major adult risk factors are prior abdominal surgery and obesity; additional risks include multiple pregnancies, rapid weight loss, COPD, and trauma.",
        "- [Both] Pediatric associations include ipsilateral undescended testis and other anterior abdominal wall defects such as omphalocele, bladder exstrophy, and prune belly.",
        "- [Both] Coexisting ventral, inguinal, or umbilical hernias may be present.",
        "",
        "=== CLINICAL AND MANAGEMENT ===",
        "- [Both] Presentation ranges from asymptomatic to pain, palpable bulge/mass most apparent when standing, and bowel obstruction symptoms.",
        "- [Both] Clinical diagnosis can be difficult because the sac is deep, especially in obese patients.",
        "- [Both] Typical adult age range is 40-70 years. Pediatric cases have male predominance; adult sex distribution is roughly equal.",
        "- [Both] A tight narrow neck makes strangulation common; RadPrimer reports 20% at presentation and STATdx reports 24% at presentation.",
        "- [Both] Surgical treatment is indicated or recommended in virtually all patients because of high incarceration and strangulation risk.",
        "- [Both] Repair may be open or laparoscopic, with laparoscopic repair now preferred; treatment commonly uses primary mesh repair or mesh reinforcement.",
        "- [STATdx] Recurrence rates after mesh repair are low.",
        "- [Both] Preoperative or intraoperative ultrasound localization can reduce unnecessary dissection, especially in obese patients.",
        "",
        "=== SELECTED PRIMARY IMAGE SET ===",
    ]
)

for mid in selected_primary_ids:
    image = by_id[mid]
    uses = ", ".join(used_for[mid])
    package_lines.append(
        f"- {display(mid)}: {clean_caption(image.get('caption', ''))} Used for: {uses}."
    )

package_lines.extend(["", "=== ARCHIVE-OPTIONAL DUPLICATE IMAGES ==="])
for mid in archive_optional_ids:
    package_lines.append(f"- {display(mid)}: archiveOptionalDuplicate. {duplicate_notes[mid]}")

package_lines.extend(
    [
        "",
        "=== CASE CLUSTER NOTES ===",
        "- No source case cluster was intentionally split.",
        "- RadPrimer images 1 and 2 are retained together as same-patient different-level CT images.",
        "- RadPrimer image 4 and STATdx image 4 are retained together as an obstruction/adjacent-slice cluster because the STATdx image is not the same slice/screenshot.",
        "- STATdx images 3 and 8 are retained together as an incidental colon-containing Spigelian hernia with aneurysm context.",
        "- STATdx images 9 and 10 are retained together as an appendix-within-Spigelian-hernia cluster.",
        "- STATdx images 12 and 13 are retained together as an epiploic-appendagitis-within-Spigelian-hernia cluster.",
        "- Only STATdx image 2 and STATdx image 5 are archive-optional, because staged visual evidence showed literal duplicate/same-slice renderings of RadPrimer images.",
        "",
        "=== GENERATOR INSTRUCTIONS ===",
        "- Use this package as source material for later narrative/cards, but do not generate cards or lecture output during this synthesis step.",
        "- Use clean source-qualified labels in prose, such as RadPrimer image 2 and STATdx image 11.",
        "- Use registry IDs, source image IDs, evidence filenames, source-qualified filenames, selectedPrimaryImageIds, and archiveOptionalImageIds for traceability and download routing.",
        "- Download only selectedPrimaryImageIds by default; archiveOptionalImageIds are available for recovery/review but should not drive default cards or lectures.",
        "- Use canonicalHierarchy exactly as copied from metadata.json for deckPath and any IMAIOS breadcrumb routing.",
        "- Do not fabricate Core Radiology support; no auditable Core pages were supplied or retrieved in this source bundle.",
        "",
    ]
)

package_text = "\n".join(package_lines)

created_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
master_import = {
    "version": 1,
    "articleTitle": metadata["articleTitle"],
    "createdAt": created_at,
    "packageText": package_text,
    "manifest": manifest,
    "imageRegistry": image_registry,
    "sourceSelectionPlan": source_selection_plan,
    "selectedPrimaryImageIds": selected_primary_ids,
    "archiveOptionalImageIds": archive_optional_ids,
}

report = "\n".join(
    [
        "# Master Source Report: Spigelian Hernia",
        "",
        f"Created: {created_at}",
        "",
        "## Source Review",
        "- Imported bundle from the staged browser bundle into `master_source_queue` and confirmed `_latest_master_source_bundle.txt` points to this Spigelian Hernia folder.",
        "- Compared `RadPrimer_source_package.txt`, `STATdx_source_package.txt`, `RadPrimer_metadata.json`, `STATdx_metadata.json`, `metadata.json`, and `master_source_request.md`.",
        "- Used RadPrimer/metadata canonical hierarchy exactly for deck routing: All Categories > Basic > Gastrointestinal > Peritoneum, Mesentery, and Abdominal Wall > Spigelian Hernia.",
        "- No auditable Core Radiology source was supplied or retrieved, so the master source does not claim Core support.",
        "",
        "## Image Evidence Review",
        "- Inspected staged `image_evidence` files before duplicate classification.",
        "- SHA-256 hashes were retained in `image_registry.json` visualEvidence fields for auditability; file hashes are not identical across providers, so exact duplicate calls are based on visual same-slice review rather than caption similarity alone.",
        "- STATdx does not fully cover the RadPrimer image set as exact duplicates.",
        "",
        "## RadPrimer Image Coverage By STATdx",
        "| RadPrimer image | Classification | Related STATdx image(s) | Decision |",
        "|---|---|---|---|",
    ]
)
for row in coverage_rows:
    report += (
        f'\n| {row["radPrimerImageLabel"]} | {row["classification"]} | '
        f'{"; ".join(row["relatedSTATdxImageLabels"])} | selectedPrimary |'
    )

report += "\n\n## Selected Primary Images\n"
report += "\n".join(f"- {display(mid)}" for mid in selected_primary_ids)
report += "\n\n## Archive-Optional Images\n"
report += "\n".join(f"- {display(mid)}: {duplicate_notes[mid]}" for mid in archive_optional_ids)
report += "\n\n## Case Cluster Handling\n"
report += "- No source case cluster was intentionally split.\n"
report += "- Adjacent-slice/same-patient or same-complication clusters were retained when not exact duplicates.\n"
report += "- Archived images are isolated duplicate renderings only, not partial removals from retained teaching clusters.\n"
report += "\n## Output Files\n"
report += "- `master_source_package.txt`\n"
report += "- `master_source_manifest.json`\n"
report += "- `image_registry.json`\n"
report += "- `master_source_import.json`\n"
report += "- `master_source_report.md`\n"
report += "- `_codex_master_source_done.txt`\n"

(BUNDLE / "master_source_package.txt").write_text(package_text, encoding="utf-8")
(BUNDLE / "master_source_manifest.json").write_text(
    json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
)
(BUNDLE / "image_registry.json").write_text(
    json.dumps(image_registry, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
)
(BUNDLE / "master_source_import.json").write_text(
    json.dumps(master_import, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
)
(BUNDLE / "master_source_report.md").write_text(report + "\n", encoding="utf-8")
(BUNDLE / "_codex_master_source_done.txt").write_text(
    "\n".join(
        [
            f"doneAt={created_at}",
            f"bundle={BUNDLE}",
            "articleTitle=Spigelian Hernia",
            "selectedPrimaryImageIds=" + ",".join(selected_primary_ids),
            "archiveOptionalImageIds=" + ",".join(archive_optional_ids),
            "",
        ]
    ),
    encoding="utf-8",
)

print(f"Wrote master source artifacts to {BUNDLE}")
print(f"selectedPrimary={len(selected_primary_ids)} archiveOptional={len(archive_optional_ids)}")
