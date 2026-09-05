import hashlib
import json
import re
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path


BUNDLE = Path(__file__).resolve().parents[1]


def read_json(name):
    return json.loads((BUNDLE / name).read_text(encoding="utf-8"))


def sha256_file(path):
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def clean_caption(text):
    return re.sub(r"\s+", " ", text).strip()


metadata = read_json("metadata.json")
rad_meta = read_json("RadPrimer_metadata.json")
stat_meta = read_json("STATdx_metadata.json")

article_title = metadata["articleTitle"]
canonical_hierarchy = metadata["canonicalHierarchy"]
canonical_deck_path = metadata.get("canonicalDeckPath", "")
created_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

rad_images = rad_meta["imageRegistry"]
stat_images = stat_meta["imageRegistry"]

coverage = {
    "RP-01": {
        "classification": "exactDuplicate",
        "related": ["SDX-01"],
        "notes": "STATdx image 1 is the same chest radiograph showing the upward-curving NG tube after MVC; archive the STATdx repeat and keep the RadPrimer image as the canonical primary image.",
    },
    "RP-02": {
        "classification": "exactDuplicate",
        "related": ["SDX-02", "SDX-03", "SDX-04"],
        "notes": "STATdx image 2 is the same axial CT slice with fallen viscus and collar signs. STATdx images 3 and 4 are same-patient complementary axial/sagittal CT images and remain selected.",
    },
    "RP-03": {
        "classification": "exactDuplicate",
        "related": ["SDX-15", "SDX-03"],
        "notes": "STATdx image 15 is the same axial CT slice/content as RadPrimer image 3, with only source crop/encoding differences. STATdx image 3 is an adjacent same-patient CT image and remains selected.",
    },
    "RP-04": {
        "classification": "exactDuplicate",
        "related": ["SDX-16", "SDX-04"],
        "notes": "STATdx image 16 is the same coronal CT/reformatted image of stomach herniation through the left diaphragmatic defect. STATdx image 4 is a different sagittal companion image and remains selected.",
    },
    "RP-05": {
        "classification": "conceptualReplacement",
        "related": ["SDX-19", "SDX-20"],
        "notes": "STATdx images 19 and 20 provide a separate radiograph/CT MVC cluster with an NG tube and fallen viscus sign, but they are not the same axial CT image as RadPrimer image 5.",
    },
    "RP-06": {
        "classification": "exactDuplicate",
        "related": ["SDX-09"],
        "notes": "STATdx image 9 is the same axial CT slice/content after stab wound showing splenic laceration, hemothorax, and subcutaneous emphysema; archive the STATdx repeat.",
    },
    "RP-07": {
        "classification": "exactDuplicate",
        "related": ["SDX-07"],
        "notes": "STATdx image 7 is the same coronal CT image of left hemidiaphragm defect with colon in the thorax and enteric contrast from colonic perforation; archive the STATdx repeat.",
    },
    "RP-08": {
        "classification": "nearDuplicate",
        "related": ["SDX-10"],
        "notes": "STATdx image 10 covers the same surgical-error MR teaching point but is a different plane/appearance, so both remain selected for recognition reinforcement.",
    },
    "RP-09": {
        "classification": "conceptualReplacement",
        "related": ["SDX-12", "SDX-13", "SDX-17", "SDX-20"],
        "notes": "STATdx includes several dependent-viscus/collar-sign CT examples, but none is the same axial CT slice showing the pinched stomach and thoracic abdominal fat from RadPrimer image 9.",
    },
    "RP-10": {
        "classification": "exactDuplicate",
        "related": ["SDX-08"],
        "notes": "STATdx image 8 is the same coronal CT image of splenic injury, hemothorax, lung contusion, and small diaphragmatic defect; archive the STATdx repeat.",
    },
}

archive_ids = ["SDX-01", "SDX-02", "SDX-07", "SDX-08", "SDX-09", "SDX-15", "SDX-16"]
selected_ids = [f"RP-{i:02d}" for i in range(1, 11)] + [
    "SDX-03",
    "SDX-04",
    "SDX-05",
    "SDX-06",
    "SDX-10",
    "SDX-11",
    "SDX-12",
    "SDX-13",
    "SDX-14",
    "SDX-17",
    "SDX-18",
    "SDX-19",
    "SDX-20",
]

used_for = {
    "RP-01": ["radiographPattern", "ngTubeInChest", "initialTraumaRadiograph", "exactDuplicateAnchor"],
    "RP-02": ["ctPattern", "fallenViscusSign", "collarSign", "stomachHerniation", "samePatientCluster", "exactDuplicateAnchor"],
    "RP-03": ["ctPattern", "fallenViscusSign", "intrathoracicStomach", "samePatientCluster", "exactDuplicateAnchor"],
    "RP-04": ["multiplanarReformat", "coronalCT", "diaphragmaticDefect", "samePatientCluster", "exactDuplicateAnchor"],
    "RP-05": ["fallenViscusSign", "mvc", "alternateExample", "recognitionReinforcement"],
    "RP-06": ["penetratingTrauma", "contiguousInjury", "hemothoraxHemoperitoneumConcern", "exactDuplicateAnchor"],
    "RP-07": ["colonHerniation", "diaphragmGap", "colonicPerforation", "coronalCT", "exactDuplicateAnchor"],
    "RP-08": ["mriPattern", "iatrogenicInjury", "diaphragmGap", "modalityVariant", "recognitionReinforcement"],
    "RP-09": ["collarSign", "thoracicAbdominalFat", "axialCT", "recognitionReinforcement"],
    "RP-10": ["contiguousInjury", "splenicInjury", "hemothorax", "smallDiaphragmDefect", "exactDuplicateAnchor"],
    "SDX-01": ["archiveOptionalDuplicate", "exactDuplicateOfRP-01"],
    "SDX-02": ["archiveOptionalDuplicate", "exactDuplicateOfRP-02"],
    "SDX-03": ["adjacentSlice", "samePatientCluster", "fallenViscusSign", "recognitionReinforcement"],
    "SDX-04": ["sagittalCT", "samePatientCluster", "diaphragmaticHernia", "modalityPlaneVariant"],
    "SDX-05": ["rightSidedInjury", "intrapericardialHerniationCluster", "alternateExample"],
    "SDX-06": ["rightSidedInjury", "intrapericardialHerniationCluster", "pericardialDefect", "mechanism"],
    "SDX-07": ["archiveOptionalDuplicate", "exactDuplicateOfRP-07"],
    "SDX-08": ["archiveOptionalDuplicate", "exactDuplicateOfRP-10"],
    "SDX-09": ["archiveOptionalDuplicate", "exactDuplicateOfRP-06"],
    "SDX-10": ["mriPattern", "sameConceptDifferentPlane", "modalityVariant", "recognitionReinforcement"],
    "SDX-11": ["lungWindowCT", "splenicFlexureAgainstLung", "pneumothorax", "recognitionReinforcement"],
    "SDX-12": ["dependentViscusSign", "abdominalFatLateralToDiaphragm", "recognitionReinforcement"],
    "SDX-13": ["dependentViscusSign", "colonAndFatLateralToDiaphragm", "recognitionReinforcement"],
    "SDX-14": ["radiographPattern", "elevatedDistortedDiaphragm", "ngTubeHighPosition", "alternateExample"],
    "SDX-15": ["archiveOptionalDuplicate", "exactDuplicateOfRP-03"],
    "SDX-16": ["archiveOptionalDuplicate", "exactDuplicateOfRP-04"],
    "SDX-17": ["dependentViscusSign", "spleenAndBowelAgainstPosteriorRibs", "recognitionReinforcement"],
    "SDX-18": ["radiographPattern", "indistinctHemidiaphragm", "ngTubeTipUp", "alternateExample"],
    "SDX-19": ["radiographPattern", "mvc", "ngTubeCurledBackUp", "samePatientCluster"],
    "SDX-20": ["ctCorrelation", "fallenViscusSign", "ngTube", "samePatientCluster"],
}


def evidence_hash_for(entry):
    evidence = entry.get("visualEvidence") or {}
    rel = evidence.get("evidenceFilename")
    if not rel:
        return ""
    path = BUNDLE / rel
    return sha256_file(path) if path.exists() else ""


def source_download_filename(entry):
    source = entry["sourceLabel"]
    number = entry["sourceImageNumber"]
    short = entry["imageId"].split("-")[0] if entry.get("imageId") else f"{number:02d}"
    ext = Path(entry.get("plainFilename", "")).suffix or ".jpg"
    return f"{entry['masterImageId']}_{source}_image_{number:02d}_plain_{short}{ext}"


def registry_entry(entry):
    item = deepcopy(entry)
    item["caption"] = clean_caption(item.get("caption", ""))
    item["usedFor"] = used_for.get(item["masterImageId"], [])
    item["downloadRecommendation"] = (
        "archiveOptionalDuplicate" if item["masterImageId"] in archive_ids else "primaryTeachingSet"
    )
    item["downloadFilename"] = source_download_filename(item)
    item["sourceImageId"] = item.get("imageId", "")
    item["sourcePlainFilename"] = item.get("plainFilename", "")
    item["sourceAnnotatedFilename"] = item.get("annotatedFilename", "")
    if item.get("visualEvidence"):
        item["visualEvidence"]["evidenceSha256"] = evidence_hash_for(item)
    if item["masterImageId"].startswith("RP-"):
        cov = coverage[item["masterImageId"]]
        item["radPrimerCoverageBySTATdx"] = cov["classification"]
        item["coverageNotes"] = cov["notes"]
        item["relatedImageIds"] = cov["related"]
    else:
        inverse = []
        for rp_id, cov in coverage.items():
            if item["masterImageId"] in cov["related"]:
                inverse.append(rp_id)
        item["relatedRadPrimerImageIds"] = inverse
    return item


image_registry = [registry_entry(x) for x in rad_images + stat_images]
by_id = {img["masterImageId"]: img for img in image_registry}

coverage_rows = []
for rp_id in [f"RP-{i:02d}" for i in range(1, 11)]:
    cov = coverage[rp_id]
    coverage_rows.append(
        {
            "radPrimerImageId": rp_id,
            "radPrimerImageLabel": f"RadPrimer image {int(rp_id[-2:])}",
            "classification": cov["classification"],
            "relatedSTATdxImageIds": cov["related"],
            "decision": "selectedPrimary",
            "notes": cov["notes"],
        }
    )

image_download_plan = [
    {
        "masterImageId": img_id,
        "sourceLabel": by_id[img_id]["sourceLabel"],
        "displayLabel": f"{by_id[img_id]['sourceLabel']} image {by_id[img_id]['sourceImageNumber']}",
        "downloadFilename": by_id[img_id]["downloadFilename"],
        "plainUrl": by_id[img_id].get("plainUrl", ""),
        "annotatedUrl": by_id[img_id].get("annotatedUrl", ""),
        "visualEvidenceFilename": (by_id[img_id].get("visualEvidence") or {}).get("evidenceFilename", ""),
    }
    for img_id in selected_ids
]

archive_plan = [
    {
        "masterImageId": img_id,
        "sourceLabel": by_id[img_id]["sourceLabel"],
        "displayLabel": f"{by_id[img_id]['sourceLabel']} image {by_id[img_id]['sourceImageNumber']}",
        "reason": {
            "SDX-01": "Exact duplicate of RadPrimer image 1 based on visual inspection of the staged chest radiograph evidence.",
            "SDX-02": "Exact duplicate of RadPrimer image 2 based on visual inspection of the staged axial CT evidence.",
            "SDX-07": "Exact duplicate of RadPrimer image 7 based on visual inspection of the staged coronal CT evidence.",
            "SDX-08": "Exact duplicate of RadPrimer image 10 based on visual inspection of the staged coronal CT evidence.",
            "SDX-09": "Exact duplicate of RadPrimer image 6 based on visual inspection of the staged axial CT evidence.",
            "SDX-15": "Exact duplicate of RadPrimer image 3 based on visual inspection of the staged axial CT evidence.",
            "SDX-16": "Exact duplicate of RadPrimer image 4 based on visual inspection of the staged coronal CT evidence.",
        }[img_id],
        "retainedEquivalentImageId": {
            "SDX-01": "RP-01",
            "SDX-02": "RP-02",
            "SDX-07": "RP-07",
            "SDX-08": "RP-10",
            "SDX-09": "RP-06",
            "SDX-15": "RP-03",
            "SDX-16": "RP-04",
        }[img_id],
    }
    for img_id in archive_ids
]

manifest = {
    "articleTitle": article_title,
    "canonicalHierarchy": canonical_hierarchy,
    "canonicalHierarchySource": "metadata.json canonicalHierarchy",
    "canonicalDeckPath": canonical_deck_path,
    "sourcePriority": ["RadPrimer", "STATdx supplemental"],
    "sourceCoverage": {
        "textCoverage": "RadPrimer and STATdx substantially overlap in core article text. STATdx adds supplemental language on discontinuous diaphragm terminology, contiguous injuries across the diaphragm, pleural fluid tracking, intrapericardial herniation, tension gastrothorax, diaphragmatic paralysis, delayed-diagnosis mortality, and rare conservative management of small right-sided injuries.",
        "imageCoverageSummary": "STATdx substantially covers the RadPrimer image set but does not fully exact-duplicate it. STATdx exact duplicates RadPrimer images 1, 2, 3, 4, 6, 7, and 10; RadPrimer images 5, 8, and 9 remain nonduplicate primary recognition examples.",
        "radPrimerImageCoverageBySTATdx": coverage_rows,
    },
    "imageCountBySource": {
        "RadPrimer": {
            "total": len(rad_images),
            "primaryTeachingSet": len([x for x in selected_ids if x.startswith("RP-")]),
            "archiveOptionalDuplicate": len([x for x in archive_ids if x.startswith("RP-")]),
        },
        "STATdx": {
            "total": len(stat_images),
            "primaryTeachingSet": len([x for x in selected_ids if x.startswith("SDX-")]),
            "archiveOptionalDuplicate": len([x for x in archive_ids if x.startswith("SDX-")]),
        },
        "allSources": {
            "total": len(rad_images) + len(stat_images),
            "primaryTeachingSet": len(selected_ids),
            "archiveOptionalDuplicate": len(archive_ids),
        },
    },
    "sourceAttributionRules": [
        "Use [Both] for facts present in both RadPrimer and STATdx.",
        "Use [RadPrimer] for canonical hierarchy, RadPrimer article backbone, RadPrimer-specific percentages, and RadPrimer primary images.",
        "Use [STATdx] for supplemental wording, extra complications, right-sided/intrapericardial cases, and source-specific images.",
    ],
    "selectedPrimaryImageIds": selected_ids,
    "archiveOptionalImageIds": archive_ids,
}

source_selection_plan = {
    "textBackbone": "Use RadPrimer as the canonical hierarchy and article backbone; STATdx is used as supplemental depth where it adds stronger terminology, mechanism, complication, management, or image examples.",
    "keepFromRadPrimer": [
        "Canonical hierarchy and deck routing.",
        "Core article organization: key facts, terminology, imaging, differential diagnosis, pathology, clinical issues, and diagnostic checklist.",
        "Left-sided predominance, blunt versus penetrating tear-size pattern, CT sign list, radiograph/fluoroscopy/MR sections, and all RadPrimer primary images.",
    ],
    "keepFromSTATdx": [
        "Discontinuous diaphragm wording as a named CT sign.",
        "Pleural fluid tracking and contiguous injuries above and below the diaphragm as suspicion-raising secondary signs.",
        "Intrapericardial herniation case and management/complication nuance including tension gastrothorax, diaphragmatic paralysis, delayed-diagnosis mortality, and rare conservative treatment of small right-sided injuries.",
        "All nonduplicate STATdx images as supplemental recognition reinforcement.",
    ],
    "downweightOrSkip": [
        "Do not repeat source-identical article prose twice.",
        "Do not use STATdx breadcrumb/deck path for routing.",
        "Archive only visually exact duplicate STATdx images 1, 2, 7, 8, 9, 15, and 16 by default.",
    ],
    "imageCurationPolicy": "Exact duplicates may be archived; near duplicates and conceptual replacements remain selected as recognition reinforcement unless visually identical or unusable.",
    "duplicateEvidencePolicy": "ExactDuplicate decisions require visual evidence from image_evidence files, same stable source image ID, image hashes, or explicit manual/source confirmation. Caption-only or topic-only similarity must be marked uncertain/nearDuplicate and kept primary.",
    "caseClusterGuardrails": {
        "atomicClusterRule": "Same-patient, follow-up, adjacent-slice, procedure, comparison-view, and time-lapse clusters should remain together unless the archived member is a visually exact duplicate and the selected retained image preserves the teaching context.",
        "intentionalClusterSplits": [
            {
                "cluster": "Opening MVC radiograph and CT fallen-viscus cluster",
                "selected": ["RP-01", "RP-02", "RP-03", "RP-04", "SDX-03", "SDX-04"],
                "archived": ["SDX-01", "SDX-02", "SDX-15", "SDX-16"],
                "reason": "Archived STATdx images are exact same-image/same-slice repeats of RadPrimer images; adjacent or different-plane STATdx companion views remain selected.",
            },
            {
                "cluster": "Penetrating trauma contiguous-injury examples",
                "selected": ["RP-06"],
                "archived": ["SDX-09"],
                "reason": "STATdx image 9 is the same axial CT slice/content as RadPrimer image 6; the retained RadPrimer image preserves the teaching point.",
            },
            {
                "cluster": "Colonic herniation with colonic perforation",
                "selected": ["RP-07"],
                "archived": ["SDX-07"],
                "reason": "STATdx image 7 is the same coronal CT image/content as RadPrimer image 7.",
            },
            {
                "cluster": "Splenic injury, hemothorax, lung contusion, small diaphragm defect",
                "selected": ["RP-10"],
                "archived": ["SDX-08"],
                "reason": "STATdx image 8 is the same coronal CT image/content as RadPrimer image 10.",
            },
        ],
        "radPrimerClustersPreserved": [
            "RadPrimer images 1-4 remain together as the opening radiograph/CT same-patient teaching cluster.",
            "RadPrimer images 6 and 10 remain as selected contiguous-injury examples even when STATdx exact repeats are archived.",
        ],
        "statdxClustersPreserved": [
            "STATdx images 5 and 6 remain together as an intrapericardial/right diaphragmatic rupture cluster.",
            "STATdx images 19 and 20 remain together as an MVC radiograph/CT correlation cluster.",
            "STATdx adjacent and different-plane companion views 3, 4, 10-14, 17, and 18 remain selected as recognition reinforcement.",
        ],
    },
    "imageDownloadPlan": image_download_plan,
    "archivePlan": archive_plan,
    "generatorInstructions": [
        "Use this package as source material for later narrative/cards, but do not generate cards or lecture output during this synthesis step.",
        "Use clean source-qualified labels in prose, such as RadPrimer image 5 and STATdx image 4.",
        "Keep RP-05 and SDX-04 identifiers in registry fields, filenames, metadata, and traceability fields.",
        "Download/use only selectedPrimaryImageIds by default; leave archiveOptionalImageIds available for audit or recovery.",
    ],
}
manifest["sourceSelectionPlan"] = source_selection_plan


def label_for(img_id):
    img = by_id[img_id]
    return f"{img['sourceLabel']} image {img['sourceImageNumber']}"


def image_line(img_id):
    img = by_id[img_id]
    return f"- {label_for(img_id)}: {img['caption']} Used for: {', '.join(img['usedFor'])}."


coverage_lines = []
for row in coverage_rows:
    related = ", ".join(label_for(x) for x in row["relatedSTATdxImageIds"]) or "none"
    coverage_lines.append(
        f"- {row['radPrimerImageLabel']}: {row['classification']}; related STATdx images: {related}. {row['notes']}"
    )

archive_lines = [
    f"- {label_for(x['masterImageId'])}: archiveOptionalDuplicate. {x['reason']}"
    for x in archive_plan
]

package_sections = [
    "=== MASTER SOURCE PACKAGE ===",
    f"TITLE: {article_title}",
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
    "- [STATdx] = supplemental STATdx detail, image example, or wording nuance.",
    "",
    "=== IMAGE COVERAGE GATE ===",
    manifest["sourceCoverage"]["imageCoverageSummary"],
    *coverage_lines,
    "",
    "=== KEY FACTS ===",
    "- [Both] Traumatic diaphragmatic rupture is diaphragmatic disruption, with or without herniation of abdominal contents into the thorax.",
    "- [Both] Most cases are left-sided, usually posterolateral and medial to the spleen; RadPrimer gives 90-98%, while STATdx summarizes this as greater than 90%.",
    "- [Both] About 75% are caused by blunt trauma and 25% by penetrating trauma.",
    "- [Both] Blunt tears are usually large, often greater than 10 cm, while stab wounds usually create shorter lacerations around 1-2 cm and are more likely to be delayed or missed.",
    "- [Both] Best CT clue: hemidiaphragm discontinuity with fallen/dependent viscus sign.",
    "- [Both] Major CT signs include focal diaphragmatic defect, dangling diaphragm sign, absent diaphragm sign, organ herniation, collar sign, fallen/dependent viscus sign, abdominal contents lateral to the diaphragm, and secondary thoracoabdominal injury signs.",
    "- [STATdx] Presence of contiguous injury on both sides of the diaphragm should raise concern even when a discrete defect is not visible.",
    "- [Both] CECT with multiplanar reformations is the best imaging tool; reformats are critical because the diaphragm is often parallel to the axial plane.",
    "- [Both] Surgical repair is indicated for essentially all diaphragmatic injuries, even small injuries; STATdx notes very rare conservative management of selected small right-sided injuries.",
    "",
    "=== TERMINOLOGY ===",
    "- [Both] Synonym: traumatic diaphragmatic hernia.",
    "- [Both] Definition: traumatic rupture of the diaphragm with or without abdominal visceral herniation into the chest.",
    "",
    "=== IMAGING ===",
    "- [Both] Location: 90-98% occur on the left, usually posterolateral, because the left pleuroperitoneal membrane is weaker and the right hemidiaphragm is protected by the liver.",
    "- [Both] Most ruptures originate posterolaterally and spread centrally.",
    "- [Both] Herniated organs include stomach more often than omentum, colon, small bowel, spleen, or liver.",
    "- [Both] Segmental/discontinuous diaphragm sign: focal hemidiaphragm discontinuity; the free edge may be thickened or hypoenhancing from retraction or hemorrhage.",
    "- [Both] Dangling diaphragm sign: the free edge of torn diaphragm curls inward on axial images instead of paralleling the chest wall.",
    "- [Both] Absent diaphragm sign: the diaphragm is absent in the expected location without a discrete visible tear.",
    "- [Both] Collar sign: waist-like narrowing of a herniated structure where it traverses the tear; it is often easier on coronal multiplanar reformats.",
    "- [Both] Fallen/dependent viscus sign: herniated stomach, bowel, spleen, or other viscera fall dependently against posterior ribs or thoracic wall without intervening lung.",
    "- [RadPrimer] Secondary CT signs include simultaneous pneumothorax and pneumoperitoneum, hemothorax and hemoperitoneum, active extravasation in or near the diaphragm, asymmetric diaphragmatic elevation, and injury to organs near the diaphragm.",
    "- [STATdx] Pleural fluid tracking into the upper abdomen and surrounding abdominal structures is an additional secondary clue.",
    "- [STATdx] Intrapericardial herniation is a very rare form in which bowel or fat herniates through the central tendon into the pericardial sac and can compress the heart.",
    "- [Both] CT sensitivity and specificity vary; reported sensitivity can be as low as 73% and specificity as low as 50%, particularly when the diaphragm contacts liver, pleural fluid, or another structure.",
    "- [Both] MR shows the diaphragm as a continuous low-signal band on T1- and T2-weighted imaging; MR signs parallel CT but MR is usually reserved for stable patients, not acute trauma.",
    "- [Both] Radiographs are less sensitive than CT but may show nonvisualized/elevated hemidiaphragm, lower thoracic soft tissue or gas density, herniated stomach/bowel, air-fluid levels, mediastinal shift, ipsilateral thoracic injuries, or a high NG tube.",
    "- [Both] A nasogastric tube above the left hemidiaphragm with an abnormal U-shaped course or tip directed toward the left shoulder is a classic radiographic clue.",
    "- [Both] Fluoroscopic upper GI or barium enema can show a collar sign in delayed hernia but is rarely needed acutely and is mostly supplanted by CT.",
    "",
    "=== DIFFERENTIAL DIAGNOSIS ===",
    "- [Both] Bochdalek or Morgagni congenital hernia: lacks trauma history and adjacent traumatic secondary signs.",
    "- [Both] Diaphragmatic eventration: thinned diaphragm remains continuous and attached to the costal margin; no focal defect, collar sign, or fallen viscus sign.",
    "- [Both] Paralyzed diaphragm: elevated but intact diaphragm from neurologic, phrenic nerve, neuromuscular junction, or muscle abnormality; no focal tear or herniation signs.",
    "- [Both] Pleural effusion or pulmonary/extrapleural mass can mimic traumatic diaphragmatic hernia on radiographs but should separate on CT.",
    "",
    "=== PATHOLOGY ===",
    "- [Both] Blunt trauma is most often from MVC; other mechanisms include fall from height and crushing injury.",
    "- [Both] Lateral impact causes shear injury, while frontal impact increases intraabdominal pressure and can rupture the diaphragm.",
    "- [Both] Penetrating trauma is most often gunshot or stab wound; iatrogenic injury can occur after surgery near the diaphragm.",
    "- [Both] Diaphragmatic rupture is strongly associated with polytrauma and major associated injuries, reported in 52-100% of cases.",
    "- [Both] Left-sided blunt injuries are most associated with splenic injury; right-sided injuries are associated with liver, right kidney, aortic, cardiac, pelvic, rib, and spine injuries.",
    "- [Both] Thoracic injuries such as pneumothorax, rib fractures, pleural effusion, hemothorax, and pulmonary contusion are frequent; isolated injury is uncommon.",
    "",
    "=== CLINICAL ISSUES ===",
    "- [Both] Presentation may include dyspnea, upper abdominal pain, chest pain, hypotension, tachycardia, and other signs of severe polytrauma.",
    "- [Both] Physical exam may reveal bowel sounds in the chest, decreased breath sounds, chest wall asymmetry, or dullness to percussion.",
    "- [Both] Incidence is 1-5% among patients with substantial blunt abdominal or thoracic trauma; true incidence is probably underestimated.",
    "- [Both] Diaphragmatic injuries are missed in 7-66% of cases, and right-sided injuries are more likely to be missed.",
    "- [Both] Complications include obstruction or ischemia of herniated bowel, torsion/devascularization/ischemia of herniated solid organs, respiratory complications, and central venous obstruction from mass effect.",
    "- [STATdx] Tension gastrothorax can occur when an intrathoracic stomach distends with gas, causing ipsilateral lung collapse and mediastinal shift.",
    "- [STATdx] Diaphragmatic paralysis can occur if the phrenic nerve region is injured, although this often improves over time.",
    "- [Both] Traumatic hernias account for only about 5% of all diaphragmatic hernias, but most strangulated diaphragmatic hernias are trauma-related.",
    "- [Both] Patients have high mortality mainly from associated severe injuries; RadPrimer reports 12-42%.",
    "- [STATdx] Delayed diagnosis and repair carry particularly poor prognosis, with mortality reported at 30-60%.",
    "- [Both] Diaphragmatic injuries do not heal spontaneously because of constant diaphragmatic motion and the pressure gradient across the diaphragm.",
    "- [Both] If abdominal contents do not herniate immediately, they often eventually herniate due to negative intrapleural pressure; positive-pressure ventilation can temporarily mask herniation.",
    "",
    "=== DIAGNOSTIC CHECKLIST ===",
    "- [Both] Always inspect the diaphragm on trauma CT, especially when there are more obvious visceral injuries.",
    "- [Both] Use multiplanar reformations to identify subtle defects, collar sign, and organ herniation.",
    "- [Both] Look for fallen/dependent viscus sign when a herniated viscus is no longer supported posteriorly by the diaphragm.",
    "- [Both] Remember that contusion, pneumothorax, pleural effusion, atelectasis, and phrenic nerve palsy can mask injury.",
    "- [STATdx] Contiguous injuries immediately above and below the diaphragm can be the clue even if the tear itself is occult.",
    "",
    "=== SELECTED PRIMARY IMAGE SET ===",
    *[image_line(x) for x in selected_ids],
    "",
    "=== ARCHIVE-OPTIONAL DUPLICATE IMAGES ===",
    *archive_lines,
    "",
    "=== CASE CLUSTER NOTES ===",
    "- RadPrimer images 1-4 form the opening MVC radiograph/CT same-patient cluster and remain selected as the canonical teaching sequence.",
    "- STATdx images 3 and 4 are adjacent/different-plane companions to the opening CT cluster and remain selected even though STATdx same-image repeats 1, 2, 15, and 16 are archived.",
    "- STATdx images 5 and 6 form a rare right-sided/intrapericardial herniation cluster and both remain selected.",
    "- STATdx images 19 and 20 form a radiograph/CT correlation cluster and both remain selected.",
    "- No RadPrimer source case cluster was intentionally split in a way that removes unique teaching context; archived STATdx members are exact duplicates with retained RadPrimer equivalents.",
    "",
    "=== GENERATOR INSTRUCTIONS ===",
    "- Use this package as source material for later narrative/cards, but do not generate cards or lecture output during this synthesis step.",
    "- Use clean source-qualified labels in prose, such as RadPrimer image 5 and STATdx image 4.",
    "- Use registry IDs, source image IDs, hashes, and filenames for traceability and download routing.",
    "- Download/use only selectedPrimaryImageIds by default; archiveOptionalImageIds are for audit/recovery.",
]
package_text = "\n".join(package_sections) + "\n"

report = "\n".join(
    [
        f"# Master Source Report: {article_title}",
        "",
        f"Created: {created_at}",
        "",
        "## Imported Bundle",
        f"- Bundle: {BUNDLE}",
        "- Sources compared: RadPrimer_source_package.txt, STATdx_source_package.txt, RadPrimer_metadata.json, STATdx_metadata.json, metadata.json, master_source_request.md.",
        "- Image evidence inspected: 30 staged plain image files via generated contact sheets and full-size review of candidate duplicate families.",
        "",
        "## Canonical Hierarchy",
        f"- {' > '.join(canonical_hierarchy)}",
        f"- Deck path: {canonical_deck_path}",
        "- Routing uses metadata.json canonicalHierarchy exactly.",
        "",
        "## RadPrimer Image Coverage By STATdx",
        *coverage_lines,
        "",
        "## Archived Images",
        *[f"- {x['masterImageId']}: {x['reason']}" for x in archive_plan],
        "",
        "## Retained Near Duplicates And Conceptual Replacements",
        "- RadPrimer image 5 with STATdx images 19 and 20: separate MVC radiograph/CT cluster; not the same slice and retained.",
        "- RadPrimer image 8 with STATdx image 10: same surgical-error MR concept but different plane/appearance; both selected.",
        "- RadPrimer image 9 with STATdx images 12, 13, 17, and 20: related dependent-viscus/collar-sign CT examples; visually distinct and retained.",
        "- STATdx images 3, 4, 5, 6, 10-14, 17, 18, 19, and 20 add adjacent slices, different planes, modality/radiograph examples, or rare mechanism coverage and remain primary.",
        "",
        "## Case Cluster Splits",
        "- Opening MVC radiograph and CT fallen-viscus cluster: selected RP-01, RP-02, RP-03, RP-04, SDX-03, SDX-04; archived SDX-01, SDX-02, SDX-15, SDX-16. Reason: archived STATdx images are exact same-image/same-slice repeats of RadPrimer images; adjacent or different-plane STATdx companion views remain selected.",
        "- Penetrating trauma contiguous-injury examples: selected RP-06; archived SDX-09. Reason: STATdx image 9 is the same axial CT slice/content as RadPrimer image 6.",
        "- Colonic herniation with colonic perforation: selected RP-07; archived SDX-07. Reason: STATdx image 7 is the same coronal CT image/content as RadPrimer image 7.",
        "- Splenic injury, hemothorax, lung contusion, small diaphragm defect: selected RP-10; archived SDX-08. Reason: STATdx image 8 is the same coronal CT image/content as RadPrimer image 10.",
        "- No RadPrimer source case cluster was intentionally split in a way that removes unique teaching context.",
        "",
        "## Output Files",
        "- master_source_package.txt",
        "- master_source_manifest.json",
        "- image_registry.json",
        "- master_source_import.json",
        "- master_source_report.md",
        "- _codex_master_source_done.txt",
    ]
) + "\n"

master_import = {
    "version": 1,
    "articleTitle": article_title,
    "createdAt": created_at,
    "packageText": package_text,
    "manifest": manifest,
    "imageRegistry": image_registry,
    "sourceSelectionPlan": source_selection_plan,
    "selectedPrimaryImageIds": selected_ids,
    "archiveOptionalImageIds": archive_ids,
}

(BUNDLE / "master_source_package.txt").write_text(package_text, encoding="utf-8", newline="\n")
(BUNDLE / "master_source_manifest.json").write_text(
    json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n"
)
(BUNDLE / "image_registry.json").write_text(
    json.dumps(image_registry, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n"
)
(BUNDLE / "master_source_import.json").write_text(
    json.dumps(master_import, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n"
)
(BUNDLE / "master_source_report.md").write_text(report, encoding="utf-8", newline="\n")
(BUNDLE / "_codex_master_source_done.txt").write_text(
    f"done\ncreatedAt={created_at}\narticleTitle={article_title}\nselectedPrimaryImageIds={','.join(selected_ids)}\narchiveOptionalImageIds={','.join(archive_ids)}\n",
    encoding="utf-8",
    newline="\n",
)

print(f"Wrote master source outputs to {BUNDLE}")
