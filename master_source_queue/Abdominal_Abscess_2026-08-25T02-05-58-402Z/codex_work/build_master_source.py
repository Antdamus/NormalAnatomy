import copy
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path


BUNDLE = Path(__file__).resolve().parents[1]


def read_json(name):
    return json.loads((BUNDLE / name).read_text(encoding="utf-8"))


metadata = read_json("metadata.json")
rp_meta = read_json("RadPrimer_metadata.json")
sdx_meta = read_json("STATdx_metadata.json")
evidence_manifest = read_json("image_evidence_manifest.json")

article_title = metadata["articleTitle"]
canonical_hierarchy = metadata["canonicalHierarchy"]
canonical_deck_path = metadata.get("canonicalDeckPath")
created_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

archive_optional_ids = ["SDX-11", "SDX-17", "SDX-26"]
archive_set = set(archive_optional_ids)

exact_duplicate_of = {
    "SDX-11": {
        "duplicateOf": "RP-02",
        "evidence": "Visual inspection of staged image_evidence files shows the same axial CT slice/content as RadPrimer image 2, with only source encoding/crop differences.",
    },
    "SDX-17": {
        "duplicateOf": "RP-02",
        "evidence": "Visual inspection of staged image_evidence files shows the same axial CT slice/content as RadPrimer image 2, with only source encoding/crop differences.",
    },
    "SDX-26": {
        "duplicateOf": "SDX-02",
        "evidence": "Visual inspection of staged image_evidence files shows the same appendiceal abscess drainage catheter CT image as STATdx image 2.",
    },
}

relationship_notes = {
    "RP-01": {
        "radPrimerCoverageBySTATdx": "conceptualReplacement",
        "coverageNotes": "STATdx includes postoperative abscess examples, but no exact duplicate of this rounded gas-containing postoperative collection.",
        "relatedImageIds": ["SDX-12", "SDX-18"],
    },
    "RP-02": {
        "radPrimerCoverageBySTATdx": "exactDuplicate",
        "coverageNotes": "STATdx images 11 and 17 are the same axial CT slice/content; STATdx images 12 and 18 are adjacent/same-patient reinforcement rather than duplicates.",
        "relatedImageIds": ["SDX-11", "SDX-17", "SDX-12", "SDX-18"],
    },
    "RP-03": {
        "radPrimerCoverageBySTATdx": "conceptualReplacement",
        "coverageNotes": "STATdx has pelvic abscess examples, especially MR/CT pelvic cases, but not the same post-hysterectomy CT image.",
        "relatedImageIds": ["SDX-05", "SDX-06", "SDX-10"],
    },
    "RP-04": {
        "radPrimerCoverageBySTATdx": "conceptualReplacement",
        "coverageNotes": "STATdx includes drainage catheter follow-up examples, but not this transgluteal drainage image.",
        "relatedImageIds": ["SDX-02", "SDX-26"],
    },
    "RP-05": {
        "radPrimerCoverageBySTATdx": "conceptualReplacement",
        "coverageNotes": "STATdx covers perforation-related abscess and gas-forming collections but does not exactly reproduce this free intraperitoneal gas image.",
        "relatedImageIds": ["SDX-03", "SDX-13", "SDX-15", "SDX-16"],
    },
    "RP-06": {
        "radPrimerCoverageBySTATdx": "conceptualReplacement",
        "coverageNotes": "STATdx provides diverticulitis/perforation abscess cases, but this same-patient sigmoid diverticulosis/abscess slice is not duplicated.",
        "relatedImageIds": ["SDX-03", "SDX-13", "SDX-15", "SDX-16"],
    },
    "RP-07": {
        "radPrimerCoverageBySTATdx": "conceptualReplacement",
        "coverageNotes": "STATdx includes gas-forming/retroperitoneal or lesser sac infected collections, but not the ERCP duodenal perforation case.",
        "relatedImageIds": ["SDX-08", "SDX-13"],
    },
    "RP-08": {
        "radPrimerCoverageBySTATdx": "nearDuplicate",
        "coverageNotes": "STATdx image 4 is the same GIST mimic teaching concept and likely same case family, but it is a different CT slice/image, so both remain primary.",
        "relatedImageIds": ["SDX-04"],
    },
    "RP-09": {
        "radPrimerCoverageBySTATdx": "nearDuplicate",
        "coverageNotes": "STATdx images 9 and 10 provide tuboovarian abscess ultrasound/CT reinforcement; the ultrasound appearance is visually distinct and not an exact duplicate.",
        "relatedImageIds": ["SDX-09", "SDX-10"],
    },
    "RP-10": {
        "radPrimerCoverageBySTATdx": "notCovered",
        "coverageNotes": "No STATdx staged image shows the same right psoas/Crohn-related MR abscess teaching point.",
        "relatedImageIds": [],
    },
}

used_for = {
    "RP-01": ["primaryPattern", "postoperativeAbscess", "rimEnhancement", "internalGas"],
    "RP-02": ["primaryPattern", "multipleAbscesses", "airFluidLevel", "exactDuplicateAnchor"],
    "RP-03": ["pelvicAbscess", "postoperativeAbscess", "massEffect"],
    "RP-04": ["drainageFollowUp", "transglutealApproach", "procedureContext"],
    "RP-05": ["samePatientCluster", "entericPerforation", "freeIntraperitonealGas"],
    "RP-06": ["samePatientCluster", "diverticularAbscess", "sourceOfFreeAir"],
    "RP-07": ["retroperitonealAbscess", "duodenalPerforation", "postERCPComplication"],
    "RP-08": ["abscessMimic", "cysticNeoplasm", "GIST", "recognitionReinforcement"],
    "RP-09": ["ultrasoundPattern", "tuboovarianAbscess", "internalSeptations"],
    "RP-10": ["mriPattern", "psoasAbscess", "CrohnDisease", "phlegmon"],
    "SDX-01": ["appendicealAbscess", "alternateExample", "recognitionReinforcement", "samePatientCluster"],
    "SDX-02": ["drainageFollowUp", "appendicealAbscess", "procedureContext", "duplicateAnchor"],
    "SDX-03": ["diverticulitisAbscess", "alternateExample", "recognitionReinforcement"],
    "SDX-04": ["abscessMimic", "GIST", "nearDuplicate", "recognitionReinforcement"],
    "SDX-05": ["mriPattern", "pelvicAbscess", "samePatientCluster"],
    "SDX-06": ["mriPattern", "uterineRupture", "samePatientCluster", "mechanism"],
    "SDX-07": ["perinealAbscess", "traumaticFoley", "unusualCause"],
    "SDX-08": ["lesserSacAbscess", "necrotizingPancreatitis", "gasFormingInfection"],
    "SDX-09": ["ultrasoundPattern", "tuboovarianAbscess", "samePatientCluster", "recognitionReinforcement"],
    "SDX-10": ["ctCorrelation", "tuboovarianAbscess", "samePatientCluster"],
    "SDX-11": [],
    "SDX-12": ["samePatientCluster", "postoperativeAbscess", "adjacentSlice", "internalGas"],
    "SDX-13": ["gasFormingAbscess", "retrocecalAbscess", "perforatedDiverticulum"],
    "SDX-14": ["ultrasoundPattern", "postoperativeAbscess", "fluidFluidLevel"],
    "SDX-15": ["samePatientCluster", "intramuralSigmoidAbscess", "diverticulitis"],
    "SDX-16": ["samePatientCluster", "intramuralSigmoidAbscess", "adjacentSlice"],
    "SDX-17": [],
    "SDX-18": ["samePatientCluster", "postoperativeAbscess", "adjacentSlice", "internalGas"],
    "SDX-19": ["liverAbscess", "gasFormingInfection", "diabetes", "ctPattern"],
    "SDX-20": ["liverAbscess", "ultrasoundPattern", "dirtyShadowing", "gas"],
    "SDX-21": ["amebicAbscess", "ctPattern", "perilesionalEdema"],
    "SDX-22": ["amebicAbscess", "ultrasoundPattern", "lowLevelEchoes"],
    "SDX-23": ["fungalMicroabscesses", "immunocompromised", "ultrasoundPattern"],
    "SDX-24": ["splenicAbscess", "ultrasoundPattern"],
    "SDX-25": ["appendicealAbscess", "nearDuplicate", "samePatientCluster", "recognitionReinforcement"],
    "SDX-26": [],
    "SDX-27": ["abscessMimic", "Surgicel", "postoperativeDifferential"],
}


def evidence_hash(visual_evidence):
    rel = visual_evidence.get("evidenceFilename") if visual_evidence else None
    if not rel:
        return None
    path = BUNDLE / rel
    if not path.exists():
        return None
    return hashlib.sha256(path.read_bytes()).hexdigest()


def source_qualified_filename(entry, variant):
    source = entry.get("sourceLabel") or ("RadPrimer" if entry["masterImageId"].startswith("RP-") else "STATdx")
    source = source.replace(" ", "")
    code = entry["masterImageId"]
    if variant == "plain":
        evidence = (entry.get("visualEvidence") or {}).get("evidenceFilename")
        if evidence:
            return Path(evidence).name
        original = entry.get("plainFilename") or "image.jpg"
        return f"{code}_{source}_plain_{original}"
    original = entry.get("annotatedFilename")
    if original:
        return f"{code}_{source}_annotated_{original}"
    return None


def normalize_entry(entry):
    item = copy.deepcopy(entry)
    image_id = item["masterImageId"]
    item["sourceImageId"] = item.get("imageId")
    item["sourcePlainFilename"] = item.get("plainFilename")
    item["sourceAnnotatedFilename"] = item.get("annotatedFilename")
    item["plainFilename"] = source_qualified_filename(item, "plain")
    item["annotatedFilename"] = source_qualified_filename(item, "annotated")
    item["usedFor"] = used_for.get(image_id, [])
    item["downloadRecommendation"] = "archiveOptionalDuplicate" if image_id in archive_set else "primaryTeachingSet"
    item["downloadFilename"] = item["plainFilename"]
    item["visualEvidence"] = item.get("visualEvidence") or {}
    sha = evidence_hash(item["visualEvidence"])
    if sha:
        item["visualEvidence"]["evidenceSha256"] = sha
    if image_id in exact_duplicate_of:
        item["duplicateClassification"] = "exactDuplicate"
        item["duplicateOf"] = exact_duplicate_of[image_id]["duplicateOf"]
        item["archiveReason"] = exact_duplicate_of[image_id]["evidence"]
    elif image_id in relationship_notes:
        item["radPrimerCoverageBySTATdx"] = relationship_notes[image_id]["radPrimerCoverageBySTATdx"]
        item["coverageNotes"] = relationship_notes[image_id]["coverageNotes"]
        item["relatedImageIds"] = relationship_notes[image_id]["relatedImageIds"]
    else:
        item["duplicateClassification"] = "uniqueOrSupplemental"
    return item


image_registry = []
for entry in rp_meta["imageRegistry"]:
    image_registry.append(normalize_entry(entry))
for entry in sdx_meta["imageRegistry"]:
    image_registry.append(normalize_entry(entry))

selected_primary_ids = [entry["masterImageId"] for entry in image_registry if entry["downloadRecommendation"] == "primaryTeachingSet"]

rp_coverage = [
    {
        "radPrimerImageId": image_id,
        "radPrimerImageLabel": f"RadPrimer image {int(image_id.split('-')[1])}",
        "classification": info["radPrimerCoverageBySTATdx"],
        "relatedSTATdxImageIds": [rid for rid in info["relatedImageIds"] if rid.startswith("SDX-")],
        "decision": "selectedPrimary" if image_id not in archive_set else "archiveOptionalDuplicate",
        "notes": info["coverageNotes"],
    }
    for image_id, info in relationship_notes.items()
]

image_download_plan = [
    {
        "masterImageId": entry["masterImageId"],
        "sourceLabel": entry["sourceLabel"],
        "sourceImageNumber": entry["sourceImageNumber"],
        "downloadRecommendation": entry["downloadRecommendation"],
        "downloadFilename": entry["downloadFilename"],
        "plainUrl": entry.get("plainUrl"),
        "reason": entry.get("archiveReason") or "; ".join(entry.get("usedFor", [])) or "supplemental source image",
    }
    for entry in image_registry
]

primary_download_plan = [
    item for item in image_download_plan if item["downloadRecommendation"] == "primaryTeachingSet"
]
archive_download_plan = [
    item for item in image_download_plan if item["downloadRecommendation"] == "archiveOptionalDuplicate"
]

case_cluster_guardrails = {
    "atomicClusterRule": "Same-patient, follow-up, adjacent-slice, procedure, comparison-view, and time-lapse clusters should remain together unless the archived member is a visually exact duplicate and the selected retained image preserves the teaching context.",
    "intentionalClusterSplits": [
        {
            "cluster": "STATdx images 11-12 postoperative abscess",
            "selected": ["SDX-12", "RP-02"],
            "archived": ["SDX-11"],
            "reason": "STATdx image 11 is an exact duplicate of RadPrimer image 2; STATdx image 12 is an adjacent same-patient slice with gas and remains selected.",
        },
        {
            "cluster": "STATdx images 17-18 postoperative abscess",
            "selected": ["SDX-18", "RP-02"],
            "archived": ["SDX-17"],
            "reason": "STATdx image 17 is an exact duplicate of RadPrimer image 2; STATdx image 18 is an adjacent same-patient slice and remains selected.",
        },
        {
            "cluster": "STATdx images 25-26 appendiceal abscess/drainage",
            "selected": ["SDX-25", "SDX-02"],
            "archived": ["SDX-26"],
            "reason": "STATdx image 26 is an exact duplicate of STATdx image 2; the catheter follow-up context is preserved by selecting STATdx image 2.",
        },
    ],
    "radPrimerClustersPreserved": [
        {
            "cluster": "RadPrimer images 5-6 free air and diverticular abscess",
            "selected": ["RP-05", "RP-06"],
            "archived": [],
        }
    ],
}

source_selection_plan = {
    "textBackbone": "Use RadPrimer as the canonical hierarchy and article backbone; STATdx is used as supplemental depth where it adds modality-specific language, mechanisms, management nuance, differential mimics, or stronger image examples.",
    "keepFromRadPrimer": [
        "Canonical hierarchy and deck routing.",
        "Core imaging definition and CT/US/MR/radiographic/fluoroscopic/nuclear medicine structure.",
        "Differential diagnosis list and PAD success/patient-selection details.",
        "All RadPrimer images as selected primary images.",
    ],
    "keepFromSTATdx": [
        "Small-abscess drainage nuance and fat-saturated MR edema emphasis.",
        "Additional etiologic image examples: appendicitis, diverticulitis, uterine rupture, traumatic Foley, pancreatitis, liver/amebic/fungal/splenic abscesses, and Surgicel mimic.",
        "All nonduplicate STATdx images as recognition reinforcement or supplemental cases.",
    ],
    "downweightOrSkip": [
        "Do not repeat source-identical article prose twice.",
        "Do not use STATdx breadcrumb/deck path for routing.",
        "Archive only visually exact duplicate STATdx images 11, 17, and 26 by default.",
    ],
    "imageCurationPolicy": "Exact duplicates may be archived; near duplicates and conceptual replacements remain selected as recognition reinforcement unless visually identical or unusable.",
    "duplicateEvidencePolicy": "ExactDuplicate decisions require visual evidence from image_evidence files, same stable source image ID, image hashes, or explicit manual/source confirmation. Caption-only or topic-only similarity must be marked uncertain/nearDuplicate and kept primary.",
    "caseClusterGuardrails": case_cluster_guardrails,
    "radPrimerCoverageBySTATdx": rp_coverage,
    "primaryImageDownloadUseSet": selected_primary_ids,
    "archiveOptionalDuplicates": archive_optional_ids,
    "imageDownloadPlan": {
        "defaultBehavior": "Download only primaryTeachingSet images by default, using selectedPrimaryImageIds and the source-qualified downloadFilename values below.",
        "primaryTeachingSet": primary_download_plan,
        "archiveOptionalDuplicates": archive_download_plan,
    },
    "generatorInstructions": [
        "Use source-qualified human labels in narrative-facing text, such as RadPrimer image 5 or STATdx image 4.",
        "Keep short IDs such as RP-05 and SDX-04 in registry, manifest, filenames, and traceability fields.",
        "Do not generate cards or a lecture from this synthesis step.",
    ],
}

manifest = {
    "articleTitle": article_title,
    "canonicalHierarchy": canonical_hierarchy,
    "canonicalHierarchySource": "metadata.json canonicalHierarchy",
    "canonicalDeckPath": canonical_deck_path,
    "sourcePriority": ["RadPrimer", "STATdx supplemental"],
    "sourceCoverage": {
        "textCoverage": "RadPrimer and STATdx substantially overlap in core article text; STATdx adds supplemental wording and image breadth.",
        "imageCoverageSummary": "STATdx does not fully cover the RadPrimer image set. Only RadPrimer image 2 has exact STATdx duplicates; RadPrimer images 8 and 9 have near-duplicate/same-concept reinforcement; RadPrimer image 10 is not covered.",
        "radPrimerImageCoverageBySTATdx": rp_coverage,
    },
    "imageCountBySource": {
        "RadPrimer": {"total": 10, "primaryTeachingSet": 10, "archiveOptionalDuplicate": 0},
        "STATdx": {"total": 27, "primaryTeachingSet": 24, "archiveOptionalDuplicate": 3},
        "allSources": {"total": 37, "primaryTeachingSet": len(selected_primary_ids), "archiveOptionalDuplicate": len(archive_optional_ids)},
    },
    "sourceAttributionRules": [
        "Use [Both] for facts present in both RadPrimer and STATdx.",
        "Use [RadPrimer] for canonical hierarchy, RadPrimer-only measurements, and PAD success details.",
        "Use [STATdx] for supplemental cases, small-abscess technical nuance, and source-specific image examples.",
    ],
    "selectedPrimaryImageIds": selected_primary_ids,
    "archiveOptionalImageIds": archive_optional_ids,
    "sourceSelectionPlan": source_selection_plan,
}

package_lines = [
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
    "STATdx does not fully cover the RadPrimer image set. RadPrimer image 2 has exact STATdx duplicates; RadPrimer images 8 and 9 have near-duplicate/same-concept reinforcement; RadPrimer image 10 is not covered.",
]
for row in rp_coverage:
    related = ", ".join([f"STATdx image {int(r.split('-')[1])}" for r in row["relatedSTATdxImageIds"]]) or "none"
    package_lines.append(f"- {row['radPrimerImageLabel']}: {row['classification']}; related STATdx images: {related}. {row['notes']}")

package_lines += [
    "",
    "=== KEY FACTS ===",
    "- [Both] Abdominal abscess is a localized abdominal collection of pus or infected fluid.",
    "- [Both] Best CT clue: low-density, loculated, encapsulated fluid collection with peripheral rim enhancement, with or without gas bubbles or an air-fluid level.",
    "- [Both] Internal gas without recent intervention is highly suspicious for infection, though gas can also reflect bowel communication.",
    "- [Both] Use the term abscess for a discrete, drainable collection; separate this from ill-defined inflammatory phlegmon or nondrainable fluid.",
    "- [Both] Adjacent fat stranding, edema, fascial thickening, and low-density parenchymal edema around intraparenchymal abscesses support infection.",
    "- [Both] Ultrasound shows a complex fluid collection with low-level echoes, membranes, septations, avascular center, and peripheral hyperemia.",
    "- [Both] Abscesses are common in postoperative, diabetic, and immunocompromised patients and may follow enteric perforation, bacteremia, or trauma.",
    "- [Both] Differentiating abscess from noninfected postoperative collection can require symptoms, labs, aspiration, or follow-up.",
    "",
    "=== TERMINOLOGY ===",
    "- [Both] Definition: localized abdominal collection of pus or infected fluid.",
    "",
    "=== IMAGING ===",
    "- [Both] General feature: loculated, encapsulated fluid collection with peripheral rim enhancement on contrast-enhanced CT.",
    "- [RadPrimer] Size is highly variable, often 2-15 cm, with microabscesses smaller than 2 cm.",
    "- [STATdx] Tiny microabscesses can be smaller than 1 cm, and small abscesses can be technically difficult to drain.",
    "- [Both] Location can be intraperitoneal, extraperitoneal, or intraparenchymal.",
    "- [Both] CT: simple fluid attenuation or mildly hyperdense content; surrounding inflammatory change is common.",
    "- [Both] CT: intraparenchymal abscesses in liver, kidney, spleen, and other organs often have surrounding low-density edema.",
    "- [RadPrimer] About half of abscesses contain internal gas; absence of gas does not exclude abscess.",
    "- [Both] MR: central low T1/high T2 fluid signal, peripheral rim enhancement on contrast-enhanced T1, and often restricted diffusion with low ADC.",
    "- [STATdx] Surrounding edema is especially conspicuous on fat-saturated sequences, particularly T2 fat-saturated imaging.",
    "- [Both] US: internal debris, septations, low-level echoes, variable through transmission, avascular center, peripheral hyperemia, and echogenic inflamed fat.",
    "- [Both] US gas clue: echogenic foci with ring-down artifact or dirty posterior acoustic shadowing.",
    "- [Both] Radiography may show a soft-tissue mass/density, loss of fat interface, ectopic gas or air-fluid levels, focal ileus, and subphrenic-related pleural effusion/atelectasis.",
    "- [Both] Abscess sinogram after drainage can assess residual cavity, catheter position, and fistulization to bowel, pancreas, or biliary tree.",
    "- [Both] Nuclear medicine options include labeled white blood cell imaging, gallium, and FDG PET, with PET sensitive but nonspecific.",
    "- [Both] Best imaging tool: contrast-enhanced CT.",
    "",
    "=== DIFFERENTIAL DIAGNOSIS ===",
    "- [Both] Postoperative lymphocele: lymph node dissection history; simple fluid along lymphatic drainage pathways near clips; no enhancing rim or gas.",
    "- [Both] Biloma: collection near biliary tree after biliary/hepatic surgery; usually simple unless infected.",
    "- [Both] Postoperative seroma: simple fluid, sometimes loculated or with recent postoperative gas; may be indistinguishable from abscess without clinical correlation.",
    "- [Both] Loculated ascites: minimal mass effect, no rim enhancement, no internal gas, often in cirrhosis or chronic systemic disease.",
    "- [Both] Pancreatic pseudocyst: pancreatitis history or stigmata; pseudocapsule generally develops over weeks.",
    "- [Both] Hematoma: attenuation varies with age; acute clot is often high attenuation and may weakly enhance peripherally during evolution.",
    "- [Both] Retained oxidized cellulose/Surgicel: postoperative gas collection with little fluid and no discrete drainable collection.",
    "- [Both] Cystic or necrotic neoplasm can mimic abscess, especially without fever, leukocytosis, or other infection history.",
    "",
    "=== PATHOLOGY ===",
    "- [Both] Etiologies include enteric perforation, postoperative infection, generalized bacteremia, and trauma.",
    "- [Both] Postoperative abscesses often occur in dependent intraperitoneal spaces such as cul-de-sac, Morison pouch, or subphrenic spaces.",
    "- [Both] Diabetic patients have increased risk for gas-forming abscesses; immunocompromised patients can develop fungal microabscesses.",
    "- [RadPrimer] Associated pathology includes pus, peripheral fibrocapillary capsule, and often polymicrobial enteric organisms.",
    "- [RadPrimer] Classification can be by organism, organ of origin, intra-/extraperitoneal location, or communication with bowel, biliary tree, or pancreatic duct.",
    "",
    "=== CLINICAL ISSUES ===",
    "- [Both] Presentation: fever, chills, abdominal pain, tachycardia, hypotension in sepsis, leukocytosis, positive blood cultures, or elevated ESR.",
    "- [Both] Older and immunocompromised patients may lack fever or elevated white blood cell count.",
    "- [Both] Prognosis is generally excellent with appropriate treatment but depends on abscess burden, immune status, and comorbidities.",
    "- [RadPrimer] Percutaneous abscess drainage has approximately 80% success with proper patient selection.",
    "- [Both] Ideal percutaneous drainage target: well-defined, encapsulated, fluid-filled abscess larger than 3 cm with safe catheter access.",
    "- [Both] CT or US guidance can support transcutaneous, transgluteal, transrectal, or transvaginal drainage approaches.",
    "- [Both] Complex multiseptated abscesses or abscesses with enteric fistula may require weeks to months; most drain in 10-14 days.",
    "- [Both] Catheter removal is considered when output is less than 10 cc per shift or the cavity resolves on imaging.",
    "- [Both] Patient-related drainage contraindications include coagulopathy, elevated INR, and platelets below 50,000/uL, using institution-specific thresholds.",
    "- [Both] Abscess-related drainage contraindications include phlegmon, no safe route, gas-forming infection such as emphysematous pancreatitis, echinococcal cyst, infected necrosis, multiseptated collection, or superinfected necrotic tumor.",
    "- [Both] Surgery may be needed for extensive intraperitoneal abscesses, debridement of necrotic infected tissue, or failed percutaneous drainage.",
    "- [Both] Small abscesses, usually smaller than 3 cm, may be treated with antibiotics alone; STATdx notes technical difficulty placing catheters in small abscesses.",
    "",
    "=== DIAGNOSTIC CHECKLIST ===",
    "- [Both] Correlate imaging with clinical signs, labs, aspiration, and postoperative timing when infected and noninfected collections overlap.",
    "- [Both] Do not require gas for diagnosis; an enhancing rim, mass effect, and inflammatory change can be highly suggestive in the right clinical context.",
    "- [Both] Avoid labeling nondrainable phlegmon as abscess when no discrete collection exists.",
    "",
    "=== SELECTED PRIMARY IMAGE SET ===",
]

for entry in image_registry:
    if entry["downloadRecommendation"] != "primaryTeachingSet":
        continue
    label = f"{entry['sourceLabel']} image {entry['sourceImageNumber']}"
    role = ", ".join(entry["usedFor"])
    package_lines.append(f"- {label}: {entry['caption']} Used for: {role}.")

package_lines += [
    "",
    "=== ARCHIVE-OPTIONAL DUPLICATE IMAGES ===",
]
for image_id in archive_optional_ids:
    entry = next(item for item in image_registry if item["masterImageId"] == image_id)
    label = f"{entry['sourceLabel']} image {entry['sourceImageNumber']}"
    package_lines.append(f"- {label}: archiveOptionalDuplicate. {entry['archiveReason']}")

package_lines += [
    "",
    "=== CASE CLUSTER NOTES ===",
    "- RadPrimer images 5 and 6 are a same-patient free-air/diverticular abscess cluster and both remain selected.",
    "- STATdx image 12 and STATdx image 18 are adjacent/same-patient reinforcement images and remain selected even though their paired duplicate opening slices are archived.",
    "- STATdx image 2 preserves catheter follow-up context for the appendiceal abscess cluster after STATdx image 26 is archived as an exact duplicate.",
    "",
    "=== GENERATOR INSTRUCTIONS ===",
    "- Use this package as source material for later narrative/cards, but do not generate cards or lecture output during this synthesis step.",
    "- Use clean source-qualified labels in prose, such as RadPrimer image 5 and STATdx image 4.",
    "- Use registry IDs, source image IDs, hashes, and filenames for traceability and download routing.",
]

package_text = "\n".join(package_lines) + "\n"

report_lines = [
    "# Master Source Report: Abdominal Abscess",
    "",
    f"Created: {created_at}",
    "",
    "## Imported Bundle",
    f"- Bundle: {BUNDLE}",
    "- Sources compared: RadPrimer_source_package.txt, STATdx_source_package.txt, RadPrimer_metadata.json, STATdx_metadata.json, metadata.json, master_source_request.md.",
    f"- Image evidence inspected: {len(evidence_manifest.get('entries', []))} staged plain image files via contact sheets and full-size checks of candidate duplicate families.",
    "",
    "## Canonical Hierarchy",
    f"- {' > '.join(canonical_hierarchy)}",
    f"- Deck path: {canonical_deck_path}",
    "- Routing uses metadata.json canonicalHierarchy exactly.",
    "",
    "## RadPrimer Image Coverage By STATdx",
]
for row in rp_coverage:
    related = ", ".join(row["relatedSTATdxImageIds"]) or "none"
    report_lines.append(f"- {row['radPrimerImageId']}: {row['classification']}; related STATdx IDs: {related}; {row['notes']}")

report_lines += [
    "",
    "## Archived Images",
    "- SDX-11: exact duplicate of RP-02 based on actual staged image evidence; archived.",
    "- SDX-17: exact duplicate of RP-02 based on actual staged image evidence; archived.",
    "- SDX-26: exact duplicate of SDX-02 based on actual staged image evidence; archived.",
    "",
    "## Retained Near Duplicates And Conceptual Replacements",
    "- RP-08 and SDX-04: same GIST mimic teaching concept but different CT slice/image; both selected.",
    "- RP-09 with SDX-09/SDX-10: tuboovarian abscess reinforcement across US/CT; all selected.",
    "- SDX-01 and SDX-25: same appendiceal abscess concept/case family but visually distinct enough to keep as recognition reinforcement.",
    "",
    "## Case Cluster Splits",
]
for split in case_cluster_guardrails["intentionalClusterSplits"]:
    report_lines.append(f"- {split['cluster']}: selected {', '.join(split['selected'])}; archived {', '.join(split['archived'])}. Reason: {split['reason']}")
report_lines += [
    "- No RadPrimer source case cluster was intentionally split.",
    "",
    "## Output Files",
    "- master_source_package.txt",
    "- master_source_manifest.json",
    "- image_registry.json",
    "- master_source_import.json",
    "- master_source_report.md",
    "- _codex_master_source_done.txt",
]
report_text = "\n".join(report_lines) + "\n"

master_import = {
    "version": 1,
    "articleTitle": article_title,
    "createdAt": created_at,
    "packageText": package_text,
    "manifest": manifest,
    "imageRegistry": image_registry,
    "sourceSelectionPlan": source_selection_plan,
    "selectedPrimaryImageIds": selected_primary_ids,
    "archiveOptionalImageIds": archive_optional_ids,
}

(BUNDLE / "master_source_package.txt").write_text(package_text, encoding="utf-8")
(BUNDLE / "master_source_manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
(BUNDLE / "image_registry.json").write_text(json.dumps(image_registry, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
(BUNDLE / "master_source_import.json").write_text(json.dumps(master_import, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
(BUNDLE / "master_source_report.md").write_text(report_text, encoding="utf-8")
(BUNDLE / "_codex_master_source_done.txt").write_text(
    f"done\ncreatedAt={created_at}\nselectedPrimaryImageIds={','.join(selected_primary_ids)}\narchiveOptionalImageIds={','.join(archive_optional_ids)}\n",
    encoding="utf-8",
)

print(BUNDLE)
print(f"primary={len(selected_primary_ids)} archive={len(archive_optional_ids)} total={len(image_registry)}")
