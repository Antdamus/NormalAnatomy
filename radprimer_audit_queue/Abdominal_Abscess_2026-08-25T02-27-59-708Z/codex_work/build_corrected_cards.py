import csv
from pathlib import Path


BUNDLE = Path(__file__).resolve().parents[1]
ROWS_PATH = BUNDLE / "generated_cards.tsv"

with ROWS_PATH.open("r", encoding="utf-8", newline="") as f:
    rows = list(csv.reader(f, delimiter="\t"))

if any(len(row) != 22 for row in rows):
    raise SystemExit("Input TSV does not have 22 columns on every row.")

summary = rows[0][20]

image_answer_replacements = {
    1: "Abdominal abscess<br><br>Key findings:<br>rounded complex fluid collection<br>gas bubbles<br>enhancing capsule<br><br>Why this is the answer: A discrete rim-enhancing postoperative collection with internal gas is the classic CT pattern of abdominal abscess. Source basis: RadPrimer image 1; Core + RadPrimer + STATdx synthesis.<br><br>Differential: postoperative seroma, hematoma, cystic or necrotic neoplasm.",
    2: "Multiple abdominal abscesses<br><br>Key findings:<br>multiple loculated fluid collections<br>prominently enhancing capsules<br>mass effect on adjacent structures<br>air-fluid level<br><br>Why this is the answer: Multiple encapsulated rim-enhancing postoperative collections with an air-fluid level favor drainable abscesses rather than phlegmon or sterile fluid. Source basis: RadPrimer image 2; Core + RadPrimer + STATdx synthesis.<br><br>Differential: postoperative seroma, hematoma, loculated ascites.",
    3: "Pelvic abscess<br><br>Key findings:<br>large pelvic collection<br>discrete enhancing rim<br>mass effect on adjacent bowel and bladder<br>post-hysterectomy context<br><br>Why this is the answer: A postoperative pelvic collection with a mature enhancing rim and mass effect is a source-supported abscess pattern. Source basis: RadPrimer image 3.<br><br>Differential: postoperative seroma, lymphocele, hematoma.",
    4: "Drained pelvic abscess<br><br>Key findings:<br>percutaneous drainage catheter<br>transgluteal approach<br>near resolution of the collection<br><br>Why this is the answer: The catheter position and interval near-resolution identify a treated abscess and preserve the procedure/follow-up teaching point. Source basis: RadPrimer image 4.<br><br>Differential: residual abscess cavity, sterile postoperative collection, recurrent collection.",
    5: "Enteric perforation with pneumoperitoneum<br><br>Key findings:<br>extensive free intraperitoneal gas<br>lower abdominal pain<br>fever and tenderness<br><br>Why this is the answer: In this same-patient RadPrimer cluster, free intraperitoneal gas is the clue to perforation; the companion image localizes the diverticular abscess source. Source basis: RadPrimer image 5.<br><br>Differential: recent postoperative gas, bowel perforation from another cause, gas-forming infection.",
    6: "Diverticular abscess from perforated diverticulitis<br><br>Key findings:<br>loculated abscess adjacent to sigmoid colon<br>extensive diverticulosis<br>source of free air<br><br>Why this is the answer: A loculated collection directly adjacent to diverticular sigmoid colon explains the same-patient pneumoperitoneum and supports perforated diverticulitis with abscess. Source basis: RadPrimer image 6; Core supports diverticulitis complicated by abscess and possible drainage.<br><br>Differential: colon cancer with contained perforation, phlegmon, postoperative collection.",
    7: "Duodenal perforation with retroperitoneal infected gas/fluid collection<br><br>Key findings:<br>post-ERCP context<br>large gas-fluid collection<br>spread through anterior pararenal and interfascial retroperitoneal planes<br><br>Why this is the answer: Procedure-related duodenal perforation can seed retroperitoneal gas and fluid; the compartmental distribution is the discriminator. Source basis: RadPrimer image 7.<br><br>Differential: isolated postprocedural gas, retroperitoneal hematoma, pancreatitis-related infected collection.",
    8: "Gastrointestinal stromal tumor (GIST) mimicking abscess<br><br>Key findings:<br>large cystic mass<br>internal complexity<br>unsuccessful drainage<br>ultimately GIST<br><br>Why this is the answer: The teaching point is a cystic/necrotic neoplasm mimic: failure of presumed abscess drainage should prompt reconsideration of tumor. Source basis: RadPrimer image 8.<br><br>Differential: abdominal abscess, hematoma, pancreatic pseudocyst or other cystic mass.",
    9: "Tuboovarian abscess<br><br>Key findings:<br>complex cystic right adnexal mass<br>internal septations<br>higher echogenicity/debris<br>PID context<br><br>Why this is the answer: A complex adnexal collection with internal septations/debris in a PID context supports tuboovarian abscess. Source basis: RadPrimer image 9 and STATdx tuboovarian US/CT reinforcement.<br><br>Differential: hemorrhagic ovarian cyst, endometrioma, cystic ovarian neoplasm (model-inferred differential; not explicitly listed in source package).",
    10: "Right psoas abscess<br><br>Key findings:<br>rim-enhancing right psoas collection on contrast MRI<br>surrounding phlegmonous enhancement<br>Crohn disease context<br><br>Why this is the answer: A rim-enhancing intramuscular collection with surrounding inflammatory change is a psoas abscess; Core supports Crohn disease complicated by abscess/fistula. Source basis: RadPrimer image 10.<br><br>Differential: hematoma, necrotic neoplasm, phlegmon without drainable cavity.",
    11: "Appendiceal abscess from perforated appendicitis<br><br>Key findings:<br>right lower quadrant loculated rim-enhancing collection<br>surrounding soft-tissue edema<br>appendix partly visualized in the collection<br><br>Why this is the answer: The appendix within the abscess localizes the source to perforated appendicitis. Source basis: STATdx image 1; Core supports appendicitis progressing to abscess.<br><br>Differential: Crohn-related abscess, diverticular abscess, postoperative collection.",
    12: "Drained appendiceal abscess<br><br>Key findings:<br>percutaneous catheter in collection<br>decreased abscess size after drainage<br><br>Why this is the answer: This follow-up image tests successful catheter drainage of an appendiceal abscess. Source basis: STATdx image 2.<br><br>Differential: residual cavity, recurrent abscess, sterile postoperative collection.",
    13: "Peridiverticular abscess<br><br>Key findings:<br>thick-walled enhancing collection<br>abuts inflamed sigmoid colon<br>pelvic pain and fever<br><br>Why this is the answer: A rim-enhancing collection contiguous with inflamed sigmoid colon supports perforated diverticulitis with localized abscess. Source basis: STATdx image 3; Core supports diverticulitis complicated by abscess.<br><br>Differential: tuboovarian abscess, colon cancer with contained perforation, phlegmon.",
    14: "Gastrointestinal stromal tumor (GIST) mimicking abscess<br><br>Key findings:<br>peripherally enhancing fluid-like mass<br>abuts bowel<br>unsuccessful drainage<br>ultimately GIST<br><br>Why this is the answer: Same teaching concept as the RadPrimer mimic case but a distinct selected image: failed drainage of a presumed abscess should trigger tumor reconsideration. Source basis: STATdx image 4.<br><br>Differential: abdominal abscess, hematoma, cystic/necrotic neoplasm.",
    15: "Pelvic abscesses<br><br>Key findings:<br>thick-walled peripherally enhancing pelvic fluid collections on MRI<br>septic shock context<br><br>Why this is the answer: Multiple thick-walled enhancing pelvic collections in systemic infection support abscesses. Source basis: STATdx image 5.<br><br>Differential: postoperative seroma, hematoma, cystic neoplasm.",
    16: "Uterine rupture with pelvic abscesses<br><br>Key findings:<br>anterior collection contiguous with C-section scar<br>posterior collection between uterus and rectum<br><br>Why this is the answer: The sagittal MR image supplies the mechanism/source of the pelvic abscesses by showing contiguity with the C-section scar. Source basis: STATdx image 6.<br><br>Differential: postoperative seroma, hematoma, tuboovarian abscess.",
    17: "Perineal abscess from urethral perforation<br><br>Key findings:<br>large rim-enhancing perineal collection<br>traumatic Foley/urethral perforation context<br><br>Why this is the answer: A rim-enhancing perineal collection in the setting of urethral perforation localizes the source. Source basis: STATdx image 7.<br><br>Differential: hematoma, urinoma, necrotic tumor.",
    18: "Gas-forming lesser-sac abscess from necrotizing pancreatitis<br><br>Key findings:<br>large loculated lesser-sac collection<br>rim enhancement<br>internal gas<br>necrotizing pancreatitis context<br><br>Why this is the answer: An infected necrotizing pancreatitis collection can form a gas-containing abscess-like lesser-sac collection. Source basis: STATdx image 8; Core supports pancreatitis-related infected collections and gas as an infection clue.<br><br>Differential: pancreatic pseudocyst, walled-off necrosis, hematoma.",
    19: "Tuboovarian abscess<br><br>Key findings:<br>complex cystic adnexal mass on color Doppler US<br>little internal vascularity<br>pelvic pain and fever<br><br>Why this is the answer: The US shows a complex avascular center with inflammatory clinical context, matching the source-supported TOA pattern. Source basis: STATdx image 9.<br><br>Differential: hemorrhagic ovarian cyst, endometrioma, cystic ovarian neoplasm (model-inferred differential; not explicitly listed in source package).",
    20: "Tuboovarian abscess on CT correlation<br><br>Key findings:<br>large rim-enhancing collection<br>surrounding fat stranding<br>same patient as complex US mass<br><br>Why this is the answer: CT confirms the same TOA collection but shows less internal complexity than ultrasound, a source-stated multimodality teaching point. Source basis: STATdx image 10.<br><br>Differential: pelvic abscess from bowel source, ovarian neoplasm, hematoma.",
    21: "Pelvic abscess with internal gas<br><br>Key findings:<br>ectopic gas bubbles within a pelvic abscess<br>same postoperative patient family as multiple abscesses<br><br>Why this is the answer: Gas within a collection supports abscess when not explained by recent intervention or bowel communication; this image is adjacent/same-patient reinforcement. Source basis: STATdx image 12.<br><br>Differential: postoperative gas in sterile collection, bowel fistula, Surgicel mimic.",
    22: "Gas-forming retrocecal abscess from perforated diverticulum<br><br>Key findings:<br>ectopic gas posterior to cecum<br>cecal thickening<br>adjacent fat stranding<br><br>Why this is the answer: Gas plus adjacent colonic wall thickening and inflammation supports a perforation-related retrocecal abscess. Source basis: STATdx image 13.<br><br>Differential: perforated appendicitis, colonic malignancy with perforation, phlegmon.",
    23: "Postoperative abdominal abscess on ultrasound<br><br>Key findings:<br>hypoechoic collection<br>fluid-fluid level<br>postoperative context<br><br>Why this is the answer: A complex postoperative US collection with a fluid-fluid level can represent abscess; CT/clinical correlation may be needed when sterile fluid overlaps. Source basis: STATdx image 14.<br><br>Differential: seroma, hematoma, lymphocele.",
    24: "Intramural sigmoid abscess from diverticulitis<br><br>Key findings:<br>long segment markedly thickened sigmoid<br>adjacent/ill-defined fluid collection<br><br>Why this is the answer: Complicated diverticulitis can produce intramural or adjacent abscess; this image emphasizes bowel-wall source identification. Source basis: STATdx image 15; Core supports diverticulitis complicated by abscess.<br><br>Differential: colon cancer, phlegmon, Crohn-related abscess.",
    25: "Multiple sigmoid-related abscesses<br><br>Key findings:<br>discrete abscess collections on a lower CT plane<br>same diverticulitis case family<br><br>Why this is the answer: The lower slice demonstrates more discrete drainable collections in the same sigmoid inflammatory process. Source basis: STATdx image 16.<br><br>Differential: phlegmon, postoperative collection, necrotic tumor.",
    26: "Multiple postoperative abdominal abscesses<br><br>Key findings:<br>multiple rim-enhancing collections<br>gas in the pelvic abscess<br>gas absent in other collections<br><br>Why this is the answer: This reinforces that gas helps but is not required: other rim-enhancing postoperative collections in the same patient are still abscesses. Source basis: STATdx image 18 and RadPrimer gas-frequency rule.<br><br>Differential: seroma, hematoma, lymphocele.",
    27: "Gas-forming pyogenic liver abscess<br><br>Key findings:<br>hepatic abscess cavity<br>air-fluid level<br>diabetic patient context<br><br>Why this is the answer: Internal gas/air-fluid level in a liver abscess is highly supportive of gas-forming infection, especially in diabetes. Source basis: STATdx image 19; Core supports hepatic abscess and diabetes/gas-forming context through source synthesis.<br><br>Differential: necrotic metastasis, biloma, infected cyst.",
    28: "Gas-containing liver abscess on ultrasound<br><br>Key findings:<br>linear high-amplitude echoes<br>dirty posterior acoustic shadowing<br>gas in liver abscess<br><br>Why this is the answer: Dirty shadowing from echogenic foci is the source-supported US clue to gas within an abscess. Source basis: STATdx image 20.<br><br>Differential: calcification, pneumobilia-related artifact, necrotic mass.",
    29: "Amebic liver abscess<br><br>Key findings:<br>hepatic abscess<br>peripheral low-attenuation edema zone on CT<br><br>Why this is the answer: This image tests intraparenchymal abscess with surrounding edema; the source identifies the organism category as amebic. Source basis: STATdx image 21.<br><br>Differential: pyogenic abscess, necrotic metastasis, infected cyst.",
    30: "Amebic liver abscess on ultrasound<br><br>Key findings:<br>hypoechoic hepatic mass<br>low-level echoes<br>lack of distal acoustic enhancement<br><br>Why this is the answer: Low-level internal echoes within a hepatic abscess support complex infected contents rather than a simple cyst. Source basis: STATdx image 22.<br><br>Differential: pyogenic abscess, complicated cyst, necrotic mass.",
    31: "Fungal microabscesses from systemic candidiasis<br><br>Key findings:<br>multiple target lesions on ultrasound<br>systemic candidiasis context<br><br>Why this is the answer: Multiple tiny target-like lesions match the source-stated fungal microabscess pattern, typically in immunocompromised patients. Source basis: STATdx image 23 and Core evidence.<br><br>Differential: metastases, pyogenic microabscesses, granulomatous infection (model-inferred differential; not explicitly listed in source package).",
    32: "Splenic abscess<br><br>Key findings:<br>splenic lesion/collection<br>low-level internal echoes<br>ultrasound appearance<br><br>Why this is the answer: Low-level echoes within a splenic collection support abscess in the source context; Core also supports splenic bacterial/fungal abscess patterns. Source basis: STATdx image 24 and Core evidence.<br><br>Differential: cyst, hematoma, necrotic metastasis.",
    33: "Appendiceal abscess from ruptured appendix<br><br>Key findings:<br>encapsulated right lower quadrant collection<br>peripheral rim enhancement<br>tubular appendix-like structure within collection<br><br>Why this is the answer: A tubular appendix within a rim-enhancing RLQ collection identifies ruptured appendicitis with abscess. Source basis: STATdx image 25; Core supports appendicitis progression to abscess.<br><br>Differential: Crohn-related abscess, diverticular abscess, tuboovarian abscess.",
    34: "Retained oxidized cellulose (Surgicel), not abscess<br><br>Key findings:<br>gas in cholecystectomy bed<br>very little fluid<br>surgical clips<br><br>Why this is the answer: Surgicel can mimic gas-forming abscess, but the key discriminator is gas with little fluid and no discrete drainable collection in the operative bed. Source basis: STATdx image 27.<br><br>Differential: abdominal abscess, seroma, biloma.",
}

for row_number, replacement in image_answer_replacements.items():
    rows[row_number - 1][4] = replacement

# Mechanism edits: keep only auditable Core/source claims or label source-derived clarification.
rows[42][11] = (
    "Source-supported link: the article describes central pus/infected fluid and a peripheral fibrocapillary capsule. "
    "Source-derived clarification: the capsule/peripheral inflammatory tissue enhances after contrast while the central fluid/pus remains nonenhancing, producing the rim-enhancing abscess pattern. "
    "This is why a mature, discrete enhancing wall supports abscess and helps separate it from ill-defined phlegmon."
)
rows[44][11] = (
    "Core evidence supports appendicitis progressing to gangrenous/perforated appendicitis with abscess, and the source images show periappendiceal abscess when the appendix lies within or adjacent to a rim-enhancing collection. "
    "Mechanism at the source-supported level: perforation releases infected material locally, which can become walled off as a periappendiceal abscess rather than free diffuse contamination."
)
rows[45][11] = (
    "Core evidence supports diverticulitis as a bowel process that can be complicated by abscess, and the source images show thick-walled collections abutting inflamed sigmoid colon. "
    "Mechanism at the source-supported level: contained perforation/local contamination from diseased diverticular colon can become walled off next to the bowel, producing a peridiverticular abscess."
)
rows[52][15] = (
    "Splenic fungal abscesses are typically small, multiple, and occur in immunocompromised patients.<br>"
    "Exam pivot: Multiple tiny splenic abscesses in an immunocompromised patient should raise fungal infection in the ranking."
)

# Split overloaded drainage framework into one-card retrieval targets.
rows[66][14] = "What source-supported imaging criteria make an abdominal abscess a good percutaneous drainage target?"
rows[66][15] = (
    "A well-defined, encapsulated, fluid-filled abscess, usually >3 cm, with a safe catheter access route.<br>"
    "Exam pivot: First prove there is a discrete drainable cavity; size alone is not enough."
)

def high_yield(context, q, a, uid):
    row = [""] * 22
    row[0] = f"{context} {uid}"
    row[14] = q
    row[15] = a
    row[20] = summary
    return row

def mechanism(entity, q, a, uid):
    row = [""] * 22
    row[0] = uid
    row[5] = entity
    row[10] = q
    row[11] = a
    row[20] = summary
    return row

additions = [
    high_yield(
        "Abdominal abscess drainage",
        "What patient-related coagulation limits can make percutaneous abdominal abscess drainage unsafe according to the source?",
        "Common source-stated limits include prothrombin time >3 seconds, INR >1.5, or platelets <50,000/uL, with institution-specific variation.<br>Exam pivot: Drainage planning must check bleeding risk as well as whether the collection is technically drainable.",
        "AUDITADD01",
    ),
    high_yield(
        "Abdominal abscess drainage",
        "What collection-related features are source-stated poor targets or contraindications for percutaneous abdominal abscess drainage?",
        "Poorly defined phlegmon/no discrete drainable cavity, no safe access route, infected necrosis, multiseptated abscess, superinfected necrotic tumor, echinococcal cyst, or gas-forming infection such as emphysematous pancreatitis.<br>Exam pivot: Do not equate every infected-appearing collection with a safe drainage target.",
        "AUDITADD02",
    ),
    high_yield(
        "Postoperative abdominal collection",
        "When imaging cannot confidently separate abscess from a sterile postoperative collection, what source-supported step prevents overcalling infection?",
        "Correlate with clinical symptoms/labs of infection and consider fluid aspiration when needed.<br>Exam pivot: Rim enhancement, gas, and complexity help, but postoperative collections can overlap; clinical or aspirated evidence may be required.",
        "AUDITADD03",
    ),
    high_yield(
        "Abdominal abscess ultrasound",
        "What source-stated ultrasound feature predicts more difficult abscess drainage?",
        "Increasing internal complexity, septations, debris, or thick/viscous contents can make drainage harder, especially with small-caliber catheters.<br>Exam pivot: Ultrasound complexity is not just diagnostic; it also affects procedural expectations.",
        "AUDITADD04",
    ),
    high_yield(
        "Abdominal abscess MRI",
        "What is the source-stated diffusion caveat for abdominal abscess?",
        "Abscesses often restrict diffusion with low ADC, but lack of restricted diffusion does not exclude abscess because ADC values can overlap with necrotic tumors and noninfected collections.<br>Exam pivot: Use DWI as supportive evidence, not an absolute rule-out test.",
        "AUDITADD05",
    ),
    high_yield(
        "Abdominal abscess differential",
        "How does loculated ascites differ from abdominal abscess in the source-supported differential?",
        "Loculated ascites is typically simple fluid with minimal mass effect, no peripheral enhancement, and no internal gas; it may appear complex on US/MR while remaining simple on CT.<br>Exam pivot: Rim enhancement, gas, mass effect, and clinical infection shift toward abscess.",
        "AUDITADD06",
    ),
    high_yield(
        "Abdominal abscess differential",
        "How does pancreatic pseudocyst differ from abdominal abscess in the source-supported differential?",
        "Pancreatic pseudocyst requires pancreatitis context and usually develops a peripheral pseudocapsule over several weeks; it often localizes to the pancreas, lesser sac, anterior pararenal space, or transverse mesocolon.<br>Exam pivot: Pancreatitis timing/location favors pseudocyst, while internal gas or infected inflammatory context favors abscess.",
        "AUDITADD07",
    ),
    high_yield(
        "Abdominal abscess differential",
        "How does acute hematoma differ from abdominal abscess on source-supported imaging?",
        "Hematoma attenuation varies with blood age; acute clot is typically high attenuation (>45 HU) and gradually decreases over time. It may show weak peripheral enhancement as it evolves without necessarily being infected.<br>Exam pivot: Blood-product attenuation/evolution favors hematoma; a rim-enhancing infected clinical context favors abscess.",
        "AUDITADD08",
    ),
    mechanism(
        "Abscess versus phlegmon",
        "Why does the abscess-versus-phlegmon distinction matter for management?",
        "The source reserves 'abscess' for a discrete, drainable fluid collection. Phlegmon is ill-defined inflammatory tissue or nondrainable fluid, so labeling phlegmon as abscess can imply a catheter target that does not actually exist. Management pivot: describe whether there is a mature encapsulated collection and whether a safe drainage route is present.",
        "AUDITADD09",
    ),
]

rows.extend(additions)

out = BUNDLE / "corrected_cards.tsv"
with out.open("w", encoding="utf-8", newline="") as f:
    writer = csv.writer(f, delimiter="\t", lineterminator="\n")
    writer.writerows(rows)

anki = BUNDLE / "corrected_cards_anki_import.tsv"
headers = [
    "#separator:tab",
    "#html:true",
    "#notetype:core_rad_notetype_v2",
    "#deck:Corebook::GI::Peritoneum, Mesentery, and Abdominal Wall::Abdominal Abscess",
]
anki.write_text("\n".join(headers) + "\n" + out.read_text(encoding="utf-8"), encoding="utf-8")

report = f"""# RadPrimer Card Audit Report: Abdominal Abscess

## Bundle
- Imported bundle: {BUNDLE}
- Compared: source_package.txt, generated_cards.tsv, metadata.json, audit_instructions.md, and core_evidence.txt.
- Core evidence status: USED. Core-specific cards were retained only when supported by core_evidence.txt or the fused source package.

## Summary
- Input TSV: {len(rows) - len(additions)} rows, 22 columns.
- Corrected TSV: {len(rows)} rows, 22 columns.
- Anki import file written because metadata.json specifies note type core_rad_notetype_v2 and deck Corebook::GI::Peritoneum, Mesentery, and Abdominal Wall::Abdominal Abscess.

## Major Corrections
- Preserved all 34 selected primary image cards and kept the selected image set aligned with metadata.masterImageIds.
- Rewrote the 34 image-card diagnosis backs to replace generic boilerplate with source-specific discriminators and concise differentials.
- Revised mechanism cards for appendicitis and diverticulitis to remove unsupported detailed pathophysiology and keep only source-supported contained-perforation/localization framing.
- Labeled the rim-enhancement explanation as source-derived clarification from the source-described fibrocapillary capsule.
- Corrected splenic fungal abscess wording from "almost all" to the supported "typically small, multiple, and immunocompromised."
- Split the overloaded drainage-framework card into separate cards for good drainage target criteria, patient coagulopathy limits, and collection-related poor targets/contraindications.
- Added missing source-supported high-yield cards covering postoperative correlation/aspiration, ultrasound complexity and drainage difficulty, DWI caveat, loculated ascites, pancreatic pseudocyst, hematoma, and abscess-versus-phlegmon management impact.

## Removed Cards
- No full rows were removed. I did not find prompt-metadata or bookkeeping cards in the generated TSV; the repeated summary field is part of the note type and was preserved.

## Remaining Notes
- Some Differential Drill cards retain explicitly labeled model-inferred differentials where the source package did not list a complete image-specific differential. These labels were left visible rather than silently presenting them as Core/RadPrimer/STATdx facts.
- No cards or claims were added from unaudited Core material beyond core_evidence.txt and the fused source_package.txt.
"""
(BUNDLE / "audit_report.md").write_text(report, encoding="utf-8")

(BUNDLE / "_codex_audit_done.txt").write_text(
    "done\n"
    f"correctedRows={len(rows)}\n"
    "columns=22\n"
    "ankiImport=corrected_cards_anki_import.tsv\n"
    "deck=Corebook::GI::Peritoneum, Mesentery, and Abdominal Wall::Abdominal Abscess\n",
    encoding="utf-8",
)

print(f"wrote {len(rows)} rows")
