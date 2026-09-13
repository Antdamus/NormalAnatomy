from pathlib import Path
import csv, json, re, secrets, string, hashlib, io
from datetime import datetime, timezone

B = Path(__file__).resolve().parent
META = json.loads((B / 'metadata.json').read_text(encoding='utf-8-sig'))
ORIG = list(csv.reader((B/'generated_cards.tsv').open(encoding='utf-8-sig', newline=''), delimiter='\t'))
FIELDS = ['Clinical_Context','Image','Image_Annotated','Question','Most_Likely_Diagnosis','Entity_Label','Differential_Q','Differentials','Imaging_Differentiation','Original_Caption','Mechanism_Q','Mechanism','Boards_Trap_Q','Boards_Trap','High_Yield_Q','High_Yield_A','Radiopaedia_Link','Radiopaedia_Case_Context','Radiopaedia_Case_Summary','Radiopaedia_Case_Differential','summary','Tags']
assert len(ORIG)==59 and all(len(r)==22 for r in ORIG)
rows = {i:r.copy() for i,r in enumerate(ORIG,1)}
used = {re.search(r'([A-Z0-9]{12})$',r[0]).group(1) for r in ORIG}
assert len(used)==59 and not any(re.fullmatch(r'(?:Q|CASE|ROW|UNKNOWN)\d+',x) for x in used)
idpath=B/'_audit_new_ids.json'
newids=json.loads(idpath.read_text()) if idpath.exists() else {}
def uid(key):
    if key not in newids:
        while True:
            code=''.join(secrets.choice(string.ascii_uppercase+string.digits) for _ in range(12))
            if code not in used and code not in newids.values(): break
        newids[key]=code
    return newids[key]

downloads={(d['masterImageId'],d['variant']):d for d in META['downloadFiles']}
registry={d['masterImageId']:d for d in META['imageRegistry']}
rename={}
for ident in META['masterImageIds']:
    item=registry[ident]
    for variant,key in [('plain','targetPlainFilename'),('annotated','targetAnnotatedFilename')]:
        rename[item[key]]=downloads[(ident,variant)]['filename']
def clean(text):
    for old,new in rename.items(): text=text.replace(old,new)
    # Caption symbols identify specific annotations and are meaningful image media.
    # Preserve their exact src names; missing assets must be resolved or flagged.
    return text
for row in rows.values():
    for i in range(22): row[i]=clean(row[i])

# The repeated article summary is intentionally preserved, with only accuracy repairs.
summary=rows[1][20]
summary=summary.replace('Core + RadPrimer + STATdx synthesis','RadPrimer + STATdx synthesis, with Core additions supported by the captured Core evidence file')
summary=summary.replace('ADPLD: innumerable nonenhancing simple cysts throughout the liver; extrahepatic cysts/family history help establish the syndrome.','Polycystic liver disease: innumerable nonenhancing simple cysts throughout the liver; assess renal findings and family history when classifying the syndrome.')
summary=summary.replace('Complexity warning signs: mural nodularity, solid component, enhancing wall or septa, internal debris/blood, biliary communication, or rapid interval change.','Features requiring characterization: mural nodularity, solid tissue, enhancing wall or septa, internal debris/blood, biliary communication, or rapid interval change. These findings are not all malignant: infection, hemorrhage, and ductal disease can also create complexity.')
summary=summary.replace('small lesions may appear echogenic on ultrasound.','small lesions may appear echogenic on ultrasound. The illustrated tiny hamartomas can have enhancing wall nodules, so multiplicity, size, and noncommunication must temper a blanket tumor rule.',1)
summary=summary.replace('Enhancing solid tissue or nodularity in a cystic liver lesion should be treated as tumor until proven otherwise.','Enhancing solid tissue or a true mural nodule raises concern for neoplasm. Enhancing septa alone also occur in abscess; tiny nodular hamartomas are a source-described benign exception.')

def setrow(n, **fields):
    for k,v in fields.items(): rows[n][FIELDS.index(k)] = v
def mini(n, diff, findings):
    setrow(n,Differentials=diff,Imaging_Differentiation=findings)
def imagefields(numbers):
    front=[];back=[]
    for n in numbers:
        ident=f'SDX-{n:02d}'
        front.append('<img src="'+downloads[(ident,'plain')]['filename']+'">')
        caption=clean(registry[ident]['caption'])
        back.append('<div class="stackItem"><img src="'+downloads[(ident,'annotated')]['filename']+'"><div class="stackCap">'+caption+'</div></div>')
    return '<br>'.join(front), ''.join(back)

# Split unrelated simple-cyst examples: the stated age applies to SDX-01 only.
rows[1][1],rows[1][2]=imagefields([1])
setrow(1,Most_Likely_Diagnosis='Uncomplicated simple hepatic cyst',Imaging_Differentiation='Key imaging findings: Homogeneous water-attenuation lesion with a smooth, nearly imperceptible wall and no debris or mural irregularity.<br>Key differentiators: No enhancing solid tissue, thick wall, or mural nodule. Classic simple-fluid morphology supports a simple cyst.')
extra_unknown=[]
for key,n,question,answer,diff,reason in [
 ('cyst_obstruction',2,'What complication of this large cyst should be reported?','Large hepatic cyst causing compression and obstruction of the intrahepatic bile ducts','Biliary cystic neoplasm<br>Hepatic abscess','Key imaging findings: Very large homogeneous cyst with adjacent intrahepatic ductal dilatation.<br>Report-critical finding: Biliary compression/obstruction from mass effect. Benign fluid morphology does not exclude a clinically important complication.'),
 ('cyst_hemorrhage',3,'What accounts for the heterogeneous signal within these cysts on T2-weighted MRI?','Hemorrhage within hepatic cysts','Hemorrhagic cyst<br>Biliary cystic neoplasm<br>Hepatic abscess','Key imaging findings: Contiguous large cysts with areas of lower T2 signal than the remaining fluid.<br>Key differentiator: Blood products explain the source-described signal complexity. This T2 image alone cannot exclude an enhancing neoplastic component; inspect the contrast-enhanced examination before classifying a complex cyst.')]:
    r=['']*22;r[0]=uid(key);r[1],r[2]=imagefields([n]);r[3]=question;r[4]=answer;r[7]=diff;r[8]=reason
    extra_unknown.append((key,r))

setrow(2,Most_Likely_Diagnosis='Polycystic liver disease; determine the hereditary subtype with clinical/family assessment',Imaging_Differentiation='Key imaging findings: Innumerable water-attenuation cysts of varying size causing hepatomegaly; the caption describes only a few renal cysts and normal renal function.<br>Key differentiators: Larger variable-size cysts favor polycystic liver disease over tiny irregular biliary hamartomas. Ductal communication favors Caroli disease. Imaging identifies the liver phenotype; renal and family/genetic assessment establish the syndrome.')
setrow(3,Question='Patient with subacute diverticulitis. Most likely diagnosis of this complex liver lesion?')
setrow(4,Imaging_Differentiation='Key imaging findings: Innumerable small, often irregular 2-15 mm CT lesions; smaller lesions are echogenic on US, while larger lesions appear cystic. MRCP shows noncommunicating T2-bright lesions.<br>Key differentiators: Noncommunication argues against Caroli disease; a uniformly tiny lesion population favors hamartomas over the variable-size larger cysts of polycystic liver disease.<br>Pitfall: The illustrated benign hamartomas have small enhancing wall nodules. Do not apply a solitary complex-cyst malignancy rule without considering the whole pattern.')
setrow(5,Most_Likely_Diagnosis='Cystic hepatic metastasis (thyroid primary established in the source case)')
setrow(6,Question='CT before and after treatment of a known gastric GIST. What explains the change in the hepatic lesion?',Differentials='Uncomplicated hepatic cyst<br>Hepatic abscess',Imaging_Differentiation='Key imaging findings: A previously solid heterogeneous metastasis becomes cystic after imatinib (Gleevec) therapy in the source case.<br>Interpretation pivot: Compare the two time points; treatment-related necrosis explains the change. A new fluid-like appearance does not reclassify a known metastasis as a benign cyst. Complete necrosis is the source case outcome, not a viability guarantee from a single CT image.')
setrow(7,Question='What lesion category is favored, and can this CT establish the infectious cause?',Most_Likely_Diagnosis='Hepatic abscess; amebic in the source case, but CT alone cannot distinguish amebic from pyogenic abscess')
setrow(8,Question='Three weeks after blunt traumatic liver laceration. What is the likely nature of this new collection?',Most_Likely_Diagnosis='Posttraumatic collection containing bile and blood',Imaging_Differentiation='Key imaging findings: Lobulated cystic collection at the site of prior liver injury.<br>Key differentiators: Trauma timing and comparison with prior CT favor a posttraumatic collection over a primary cystic neoplasm; CT appearance alone does not establish exact fluid composition.<br>Outside clarification (NCI terminology): Biloma denotes collected bile; hematoma denotes collected blood; seroma denotes serous/clear fluid. The original caption incorrectly equates blood with seroma.')
setrow(8,Image_Annotated=rows[8][2].replace('that represents a combination of walled-off bile and blood, also known, respectively, as biloma and seroma.','that the source describes as walled-off bile and blood.'))
setrow(9,Question='Liver transplant recipient. What complication does this pattern suggest, and which vessel requires evaluation?',Most_Likely_Diagnosis='Transplant biloma with suspected ischemic biliary injury; assess for hepatic artery thrombosis',Differentials='Postoperative seroma<br>Hepatic abscess',Imaging_Differentiation='Key imaging findings: Irregular cystic collections, dilated ducts, and peribiliary fluid in the allograft.<br>Report-critical pivot: Assess hepatic arterial patency because hepatic artery thrombosis can cause biliary necrosis and biloma. The source cases had confirmed thrombosis; these fluid images alone do not prove the vascular diagnosis.')
setrow(10,Question='Febrile, immunosuppressed patient. What process is favored by these numerous small liver lesions?',Most_Likely_Diagnosis='Opportunistic hepatic microabscesses (candidiasis in the source case)',Imaging_Differentiation='Key imaging findings: Innumerable tiny hypodense hepatic lesions with irregular walls in a febrile immunosuppressed patient.<br>Key differentiators: Clinical context favors opportunistic infection. Fungal and mycobacterial infections overlap; imaging alone cannot identify Candida. Microbiologic/clinical correlation is required.')
setrow(11,Question='Patient from an echinococcosis-endemic region of the Middle East. Most likely diagnosis?',Imaging_Differentiation='Key imaging findings: Large multiseptate cystic masses containing peripheral daughter cysts.<br>Key differentiator: Daughter cysts within a mother cyst, or a detached floating membrane, strongly support hydatid disease; exposure and serology support interpretation.<br>Outside clarification (CDC): Scolices are microscopic parasitic structures, not the macroscopic daughter cysts seen on CT.')
setrow(11,Image_Annotated=rows[11][2].replace('multiple daughter cysts or scolices.','multiple daughter cysts.'))
setrow(12,Most_Likely_Diagnosis='Biliary cystic neoplasm (biliary cystadenoma in the source case)',Image_Annotated=rows[12][2].replace('These findings with no other known tumor could be considered sufficiently diagnostic of biliary cystadenoma to warrant resection without further evaluation.','In the source case, this pattern without another known tumor prompted resection for suspected biliary cystadenoma. Imaging alone does not establish benign versus malignant histology.'))
setrow(13,Question='A cystic hepatic lesion opacifies during ERCP, with surface nodularity in the ducts. What diagnosis is favored?',Most_Likely_Diagnosis='Intraductal biliary neoplasm (biliary IPMN in source terminology); associated cholangiocarcinoma was established in this case',Imaging_Differentiation='Key imaging findings: Dilated ducts and a cystic mass on CT; the source reports ERCP communication and intraductal surface nodularity.<br>Key differentiator: Ductal communication plus nodularity favors intraductal neoplasm over simple cyst or uncomplicated Caroli disease. Invasive cholangiocarcinoma cannot be established from this CT image alone.')
setrow(14,Question='Woman with portal hypertension. Most likely explanation for these cyst-like liver lesions?',Imaging_Differentiation=rows[14][8]+'<br>Associated source finding: Congenital hepatic fibrosis accounts for the portal hypertension with splenomegaly and varices in this example.')
setrow(15,Most_Likely_Diagnosis='Aggressive cystic hepatic neoplasm with rupture (undifferentiated hepatic sarcoma in the source case)',Imaging_Differentiation=rows[15][8]+'<br>Report-critical finding: Hemoperitoneum from capsular rupture; the histologic tumor type requires pathology.')
setrow(16,Question='29-year-old woman with a solid-appearing segment IV lesion on ultrasound; no enhancement on the complete MRI. Which cyst is suggested?')

setrow(17,Mechanism='Abnormal development of small intrahepatic bile ducts leaves benign cystic ductal remnants disconnected from the functioning biliary tree.<br>Imaging consequence: Numerous tiny, often irregular lesions; small lesions may be echogenic on US, and MRCP shows no biliary communication.<br>Interpretation pivot: Noncommunication separates this pattern from the communicating ductal dilatation of Caroli disease.')
setrow(18,Mechanism='Caroli disease is saccular dilatation of intrahepatic bile ducts around portal-tract branches. On contrast-enhanced imaging, an enhancing portal branch within a dilated duct produces the central-dot sign.<br>Interpretation pivot: The dot together with ductal communication favors Caroli disease over noncommunicating cysts and biliary hamartomas.')
setrow(21,Mechanism_Q='How can diverticulitis be linked to a complex hepatic abscess?',Mechanism='The article links hepatic infection to hematogenous spread from the colon.<br>Outside clarification (anatomic explanation): Colonic venous drainage reaches the liver through the portal system, providing a route for infection to seed the liver.<br>Imaging consequence: Suppurative infection forms a complex fluid collection with inflammatory wall/septa. In the illustrated case, aspiration yielded pus.<br>Interpretation pivot: An inflammatory bowel source raises the likelihood of abscess when CT shows a complex hepatic collection.')
setrow(25,Boards_Trap=rows[25][13].replace('The allowed sources explicitly state that amebic abscess can be indistinguishable','Amebic abscess can be indistinguishable'))

setrow(27,High_Yield_Q='How should known ADPKD change the interpretation of innumerable nonenhancing hepatic cysts?',High_Yield_A='Known ADPKD supports an associated polycystic liver phenotype rather than an unrelated multifocal tumor or infection.<br>Interpretation pivot: Integrate the renal disease and family history with the simple-cyst morphology; do not rank innumerable cysts without that context.<br>Outside clarification (NIDDK): Liver cysts are an extrarenal manifestation of ADPKD. The association does not by itself establish a separate isolated hereditary liver disorder.')
setrow(28,High_Yield_A='A middle-aged woman with a solitary large multiseptated cystic mass and enhancing wall/septa has a pattern that raises concern for biliary cystic neoplasm.<br>Pretest pivot: The demographic context helps rank the differential, but cannot distinguish benign from malignant histology.')
setrow(29,High_Yield_A='CT: Homogeneous water attenuation (0-20 HU), a thin/nearly imperceptible wall, and no enhancement.<br>Interpretation pivot: Thick enhancing wall, enhancing septa, or a true mural nodule requires characterization as a complex lesion; fluid attenuation alone is insufficient.')
setrow(32,High_Yield_Q='What imaging pattern favors polycystic liver disease over biliary hamartomas?',High_Yield_A='Innumerable nonenhancing simple cysts of varying size, often including large cysts and causing hepatomegaly.<br>Key differentiator: Biliary hamartomas are predominantly tiny and often irregular; Caroli disease communicates with the biliary tree. Correlate renal findings and family history to classify the hereditary syndrome.')
setrow(33,High_Yield_Q='What contrast-enhanced CT pattern supports hepatic pyogenic abscess?',High_Yield_A='A complex fluid collection with an enhancing rim and/or multiple enhancing septa.<br>Interpretation pivot: This pattern raises abscess in an infectious clinical setting but overlaps cystic/necrotic tumor. Ring enhancement alone is not organism-specific or diagnostic.')
setrow(34,High_Yield_Q='What ultrasound appearance of a mature hepatic abscess distinguishes it from a simple cyst?',High_Yield_A='A hypoechoic lesion with internal echoes rather than uniformly anechoic simple fluid.<br>Interpretation pivot: Internal complexity plus an infectious clinical setting favors abscess, although debris and complex fluid are not specific for infection.')
setrow(35,High_Yield_A='CT: Innumerable tiny, often irregular cyst-like lesions; the illustrated case spans 2-15 mm and includes small enhancing wall nodules.<br>Interpretation pivot: Assess the full tiny-lesion distribution and MRCP noncommunication before assuming mural nodularity means malignant cystic masses. The nodular wall appearance is a described variant, not a required finding.')
setrow(38,High_Yield_A='A true mural nodule or enhancing solid component in an otherwise cystic mass raises concern for neoplasm; multiple lesions or a known cancer history increase concern for metastases.<br>Pitfall: Nodularity does not establish a primary site or prove malignancy. The source also illustrates tiny biliary hamartomas with enhancing wall nodules.')
setrow(42,High_Yield_A='Biloma, peribiliary fluid, and/or biliary necrosis in the allograft should prompt assessment of hepatic arterial patency.<br>Report pivot: Hepatic artery thrombosis is a consequential cause of ischemic biliary injury in this setting. Report the arterial assessment rather than attributing all postoperative fluid to an uncomplicated collection.')
setrow(43,High_Yield_A='CT: Innumerable tiny hypoenhancing lesions. MRI may show T2 hyperintensity and diffusion restriction.<br>Interpretation pivot: In a febrile immunocompromised patient, this pattern favors opportunistic microabscesses. Imaging does not reliably identify the organism; absence of a particular MR feature does not exclude infection.')
setrow(44,High_Yield_A='Multiple tiny hypoechoic liver lesions.<br>Interpretation pivot: In a febrile immunocompromised patient this raises opportunistic microabscesses, but the US pattern is nonspecific and requires clinical/microbiologic correlation.')
setrow(45,High_Yield_Q='Which cross-sectional imaging features favor hydatid disease over a simple hepatic cyst?',High_Yield_A='Daughter cysts within a mother cyst and/or a detached floating membrane; a peripheral cyst wall may calcify.<br>Interpretation pivot: These internal structures, combined with exposure history, favor echinococcal disease over an uncomplicated simple cyst. Their absence does not establish a benign simple cyst.')
setrow(46,High_Yield_Q='What produces the water-lily sign in a hepatic hydatid cyst?',High_Yield_A='A detached endocyst membrane floats or undulates within the cyst fluid.<br>Interpretation pivot: A floating membrane supports hydatid disease rather than a simple hepatic cyst; it is distinct from fine echogenic hydatid sand.<br>Outside clarification: The membrane definition is corroborated by the cystic-liver imaging review cited in the audit report.')
setrow(48,High_Yield_A='Describe the enhancing wall/septa and any mural nodule or solid component, and flag a suspected biliary cystic neoplasm for surgical evaluation.<br>Management pivot: The article emphasizes complete resection to prevent recurrence. Imaging may not distinguish biliary cystadenoma from cystadenocarcinoma; do not label the lesion benign solely because most of it is fluid.')
setrow(49,High_Yield_A='Demonstrated communication with the bile ducts, such as filling of the cystic component during ERCP, establishes a ductal connection.<br>Key differentiator: Associated intraductal nodularity raises concern for an intraductal biliary neoplasm. Communication alone also occurs in Caroli disease and does not prove carcinoma.')
setrow(55,High_Yield_A='It can appear complex or solid on US despite a nonenhancing cystic appearance on MRI, as in the segment IV source case.<br>Interpretation pivot: Compare modalities and enhancement before assuming an apparently solid US lesion is a solid tumor. This pattern suggests a foregut cyst but does not establish its histology.')
setrow(57,High_Yield_Q='Which structural checks are essential before calling a hepatic lesion a simple cyst?',High_Yield_A='Assess fluid homogeneity, wall/septal enhancement, true mural nodules or solid tissue, blood/debris, ductal communication, and interval change.<br>Interpretation pivot: Complexity requires characterization, not an automatic malignant label. Infection can enhance, hemorrhage changes fluid signal, Caroli disease communicates with ducts, and tiny biliary hamartomas can have small enhancing wall nodules.')

deleted={24:'Duplicates the treated-GIST mechanism and image comparison (original rows 6 and 20).',39:'Repeats the same treated-GIST interval-necrosis pivot (rows 6 and 20).',51:'Repeats the central-dot sign already taught by the image case and mechanism (rows 14 and 18).',52:'Repeats the Caroli-versus-hamartoma communication comparison (row 37).',54:'Duplicates the foregut-cyst US/MRI discrepancy retained in row 55 and image row 16.',56:'Duplicates the focal-fat multimodality pitfall retained in row 22.'}

added_hy=[
 ('abscess_mri',33,'Which MRI feature supports pus within a suspected hepatic abscess?','Central T2 hyperintensity with restricted diffusion can support purulent content.<br>Interpretation pivot: Combine this with a complex/rim-enhancing lesion and infection context; restriction alone is not sufficient to exclude necrotic tumor.','Core evidence: pyogenic abscess bullet.','Modality appearance / differential discriminator'),
 ('hydatid_sand',46,'On ultrasound, how is hydatid sand different from daughter cysts or a floating membrane?','Hydatid sand appears as fine internal echoes that may become more apparent with patient repositioning; daughter cysts are separate cystic structures, and a detached membrane produces the water-lily sign.<br>Outside clarification (CDC and cystic-liver imaging review): Sand contains microscopic protoscolices and hooklets, not merely detached membrane sediment. This distinction prevents conflating three different hydatid signs.','Core hydatid bullet and article hydatid synthesis; outside clarification: CDC DPDx and pictorial review.','Modality appearance / pitfall'),
 ('sarcoma_myxoid',None,'Why can an undifferentiated hepatic sarcoma appear solid on US but cystic on CT or MRI?','The article attributes the discordant appearance to myxoid stroma within a solid tumor.<br>Outside clarification (radiologic-pathologic correlation): The high water content of this stroma produces low CT attenuation and high T2 signal despite solid tumor tissue.<br>Interpretation pivot: Solid US appearance with fluid-like CT/MRI appearance and enhancing peripheral tissue should raise concern for neoplasm; pathology establishes the tumor type.','source_package.txt: diagnosis-specific synthesis, undifferentiated hepatic sarcoma; outside radiologic-pathologic clarification.','Modality discrepancy / histology-to-imaging explanation'),
 ('pseudocyst_pancreatitis',None,'What associated findings should be sought when considering an intrahepatic pancreatic pseudocyst?','Look for pancreatitis or an adjacent pancreatic cyst/pseudocyst and extension along portal triads.<br>Interpretation pivot: That pancreatic/portal distribution can explain an intrahepatic cystic collection and shift the differential away from a primary hepatic cystic tumor.','source_package.txt: diagnosis-specific synthesis, intrahepatic pseudocyst.','Pretest clue / differential discriminator'),
 ('collection_course',None,'How can the expected course of an uninfected posttraumatic or postprocedural hepatic collection affect interpretation?','The article notes that these collections may take weeks to months to resolve and may not require drainage when uninfected.<br>Interpretation pivot: Persistence alone is not proof of tumor or infection; interpret interval change with the injury/procedure history and clinical state. This observation is not a blanket rule for symptomatic or complicated collections.','source_package.txt: diagnosis-specific synthesis, biloma/seroma.','Interval behavior / management pivot')]

out=[];ledger=[]
def add_record(key,row,origin,basis,gate=''):
    row[20]=summary
    if row[7]: row[8]='<b>Mini-differential:</b><br>'+row[7]+'<br><br>'+row[8]
    row[6]='';row[7]=''
    out.append(row);ledger.append({'output_row':len(out),'origin':origin,'key':key,'id':re.search(r'([A-Z0-9]{12})$',row[0]).group(1),'basis':basis,'gate':gate})
for n in range(1,60):
    if n in deleted: continue
    row=rows[n]
    if n<=16: basis='source_package.txt: selected STATdx captions + diagnosis-specific synthesis; Core only where matching a captured fact.'
    elif n<=26: basis='Article diagnosis-specific synthesis / discriminators; matching Core bullets. Outside explanations are labeled.'
    else: basis='See High-Yield evidence ledger in audit_report.md.'
    add_record('original_'+str(n),row,n,basis)
    if n==1:
        for key,r in extra_unknown: add_record(key,r,'split from 1','STATdx caption '+('SDX-02' if key=='cyst_obstruction' else 'SDX-03'))
    for key,after,q,a,basis,gate in added_hy:
        if after==n:
            r=['']*22;r[0]=uid(key);r[14]=q;r[15]=a
            add_record(key,r,'split from '+str(n),basis,gate)
for key,after,q,a,basis,gate in added_hy:
    if after is None:
        r=['']*22;r[0]=uid(key);r[14]=q;r[15]=a
        add_record(key,r,'added',basis,gate)

with (B/'corrected_cards.tsv').open('w',encoding='utf-8',newline='') as f:
    csv.writer(f,delimiter='\t',lineterminator='\n').writerows(out)
headers='#separator:tab\n#html:true\n#notetype:'+META['anki']['noteType']+'\n#deck:'+META['anki']['deckName']+'\n#tags column:22\n'
(B/'corrected_cards_anki_import.tsv').write_text(headers+(B/'corrected_cards.tsv').read_text(encoding='utf-8'),encoding='utf-8',newline='')
# Optional Anki routing wrapper: preserves the first 22 columns; a dedicated deck
# column is the documented way to CREATE a missing deck during text import.
with (B/'corrected_cards_anki_create_deck.tsv').open('w',encoding='utf-8',newline='') as f:
    f.write(headers+'#deck column:23\n')
    csv.writer(f,delimiter='\t',lineterminator='\n').writerows([r+[META['anki']['deckName']] for r in out])
idpath.write_text(json.dumps(newids,indent=2),encoding='utf-8')
(B/'_audit_row_map.json').write_text(json.dumps(ledger,indent=2),encoding='utf-8')

refs=set(re.findall(r'<img\b[^>]*src="([^"]+)"','\n'.join('\t'.join(r) for r in out)))
expected={d['filename'] for d in META['downloadFiles']}
caption_icons={d['filename'] for d in json.loads((B/'caption_icon_integrity.json').read_text())}
assert refs==expected|caption_icons and all((B/'media'/fn).is_file() for fn in refs)
assert len(out)==60 and all(len(r)==22 for r in out)
assert all(not r[6] and not r[7] for r in out)
assert len({r[0] for r in out})==len(out)
assert len({x['id'] for x in ledger})==len(out)
assert all(sum(bool(r[i]) for i in [3,6,10,12,14])==1 for r in out)
assert all(not r[4] or r[1] for r in out)
assert all(not any(c in cell for c in '\t\r\n') for r in out for cell in r)
assert not re.search(r'Image references?:|Source image links?:|https?://|\(arrow\)','\n'.join('\t'.join(r[:21]) for r in out),re.I)
assert list(csv.reader((B/'corrected_cards.tsv').open(encoding='utf-8',newline=''),delimiter='\t'))==out
stats={'input_rows':len(ORIG),'output_rows':len(out),'unknown':sum(bool(r[3]) for r in out),'mechanism':sum(bool(r[10]) for r in out),'boards_trap':sum(bool(r[12]) for r in out),'high_yield':sum(bool(r[14]) for r in out),'deleted_original_rows':deleted,'new_ids':newids,'retained_original_ids':sum(isinstance(x['origin'],int) for x in ledger),'clinical_media_files':len(expected),'caption_icon_files':len(caption_icons),'total_media_files':len(refs),'differential_trigger_fields_populated':0,'summary_populated_rows':sum(bool(r[20]) for r in out)}
(B/'_audit_validation.json').write_text(json.dumps(stats,indent=2),encoding='utf-8')
print(json.dumps(stats,indent=2))
