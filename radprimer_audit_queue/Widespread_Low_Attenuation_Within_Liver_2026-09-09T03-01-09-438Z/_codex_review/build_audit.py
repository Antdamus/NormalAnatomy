from pathlib import Path
from copy import deepcopy
import csv, html, io, json, re, secrets, string

B=Path(__file__).resolve().parent.parent
R=B/'_codex_review'
FIELDS=['Clinical_Context','Image','Image_Annotated','Question','Most_Likely_Diagnosis','Entity_Label','Differential_Q','Differentials','Imaging_Differentiation','Original_Caption','Mechanism_Q','Mechanism','Boards_Trap_Q','Boards_Trap','High_Yield_Q','High_Yield_A','Radiopaedia_Link','Radiopaedia_Case_Context','Radiopaedia_Case_Summary','Radiopaedia_Case_Differential','summary','Tags']
original=json.loads((R/'original_rows.json').read_text(encoding='utf-8'))
metadata=json.loads((B/'metadata.json').read_text(encoding='utf-8'))
registry={e['masterImageId']:e for e in metadata['imageRegistry']}
byfilename={e[v+'Filename']:e for e in registry.values() for v in ['plain','annotated']}
CORE='Captured Core evidence: core_evidence.txt, CORE_FACTS_USED'
BCS='https://karger.com/ddi/article/44/2/192/945160/Ultrasound-Characteristics-of-Budd-Chiari-Syndrome'
TIV='https://edge.sitecorecloud.io/americancoldf5f-acrorgf92a-productioncb02-3650/media/ACR/Files/RADS/LI-RADS/LI-RADS-CT-MRI-2018-Core.pdf'
new_ids_path=R/'new_ids.json'
new_ids=json.loads(new_ids_path.read_text()) if new_ids_path.exists() else {}
existing_ids={r['Clinical_Context'].split()[-1] for r in original}
def new_id(key):
    if key not in new_ids:
        while True:
            candidate=''.join(secrets.choice(string.ascii_uppercase+string.digits) for _ in range(12))
            if candidate not in existing_ids|set(new_ids.values()) and re.search('[A-Z]',candidate) and re.search('[0-9]',candidate): break
        new_ids[key]=candidate
    return new_ids[key]
def original_caption(entry):
    # Caption HTML is immutable source content, including inline arrow icons.
    return entry.get('captionOriginal', entry['caption'])
def image_ids(row):return [byfilename[name]['masterImageId'] for name in re.findall(r'<img\b[^>]*src=["\']([^"\']+)',row['Image'])]
def attach(row,mids):
    row['Image']=''.join(f'<b>Image {i}/{len(mids)}</b><br><img src="{registry[mid]["plainFilename"]}"><br>' for i,mid in enumerate(mids,1))
    row['Image_Annotated']=''.join('<div class="stackItem"><img src="'+registry[mid]['annotatedFilename']+'"><div class="stackCap">'+original_caption(registry[mid])+'</div></div>' for mid in mids)
    row['Original_Caption']='<br>'.join(original_caption(registry[mid]) for mid in mids)

rows=deepcopy(original)
changes={}
def edit(n,reason,**fields):
    rows[n-1].update(fields);changes.setdefault(n,[]).append(reason)

edit(3,'Distinguish the displayed opposed-phase image from the normal in-phase image described but not staged.',
 Imaging_Differentiation='Key imaging findings: Multifocal perivascular low-attenuation foci surround hepatic vessels without narrowing or displacement; the corresponding opposed-phase GRE image shows signal loss.<br>Key differentiators: Preserved vessel course and chemical-shift signal loss support fat. The normal in-phase sequence is described in the source caption but is not separately displayed.<br>Imaging specificity: Supports perivascular steatosis when the CT distribution and chemical-shift findings correspond.')
edit(6,'Preserve the pancreatic-cancer case context without changing the first-field identifier.',
 Question='In this patient with pancreatic cancer and right upper quadrant pain, what is the most likely diagnosis?')
edit(7,'Separate the case-established exposure from the nonspecific imaging appearance.',
 Most_Likely_Diagnosis='Acute toxic hepatic injury (alcohol and acetaminophen exposure in the documented case)')
edit(9,'Remove the claim that ultrasound alone definitively establishes melanoma metastases.',
 Imaging_Differentiation='Key imaging findings: CT resembles steatosis but contains poorly defined hypodense lesions; ultrasound shows innumerable focal hypoechoic lesions without the diffuse increased echogenicity expected for steatosis.<br>Key differentiators: Discrete lesions on companion imaging redirect interpretation from fat toward infiltration.<br>Imaging specificity: The documented case is diffuse melanoma metastases. Ultrasound reveals the lesions but does not establish the primary tumor or histology by appearance alone.')
edit(15,'Clarify that opposed-phase cancellation occurs when fat and water coexist in the same voxel.',
 Mechanism='In steatosis, intracellular fat and water contribute signal within the same imaging voxel. Their signals add on the in-phase acquisition and partially cancel on the opposed-phase acquisition, producing signal loss.<br>The comparison supports microscopic fat in the liver; the surrounding morphology and absence of mass effect help establish steatosis rather than a fat-containing mass.')
edit(16,'The captured Core report lists caudate sparing but not the drainage anatomy. Verify and label the mechanism as outside clarification; make sparing conditional.',
 Mechanism='The caudate lobe has a separate venous route directly into the IVC. When this route remains patent despite obstruction of the major hepatic veins, relative drainage is preserved and compensatory caudate enlargement may develop while the peripheral liver is injured.<br>Imaging consequence: caudate hypertrophy with peripheral volume loss supports the outflow-obstruction pattern; sparing is not guaranteed in every extent of IVC disease.<br><small>Outside clarification: <a href="'+BCS+'">Daza et al., multicenter Budd-Chiari ultrasound study (2026)</a>. The captured Core report supports the appearance, but does not spell out this anatomic mechanism.</small>')
edit(18,'Split noncontrast attenuation assessment from the independent portal-phase criterion; remove the uncaptured 1-HU claim.',
 High_Yield_Q='On unenhanced CT, how does liver attenuation relative to the spleen support steatosis?',
 High_Yield_A='A liver measuring at least 10 HU below the spleen supports steatosis in the captured Core criterion.<br>Use this as an unenhanced-CT comparison. Low attenuation also requires assessment for infiltrative, vascular or necrotic mimics when the morphology or clinical setting is atypical.')
edit(20,'Remove uncaptured renal-cortex comparison, sound-attenuation and deep-visualization elaborations.',
 High_Yield_A='Diffuse increased hepatic echogenicity supports steatosis.<br>In the melanoma case, focal hypoechoic lesions without the expected diffuse echogenicity revealed an infiltrative mimic of fatty liver on CT.')
edit(21,'Use the article-supported fissural/hepatic-vein distribution rather than an uncaptured list of focal-fat locations.',
 High_Yield_A='Geographic or perivascular low attenuation, especially around fissures and hepatic veins, favors fat when vessels traverse the region without narrowing or displacement.<br>Preserved vessel course and absence of mass effect are the practical separators from a true mass; opposed-phase MRI can confirm the fatty component.')
edit(22,'Remove starry-sky ultrasound appearance, which is not explicitly stated in the captured evidence.',
 High_Yield_A='Imaging may be normal. When abnormal, periportal edema and gallbladder wall edema are supportive but nonspecific.<br>Marked low attenuation is not the usual attenuation pattern unless there is sudden massive hepatic necrosis; correlate with the clinical and laboratory picture.')
edit(26,'Keep the useful portal-phase detection fact and remove a separate unsupported list of hypervascular metastatic primaries.',
 High_Yield_A='Most hepatic metastases are hypovascular and are best appreciated on portal-venous-phase CT.<br>When diffuse low attenuation resembles fat, inspect contrast images for focal lesions or mass effect rather than relying on attenuation alone.')
edit(28,'Remove the uncaptured generic target-sign assertion; retain the directly documented melanoma ultrasound discriminator.',
 High_Yield_A='The documented melanoma case shows innumerable focal hypoechoic metastases, without the diffuse increased echogenicity expected for steatosis.<br>Companion ultrasound can therefore expose a metastatic mimic of fatty liver on CT. Focal hypoechoic lesions are not specific for a particular primary tumor.')
edit(30,'Keep captured hypoechoic lymphoma appearance and remove the uncaptured target sign.',
 High_Yield_A='Hepatic lymphoma may be hypoechoic on ultrasound.<br>In a liver that appears diffusely low in attenuation on CT, focal lesions plus splenomegaly or lymphadenopathy raise infiltrative disease. Ultrasound appearance is nonspecific; systemic findings or tissue diagnosis may be required.')
edit(32,'Constrain this card to the explicit article microabscess pattern; remove uncaptured fungal diffusion and ultrasound details.',
 High_Yield_A='In an immunocompromised patient, small discrete hypodense hepatic lesions on CT or T2-hyperintense lesions on MRI may represent microabscesses.<br>The combination of host setting and numerous small focal lesions shifts interpretation away from uncomplicated steatosis. The pattern does not identify the organism.')
edit(33,'Keep HCC contrast discriminators while distinguishing them from an unconfirmed case diagnosis and unstaged ADC verification.',
 High_Yield_A='Look for heterogeneous enhancement, hypervascular foci, mass effect, arterial enhancement and venous/portal washout.<br>These features raise infiltrative tumor, including HCC, rather than uncomplicated fat. HCC certainty depends on the complete study and clinical setting; the supplied composite caption does not explicitly confirm HCC.')
edit(35,'Remove the uncaptured acute edematous-mottled timeline; retain direct outflow obstruction and the documented parenchymal pattern.',
 High_Yield_A='Look for hepatic-vein or IVC obstruction/thrombus, collateral vessels, caudate preservation or hypertrophy, and peripheral hepatic injury or volume loss.<br>Direct demonstration of hepatic venous outflow obstruction is the decisive clue; caudate enlargement alone does not establish the diagnosis.')
edit(36,'Avoid a cross-modality binary rule or treating nonvisualized Doppler flow as sufficient in isolation.',
 High_Yield_A='Absent hepatic venous flow supports outflow obstruction when assessed with the vessel anatomy and any visible hepatic-vein/IVC thrombus.<br>Interpret the flow finding with the complete examination. Passive congestion is supported by dilated hepatic veins/IVC with reflux on contrast imaging, whereas Budd-Chiari centers on obstruction.')
edit(37,'Narrow the card to the contrast-imaging vascular discriminator and label the exact diagnostic definition as outside clarification.',
 High_Yield_Q='On contrast CT or MRI in suspected HCC, what finding distinguishes tumor in vein from simple venous occlusion?',
 High_Yield_A='Definite enhancing soft tissue within the venous lumen establishes tumor in vein. Inspect and report the involved portal veins, hepatic veins or IVC because vascular invasion changes staging and management.<br>Occlusion, diffusion restriction or continuity with a mass alone is suggestive, not definitive; tumor in vein is not exclusive to HCC.<br><small>Outside clarification: <a href="'+TIV+'">ACR LI-RADS CT/MRI v2018, Tumor in Vein, p. 21</a>. The captured Core report names tumor-in-vein criteria but does not reproduce the definition.</small>')

deleted={27:'Delete the generic metastasis-MRI signal card: T1-low/T2-high, melanin and blood-product details are not explicitly given in the captured Core facts or article. A statement that MRI appearances were used is not fact-level evidence. The supported CT/US metastatic recognition teaching remains.'}
audit=[]
for n,row in enumerate(rows,1):
    if n in deleted:
        audit.append({'originalRow':n,'context':original[n-1]['Clinical_Context'],'disposition':'deleted','reason':deleted[n],'sourceBasis':'No explicit fact-level evidence in supplied article or captured Core report.'});continue
    if row['Differentials']:
        row['Imaging_Differentiation']='<b>Mini-differential:</b><br>'+row['Differentials']+'<br><br>'+row['Imaging_Differentiation']
        row['Differentials']=''
    row['Differential_Q']=''
    if row['Image']:
        attach(row,image_ids(row))
    audit.append({'originalRow':n,'context':original[n-1]['Clinical_Context'],'disposition':'revised' if n in changes or row!=original[n-1] else 'retained',
      'reason':' '.join(changes.get(n,[])) or ('Retained the imaging target and case group; moved mini-differential to UNKNOWN back and cleaned caption punctuation.' if n<=14 else 'Passes source support and single-target review.'),
      'sourceBasis':('STATdx selected image captions and shared article interpretation' if n<=14 else CORE+' and shared RadPrimer/STATdx article; bounded outside clarification where labeled')})

# Keep the full repeated article summary, repairing only unsupported or missing content.
summary=original[0]['summary']
summary=summary.replace('Core + RadPrimer + STATdx synthesis.','Core + RadPrimer + STATdx synthesis, limited to the explicitly captured Core facts and supplied article; outside clarifications are labeled on the affected cards.')
summary=summary.replace('Focal fat commonly occurs near the gallbladder fossa, falciform/subcapsular region, and periportal spaces.','The article emphasizes localization around fissures and hepatic veins.')
summary=summary.replace('increased hepatic echogenicity relative to renal cortex with increased sound attenuation.','diffuse increased hepatic echogenicity; discrete hypoechoic lesions without the expected diffuse echogenicity can expose an infiltrative mimic.')
summary=summary.replace('most are hypovascular and best seen on portal venous phase; melanoma is a hypervascular primary. MRI commonly shows T1-low/T2-high lesions, while melanoma can be T1 high from melanin or blood products.','most are hypovascular and best seen on portal venous phase; the documented melanoma CT/US pair shows how companion imaging reveals focal lesions within an apparently fatty liver.')
summary=summary.replace('opportunistic fungal infection may produce tiny hypoenhancing/T2-bright microabscesses.','opportunistic infection may produce small hypodense CT or T2-bright MR lesions representing microabscesses in an immunocompromised host.')
summary=summary.replace('; Core also notes newer work suggesting even 1 HU relative hypoattenuation may represent steatosis.','.')
addition='<br><b>Canonical article differential</b><br><b>Common:</b> steatosis.<br><b>Less common:</b> hepatitis; passive hepatic congestion; hepatic infarction; toxic hepatic injury; hepatic metastases and lymphoma; hepatic sarcoidosis; opportunistic hepatic infection; infiltrative HCC; Wilson disease; radiation hepatitis; Budd-Chiari syndrome; glycogen storage disease.<br><b>Source limits:</b> The article lists Wilson disease and glycogen storage disease in a low-attenuation differential, while the captured Core report describes increased attenuation with copper overload and glycogen excess. Do not turn that source disagreement into a universal attenuation rule. The provided type IV glycogen-storage case shows low attenuation and a caption-labeled adenoma. The CT/MR hepatic-nodule pair has no specified etiology, and the severe-steatosis/cirrhosis composite does not independently establish Wilson disease.'
summary=summary.replace('<br><b>&#x1F4CC; Pearls / Pitfalls</b>',addition+'<br><b>&#x1F4CC; Pearls / Pitfalls</b>')
summary=summary.replace('<li>Do not generalize single-case outcomes or disease associations beyond what is explicitly shown in the source case.</li>','<li>Do not generalize single-case outcomes or disease associations beyond what is explicitly shown in the source case. In the acetaminophen case, CT mimicked steatosis; subsequent liver failure/transplantation and explant necrosis established the diagnosis.</li>')

new=[]
def make(key,kind,source,reason,**values):
    row={f:'' for f in FIELDS};row.update(values);row['Clinical_Context']=values.get('Clinical_Context','').strip()
    row['Clinical_Context']=(row['Clinical_Context']+' ' if row['Clinical_Context'] else '')+new_id(key)
    new.append(row);audit.append({'originalRow':None,'context':row['Clinical_Context'],'disposition':kind,'reason':reason,'sourceBasis':source,'key':key});return row
split=make('portal_attenuation','split',CORE+'; explicit 25-HU portal criterion and reduced reliability after contrast.',
 'Split from original row 18 so a portal-phase threshold is not confused with the unenhanced criterion.',
 High_Yield_Q='How should a liver measuring at least 25 HU below the spleen on portal-venous-phase CT be interpreted?',
 High_Yield_A='The captured Core criterion supports steatosis, but contrast-enhanced attenuation assessment is less reliable than unenhanced CT.<br>Do not interchange this portal-phase threshold with the unenhanced 10-HU comparison. Use morphology and chemical-shift MRI when fat versus infiltration remains uncertain.')

nodule=make('nodules_pair','added','STATdx images 17-18; explicit same-patient captions and master-source uncertainty note.',
 'Restore the omitted CT/MR pair without assigning an unsupported infectious or granulomatous diagnosis.',
 Clinical_Context='36-year-old man with elevated liver enzymes',Question='What hepatic imaging pattern is present, and how specific is it?',
 Most_Likely_Diagnosis='Multifocal hepatic nodules; etiology indeterminate from these findings',
 Imaging_Differentiation='<b>Mini-differential:</b><br>Opportunistic microabscesses in an immunocompromised host<br>Granulomatous disease, including sarcoidosis<br>Metastases or lymphoma<br><br>Key findings: Hepatomegaly with innumerable small hypodense nodules on CT and T2-bright nodules on fat-suppressed MRI in the same patient.<br>Interpretation pivot: Multiple discrete nodules require an infiltrative, infectious or granulomatous differential rather than an automatic diagnosis of diffuse fat. The captions do not establish a particular cause; use clinical/immune status and accompanying organ findings.')
attach(nodule,['SDX-17','SDX-18'])
granuloma=make('granulomas','added','Shared article: Hepatic Sarcoidosis; STATdx image 19 and caption.',
 'Restore the omitted hepatosplenic granulomatous example; retain diagnostic uncertainty.',
 Clinical_Context='Adult patient',Question='What disease pattern is favored by the combined hepatic, splenic and nodal findings?',
 Most_Likely_Diagnosis='Hepatosplenic granulomatous disease; sarcoidosis is a consideration',
 Imaging_Differentiation='<b>Mini-differential:</b><br>Hepatic sarcoidosis<br>Opportunistic infection<br>Lymphoma<br><br>Key findings: Diffuse hepatic low attenuation with tiny hepatic granulomas, larger low-density splenic granulomas and lymphadenopathy.<br>Interpretation pivot: The combined liver/spleen/nodal pattern favors a systemic process over isolated steatosis. Sarcoidosis is the article association; the supplied case caption does not document biopsy confirmation.')
attach(granuloma,['SDX-19'])
tumor=make('infiltrative_composite','added','STATdx image 20; shared article infiltrative HCC differential.',
 'Restore the omitted multipanel tumor-pattern example without asserting a caption-confirmed HCC or inventing an ADC panel.',
 Clinical_Context='Adult patient',Question='What interpretation is favored over uncomplicated steatosis by this contrast-imaging pattern?',
 Most_Likely_Diagnosis='Infiltrative hepatic neoplasm; HCC is an important consideration',
 Imaging_Differentiation='<b>Mini-differential:</b><br>Infiltrative HCC<br>Diffuse metastases<br>Lymphoma<br><br>Key findings: Hypodense regions on CT, high DWI signal with caption-reported restriction, heterogeneous arterial MR enhancement and venous-phase washout.<br>Interpretation pivot: The enhancement pattern raises tumor rather than uncomplicated fat. Keep all four panels together. No ADC panel or definite HCC case diagnosis is supplied; histology and final tumor classification cannot be assigned from the caption alone.')
attach(tumor,['SDX-20'])
glycogen=make('glycogen_mass','added','STATdx image 24: explicitly documented type IV glycogen-storage case and hepatic adenoma.',
 'Restore the omitted focal-mass example within the diffusely abnormal liver; do not test an unsupported universal glycogen-storage attenuation rule.',
 Clinical_Context='28-year-old man with type IV glycogen storage disease',Question='What focal abnormality should not be overlooked within the enlarged low-attenuation liver?',
 Most_Likely_Diagnosis='Focal hepatic mass (hepatic adenoma in the documented case)',
 Imaging_Differentiation='<b>Mini-differential:</b><br>Hepatic adenoma<br>Hepatocellular carcinoma<br><br>Key findings: Hepatomegaly and diffuse low attenuation coexist with a focal hepatic mass.<br>Interpretation pivot: Diffuse parenchymal disease must not distract from the focal lesion. The source caption identifies an adenoma in this type IV case; the single image does not independently establish the mass histology. The HCC alternative is a model-inferred differential based on the focal-mass pattern, not a source-confirmed diagnosis.')
attach(glycogen,['SDX-24'])
pretest=make('treatment_fat','added','Shared article: Steatosis, after chemotherapy or partial/complete pancreatic resection.',
 'Add the missing treatment-history clue because it changes the ranking of new low attenuation versus tumor infiltration.',
 High_Yield_Q='What treatment history raises steatosis as an explanation for new geographic or diffuse hepatic low attenuation?',
 High_Yield_A='Recent chemotherapy or partial/complete pancreatic resection supports steatosis as a possibility.<br>Preserved vessel course without mass effect and opposed-phase signal loss strengthen that interpretation. Treatment history alone does not exclude tumor.')

output=[]
for n,row in enumerate(rows,1):
    if n in deleted:continue
    output.append(row)
    if n==11:output.extend([nodule,granuloma,tumor])
    if n==14:output.append(glycogen)
    if n==18:output.append(split)
output.append(pretest)
for row in output:row['summary']=summary
new_ids_path.write_text(json.dumps(new_ids,indent=2)+'\n',encoding='utf-8')
buf=io.StringIO(newline='');writer=csv.writer(buf,delimiter='\t',lineterminator='\n');writer.writerows([[r[f] for f in FIELDS] for r in output]);tsv=buf.getvalue()
(B/'corrected_cards.tsv').write_text(tsv,encoding='utf-8',newline='\n')
directives=['#separator:tab','#html:true','#notetype:'+metadata['anki']['noteType'],'#deck:'+metadata['anki']['deckName'],'#tags column:22']
(B/'corrected_cards_anki_import.tsv').write_text('\n'.join(directives)+'\n'+tsv,encoding='utf-8',newline='\n')

gates={
 17:('differential discriminator','Both article: mass effect and traversing vessels'),
 18:('modality appearance / interpretation threshold',CORE+': unenhanced liver-spleen difference of at least 10 HU'),
 19:('modality appearance','Both article and Core: opposed-phase signal loss'),
 20:('modality appearance / discriminator','Core: increased echogenicity; STATdx images 12-13'),
 21:('differential discriminator','Both article: fissures/hepatic veins, no mass effect'),
 22:('modality appearance / pitfall','Both article and Core: hepatitis can be normal; edema and massive-necrosis caveat'),
 23:('contrast behavior','Both article and Core: early reflux, dilated veins and nutmeg enhancement'),
 24:('modality appearance','STATdx image 8: Doppler and wedge-shaped CT infarcts'),
 25:('pitfall','Both article; STATdx images 9-11: toxic injury can mimic fat'),
 26:('contrast behavior',CORE+': most metastases hypovascular and best on portal venous phase'),
 28:('modality appearance / discriminator','STATdx images 12-13: melanoma CT/US pair'),
 29:('modality appearance / discriminator','Core explicit hypoenhancement/diffusion restriction; article lymphoma'),
 30:('modality appearance',CORE+': hypoechoic hepatic lymphoma'),
 31:('differential discriminator','Both article: sarcoidosis with liver/spleen granulomas and nodes'),
 32:('pretest clue / modality appearance','Both article: immunocompromised host, hypodense CT/T2-bright microabscess-like lesions'),
 33:('contrast behavior / pitfall','Both article infiltrative HCC and Core arterial enhancement/washout'),
 34:('differential discriminator','Both article; STATdx image 22: radiation-field boundary'),
 35:('modality appearance','Both article and Core: Budd-Chiari obstruction, caudate and peripheral injury'),
 36:('modality appearance','Core: absent hepatic venous flow; article outflow obstruction'),
 37:('report-critical discriminator','Core vascular invasion; labeled ACR LI-RADS outside clarification'),
 38:('report-critical pivot','STATdx image 6: capsular retraction and ascites in fulminant hepatitis')}
highyield=[]
for n,(gate,basis) in gates.items():
    highyield.append({'originalRow':n,'context':rows[n-1]['Clinical_Context'],'gate':gate,'sourceBasis':basis})
highyield.extend([{'originalRow':None,'context':split['Clinical_Context'],'gate':'contrast-phase interpretation pitfall','sourceBasis':CORE+': 25-HU portal criterion and reduced contrast reliability'},
 {'originalRow':None,'context':pretest['Clinical_Context'],'gate':'pretest clue that changes interpretation','sourceBasis':'Both article: chemotherapy and pancreatic-resection association with steatosis'}])
result={'originalNoteCount':38,'correctedNoteCount':len(output),'removedOriginalRows':[27],'splitAddedNotes':1,'newImageRecognitionNotes':4,'newHighYieldNotes':1,
 'fields':FIELDS,'rows':audit,'highYieldGate':highyield,'newIds':new_ids,'imageCoverage':{'originalUsedImages':18,'correctedUsedImages':23,'restoredImageIds':['SDX-17','SDX-18','SDX-19','SDX-20','SDX-24']},
 'coreEvidence':{'accepted':True,'status':'USED','recoveredFromUnwrappedReport':False,'basis':'Named textbook file, liver chapter page ranges and explicit captured fact list; underlying PDF not independently reopened.'},
 'ankiTemplateCheck':{'installedTemplatesVerified':False,'reason':'Local service on 8765 is the review-only bridge (modelTemplates returned HTTP 404); profile directory read was denied.','safeFallback':'Differentials and Differential_Q blank; mini-differentials moved to top of Imaging_Differentiation.','modifiedInstalledNoteType':False},
 'outsideClarifications':[{'originalRow':16,'url':BCS,'claim':'Separate caudate venous drainage and conditional relative preservation/hypertrophy.'},{'originalRow':37,'url':TIV,'claim':'Definite enhancing intravascular soft tissue establishes tumor in vein; occlusion alone does not.'}]}
(R/'row_audit.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(R/'corrected_rows.json').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

report='''# Card-quality audit: Widespread Low Attenuation Within Liver

**43 corrected notes** from 38 originals: one unsupported note removed, one extra note from splitting a CT criterion card, four omitted image-recognition cases restored and one treatment-history interpretation card added. The corrected set contains 18 UNKNOWN/image-recognition notes, 2 Mechanism notes and 23 High-Yield notes. The 22-column schema and order are unchanged.

## Source basis and comparison

Imported the newest completed browser bundle using the repository importer and read the latest-bundle pointer. Compared source_package.txt, generated_cards.tsv, metadata.json, audit_instructions.md and core_evidence.txt. The fused article is exactly the previously reviewed master source for this topic; the surrounding generation prompt is not medical evidence. The canonical RadPrimer hierarchy and supplied target deck are preserved.

The captured Core report says USED, names `junzi-shi-core-radiology-a-visual-approach-to.pdf`, identifies Gastrointestinal Imaging / Liver pages 97–100, 102–109, 116–117 and 121–123, and lists the facts used. It was not recovered through the unwrapped-report fallback. Its explicit facts are accepted as this audit's Core evidence; the underlying textbook PDF was not independently reopened. A card-family label or a statement that appearances were used does not verify an unlisted detail.

## Principal repairs

- Preserved every retained original Clinical_Context and its random-looking unique ID. Six new notes have independent random 12-character IDs. No missing, duplicate or counter-style original ID required repair.
- Removed original row 27's generic metastasis MRI signal recall. The stated T1/T2 and melanin/blood-product details were not explicit in the captured evidence. Supported metastatic CT and ultrasound teaching remains.
- Split original row 18 into unenhanced and portal-venous attenuation interpretation cards. Preserved the captured 10-HU and 25-HU comparisons, with phase/reliability caveats. Removed the uncaptured 1-HU claim from cards and summary.
- Removed uncaptured renal-cortex/acoustic-attenuation, focal-fat location-list, starry-sky, ultrasound target-sign, hypervascular-metastatic-primary list and fungal diffusion/ultrasound embellishments.
- Corrected the claim that ultrasound appearance alone establishes melanoma metastases; separated case-established diagnosis from imaging specificity.
- Clarified opposed-phase fat/water cancellation and conditional caudate preservation. Kept gross explant pathology and the transplant outcome as case-specific evidence.
- Restored four omitted case groups comprising five images: SDX-17/18 together, SDX-19, SDX-20 and SDX-24. Unspecified nodule etiology, unconfirmed HCC and caption-based adenoma remain explicitly qualified. No case was forced into an unsupported diagnosis.
- Added the article-supported chemotherapy/pancreatic-resection clue because it changes interpretation of new low attenuation.
- Moved all 14 original mini-differentials to the top of Imaging_Differentiation; the four new image cases use the same arrangement. Differentials and Differential_Q are blank throughout, preventing unsolicited Differential Drill cards even with the legacy gate. No installed note type was modified.
- Kept the complete repeated summary. Repaired its unsupported statements/source scope and restored the canonical Common/Less Common differential, toxin/explant context and Wilson/glycogen-source disagreement.
- No standalone bookkeeping notes or visible image-reference/URL/filename-list blocks were present. Diagnostic images and useful captions remain; caption punctuation left by stripped arrow icons was repaired.

## Outside clarification

Only two bounded clarifications were added, and both are labeled on the affected answers:

'''
report+=f'- Original row 16: caudate drainage anatomy explains relative preservation when that route remains patent. [Daza et al., 2026, primary multicenter ultrasound study]({BCS}).\n'
report+=f'- Original row 37: definite enhancing soft tissue in a vein establishes tumor in vein; occlusion alone is insufficient. [ACR LI-RADS CT/MRI v2018, printed page 21]({TIV}). This is not labeled Core Radiology evidence.\n'
report+='''
No outside microscopic histology, therapeutic threshold or transplant-selection algorithm was added. The inherited Core report conflicts with the article's Wilson/glycogen low-attenuation framing; the summary describes that disagreement rather than creating a universal disease-attenuation rule.

## Media and case integrity

All 46 selected media files (23 plain and 23 annotated) are present and decode under `C:\\Users\\josem.000\\Downloads\\RadPrimer`. The 23 plain files have the same SHA256 hashes as the master-source evidence already visually reviewed in this task. All 23 annotated renditions were also visually inspected in four review sheets. Every exported image src is an exact, source-qualified filename in metadata.downloadFiles. No optional archive image or unstaged arrow icon is referenced.

The original 14 cases used 18 of the 23 selected images. The corrected 18 cases cover all 23. The CT/MR steatosis and nodules pairs, CT/US melanoma pair, noncontrast/contrast lymphoma pair, CT/explant toxicity pair and every multipanel composite remain intact. Restoring the nodules pair does not make its uncertain etiology certain. The HCC-pattern composite remains a differential teaching example; the glycogen-storage mass is not a universal disease-subtype rule.

The audit bundle itself contains no media folder. Validation uses the staged Downloads media and metadata; presence in Anki's collection.media was not established. No live Anki import or media copying was performed.

## Anki routing and template compatibility

The import file has tab/HTML/note-type/deck headers and `#tags column:22`, followed directly by the corrected data with no field-header row. Target note type: `core_rad_notetype_v2`. Target deck: `Corebook::GI::Liver::Widespread Low Attenuation Within Liver`.

The installed templates could not be verified: the local service is a review bridge rather than AnkiConnect and returned HTTP 404 to the model request; the profile directory was not readable. The explicit user-approved fallback was therefore used: blank both Differential fields and retain the mini-differential at the top of Imaging_Differentiation. This requires no template mutation or additional approval.

The headers preset import routing; installed template deck overrides or updating existing notes in their current decks can affect the final destination. [Anki text-import documentation](https://docs.ankiweb.net/importing/text-files.html).

If the uncorrected file was already imported, omitting original row 27 from this corrected TSV will not delete that existing note. Its first-field ID is **B4M8Q2V7T9RK**. The corrected export preserves all other first fields to support matching updates.

## High-Yield usefulness gate

Every retained or added High-Yield note has a source-supported appearance, contrast behavior, differential discriminator, pitfall, reporting pivot or interpretation-changing pretest clue. Normal hepatitis appearance and the predominance of hypovascular metastases are retained only with their imaging implications; no prevalence-only trivia was added.

| Original row / new ID | Gate | Evidence |
|---|---|---|
'''
report+='\n'.join(f"| {g['originalRow'] or g['context']} | {g['gate']} | {g['sourceBasis']} |" for g in highyield)
report+='\n\n## Row-by-row changes\n\n| Original row / new ID | Disposition | Reason |\n|---|---|---|\n'
report+='\n'.join(f"| {a['originalRow'] or a['context'].split()[-1]} | {a['disposition']} | {a['reason']} |" for a in audit)
report+='''

## Validation and outputs

Machine-readable row decisions, source evidence, IDs and media hashes are retained under _codex_review. validation_results.json records schema/round-trip, import-body, source preservation, unique-ID, one-family-per-note, differential suppression, source-qualified media, summary and complete case-group checks. The completion marker is written only after these checks pass. Validation does not claim to render the installed Anki template.

- corrected_cards.tsv
- corrected_cards_anki_import.tsv
- audit_report.md
- _codex_audit_done.txt
'''
(B/'audit_report.md').write_text(report,encoding='utf-8',newline='\n')
print(json.dumps({'notes':len(output),'unknown':sum(bool(r['Question']) for r in output),'mechanism':sum(bool(r['Mechanism_Q']) for r in output),'highYield':sum(bool(r['High_Yield_Q']) for r in output),'newIds':len(new_ids)}))
