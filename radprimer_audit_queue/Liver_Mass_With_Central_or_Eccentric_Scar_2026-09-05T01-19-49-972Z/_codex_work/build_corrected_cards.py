import csv
import json
from pathlib import Path


BUNDLE = Path(__file__).resolve().parents[1]
GENERATED = BUNDLE / "generated_cards.tsv"
CORRECTED = BUNDLE / "corrected_cards.tsv"
ANKI_IMPORT = BUNDLE / "corrected_cards_anki_import.tsv"
REPORT = BUNDLE / "audit_report.md"
DONE = BUNDLE / "_codex_audit_done.txt"
METADATA = BUNDLE / "metadata.json"

FIELD_COUNT = 22


def read_rows(path):
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.reader(handle, delimiter="\t"))


def write_rows(path, rows):
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle, delimiter="\t", lineterminator="\n", quoting=csv.QUOTE_MINIMAL)
        writer.writerows(rows)


def blank_row(context):
    row = [""] * FIELD_COUNT
    row[0] = context
    row[20] = SUMMARY
    return row


def high_yield(context, question, answer):
    row = blank_row(context)
    row[14] = question
    row[15] = answer
    return row


def mechanism(context, question, answer):
    row = blank_row(context)
    row[10] = question
    row[11] = answer
    return row


def trap(context, question, answer):
    row = blank_row(context)
    row[12] = question
    row[13] = answer
    return row


SOURCE = "Source: RadPrimer, Liver Mass With Central or Eccentric Scar."

SUMMARY = (
    '<div><b>&#x1F9ED; Liver Mass With Central or Eccentric Scar</b></div><br>'
    '<b>Source Basis:</b> RadPrimer-only.<br>'
    '<div><b>&#x1F50D; Key Imaging Findings</b></div>'
    '<ul>'
    '<li>First decide whether the central/eccentric low-signal or low-density region is a true scar versus necrosis, fibrosis, fat, or hemorrhage.</li>'
    '<li>FNH: larger lesions usually have a small central scar with possible thin radiating septa; the mass enhances homogeneously in arterial phase and becomes isodense/isointense to liver on other phases.</li>'
    '<li>FNH scar: T2 bright with delayed persistent enhancement on CT or intravascular MR contrast; it does not take up/retain gadoxetate in the illustrated delayed hepatobiliary image.</li>'
    '<li>Giant hemangioma: lesions >5 cm commonly have a fibrotic nonenhancing scar that may calcify, while nonscarred portions show typical nodular enhancement.</li>'
    '<li>HCC: large heterogeneous hypervascular mass with washout, central necrosis/scar, and rarely calcified scar; vascular invasion and metastases are common.</li>'
    '<li>Adenoma: apparent scar-like low-density foci may be fat, necrosis, or old hemorrhage rather than true scar; chemical-shift signal drop supports fat.</li>'
    '<li>Metastases: target appearance and central necrosis/fibrosis can mimic scar; mucinous colon or ovarian metastases may calcify.</li>'
    '<li>Fibrolamellar HCC: large heterogeneous mass on all phases; central scar is large and often calcified, and aggressive findings are present in more than 60% at presentation.</li>'
    '<li>Cholangiocarcinoma: focal necrosis/fibrosis can mimic scar; extensive fibrous stroma produces delayed persistent enhancement with capsular retraction, volume loss, biliary obstruction, or portal venous obstruction.</li>'
    '<li>Epithelioid hemangioendothelioma: multiple coalescent peripheral nodules with target/lollipop appearance on CECT or MR and capsular retraction.</li>'
    '<li>Nodular regenerative hyperplasia: large regenerative nodules may have central scars; they are usually multiple, usually &lt;4 cm, and usually occur in Budd-Chiari syndrome.</li>'
    '</ul>'
    '<div><b>&#x2B50; Super Summary</b></div>'
    '<ul>'
    '<li>Central scar plus homogeneous arterial enhancement favors FNH.</li>'
    '<li>Central scar plus peripheral nodular enhancement favors giant hemangioma.</li>'
    '<li>Large calcified scar in a heterogeneous mass favors fibrolamellar HCC or giant hemangioma; use enhancement pattern and aggressive findings to separate them.</li>'
    '<li>Delayed fibrous enhancement with capsular retraction or biliary/portal obstruction favors cholangiocarcinoma.</li>'
    '<li>Multiplicity pushes toward metastases, epithelioid hemangioendothelioma, or regenerative nodules when the morphology fits.</li>'
    '</ul>'
)


rows = read_rows(GENERATED)
if any(len(row) != FIELD_COUNT for row in rows):
    bad = [(idx + 1, len(row)) for idx, row in enumerate(rows) if len(row) != FIELD_COUNT]
    raise SystemExit(f"Generated TSV has invalid column counts: {bad[:10]}")

corrected = []

# Keep the 14 image-recognition cases, preserving image fields and verbatim captions.
unknowns = [row[:] for row in rows[:14]]
for row in unknowns:
    row[20] = SUMMARY

unknown_updates = {
    0: {
        "mld": "<b>Giant hepatic cavernous hemangioma</b><br><b>Caption-derived KEYWORD FINDINGS:</b> large mass; peripheral nodular enhancement; central scar; small focus of calcification; progressive nodular enhancement<br><b>Reasoning:</b> Peripheral nodular enhancement isodense to vessels, progressive nodular enhancement across phases, very bright T2 signal, and a central nonenhancing/calcified scar match the RadPrimer giant hemangioma pattern.",
        "diff": "Focal nodular hyperplasia<br>Fibrolamellar HCC<br>Hepatocellular carcinoma",
        "imdiff": "Key differentiators: Hemangioma is favored by peripheral nodular enhancement isodense to vessels with progressive fill-in and very bright T2 signal. FNH is favored by homogeneous arterial enhancement with delayed scar behavior. Fibrolamellar HCC is favored by a large heterogeneous mass with a large, often calcified scar and aggressive findings. Imaging specificity: Strongly suggestive when the full multiphase hemangioma pattern is present.<br>Image references: Liver_Mass_With_Central_or_Eccentric_Scar3<br>Liver_Mass_With_Central_or_Eccentric_Scar4<br>Reference: RadPrimer - Liver Mass With Central or Eccentric Scar."
    },
    1: {
        "mld": "<b>Hepatic metastases</b><br><b>Caption-derived KEYWORD FINDINGS:</b> older patient with colon cancer; multiple lesions; faint central calcification; central low-density necrosis or fibrosis<br><b>Reasoning:</b> Multiplicity plus central necrosis/fibrosis and faint calcification in a patient with colon cancer fits the RadPrimer metastatic pattern; the article notes that mucinous carcinoma metastases such as colon can calcify.",
        "diff": "Epithelioid hemangioendothelioma<br>Nodular regenerative hyperplasia<br>Multifocal hepatocellular carcinoma",
        "imdiff": "Key differentiators: Multiple lesions with target/necrotic morphology favor metastases, especially with a compatible primary malignancy. Epithelioid hemangioendothelioma is suggested by peripheral coalescent target/lollipop nodules and capsular retraction. Nodular regenerative hyperplasia is suggested by multiple small regenerative nodules in Budd-Chiari syndrome. Imaging specificity: Requires clinical primary-tumor correlation.<br>Image references: Liver_Mass_With_Central_or_Eccentric_Scar9<br>Liver_Mass_With_Central_or_Eccentric_Scar10<br>Reference: RadPrimer - Liver Mass With Central or Eccentric Scar."
    },
    2: {
        "mld": "<b>Mass-forming intrahepatic cholangiocarcinoma</b><br><b>Caption-derived KEYWORD FINDINGS:</b> large hepatic mass; foci of scar or necrosis; capsular retraction; portal vein occlusion; bile duct occlusion; progressive enhancement<br><b>Reasoning:</b> Delayed/progressive enhancement due to fibrotic change plus capsular retraction and biliary/portal obstruction matches the RadPrimer cholangiocarcinoma pattern.",
        "diff": "Fibrolamellar HCC<br>Epithelioid hemangioendothelioma<br>Hepatic metastases",
        "imdiff": "Key differentiators: Cholangiocarcinoma is favored by delayed persistent fibrous enhancement plus capsular retraction, hepatic volume loss, biliary obstruction, or portal venous obstruction. Epithelioid hemangioendothelioma is usually multiple and peripheral/subcapsular. Metastases are often multiple and target/necrotic. Imaging specificity: Strongly suggestive.<br>Image references: Liver_Mass_With_Central_or_Eccentric_Scar13<br>Liver_Mass_With_Central_or_Eccentric_Scar14<br>Reference: RadPrimer - Liver Mass With Central or Eccentric Scar."
    },
    3: {
        "mld": "<b>Hepatic epithelioid hemangioendothelioma</b><br><b>Caption-derived KEYWORD FINDINGS:</b> young woman; multiple peripheral hypovascular lesions; target appearance; capsular retraction; peripheral and confluent masses; central necrosis or scar<br><b>Reasoning:</b> Multiple peripheral/subcapsular nodules that become confluent, show target morphology, and retract the capsule match the RadPrimer epithelioid hemangioendothelioma pattern.",
        "diff": "Hepatic metastases<br>Mass-forming cholangiocarcinoma<br>Nodular regenerative hyperplasia",
        "imdiff": "Key differentiators: Multiple peripheral/subcapsular coalescent nodules with target or lollipop appearance and capsular retraction favor epithelioid hemangioendothelioma. Metastases can be multiple and target-like but need a compatible primary and do not specifically explain the peripheral coalescent/lollipop pattern. Cholangiocarcinoma is more often solitary and fibrotic/obstructive. Imaging specificity: Strongly suggestive.<br>Image references: Liver_Mass_With_Central_or_Eccentric_Scar15<br>Liver_Mass_With_Central_or_Eccentric_Scar16<br>Reference: RadPrimer - Liver Mass With Central or Eccentric Scar."
    },
    4: {
        "mld": "<b>Nodular regenerative hyperplasia / large regenerative nodules</b><br><b>Caption-derived KEYWORD FINDINGS:</b> hypercoagulable patient; multiple hypervascular foci; hypointense rim or central scar; delayed gadobenate retention; functioning hepatocytes with deficient biliary ducts<br><b>Reasoning:</b> Multiple hypervascular nodules with delayed gadobenate retention indicating functional hepatocytes fit the RadPrimer regenerative nodule/NRH examples rather than nonhepatocellular metastases.",
        "diff": "Focal nodular hyperplasia<br>Hepatocellular carcinoma<br>Hepatic metastases",
        "imdiff": "Key differentiators: Multiplicity and delayed gadobenate retention favor hepatocellular/regenerative nodules. The article ties the multiacinar NRH form to multiple nodules that are usually &lt;4 cm and usually occur in Budd-Chiari syndrome. HCC remains a concern when there is vascular invasion, washout, or metastases. Imaging specificity: Requires vascular/hepatic clinical correlation.<br>Image references: Liver_Mass_With_Central_or_Eccentric_Scar17<br>Liver_Mass_With_Central_or_Eccentric_Scar18<br>Reference: RadPrimer - Liver Mass With Central or Eccentric Scar."
    },
    5: {
        "mld": "<b>Nodular regenerative hyperplasia / large regenerative nodules</b><br><b>Caption-derived KEYWORD FINDINGS:</b> Budd-Chiari syndrome; multiple hypervascular nodules; central scar; doughnut-like enhancement; TIPS<br><b>Reasoning:</b> Multiple large regenerative nodules with central scars and doughnut-like enhancement in Budd-Chiari syndrome match the RadPrimer NRH pattern.",
        "diff": "Focal nodular hyperplasia<br>Hepatocellular carcinoma<br>Hepatic metastases",
        "imdiff": "Key differentiators: Multiple regenerative nodules in Budd-Chiari syndrome favor NRH over usually solitary FNH and fibrolamellar HCC. HCC is favored by vascular invasion/metastases and classic hypervascular washout behavior. Imaging specificity: Requires vascular/hepatic clinical correlation.<br>Image references: Liver_Mass_With_Central_or_Eccentric_Scar19<br>Liver_Mass_With_Central_or_Eccentric_Scar20<br>Reference: RadPrimer - Liver Mass With Central or Eccentric Scar."
    },
    6: {
        "mld": "<b>Focal nodular hyperplasia</b><br><b>Caption-derived KEYWORD FINDINGS:</b> homogeneously and brightly enhancing mass; central scar; isodense to liver on portal venous phase<br><b>Reasoning:</b> Homogeneous bright arterial enhancement with return to liver attenuation on portal venous phase and a central scar is the RadPrimer FNH pattern.",
        "diff": "Fibrolamellar HCC<br>Giant hepatic cavernous hemangioma<br>Hepatic adenoma",
        "imdiff": "Key differentiators: FNH is favored by homogeneous arterial enhancement and isodensity/isointensity to liver on other phases. Hemangioma is favored by peripheral nodular vascular enhancement. Adenoma may be heterogeneous from fat, necrosis, or old hemorrhage. Fibrolamellar HCC is favored by a large heterogeneous mass with a large often calcified scar and aggressive findings. Imaging specificity: Strongly suggestive.<br>Image references: Liver_Mass_With_Central_or_Eccentric_Scar1<br>Reference: RadPrimer - Liver Mass With Central or Eccentric Scar."
    },
    7: {
        "mld": "<b>Focal nodular hyperplasia</b><br><b>Caption-derived KEYWORD FINDINGS:</b> 20-minute delayed T1 MR; mass retains gadoxetate more than liver; central scar does not take up or retain gadoxetate<br><b>Reasoning:</b> Delayed gadoxetate retention in the lesion with non-retention in the central scar is the illustrated RadPrimer FNH pattern and helps separate FNH from adenoma.",
        "diff": "Hepatic adenoma<br>Fibrolamellar HCC<br>Hepatic metastases",
        "imdiff": "Key differentiators: FNH is supported by hepatobiliary-agent retention in the mass with no gadoxetate uptake/retention in the scar. Adenoma can show fat, necrosis, or old hemorrhage and is best separated from FNH with Eovist-enhanced MR according to the article. Metastases are often multiple and target/necrotic rather than hepatobiliary-retaining. Imaging specificity: Strongly suggestive.<br>Image references: Liver_Mass_With_Central_or_Eccentric_Scar2<br>Reference: RadPrimer - Liver Mass With Central or Eccentric Scar."
    },
    8: {
        "mld": "<b>Conventional hepatocellular carcinoma</b><br><b>Caption-derived KEYWORD FINDINGS:</b> older woman; large heterogeneous hypervascular mass; necrosis; mottled/mosaic appearance; absent calcification<br><b>Reasoning:</b> A large heterogeneous hypervascular mass with necrosis and mosaic appearance fits HCC; the caption states that older age and absent calcification favored conventional HCC over fibrolamellar HCC in this case.",
        "diff": "Fibrolamellar HCC<br>Hepatic adenoma<br>Focal nodular hyperplasia",
        "imdiff": "Key differentiators: Conventional HCC is supported by a heterogeneous hypervascular mass with washout, central necrosis/scar, vascular invasion, or metastases. Fibrolamellar HCC is favored by a younger patient with a large heterogeneous mass and a large often calcified scar. FNH is typically homogeneous outside the scar. Imaging specificity: Strongly suggestive; biopsy/clinical context may be needed in overlap cases.<br>Image references: Liver_Mass_With_Central_or_Eccentric_Scar5<br>Reference: RadPrimer - Liver Mass With Central or Eccentric Scar."
    },
    9: {
        "mld": "<b>Hepatocellular carcinoma</b><br><b>Caption-derived KEYWORD FINDINGS:</b> large mass; eccentric scar or necrotic area; portal vein tumor invasion<br><b>Reasoning:</b> Portal-vein invasion is a key RadPrimer discriminator for HCC in a scar-like hypervascular liver mass.",
        "diff": "Fibrolamellar HCC<br>Mass-forming cholangiocarcinoma<br>Hepatic metastases",
        "imdiff": "Key differentiators: HCC is favored by vascular invasion, metastases, and a heterogeneous hypervascular mass with washout. Cholangiocarcinoma is favored by delayed fibrous enhancement with capsular retraction, volume loss, biliary obstruction, or portal venous obstruction. Fibrolamellar HCC is favored by young age and a large often calcified scar. Imaging specificity: Strongly suggestive when tumor-in-vein is present.<br>Image references: Liver_Mass_With_Central_or_Eccentric_Scar6<br>Reference: RadPrimer - Liver Mass With Central or Eccentric Scar."
    },
    10: {
        "mld": "<b>Hepatic adenoma</b><br><b>Caption-derived KEYWORD FINDINGS:</b> heterogeneous mass; high attenuation hemorrhage; lower-density necrosis and fibrosis<br><b>Reasoning:</b> The article emphasizes that adenoma may contain fat, necrosis, or old hemorrhage rather than a true scar; this case shows hemorrhage with low-density necrosis/fibrosis.",
        "diff": "Hepatocellular carcinoma<br>Focal nodular hyperplasia<br>Hepatic metastases",
        "imdiff": "Key differentiators: Adenoma can be heterogeneous from fat, necrosis, or old hemorrhage and may mimic a scar-bearing mass without having a true scar. FNH is typically homogeneous and is best separated from adenoma with Eovist-enhanced MR. HCC can also be heterogeneous/necrotic, so clinical risk factors and multiphase behavior matter. Imaging specificity: Requires correlation when hemorrhage/necrosis dominates.<br>Image references: Liver_Mass_With_Central_or_Eccentric_Scar7<br>Reference: RadPrimer - Liver Mass With Central or Eccentric Scar."
    },
    11: {
        "mld": "<b>Hepatic adenoma</b><br><b>Caption-derived KEYWORD FINDINGS:</b> venous-phase T1 C+ MR; large enhancing mass; central nonenhancing scar-like region<br><b>Reasoning:</b> In the article's adenoma examples, a central nonenhancing region may represent necrosis/fibrosis rather than a true scar, so adenoma remains an important scar mimic.",
        "diff": "Focal nodular hyperplasia<br>Fibrolamellar HCC<br>Hepatocellular carcinoma",
        "imdiff": "Key differentiators: Adenoma may be heterogeneous from fat, necrosis, or old hemorrhage and can be difficult to distinguish from other hypervascular lesions. FNH is favored by homogeneous arterial enhancement and Eovist retention. Fibrolamellar HCC is favored by a large heterogeneous mass with a large, often calcified scar and aggressive findings. Imaging specificity: Requires correlation when imaging is indeterminate.<br>Image references: Liver_Mass_With_Central_or_Eccentric_Scar8<br>Reference: RadPrimer - Liver Mass With Central or Eccentric Scar."
    },
    12: {
        "mld": "<b>Fibrolamellar hepatocellular carcinoma</b><br><b>Caption-derived KEYWORD FINDINGS:</b> 22-year-old man; heterogeneous hypervascular mass; large calcified central scar; enhancing cardiophrenic node<br><b>Reasoning:</b> A large heterogeneous hypervascular hepatic mass with a large calcified central scar in a young patient, plus nodal disease, matches the RadPrimer fibrolamellar HCC pattern.",
        "diff": "Focal nodular hyperplasia<br>Giant hepatic cavernous hemangioma<br>Conventional hepatocellular carcinoma",
        "imdiff": "Key differentiators: Fibrolamellar HCC is favored by young age, a large heterogeneous mass, a large often calcified central scar, and aggressive findings such as nodal/metastatic disease. FNH is usually homogeneous and its scar is T2 bright with delayed enhancement. Giant hemangioma can calcify centrally but should show peripheral nodular enhancement in nonscarred portions. Imaging specificity: Strongly suggestive.<br>Image references: Liver_Mass_With_Central_or_Eccentric_Scar11<br>Reference: RadPrimer - Liver Mass With Central or Eccentric Scar."
    },
    13: {
        "mld": "<b>Fibrolamellar hepatocellular carcinoma</b><br><b>Caption-derived KEYWORD FINDINGS:</b> young woman; large heterogeneously enhancing left hepatic lobe mass; central necrotic scar<br><b>Reasoning:</b> The caption explicitly identifies a large heterogeneously enhancing mass with a central necrotic scar in a young woman as fibrolamellar HCC.",
        "diff": "Focal nodular hyperplasia<br>Conventional hepatocellular carcinoma<br>Giant hepatic cavernous hemangioma",
        "imdiff": "Key differentiators: Fibrolamellar HCC is favored by a large heterogeneous mass in a young patient and by a large often calcified or necrotic central scar. FNH is usually homogeneous with a smaller scar. Giant hemangioma is separated by typical peripheral nodular enhancement. Imaging specificity: Strongly suggestive.<br>Image references: Liver_Mass_With_Central_or_Eccentric_Scar12<br>Reference: RadPrimer - Liver Mass With Central or Eccentric Scar."
    },
}

for idx, update in unknown_updates.items():
    unknowns[idx][4] = update["mld"]
    unknowns[idx][7] = update["diff"]
    unknowns[idx][8] = update["imdiff"]

corrected.extend(unknowns)

corrected.extend(
    [
        mechanism(
            "Mechanism recall: delayed fibrous liver-mass enhancement LMSCM001",
            "Why does mass-forming intrahepatic cholangiocarcinoma show delayed persistent enhancement?",
            "RadPrimer links the enhancement to extensive fibrous stroma. Fibrotic tissue enhances progressively and persistently, so a cholangiocarcinoma can have a scar-like necrotic/fibrotic center plus delayed enhancement rather than the rapid arterial pattern of a purely hypervascular hepatocellular lesion.<br>Imaging pivot: pair delayed persistent enhancement with capsular retraction, hepatic volume loss, biliary obstruction, or portal venous obstruction.<br>Source: RadPrimer, Liver Mass With Central or Eccentric Scar.",
        ),
        mechanism(
            "Mechanism recall: delayed gadobenate retention in regenerative nodules LMSCM002",
            "Why can regenerative nodules retain gadobenate dimeglumine on delayed MR imaging?",
            "The RadPrimer caption states that persistent gadobenate uptake/retention in the nodules indicates functional hepatocytes with deficient biliary ducts. That supports hepatocellular/regenerative tissue rather than nonhepatocellular metastases.<br>Imaging pivot: in the right vascular setting, delayed retention by multiple nodules supports regenerative nodules/nodular regenerative hyperplasia.<br>Source: RadPrimer image captions, Liver Mass With Central or Eccentric Scar.",
        ),
        trap(
            "Trap recall: central scar FNH versus fibrolamellar HCC LMSCT001",
            "What scar-related trap can make FNH look like fibrolamellar HCC?",
            "Trap: Calling any central-scar liver mass fibrolamellar HCC.<br>Safety check: Compare whole-lesion enhancement, scar size, calcification, and aggressive findings.<br>FNH: usually homogeneous arterial enhancement, isodense/isointense on other phases, and a T2-bright scar with delayed enhancement behavior.<br>Fibrolamellar HCC: large heterogeneous mass on all phases, large often calcified scar, and aggressive findings in more than 60% at presentation.<br>Source: RadPrimer, Liver Mass With Central or Eccentric Scar.",
        ),
        trap(
            "Trap recall: calcified giant hemangioma versus fibrolamellar HCC LMSCT002",
            "What trap is created by a calcified central scar in a giant hemangioma?",
            "Trap: Mistaking a giant hemangioma with a calcified fibrotic scar for fibrolamellar HCC.<br>Safety check: Follow enhancement in the nonscarred portion.<br>Hemangioma: nonscarred portions show typical nodular enhancement and large lesions may have a fibrotic nonenhancing scar that calcifies.<br>Fibrolamellar HCC: large heterogeneous mass with a large often calcified scar and aggressive findings.<br>Source: RadPrimer, Liver Mass With Central or Eccentric Scar.",
        ),
        trap(
            "Trap recall: Budd-Chiari regenerative nodules versus tumor LMSCT003",
            "What trap can occur with hypervascular scar-bearing nodules in Budd-Chiari syndrome?",
            "Trap: Calling multiple regenerative nodules/nodular regenerative hyperplasia HCC or metastases solely because they are hypervascular and scar-bearing.<br>Safety check: Look for the Budd-Chiari setting, multiplicity, small size pattern, delayed hepatobiliary-agent retention when shown, and absence/presence of aggressive tumor features.<br>RadPrimer pattern: large regenerative nodules may have central scars, are usually multiple and &lt;4 cm, and usually occur in Budd-Chiari syndrome.<br>Source: RadPrimer, Liver Mass With Central or Eccentric Scar.",
        ),
        high_yield(
            "Framework recall: scar-bearing liver mass first-pass sort LMSCH001",
            "For a liver mass with a central or eccentric scar, what first-pass imaging questions narrow the differential?",
            "Ask: How large/characteristic is the scar? Is the scar calcified? What is the mass enhancement pattern? Are there associated findings such as capsular retraction, vascular invasion, biliary obstruction, hepatic volume loss, or metastases?<br>Interpretation pivot: calcification is common in fibrolamellar carcinoma and giant hemangioma but uncommon to rare in the other listed causes.<br>Source: RadPrimer, Liver Mass With Central or Eccentric Scar.",
        ),
        high_yield(
            "Framework recall: multiplicity in scar-bearing liver masses LMSCH002",
            "How does multiplicity change the differential for scar-bearing liver masses?",
            "Fibrolamellar carcinoma is almost always solitary. Cholangiocarcinoma and FNH are usually solitary. Multiplicity pushes toward metastases, epithelioid hemangioendothelioma, nodular regenerative hyperplasia, or multifocal hepatocellular disease when the morphology and clinical setting fit.<br>Source: RadPrimer, Liver Mass With Central or Eccentric Scar.",
        ),
        high_yield(
            "FNH pattern recall: CT and MR scar behavior LMSCH003",
            "What CT/MR pattern favors focal nodular hyperplasia among central-scar liver masses?",
            "Larger FNH lesions (>3 cm) usually have a small central scar with possible thin radiating septa. The mass enhances homogeneously on arterial phase and becomes isodense/isointense to liver on other phases. The central scar is bright on T2WI and shows delayed persistent enhancement on CT and by intravascular MR contrast agents.<br>Source: RadPrimer, Liver Mass With Central or Eccentric Scar.",
        ),
        high_yield(
            "FNH pattern recall: Eovist discriminator LMSCH004",
            "What gadoxetate/Eovist behavior helps separate FNH from adenoma?",
            "The illustrated FNH retains gadoxetate on 20-minute delayed T1 MR while the central scar does not take up or retain gadoxetate. RadPrimer states that the distinction from hepatic adenoma is best made by Eovist-enhanced MR.<br>Source: RadPrimer, Liver Mass With Central or Eccentric Scar.",
        ),
        high_yield(
            "Hemangioma pattern recall: giant hemangioma with scar LMSCH005",
            "What pattern favors giant hepatic cavernous hemangioma when a central scar is present?",
            "Large hemangiomas (>5 cm) commonly have a fibrotic nonenhancing scar that may calcify. The nonscarred portions show typical nodular enhancement; the image captions show peripheral nodular enhancement isodense to vessels, progressive nodular enhancement, and very bright T2 signal.<br>Source: RadPrimer, Liver Mass With Central or Eccentric Scar.",
        ),
        high_yield(
            "HCC pattern recall: conventional HCC scar mimic LMSCH006",
            "What pattern favors conventional HCC when a scar-like region is present?",
            "Large HCC, especially in a noncirrhotic liver, may resemble fibrolamellar carcinoma. RadPrimer favors HCC when there is a heterogeneous hypervascular mass with washout, central necrosis or scar, rarely calcified scar, vascular invasion, or metastases.<br>Source: RadPrimer, Liver Mass With Central or Eccentric Scar.",
        ),
        high_yield(
            "HCC report pivot: vascular invasion LMSCH007",
            "In a scar-like liver mass suspicious for HCC, what finding must be actively inspected and reported?",
            "Inspect for vascular invasion and metastases. RadPrimer states that vascular invasion and metastases are common in HCC, and the illustrated case uses portal vein tumor invasion to identify HCC.<br>Report pivot: tumor-in-vein changes staging and management, so it should not be treated as a secondary detail.<br>Source: RadPrimer, Liver Mass With Central or Eccentric Scar.",
        ),
        high_yield(
            "Adenoma pattern recall: scar mimic from fat hemorrhage necrosis LMSCH008",
            "How can hepatic adenoma mimic a scar-bearing liver mass?",
            "Adenoma can contain low-density foci from fat, necrosis, or old hemorrhage; these are not true scar. Chemical-shift MR signal drop supports fat. Calcification of scar is uncommon. Distinction from FNH is best made with Eovist-enhanced MR.<br>Source: RadPrimer, Liver Mass With Central or Eccentric Scar.",
        ),
        high_yield(
            "Metastasis pattern recall: necrotic target scar mimic LMSCH009",
            "What metastatic pattern can mimic a central scar?",
            "Metastases may show target appearance and central necrosis rather than true scar. Breast and other metastases may have substantial fibrous stroma, especially after treatment. Calcification of the necrotic area is rare, but mucinous carcinoma metastases such as colon or ovarian can calcify.<br>Source: RadPrimer, Liver Mass With Central or Eccentric Scar.",
        ),
        high_yield(
            "Fibrolamellar HCC pattern recall: calcified scar LMSCH010",
            "What pattern favors fibrolamellar HCC among central-scar liver masses?",
            "Fibrolamellar HCC is a large heterogeneous mass on all phases of imaging. The scar is large and often calcified (>60%). Aggressive signs are present at presentation in more than 60%, including local invasion of vessels/bile ducts and metastases.<br>Source: RadPrimer, Liver Mass With Central or Eccentric Scar.",
        ),
        high_yield(
            "Cholangiocarcinoma pattern recall: delayed fibrous scar mimic LMSCH011",
            "What enhancement and associated findings favor mass-forming intrahepatic cholangiocarcinoma?",
            "Focal necrosis or fibrosis may resemble a scar. Extensive fibrous stroma produces typical delayed persistent enhancement. Associated findings include overlying capsular retraction, hepatic volume loss, biliary obstruction, and portal venous obstruction.<br>Source: RadPrimer, Liver Mass With Central or Eccentric Scar.",
        ),
        high_yield(
            "EHE pattern recall: peripheral target lollipop lesions LMSCH012",
            "What CT/MR pattern favors hepatic epithelioid hemangioendothelioma?",
            "Multiple, coalescent, peripheral nodules with target or lollipop appearance on CECT or MR, often with capsular retraction over the lesions.<br>Key differentiator: peripheral coalescent target/lollipop lesions plus capsular retraction should move EHE above solitary scar-bearing tumors.<br>Source: RadPrimer, Liver Mass With Central or Eccentric Scar.",
        ),
        high_yield(
            "NRH pattern recall: Budd-Chiari regenerative scar nodules LMSCH013",
            "What pattern favors nodular regenerative hyperplasia/large regenerative nodules rather than tumor?",
            "The multiacinar form of nodular regenerative hyperplasia may produce large regenerative nodules with central scars. They are usually multiple, usually &lt;4 cm, and usually occur in patients with Budd-Chiari syndrome.<br>Source: RadPrimer, Liver Mass With Central or Eccentric Scar.",
        ),
        high_yield(
            "NRH pattern recall: gadobenate retention LMSCH014",
            "What delayed MR contrast behavior supports regenerative nodules in the illustrated Budd-Chiari cases?",
            "At 2 hours after IV gadobenate dimeglumine, the nodules show persistent uptake and retention. The caption interprets this as functional hepatocytes with deficient biliary ducts.<br>Key differentiator: retention supports regenerative/hepatocellular tissue rather than nonhepatocellular metastases.<br>Source: RadPrimer image captions, Liver Mass With Central or Eccentric Scar.",
        ),
    ]
)

if any(len(row) != FIELD_COUNT for row in corrected):
    bad = [(idx + 1, len(row)) for idx, row in enumerate(corrected) if len(row) != FIELD_COUNT]
    raise SystemExit(f"Corrected TSV has invalid column counts: {bad[:10]}")

for idx, row in enumerate(corrected, 1):
    if not row[0].strip():
        raise SystemExit(f"Row {idx} has empty first field")
    if "\n" in "\t".join(row) or "\r" in "\t".join(row):
        raise SystemExit(f"Row {idx} contains a literal newline")

write_rows(CORRECTED, corrected)

metadata = json.loads(METADATA.read_text(encoding="utf-8"))
anki = metadata.get("anki") or {}
if anki.get("createImportFile"):
    note_type = anki.get("noteType") or "core_rad_notetype_v2"
    deck = anki.get("deckName") or "Corebook::GI::Liver::Liver Mass With Central or Eccentric Scar"
    with ANKI_IMPORT.open("w", encoding="utf-8", newline="") as handle:
        handle.write("#separator:tab\n")
        handle.write("#html:true\n")
        handle.write(f"#notetype:{note_type}\n")
        handle.write(f"#deck:{deck}\n")
        with CORRECTED.open("r", encoding="utf-8", newline="") as src:
            handle.write(src.read())

report = f"""# Audit Report

Topic: Liver Mass With Central or Eccentric Scar

## Result
- Generated TSV rows reviewed: {len(rows)}
- Corrected TSV rows written: {len(corrected)}
- Output schema: 22 columns, no header row in `corrected_cards.tsv`
- Anki import file: `corrected_cards_anki_import.tsv`

## Major Changes
- Preserved all 14 image-recognition UNKNOWN rows and kept the selected case grouping intact.
- Preserved source captions verbatim in the image/caption fields, including original wording and arrow image tags.
- Kept complete image reference names on the back of every image-containing card.
- Replaced the repeated Core-contaminated summary with a RadPrimer-only article summary because `core_evidence.txt` says `NOT_PROVIDED`.
- Removed unsupported Core-only, ultrasound, nuclear-medicine/HIDA, epidemiology, adenoma-management, and adenoma-histology-risk cards that were not auditable from `source_package.txt`.
- Retained or rewrote source-supported CT/MR scar-pattern, differential, mechanism, and report-critical cards as independent TSV rows.

## Prompt/Schema Issues Exposed
- The generator can still claim Core + RadPrimer synthesis even when the audit bundle has no auditable Core evidence block. Future audits should explicitly downgrade those claims to article-only unless Core text is present.
- The article summary field itself should not be treated as bloat merely because it is repeated; it is hidden in the user's Anki UI. It should only be corrected when it is source-contaminated, inaccurate, overcompressed, or missing key article structure.
- Source-supported modality cards worked better after the schema update, but the model still overgenerated unsupported ultrasound and nuclear-medicine cards. Future validation should block modality cards unless the article/source package explicitly contains that modality bucket.

## Remaining Uncertainties
- The audit bundle contains filenames and captions but not the actual image files, so this audit validated image references and captions against the source package rather than re-reviewing image pixels.
- Core Radiology may support some removed claims, but it was not auditable in this bundle. Those claims can be restored only if a future bundle includes captured Core evidence.
"""

REPORT.write_text(report, encoding="utf-8")
DONE.write_text("DONE\ncorrected_cards.tsv\ncorrected_cards_anki_import.tsv\naudit_report.md\n", encoding="utf-8")

print(f"Wrote {len(corrected)} corrected rows")
