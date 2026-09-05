import hashlib
import json
import re
from pathlib import Path

BUNDLE = Path(__file__).resolve().parents[1]
CREATED_AT = "2026-08-09T21:10:00Z"
ARTICLE_TITLE = "Tuboovarian Abscess"


def read_json(name):
    return json.loads((BUNDLE / name).read_text(encoding="utf-8"))


def jpeg_size(path):
    data = path.read_bytes()
    i = 2
    while i < len(data):
        if data[i] != 0xFF:
            i += 1
            continue
        while i < len(data) and data[i] == 0xFF:
            i += 1
        if i >= len(data):
            break
        marker = data[i]
        i += 1
        if marker in (0xD8, 0xD9):
            continue
        if i + 2 > len(data):
            break
        length = int.from_bytes(data[i : i + 2], "big")
        if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
            return int.from_bytes(data[i + 5 : i + 7], "big"), int.from_bytes(data[i + 3 : i + 5], "big")
        i += length
    return None, None


metadata = read_json("metadata.json")
rp_meta = read_json("RadPrimer_metadata.json")
sdx_meta = read_json("STATdx_metadata.json")
evidence_manifest = read_json("image_evidence_manifest.json")

canonical_hierarchy = metadata["canonicalHierarchy"]
canonical_deck_path = metadata["canonicalDeckPath"]
evidence_by_id = {e["masterImageId"]: e for e in evidence_manifest["entries"]}
source_by_id = {e["masterImageId"]: e for e in rp_meta["imageRegistry"] + sdx_meta["imageRegistry"]}

groups = {
    "RP-03": "RadPrimer salpingitis grayscale/color Doppler same-patient pair",
    "RP-04": "RadPrimer salpingitis grayscale/color Doppler same-patient pair",
    "RP-05": "RadPrimer pyosalpinx ultrasound/MR same-patient pair",
    "RP-06": "RadPrimer pyosalpinx ultrasound/MR same-patient pair",
    "RP-09": "RadPrimer post-D&C TOA ultrasound/CT same-patient pair",
    "RP-10": "RadPrimer post-D&C TOA ultrasound/CT same-patient pair",
}
cluster_ranges = [
    (7, 8, "STATdx CT pyosalpinx axial/coronal same-patient pair"),
    (9, 10, "STATdx bilateral pyosalpinx/endometritis CT same-patient pair"),
    (11, 14, "STATdx US/CT/MR TOA same-patient cluster"),
    (15, 16, "STATdx large TOA CT axial/coronal same-patient pair"),
    (17, 22, "STATdx TOA/endometrioma differential multiparametric MR same-patient cluster"),
    (23, 26, "STATdx unilocular ovarian abscess multiparametric MR same-patient cluster"),
    (27, 28, "STATdx TOA with Fitz-Hugh-Curtis same-patient CT pair"),
    (29, 30, "STATdx TOA with RUQ spread same-patient CT pair"),
    (31, 32, "STATdx severe PID/Fitz-Hugh-Curtis CT same-patient pair"),
    (33, 34, "STATdx diverticulitis-related ovarian abscess same-patient CT pair"),
    (35, 40, "STATdx renal-transplant left ovarian abscess multiparametric MR same-patient cluster"),
    (41, 46, "STATdx right ovarian abscess US/MR multiparametric same-patient cluster"),
]
for start, end, desc in cluster_ranges:
    for n in range(start, end + 1):
        groups[f"SDX-{n:02d}"] = desc

role_by_id = {
    "RP-01": ["tuboOvarianComplex", "complexFluid", "ovarySeparate"],
    "RP-02": ["tuboOvarianAbscess", "pusLevel", "transvaginalUltrasound"],
    "RP-03": ["salpingitis", "thickenedTube", "ovarySeparate"],
    "RP-04": ["salpingitis", "colorDopplerHyperemia", "samePatientCompanion"],
    "RP-05": ["pyosalpinx", "lowLevelEchoes", "incompleteSepta"],
    "RP-06": ["MRPyosalpinx", "debrisLevel", "samePatientCompanion"],
    "RP-07": ["endometritis", "endometrialFluid", "PIDSpectrum"],
    "RP-08": ["multiloculatedTOA", "debris", "surroundingHyperemia"],
    "RP-09": ["postDandC_TOA", "noCentralFlow", "thickEndometrium"],
    "RP-10": ["CECTExtent", "endometritis", "samePatientCompanion"],
}
sdx_roles = {
    range(1, 7): ["salpingitisPyosalpinx", "ultrasoundRecognition", "alternateExample"],
    range(7, 17): ["CT_TOA_PID", "modalityVariant", "alternateExample"],
    range(17, 27): ["MR_TOA", "diffusionRestriction", "differentialTeaching"],
    range(27, 33): ["FitzHughCurtis", "upperAbdominalSpread", "complicationTeaching"],
    range(33, 35): ["secondaryPelvicInfection", "diverticulitis", "complicationTeaching"],
    range(35, 47): ["multiparametricMR", "TOARecognition", "samePatientSequenceCluster"],
    range(47, 49): ["ultrasoundRecognition", "PIDSpectrum", "alternateExample"],
}


def roles_for(mid):
    if mid.startswith("RP-"):
        roles = ["primaryTeachingSet", "canonicalBackbone", "recognitionReinforcement"] + role_by_id[mid]
    else:
        n = int(mid.split("-")[1])
        found = next(v for r, v in sdx_roles.items() if n in r)
        roles = ["primaryTeachingSet", "recognitionReinforcement"] + found
    if mid in groups:
        roles.append("caseClusterPreserved")
    return roles


def source_qualified_filename(item, annotated=False):
    original = item.get("annotatedFilename" if annotated else "plainFilename") or item.get("filename") or f"{item.get('baseName', 'image')}.jpg"
    kind = "annotated" if annotated else "plain"
    return f"{item['masterImageId']}_{item['sourceLabel']}_{kind}_{original}"


def clean_caption(text):
    return re.sub(r"<img[^>]*>", "", text or "").replace("  ", " ").strip()


ids = [f"RP-{n:02d}" for n in range(1, 11)] + [f"SDX-{n:02d}" for n in range(1, 49)]
image_registry = []
for mid in ids:
    src = source_by_id[mid]
    ev = evidence_by_id[mid]
    ev_path = BUNDLE / ev["evidenceFilename"].replace("/", "\\")
    data = ev_path.read_bytes()
    width, height = jpeg_size(ev_path)
    image_registry.append(
        {
            "masterImageId": mid,
            "displayLabel": f"{src['sourceLabel']} image {src['sourceImageNumber']}",
            "sourceKind": src["sourceKind"],
            "sourceLabel": src["sourceLabel"],
            "sourceImageNumber": src["sourceImageNumber"],
            "imageId": src.get("imageId"),
            "caption": src.get("caption", ""),
            "usedFor": roles_for(mid),
            "downloadRecommendation": "primaryTeachingSet",
            "plainFilename": source_qualified_filename(src, False),
            "annotatedFilename": source_qualified_filename(src, True),
            "originalPlainFilename": src.get("plainFilename"),
            "originalAnnotatedFilename": src.get("annotatedFilename"),
            "plainUrl": src.get("plainUrl") or ev.get("evidenceUrl"),
            "annotatedUrl": src.get("annotatedUrl"),
            "baseName": src.get("baseName"),
            "group": groups.get(mid, ""),
            "visualEvidence": {
                "evidenceFilename": ev["evidenceFilename"],
                "evidenceVariant": ev.get("evidenceVariant"),
                "downloaded": ev.get("downloaded"),
                "downloadError": ev.get("downloadError", ""),
                "width": width,
                "height": height,
                "sha256": hashlib.sha256(data).hexdigest(),
            },
            "duplicateClassification": "selectedPrimaryDistinct",
            "duplicateOfMasterImageId": None,
            "archiveRationale": "",
        }
    )

selected_primary_ids = [x["masterImageId"] for x in image_registry]
archive_optional_ids = []

coverage = [
    ("RP-01", "conceptualReplacement", ["SDX-11", "SDX-48"], "STATdx has distinct ultrasound examples of complex adnexal/pelvic abscess patterns, but not the same left tubo-ovarian complex with separate ovary."),
    ("RP-02", "conceptualReplacement", ["SDX-02", "SDX-11"], "STATdx includes pyosalpinx/TOA ultrasound examples, but the actual images are different anatomy and screenshots."),
    ("RP-03", "nearDuplicate", ["SDX-02"], "Both teach grayscale salpingitis/pyosalpinx with thickened tube/endosalpingeal folds, but visual review shows different images and different stable IDs/hashes."),
    ("RP-04", "nearDuplicate", ["SDX-01", "SDX-05"], "Both teach color Doppler hyperemia in salpingitis, but candidate-pair review shows distinct images rather than the same screenshot or slice."),
    ("RP-05", "nearDuplicate", ["SDX-02"], "Both teach pyosalpinx with debris/folds, but visual review shows different probes/views and different source image IDs."),
    ("RP-06", "conceptualReplacement", ["SDX-17", "SDX-23", "SDX-35"], "STATdx has multiple MR abscess/TOA examples, but none duplicates the sagittal T2 pyosalpinx-with-fibroids RadPrimer image."),
    ("RP-07", "conceptualReplacement", ["SDX-10", "SDX-48"], "STATdx covers endometritis/indefinite uterus sign by CT and pelvic abscess ultrasound, but not the same coronal transvaginal uterine ultrasound image."),
    ("RP-08", "nearDuplicate", ["SDX-41"], "Both show multiloculated abscess on ultrasound with vascularity, but focused pair review shows distinct case appearance and no same image/slice evidence."),
    ("RP-09", "nearDuplicate", ["SDX-41"], "Both are ultrasound examples of complex TOA, but the RadPrimer image is a post-D&C transabdominal Doppler case and STATdx image 41 is a different multilocular right ovarian mass."),
    ("RP-10", "conceptualReplacement", ["SDX-16", "SDX-30", "SDX-34"], "STATdx has coronal CT examples of TOA extent/inflammation, but none duplicates the RadPrimer same-patient post-D&C coronal CECT image by visual review or stable ID/hash."),
]
coverage_objects = [
    {
        "radprimerImageId": mid,
        "classification": cls,
        "coveredBy": covered,
        "evidence": evidence,
        "action": "Keep the RadPrimer image primary and keep STATdx examples primary as recognition reinforcement; archive nothing.",
    }
    for mid, cls, covered, evidence in coverage
]


def download_plan_entry(x):
    return {
        "masterImageId": x["masterImageId"],
        "displayLabel": x["displayLabel"],
        "sourceLabel": x["sourceLabel"],
        "plainFilename": x["plainFilename"],
        "annotatedFilename": x["annotatedFilename"],
        "plainUrl": x["plainUrl"],
        "annotatedUrl": x["annotatedUrl"],
        "downloadRecommendation": x["downloadRecommendation"],
    }


source_selection_plan = {
    "textBackbone": {
        "primary": "RadPrimer supplies the canonical hierarchy/backbone, deck routing, and Tuboovarian Abscess article structure.",
        "supplement": "STATdx contributes broader PID-spectrum depth, complication imaging, CT/MR/DWI detail, Fitz-Hugh-Curtis syndrome, secondary pelvic infection pathways, drainage planning, and supplemental image clusters.",
        "downweight": "Do not use the STATdx breadcrumb for canonical hierarchy or deck routing. Do not claim Core Radiology support because no auditable Core text was supplied in this bundle.",
    },
    "imageCurationPolicy": "Exact duplicates may be archived. Near duplicates, alternate patients, alternate same-disease examples, modality variants, same-patient companion images, and conceptual replacements remain selected as recognition reinforcement unless visually identical or unusable.",
    "duplicateEvidencePolicy": "ExactDuplicate decisions require visual evidence from image_evidence files, same stable source image ID, image hashes, or explicit manual/source confirmation. Caption-only or topic-only similarity is insufficient.",
    "caseClusterGuardrails": {
        "rule": "Treat same-patient, follow-up, procedure, adjacent-slice, comparison-view, and time-lapse groups as atomic teaching clusters unless a documented split is safe.",
        "intentionalSplits": [],
        "preservedClusters": sorted(set(groups.values())),
    },
    "radprimerImageCoverageGate": {
        "statdxFullyCoversRadPrimerImageSet": False,
        "summary": "STATdx substantially supplements the RadPrimer image set but does not fully cover it by exact duplicate or equivalent same-patient clusters. Actual staged image_evidence files were reviewed with all-source and candidate-pair contact sheets.",
        "coverage": coverage_objects,
        "action": "Keep all RadPrimer images as canonical primary images. Keep all STATdx images as selected primary supplemental recognition/modality/complication examples. Archive no images by default.",
    },
    "primaryImageDownloadUseSet": selected_primary_ids,
    "archiveOptionalDuplicateIds": archive_optional_ids,
    "imageDownloadPlan": [download_plan_entry(x) for x in image_registry],
    "generatorInstructions": [
        "Use RadPrimer hierarchy/deck routing exactly as supplied in metadata.json.",
        "Use source-qualified human-facing labels such as RadPrimer image 5 or STATdx image 4 in narrative text.",
        "Keep RP-05 and SDX-04 style IDs in registry, filenames, traceability fields, and import metadata.",
        "Download only selectedPrimaryImageIds by default through sourceSelectionPlan.imageDownloadPlan.",
        "Preserve same-patient clusters and procedure/follow-up context when generating later cards or lecture.",
        "Do not generate cards or a lecture from this package yet.",
    ],
}

appendix = []
for image in image_registry:
    role_words = ", ".join([r for r in image["usedFor"] if r not in ("primaryTeachingSet", "canonicalBackbone", "recognitionReinforcement")][:3])
    appendix.append(f"- {image['displayLabel']}: {clean_caption(image['caption'])} Teaching role: {role_words}.")

package_text = f"""TITLE: Tuboovarian Abscess

SOURCE STATUS
- [Both] This fused master source combines RadPrimer Tuboovarian Abscess with STATdx Pelvic Inflammatory Disease.
- [RadPrimer] Canonical hierarchy: {' > '.join(canonical_hierarchy)}
- [RadPrimer] Canonical deck path: {canonical_deck_path}
- [Both] Core Radiology evidence was requested but not supplied in this browser bundle; do not label later output as Core-supported unless a later run provides auditable Core text.

MASTER SUMMARY
- [Both] Pelvic inflammatory disease is an ascending upper genital tract infection spanning cervicitis, endometritis, salpingitis, pyosalpinx, oophoritis, tubo-ovarian complex, tubo-ovarian abscess, peritonitis, and Fitz-Hugh-Curtis syndrome.
- [RadPrimer] Tubo-ovarian complex means abscess adherent to tube with a still-distinguishable ovary; tubo-ovarian abscess means tube and ovary are involved together and the separate ovary is no longer recognizable.
- [Both] The core imaging pattern is pelvic inflammation plus a thick-walled tubular or complex adnexal structure. Early disease can be subtle, while advanced disease forms multilocular complex cystic/solid adnexal masses, abscesses, and inflammatory collections.
- [Both] Imaging is often performed to find complications, exclude mimics, define disease extent, and plan drainage or surgery. Transvaginal ultrasound is first line; CT helps when symptoms are diffuse or complicated disease is suspected; MR is useful when ultrasound/CT are equivocal or when differentiating TOA from other ovarian masses.

ULTRASOUND RECOGNITION
- [Both] Ultrasound findings include thickened dilated fallopian tubes, complex intraluminal fluid, low-level debris, fluid-debris levels, thick wall often at least 5 mm, incomplete septa from a folded tube, and thickened endosalpingeal folds producing the cogwheel sign.
- [Both] Color Doppler may show hyperemia in the wall/folds of the tube, ovary, or inflamed pelvic fat. Probe tenderness can function as an ultrasound correlate of cervical motion tenderness.
- [Both] Oophoritis may appear as an enlarged edematous hyperemic ovary with multiple follicles and indistinct contours. Once ovary and tube are no longer separable, the pattern becomes TOA rather than a simple pyosalpinx or TOC.
- [RadPrimer] RadPrimer image 1 shows a left tubo-ovarian complex with complex abscess fluid distinct from the ovary.
- [RadPrimer] RadPrimer image 2 shows a coronal transvaginal ultrasound TOA with a pus level.
- [RadPrimer] RadPrimer image 3 and RadPrimer image 4 form a salpingitis pair: grayscale thickened tender tube and ovary, followed by color Doppler hyperemia in the same patient.
- [RadPrimer] RadPrimer image 5 shows pyosalpinx with low-level echoes and incomplete septa.
- [RadPrimer] RadPrimer image 7 shows endometrial fluid from endometritis in the PID spectrum.
- [RadPrimer] RadPrimer image 8 shows multiloculated TOA with debris and surrounding hyperemia.
- [RadPrimer] RadPrimer image 9 shows a post-D&C TOA without central color flow and with thick endometrium.
- [STATdx] STATdx images 1, 2, 5, and 6 add Doppler salpingitis, pyosalpinx/cogwheel, fimbrial thickening, debris, and peritubal fluid examples.
- [STATdx] STATdx image 41 and STATdx image 48 add complex multilocular abscess and indefinite uterus sign examples for recognition reinforcement.
- [STATdx] STATdx image 47 adds early oophoritis with ovarian enlargement and cystic spaces.

CT RECOGNITION
- [Both] CT can be normal or subtle in mild PID, but useful findings include pelvic fat haziness/stranding, thickened uterosacral ligaments, obscured fascial planes, peritoneal thickening/enhancement, free fluid, thickened/enhancing fallopian tubes, high-attenuation tubal fluid, enlarged enhancing ovaries, endometrial fluid/enhancement, and enlarged enhancing cervix.
- [Both] Advanced CT disease shows thick-walled complex fluid collections, internal septa, debris, occasional gas, loss of fat planes, and secondary bowel, urinary tract, or peritoneal involvement.
- [Both] CT is particularly useful when symptoms are nonspecific, when nongynecologic diagnoses are possible, or when abscess accessibility for percutaneous/transvaginal drainage must be assessed.
- [RadPrimer] RadPrimer image 10 is the CT companion to RadPrimer image 9 and shows the extent of the post-D&C TOA with low-density endometrium.
- [STATdx] STATdx images 3, 4, 7, 8, 9, 10, 12, 15, 16, 27, 30, 31, 33, and 34 add CT examples of adnexal abscess wall enhancement, pyosalpinx, bilateral disease, oophoritis, endometritis, fat stranding, and secondary pelvic infection.

MR RECOGNITION
- [Both] MR findings include T1 low/intermediate fluid signal, possible hyperintense hemorrhagic/proteinaceous/purulent contents, T2 intermediate-to-high fluid in dilated tubes and abscesses, thick irregular hypointense walls/septa, parametrial edema, and enhancement of abscess walls, septa, peritoneum, and inflammatory bands.
- [STATdx] DWI/ADC is a major STATdx contribution: TOA cavities often show high DWI signal and low ADC, helping differentiate abscess from many ovarian tumors when interpreted with T1/T2 content and enhancement.
- [RadPrimer] RadPrimer image 6 is the MR companion to RadPrimer image 5, showing a debris level in a pyosalpinx in a patient whose fibroids limited ultrasound assessment.
- [STATdx] STATdx images 13, 14, 17-26, 35-40, and 42-46 provide multiparametric MR clusters showing T2 complexity, rim/septal enhancement, hyperintense inner rim, diffusion restriction, and same-patient sequence correlation.

COMPLICATIONS AND SPREAD
- [Both] PID can extend beyond the adnexa into the peritoneum and adjacent organs. Complications include pelvic abscess, TOA rupture with life-threatening peritonitis, bowel ileus/obstruction, reactive bowel or bladder wall thickening, ureteral obstruction, pelvic thrombophlebitis/ovarian vein thrombosis, adhesions, and chronic tubal damage.
- [Both] Fitz-Hugh-Curtis syndrome is spread through the right paracolic gutter to the right upper quadrant, producing perihepatitis. CT/MR may show anterior hepatic capsular enhancement, subcapsular or periportal perfusion changes, periportal edema, gallbladder wall thickening, pericholecystic fluid, right paracolic gutter stranding, or loculated perihepatic fluid.
- [STATdx] STATdx images 27-32 are the key Fitz-Hugh-Curtis/upper abdominal spread examples, including hepatic capsule enhancement, gallbladder wall thickening, right paracolic gutter inflammation, periportal edema, and bilateral TOA in severe PID.
- [STATdx] STATdx images 33 and 34 show that pelvic inflammatory disease/ovarian abscess can also arise from adjacent pelvic infection such as diverticulitis, not only ascending sexually transmitted infection.

DIFFERENTIAL DIAGNOSIS
- [Both] Endometrioma or ruptured endometrioma can mimic TOA because it may be complex, bilateral, and show T1 hyperintensity or diffusion restriction. Lack of infectious signs, chronic endometriosis history, classic T1/T2 shading, and absence of pelvic inflammatory fat stranding favor endometrioma.
- [Both] Hemorrhagic ovarian cyst is usually a single thin-walled ovarian cyst with reticular echoes or internal debris and a vascular rim, without thick inflamed tube or pelvic fat inflammation.
- [RadPrimer] Paraovarian cyst is thin-walled, anechoic, extraovarian, and lacks endosalpingeal folds or inflammatory change.
- [Both] Appendicitis, diverticulitis, Crohn disease, or another pelvic abscess can mimic PID/TOA. Trace a tubular right-sided structure to cecum versus uterus; look for appendicolith, diverticulosis, bowel-centered inflammation, gas, normal ovary, and patient age/context.
- [STATdx] Ovarian torsion has preserved ovarian architecture, peripheral follicles, twisted pedicle/whirlpool sign, and little inflammatory change unless complicated. Ruptured dermoid has fat or calcification.
- [Both] Hydrosalpinx has simple tubal fluid without wall thickening or surrounding inflammation. Hematosalpinx is avascular blood-filled tube and is often clarified on MR. Ectopic pregnancy needs positive beta-hCG context and usually lacks pelvic fat inflammation.
- [Both] Ovarian neoplasm can be mixed cystic/solid and large, but typically lacks clinical infection and pelvic inflammatory fat stranding; DWI alone should not override morphology and clinical context.

PATHOLOGY AND CLINICAL CONTEXT
- [Both] Most PID is related to ascending infection, commonly Neisseria gonorrhoeae or Chlamydia trachomatis, with many cases polymicrobial. Other organisms and secondary extension from appendicitis/diverticulitis/colitis can occur.
- [Both] Infection damages the endocervical barrier and ascends to the endometrium, tubes, ovaries, and peritoneal cavity. Tubal occlusion can produce hydrosalpinx or pyosalpinx; oophoritis and adhesions can progress to TOC/TOA.
- [Both] Clinical presentation commonly includes pelvic pain, cervical motion or adnexal tenderness, fever, vaginal discharge, elevated WBC/ESR/CRP, or vague nonspecific symptoms. Normal inflammatory markers do not exclude PID.
- [Both] Highest incidence is in young women under 25, but postmenopausal TOA deserves evaluation for gynecologic malignancy when clinically appropriate.

MANAGEMENT
- [Both] Uncomplicated PID is treated with broad polymicrobial antibiotic therapy. Treatment aims to cure acute infection and prevent infertility, ectopic pregnancy, recurrent PID, chronic pelvic pain, adhesions, and hydrosalpinx.
- [Both] TOA may require hospitalization, IV/parenteral antibiotics, image-guided drainage, or surgery if there is poor clinical response, large/accessible abscess, rupture, generalized peritonitis, septic shock, or uncertain diagnosis.
- [STATdx] Drainage may be transvaginal, transabdominal, transgluteal, or transrectal depending on abscess location. Catheter removal can be considered after resolution of fever/leukocytosis, low output, and no fistula or large residual cavity on injection.
- [RadPrimer] Empiric partner treatment is important in sexually transmitted PID contexts. RadPrimer notes that IUD presence does not by itself require empiric removal.

IMAGE CURATION SUMMARY
- [Both] Actual staged image_evidence files were inspected using all-source contact sheets and a focused candidate-pair sheet before duplicate classification.
- [Both] STATdx does not fully cover the RadPrimer image set by exact duplicates. The closest STATdx matches are near duplicates or conceptual replacements, not same-slice or same-screenshot images.
- [RadPrimer] RadPrimer images 1-10 remain selected primary images because RadPrimer is the canonical hierarchy/backbone and each image teaches a distinct or cluster-dependent point.
- [STATdx] STATdx images 1-48 remain selected primary supplemental images as recognition reinforcement, modality variants, complication examples, or preserved same-patient clusters.
- [Both] No images are archived by default because no exact duplicate, same-slice/same-screenshot copy, or unusable image was identified.

PRIMARY IMAGE APPENDIX
{chr(10).join(appendix)}

ARCHIVED DUPLICATE IMAGE NOTES
- [Both] None. No exact duplicate or unusable image was identified after reviewing the staged image_evidence files.

GENERATOR NOTES
- Use RadPrimer hierarchy/deck routing exactly as supplied in metadata.json.
- Use source labels in later prose when a detail is source-specific.
- Use clean image labels such as RadPrimer image 5 or STATdx image 4 in narrative-facing text; keep short IDs only in traceability metadata.
- Download only selectedPrimaryImageIds by default using sourceSelectionPlan.imageDownloadPlan.
- Preserve same-patient and same-procedure clusters; do not split them unless a later source explicitly documents a safe split.
- Do not generate cards or a lecture from this package yet.
"""

manifest = {
    "articleTitle": ARTICLE_TITLE,
    "createdAt": CREATED_AT,
    "canonicalHierarchy": canonical_hierarchy,
    "canonicalDeckPath": canonical_deck_path,
    "sourcePriority": ["RadPrimer", "STATdx"],
    "sourceCoverage": {
        "RadPrimer": {
            "role": "Canonical hierarchy/backbone, canonical deck routing, and primary Tuboovarian Abscess structure.",
            "keptText": [
                "terminology separating PID, pyosalpinx, TOC, and TOA",
                "ultrasound-first recognition features including cogwheel, incomplete septa, pyosalpinx, hyperemia, TOA, endometritis, and complex pelvic fluid",
                "CT/MR role for diffuse symptoms, extensive disease, equivocal ultrasound, and full extent assessment",
                "differential diagnosis, pathology, clinical issues, treatment, and diagnostic checklist",
            ],
            "limitations": ["STATdx supplies broader PID-spectrum complication and MR/DWI depth.", "No Core Radiology source text was supplied in the bundle."],
        },
        "STATdx": {
            "role": "Supplemental depth for PID-spectrum imaging, complications, differentials, management, and image-recognition reinforcement.",
            "keptText": [
                "expanded CT/MR/DWI feature detail and sensitivity/specificity notes",
                "Fitz-Hugh-Curtis syndrome and upper abdominal spread imaging",
                "secondary pelvic infection examples including diverticulitis",
                "drainage route and catheter-removal details",
                "large supplemental same-patient image clusters",
            ],
            "limitations": [
                "STATdx breadcrumb is not used for canonical hierarchy because RadPrimer is present.",
                "STATdx title is Pelvic Inflammatory Disease, so later output should stay centered on Tuboovarian Abscess while using PID-spectrum details when they support TOA recognition.",
            ],
        },
    },
    "imageCountBySource": {"RadPrimer": 10, "STATdx": 48},
    "sourceAttributionRules": {
        "default": "Tag factual blocks as [RadPrimer], [STATdx], or [Both] where source distinction matters.",
        "humanFacingImages": "Use labels like RadPrimer image 5 or STATdx image 4 in prose.",
        "traceability": "Use masterImageId values only in registry fields, filenames, import metadata, and traceability notes.",
    },
    "selectedPrimaryImageIds": selected_primary_ids,
    "archiveOptionalImageIds": archive_optional_ids,
    "sourceSelectionPlan": source_selection_plan,
}

report = f"""# Master Source Report: Tuboovarian Abscess

## Bundle
- Imported bundle: {BUNDLE}
- Sources compared: RadPrimer_source_package.txt, STATdx_source_package.txt, RadPrimer_metadata.json, STATdx_metadata.json, metadata.json, master_source_request.md, image_evidence_manifest.json, and staged image_evidence files.
- Canonical hierarchy copied exactly from metadata.json: {' > '.join(canonical_hierarchy)}
- Canonical deck path: {canonical_deck_path}

## Image Evidence Review
- Reviewed all 10 RadPrimer and 48 STATdx staged image files through contact sheets.
- Reviewed focused candidate pairs for closest overlaps: RP-03/SDX-02, RP-04/SDX-01, RP-04/SDX-05, RP-05/SDX-02, RP-06/SDX-17, RP-07/SDX-10, RP-08/SDX-41, RP-09/SDX-41, RP-10/SDX-16, and RP-10/SDX-30.
- No RadPrimer image had a matching STATdx stable source image ID, image hash, or same-slice/same-screenshot visual match.

## RadPrimer Image Coverage Gate
- STATdx fully covers RadPrimer image set: false.
- Exact duplicates: none.
- Near duplicates retained as primary: RP-03, RP-04, RP-05, RP-08, RP-09 have same-pattern STATdx reinforcement but distinct visual content.
- Conceptual replacements retained as primary: RP-01, RP-02, RP-06, RP-07, RP-10 have STATdx conceptual/modality reinforcement but distinct visual content.
- Not covered: none in the sense of teaching concept, but no image is exactly covered.

## Image Selection
- Selected primary images: {len(selected_primary_ids)} ({', '.join(selected_primary_ids)})
- Archive-optional images: none.
- Rationale: archive only exact duplicates or unusable images by default. Since all images are visually distinct and usable, all remain selected for recognition reinforcement or cluster preservation.

## Case Cluster Handling
- Preserved RadPrimer clusters: images 3-4, images 5-6, images 9-10.
- Preserved STATdx clusters: images 7-8, 9-10, 11-14, 15-16, 17-22, 23-26, 27-28, 29-30, 31-32, 33-34, 35-40, and 41-46.
- No source case cluster was intentionally split.

## Outputs Written
- master_source_package.txt
- master_source_manifest.json
- image_registry.json
- master_source_import.json
- master_source_report.md
- _codex_master_source_done.txt
"""

import_obj = {
    "version": 1,
    "articleTitle": ARTICLE_TITLE,
    "createdAt": CREATED_AT,
    "packageText": package_text,
    "manifest": manifest,
    "imageRegistry": image_registry,
    "sourceSelectionPlan": source_selection_plan,
    "selectedPrimaryImageIds": selected_primary_ids,
    "archiveOptionalImageIds": archive_optional_ids,
}

(BUNDLE / "master_source_package.txt").write_text(package_text, encoding="utf-8", newline="\n")
(BUNDLE / "master_source_manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8", newline="\n")
(BUNDLE / "image_registry.json").write_text(json.dumps(image_registry, ensure_ascii=False, indent=2), encoding="utf-8", newline="\n")
(BUNDLE / "master_source_import.json").write_text(json.dumps(import_obj, ensure_ascii=False, indent=2), encoding="utf-8", newline="\n")
(BUNDLE / "master_source_report.md").write_text(report, encoding="utf-8", newline="\n")
(BUNDLE / "_codex_master_source_done.txt").write_text(
    f"DONE\ncreatedAt={CREATED_AT}\narticleTitle={ARTICLE_TITLE}\nselectedPrimaryImageIds={len(selected_primary_ids)}\narchiveOptionalImageIds=0\n",
    encoding="utf-8",
    newline="\n",
)

print(BUNDLE)
print(len(image_registry), len(selected_primary_ids), len(archive_optional_ids))
