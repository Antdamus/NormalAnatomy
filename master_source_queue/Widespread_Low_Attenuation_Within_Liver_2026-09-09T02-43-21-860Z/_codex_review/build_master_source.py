from pathlib import Path
from datetime import datetime, timezone
from copy import deepcopy
import hashlib, json, re

B = Path(__file__).resolve().parent.parent
R = B / '_codex_review'
def read(name): return json.loads((B/name).read_text(encoding='utf-8-sig'))
def write(name, obj): (B/name).write_text(json.dumps(obj, ensure_ascii=False, indent=2)+'\n', encoding='utf-8', newline='\n')
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def ids(nums, prefix='SDX'): return [f'{prefix}-{n:02}' for n in nums]
def label(mid): return ('RadPrimer' if mid.startswith('RP') else 'STATdx') + ' image ' + str(int(mid.split('-')[1]))
def labels(mids): return ', '.join(map(label,mids))
def clean(s): return re.sub(r'\s+', ' ', re.sub(r'<img\b[^>]*>', '', s)).strip()

m, rp, sd = [read(n) for n in ['metadata.json','RadPrimer_metadata.json','STATdx_metadata.json']]
raw = rp['imageRegistry'] + sd['imageRegistry']
byid = {e['masterImageId']:e for e in raw}
audit = {e['masterImageId']:e for e in read('_codex_review/image_file_audit.json')}
now = datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00','Z')
rt, st = [(B/(n+'_source_package.txt')).read_text(encoding='utf-8-sig') for n in ['RadPrimer','STATdx']]
ra, sa = [t.split('=== ARTICLE ===')[1].split('=== IMAGES')[0].strip() for t in [rt,st]]
essential = ra.split('ESSENTIAL INFORMATION',1)[1].strip()
assert essential == sa.split('ESSENTIAL INFORMATION',1)[1].strip()
assert m['canonicalHierarchy'] == rp['breadcrumbTrail']
for source, meta, txt in zip(m['sources'], [rp,sd], [rt,st]):
    assert source['metadata'] == meta and source['imageRegistry'] == meta['imageRegistry']
    caps = re.findall(r'IMAGE_(\d+):[^\n]*\n.*?    Caption: (.*?)(?=\n\nIMAGE_|\n\n=== SOURCE ATTRIBUTION)',txt,re.S)
    assert len(caps)==len(meta['imageRegistry'])
    for (n,cap),e in zip(caps,meta['imageRegistry']):
        assert int(n)==e['sourceImageNumber'] and cap.strip()==e['caption'].strip()
assert read('image_evidence_manifest.json') == m['imageEvidence']

# These observations record completed visual review of all 44 staged image files.
pairnums = [1,2,3,4,6,7,8,9,12,13,14,15,17,18,19,20,21,22,23,24]
observations = [
 'Same axial CT slice: identical geographic anterior/medial low attenuation, traversing vessels, stomach and vertebra.',
 'Same four-panel composite: crescentic fat on CT, opposed-phase dropout and arterial/venous MR comparison; identical dividers and anatomy.',
 'Same axial CT slice: identical perivascular low-attenuation foci and undisplaced vessels.',
 'Same opposed-phase MR slice with identical perivascular signal-loss foci and organ contours.',
 'Same hepatic-dome CT slice with identical left-lobe retraction, low attenuation and surrounding ascites.',
 'Same CT slice with identical opacified dilated hepatic veins/IVC and mottled hepatic enhancement.',
 'Same four-panel Doppler/portal-vein CT/arterial CT/venous CT composite, including identical color-flow display and wedge-shaped defects.',
 'Same axial CT slice with identical hepatomegaly, heterogeneous low attenuation and portal branching.',
 'Same axial CT slice with identical subtle hepatic lesions, gastric contrast and upper-abdominal anatomy.',
 'Same transverse ultrasound frame with identical numerous hypoechoic lesions, speckle pattern and field boundaries.',
 'Same noncontrast CT slice with identical enlarged low-attenuation liver, spleen and enteric tube.',
 'Same contrast CT slice with identical liver/splenic lesions, organ contours and enteric tube.',
 'Same noncontrast CT slice with identical innumerable tiny nodules, liver contour and splenic appearance.',
 'Same fat-suppressed T2 MR slice with identical bright hepatic nodules and anatomic landmarks.',
 'Same contrast CT slice with identical small hepatic and larger splenic granulomas and nodal pattern.',
 'Same four-panel CT/DWI/arterial MR/venous MR composite with identical lesion, anatomy and dividers.',
 'Same four-panel CT/in-phase MR/opposed-phase MR/elastogram composite, including identical color stiffness map.',
 'Same coronal CT reconstruction with identical straight inferior hepatic demarcation and surgical clips.',
 'Same axial CT slice with identical enlarged caudate, peripheral hypoattenuation and vascular anatomy.',
 'Same coronal CT reconstruction with identical enlarged low-attenuation liver, focal lesion and bowel configuration.'
]
coverage=[]
for i,(sn,note) in enumerate(zip(pairnums,observations),1):
    rid,sid=f'RP-{i:02}',f'SDX-{sn:02}'
    assert byid[rid]['imageId']==byid[sid]['imageId']
    coverage.append({'radPrimerImageId':rid,'statdxImageIds':[sid], 'classification':'exactDuplicate',
      'classificationLabel':'exact duplicate','confidence':'high','replacementImageId':sid,
      'reason':'Same stable publisher image ID and visually identical image/slice/composite. Different source rendering size/compression does not create another example.',
      'visualObservation':note,'evidence':{'sameStableSourceImageId':byid[rid]['imageId'],
        'radPrimerEvidence':audit[rid],'statdxEvidence':audit[sid],
        'byteIdentical':audit[rid]['sha256']==audit[sid]['sha256'],
        'visualReviewCompleted':True,'contactSheet':f'_codex_review/paired_{(i-1)//4+1:02}.jpg'},
      'radPrimerDisposition':'archiveOptionalDuplicate','statdxDisposition':'primaryTeachingSet'})
extra_duplicate={'archivedImageId':'SDX-05','selectedImageId':'SDX-01','classification':'exactDuplicate',
 'reason':'Exact duplicate of the same CT slice/screenshot, with only rendition sharpness/compression and caption differences. This is not an adjacent slice or a second patient.',
 'evidence':{'visualReviewCompleted':True,'sameStableSourceImageId':False,'byteIdentical':False,
  'images':[audit['SDX-01'],audit['SDX-05']],
  'visualObservation':'Full-size views have identical vessel branches within the geographic fatty region, portal bifurcation, aorta, stomach contrast outline, vertebral trabeculae, ribs and skin contour. Image 5 is softer; it adds no distinct anatomy.',
  'contactSheets':['_codex_review/paired_01.jpg','_codex_review/statdx_additions.jpg'],
  'originalFilesViewedIndividually':True}}

# Source group fields are empty; explicit captions and visible composites supply grouping evidence.
specs=[
 ('geographic_steatosis',[1,5], 'Geographic steatosis','Axial CECT',
  'Preserve the geographic low attenuation and vessels crossing without mass effect. The repeated standalone view adds no phase, slice, or follow-up.',
  'Visual identity of repeated source views; no temporal/procedure companion stated.'),
 ('fat_perfusion_composite',[2], 'Crescentic fat with transient adjacent enhancement','NECT, opposed-phase MR, arterial/venous MR composite',
  'Keep all four panels together: fat on NECT, opposed-phase dropout, arterial enhancement and venous blending.', 'Caption and visible four-panel composite.'),
 ('perivascular_fat',[3,4], 'Perivascular steatosis','CECT and opposed-phase GRE MR',
  'Same patient: CT foci surround undisplaced vessels; opposed-phase MR shows dropout. Normal in-phase MR is described but not separately staged.', 'Explicit same-patient caption in image 4.'),
 ('fulminant_hepatitis',[6], 'Acute fulminant hepatitis','Axial CECT',
  'Preserve low attenuation, left-lobe volume loss, capsular retraction and ascites in the source case.', 'Explicit source caption.'),
 ('passive_congestion',[7], 'Passive hepatic congestion','Arterial-phase CECT',
  'Preserve early retrograde contrast in dilated hepatic veins/IVC and heterogeneous hepatic enhancement.', 'Explicit source caption.'),
 ('infarction_composite',[8], 'Hepatic infarction','Doppler US and multiphase CT composite',
  'Keep all four panels and the 63-year-old pancreatic-cancer/RUQ-pain context. Preserve absent Doppler flow, portal filling defect and arterial/venous wedge-shaped infarcts.', 'Caption and visible four-panel composite.'),
 ('combined_toxicity',[9], 'Acute alcohol and acetaminophen toxicity','Axial CECT',
  'Retain the fatal source case with hepatomegaly, heterogeneous low attenuation, periportal edema and ascites; do not conflate it with the separate transplant case.', 'Explicit source caption; no same-patient link to images 10-11.'),
 ('toxic_necrosis_explant',[10,11], 'Acetaminophen toxicity with massive hepatocellular necrosis','CECT followed by gross explant photograph',
  'Same patient: CT mimicked steatosis; later ascites/liver failure led to urgent transplantation. Keep CT with the explanted liver demonstrating hemorrhagic necrosis. This is a case outcome, not a general treatment rule.', 'Explicit same-patient caption in image 11 and course in image 10.'),
 ('melanoma_ct_us',[12,13], 'Diffuse melanoma metastases','CECT and transverse US',
  'Same patient: CT resembles steatosis but contains subtle lesions; US confirms numerous focal hypoechoic metastases without the expected diffuse increased echogenicity of steatosis.', 'Explicit same-patient caption in image 13.'),
 ('lymphoma_ne_ct',[14,15], 'Non-Hodgkin lymphoma','NECT and CECT',
  'Same patient: NECT mimics fatty liver; CECT reveals numerous liver/splenic lesions. Biopsy-confirmed lymphoma belongs to this pair.', 'Explicit same-patient caption in image 15.'),
 ('lymphoma_alternate',[16], 'Non-Hodgkin lymphoma, additional example','Axial NECT',
  'Retain the distinct low-attenuation liver-and-spleen example for recognition reinforcement. No same-patient or follow-up relationship to images 14-15 is documented.', 'Explicit caption diagnosis; distinct anatomy on visual review.'),
 ('nodules_ct_mr',[17,18], 'Multiple hepatic nodules: etiology not specified in captions','NECT and T2 fat-suppressed MR',
  'Same 36-year-old patient with elevated liver enzymes: innumerable CT nodules and T2-bright MR nodules. Preserve the pair without asserting a proven infectious or granulomatous cause.', 'Explicit same-patient caption in image 18; diagnosis absent from both captions and registry group fields.'),
 ('granulomas_liver_spleen',[19], 'Hepatic/splenic granulomas with lymphadenopathy','Axial CECT',
  'Preserve small hepatic and larger splenic granulomas plus lymphadenopathy. This supports the article sarcoidosis differential; no biopsy confirmation is supplied.', 'Caption describes granulomas; article supplies sarcoidosis association.'),
 ('infiltrative_pattern',[20], 'Infiltrative tumor pattern: HCC in the article differential','CT, DWI and contrast MR composite',
  'Keep all four panels: hypodense CT regions, caption-reported diffusion restriction, arterial heterogeneity and venous washout. HCC is an article-level interpretation, not an explicit case diagnosis in this caption.', 'Visible composite and source caption; diagnosis inferred only from article context.'),
 ('fat_cirrhosis_elastogram',[21], 'Severe steatosis and cirrhosis; Wilson disease in article context','NECT, in/opposed-phase MR and MR elastography composite',
  'Keep all four panels. Caption supports severe steatosis and cirrhosis; the phrase the disease is unnamed. Do not claim independently confirmed Wilson disease or invent stiffness thresholds.', 'Visible composite and caption; Wilson disease link is contextual, not explicit case confirmation.'),
 ('radiation_field',[22], 'Radiation hepatitis','Coronal CECT',
  'Preserve straight field-boundary demarcation after radiotherapy for cholangiocarcinoma.', 'Explicit source caption and article context.'),
 ('budd_chiari',[23], 'Budd-Chiari pattern','Axial CECT',
  'Preserve thrombosed major hepatic veins, narrowed IVC, caudate hypertrophy and peripheral volume/attenuation loss from steatosis and necrosis.', 'Caption findings and article differential; no serial images supplied.'),
 ('glycogen_storage',[24], 'Type IV glycogen storage disease','Coronal CECT',
  'Retain the 28-year-old source case with hepatomegaly, low attenuation and a caption-labeled hepatic adenoma. Do not generalize the association or attenuation pattern to all glycogen storage diseases.', 'Explicit source caption.')
]
primary=ids([n for n in range(1,25) if n!=5])
archive=ids(range(1,21),'RP')+['SDX-05']
mapping={f'RP-{i:02}':f'SDX-{sn:02}' for i,sn in enumerate(pairnums,1)}
clusters=[]; cluster_by_id={}
for key,nums,topic,modality,context,basis in specs:
    members=ids(nums); rpmembers=[r for r,s in mapping.items() if s in members]
    cl={'clusterId':key,'topic':topic,'modalities':modality,'atomic':True,'context':context,'groupingEvidence':basis,
      'sourceMembers':{'RadPrimer':rpmembers,'STATdx':members},
      'selectedImageIds':[s for s in members if s in primary],
      'archiveImageIds':rpmembers+([s for s in members if s in archive]),
      'replacementMappings':[{'archivedImageId':r,'selectedImageId':mapping[r]} for r in rpmembers],
      'preserveAllCompositePanels':key in ['fat_perfusion_composite','infarction_composite','infiltrative_pattern','fat_cirrhosis_elastogram']}
    if key=='geographic_steatosis':cl['replacementMappings'].append({'archivedImageId':'SDX-05','selectedImageId':'SDX-01'})
    clusters.append(cl)
    for mid in rpmembers+members:cluster_by_id[mid]=cl

registry=[]
for entry in raw:
    e=deepcopy(entry);mid=e['masterImageId'];cl=cluster_by_id[mid]
    e['displayLabel']=label(mid)
    e['originalPlainFilename']=e['plainFilename']; e['originalAnnotatedFilename']=e['annotatedFilename']
    for variant in ['plain','annotated']: e[variant+'Filename']=f"{mid}_{e['sourceLabel']}_{variant}_{entry[variant+'Filename']}"
    e['filename']=e['plainFilename']
    e['group']=cl['clusterId'];e['caseClusterId']=cl['clusterId'];e['caseContext']=cl['context']
    e['companionImageIds']=[x for x in cl['selectedImageIds'] if x!=mid]
    e['sourceCompanionImageIds']=[x for x in cl['sourceMembers'][e['sourceLabel']] if x!=mid]
    e['topic']=cl['topic'];e['modalities']=cl['modalities'];e['groupingEvidence']=cl['groupingEvidence']
    e['teachingCaption']=clean(e['caption'])
    # Make source-relative same-patient phrases self-contained in the selected library.
    same_patient={4:3,11:10,13:12,15:14,18:17}
    if mid.startswith('SDX') and e['sourceImageNumber'] in same_patient:
        previous=same_patient[e['sourceImageNumber']]
        e['teachingCaption']=re.sub(r'(?i)the same patient',f'the same patient as STATdx image {previous}',e['teachingCaption'])
    e['annotationReferences']=re.findall(r'<img\b[^>]*src="([^"]+)"[^>]*>',e['caption'])
    e['captionProvenance']={'file':e['sourceLabel']+'_source_package.txt','imageNumber':e['sourceImageNumber'],'rawCaptionPreserved':True}
    e['visualEvidence'].update({k:v for k,v in audit[mid].items() if k not in ['masterImageId','imageId']})
    e['visualEvidence'].update({'visuallyInspected':True,'inspectionScope':'Staged plain rendition; annotated rendition URLs retained but annotated files were not staged or reviewed.'})
    e['downloadRecommendation']='primaryTeachingSet' if mid in primary else 'archiveOptionalDuplicate'
    e['usedFor']=['imageRecognition','differentialDiscrimination'] if mid in primary else []
    e['role']='canonicalExample' if mid in primary else 'exactDuplicateRecovery'
    if mid in ['SDX-02','SDX-03','SDX-04','SDX-09','SDX-10','SDX-16']:
        e['usedFor']+=['recognitionReinforcement','alternateExample'];e['role']='recognitionReinforcement'
    if mid=='SDX-11':e['usedFor']=['recognitionReinforcement','grossPathologyCorrelation','samePatientOutcome'];e['role']='recognitionReinforcement'
    if len(cl['selectedImageIds'])>1 and mid in primary:e['usedFor'].append('caseClusterCompanion')
    if cl['preserveAllCompositePanels'] and mid in primary:e['usedFor'].append('multimodalityComposite')
    if mid in mapping:
        row=next(c for c in coverage if c['radPrimerImageId']==mid)
        e['duplicateOf']=mapping[mid];e['duplicateEvidence']=row['evidence'];e['duplicateClassification']='exactDuplicate'
        e['archiveReason']='Exact duplicate: same publisher image ID and same image/slice/composite as '+label(mapping[mid])+'. Whole equivalent case cluster is retained in STATdx.'
    elif mid=='SDX-05':
        e['duplicateOf']='SDX-01';e['duplicateEvidence']=extra_duplicate['evidence'];e['duplicateClassification']='exactDuplicate';e['archiveReason']=extra_duplicate['reason']
    else:
        e['equivalentSourceImageIds']=[r for r,s in mapping.items() if s==mid]+(['SDX-05'] if mid=='SDX-01' else [])
        e['selectionReason']='Verified equivalent image in a complete case cluster; STATdx staged plain rendition is 1000 x 1000 versus RadPrimer 900 x 900. No additional native detail is assumed from dimensions alone.' if e['equivalentSourceImageIds'] else 'Distinct source example or companion with no exact duplicate among the RadPrimer images.'
    registry.append(e)

new_relations=[
 {'statdxImageId':'SDX-05','comparedWithImageIds':['RP-01','SDX-01'],'classification':'exactDuplicate','disposition':'archiveOptionalDuplicate','evidence':extra_duplicate['evidence']},
 {'statdxImageId':'SDX-10','comparedWithImageIds':['RP-08','SDX-09'],'classification':'conceptualReplacement','disposition':'primaryTeachingSet','reason':'Different CT anatomy and clinical course; adds transplant-linked massive necrosis. Same disease family is not image identity.'},
 {'statdxImageId':'SDX-11','comparedWithImageIds':[],'classification':'notCovered','disposition':'primaryTeachingSet','reason':'Gross explant photograph absent from RadPrimer; atomic companion to STATdx image 10.'},
 {'statdxImageId':'SDX-16','comparedWithImageIds':['RP-11','RP-12','SDX-14','SDX-15'],'classification':'conceptualReplacement','disposition':'primaryTeachingSet','reason':'Distinct NECT anatomy with low attenuation of liver and spleen; keep as an additional lymphoma recognition example.'}
]
split={'clusterId':'geographic_steatosis','archivedImageId':'SDX-05','retainedImageIds':['SDX-01'],
 'safeSplitReason':'STATdx images 1 and 5 are the same CT slice/screenshot. Retaining image 1 preserves all anatomy and vessel/no-mass-effect teaching. Image 5 has no distinct phase, slice, follow-up or procedure role, and its shorter caption adds no separate clinical fact. This is the only intentional source-cluster selected/archive split.'}
files=[]
for e in registry:
    if e['masterImageId'] not in primary:continue
    for v in ['plain','annotated']:
        files.append({'masterImageId':e['masterImageId'],'sourceKind':e['sourceKind'],'sourceLabel':e['sourceLabel'],'sourceImageNumber':e['sourceImageNumber'],
          'variant':v,'filename':e[v+'Filename'],'url':e[v+'Url'],'downloadRecommendation':'primaryTeachingSet'})

plan={
 'recommendation':'Merged source text with RadPrimer hierarchy/differential backbone and curated STATdx image renditions.',
 'textSelection':{
  'RadPrimer':{'keep':['Exact canonical hierarchy and metadata canonical deck path','Common/less-common differential ordering','Complete Essential Information, shared verbatim by both articles','All unique image-caption information through exact cross-source mapping'],
    'downweightOrSkip':['Repeated copy of the shared Essential Information','Source extraction prompts and UI instructions','Stale manualDeckRoot setting unrelated to this topic','Unverified Core cross-check request']},
  'STATdx':{'keep':['Caption depth from images 10-11: imaging-to-gross-pathology correlation and documented transplant outcome','Image 16: distinct lymphoma example','Complete equivalent same-patient and composite clusters','1000-pixel staged image renditions'],
    'downweightOrSkip':['Second copy of shared article text','Image 5 as a default teaching image because the same slice is retained as image 1','STATdx breadcrumb as routing root']}},
 'imageCurationPolicy':'Archive only verified exact image/slice/screenshot duplicates or unusable files. Retain near duplicates, alternate patients, slices, projections, modalities, stages and conceptual replacements as recognition reinforcement. No unusable image was found.',
 'duplicateEvidencePolicy':'Exact duplicate decisions require actual staged image review, stable source image IDs, image hashes, or explicit source/manual evidence. All 44 plain files were visually inspected. The 20 cross-source pairs share stable IDs and visual identity; SHA256 hashes differ across renditions and are not asserted equal. STATdx image 5 was separately verified by full-size same-slice visual comparison despite a different ID. Captions alone never establish identity.',
 'caseClusterGuardrails':{'atomicRule':'Keep complete same-patient, follow-up, procedure, adjacent-slice, comparison-view and multipanel clusters. Replace a source cluster only by a complete equivalent cluster. Preserve described-but-unstaged companion context without inventing files.',
  'sourceGroupFields':'Empty for all 44 source entries; inferred grouping is explicitly documented.',
  'intentionalSplits':[split],'equivalentClusterReplacements':'All RadPrimer groups are archived only after their complete equivalent STATdx groups are selected. No temporal/procedure companion is dropped.',
  'timeLapseAndProcedureContext':'No standalone time-lapse sequence supplied. Preserve arterial/venous comparisons, post-radiotherapy context and the CT-to-transplant/explant sequence.'},
 'imageDownloadPlan':{'primaryTeachingSet':{'RadPrimer':[],'STATdx':primary},'archiveOptionalDuplicates':{'RadPrimer':ids(range(1,21),'RP'),'STATdx':['SDX-05']},
  'recognitionReinforcement':{'STATdx':[e['masterImageId'] for e in registry if 'recognitionReinforcement' in e['usedFor']]},
  'selectedImageCount':23,'archiveImageCount':21,'primaryVariantFileCount':46,'variants':['plain','annotated'],
  'defaultBehavior':'Download both known variants only for selected primary IDs. Optional archives are excluded by default. Preserve composite files intact.',
  'filenamePolicy':'<masterImageId>_<sourceLabel>_<variant>_<originalFilename>; all 88 potential variant names remain unique.',
  'files':files,'annotatedEvidenceStatus':'Annotated URLs retained from source metadata; only plain evidence files were staged and reviewed.'},
 'generatorInstructions':{
  'scopeNow':'Master-source synthesis only; do not generate cards or a lecture.',
  'routing':'Use manifest canonicalHierarchy exactly and the supplied canonicalDeckPath. Any future IMAIOS chunks inherit this hierarchy plus only a local parent group; do not substitute STATdx breadcrumbs.',
  'narrative':['Use the RadPrimer differential order and explain discriminating imaging clues using the selected image library.','Use a single clean source-qualified display label per image reference; short IDs belong in filenames and traceability.','Keep case groups and all composite panels together. Discuss the toxicity transplant as the source case outcome.'],
  'cards':['If separately requested later, prioritize image recognition and management-relevant interpretation supported by the sources.','Use selected primary images and their exact qualified filenames; retain reinforcement examples.','Resolve same-patient phrases with named companions; do not invent a missing in-phase MR or ADC image.','Do not convert indeterminate caption diagnoses, exposure lists, disease lists, or single-case transplant outcomes into unsupported standalone facts.'],
  'limitations':['Core Radiology evidence is not supplied or verified; Corebook is a routing label only.','No formal management algorithm, microscopic histology, or nuclear-medicine protocol is supplied.','The CT/MR nodules pair lacks a definite etiology. HCC and Wilson links in the relevant composites are article-context associations rather than explicit caption-confirmed case diagnoses.']}}

claims=[
 {'id':'differential_order','sourceLabels':['RadPrimer'],'sourceFiles':['RadPrimer_source_package.txt'],'locator':'ARTICLE > DIFFERENTIAL DIAGNOSIS','use':'Canonical common/less-common list.'},
 {'id':'essential_information','sourceLabels':['RadPrimer','STATdx'],'sourceFiles':['RadPrimer_source_package.txt','STATdx_source_package.txt'],'locator':'ARTICLE > ESSENTIAL INFORMATION','use':'Exact shared text, included once with Both attribution.'},
 {'id':'toxic_necrosis_outcome','sourceLabels':['STATdx'],'masterImageIds':['SDX-10','SDX-11'],'use':'Case-specific CT mimic, massive necrosis, subsequent liver failure/transplantation and gross pathology.'},
 {'id':'lymphoma_reinforcement','sourceLabels':['STATdx'],'masterImageIds':['SDX-16'],'use':'Distinct liver-and-spleen low-attenuation NECT example.'}
]
manifest={'version':1,'articleTitle':m['articleTitle'],'createdAt':now,'canonicalHierarchy':deepcopy(m['canonicalHierarchy']),
 'canonicalHierarchySource':deepcopy(m['canonicalHierarchySource']),'canonicalDeckPath':m['canonicalDeckPath'],
 'sourcePriority':{'hierarchy':'RadPrimer','differentialBackbone':'RadPrimer','sharedEssentialInformation':'Both','supplementalDepth':'STATdx','selectedImageRenditions':'STATdx after evidence-backed complete coverage gate'},
 'sourceCoverage':{'imageCoverageGate':{'performedBeforeMerge':True,'statdxFullyCoversRadPrimerImageSet':True,'radPrimerImageCoverage':coverage,
    'classificationCounts':{'exactDuplicate':20,'nearDuplicate':0,'conceptualReplacement':0,'notCovered':0}},
  'textComparison':{'essentialInformationIdentical':True,'radPrimerOnly':'Explicit ranked differential list.','statdxAdditionalDepth':'Caption material: transplant-linked toxicity CT/explant pair and alternate lymphoma NECT.','metadataConsistency':'Both embedded source metadata objects/registries and the top image evidence manifest match their standalone files.'},
  'statdxAdditionalEntryAssessment':new_relations,'statdxAdditionalSelectedEntries':['SDX-10','SDX-11','SDX-16'],
  'sourceLimitations':plan['generatorInstructions']['limitations']},
 'imageCountBySource':{'RadPrimer':20,'STATdx':24},'selectedImageCountBySource':{'RadPrimer':0,'STATdx':23},
 'archiveImageCountBySource':{'RadPrimer':20,'STATdx':1},'totalSourceImageCount':44,'totalSelectedImageCount':23,'primaryVariantDownloadCount':46,
 'sourceAttributionRules':['Use [RadPrimer], [STATdx] and [Both] for text claims.','Use RadPrimer image N or STATdx image N in prose; keep RP/SDX IDs in metadata and filenames.','Shared publisher images are not independent diagnostic corroboration.','Corebook routing does not verify Core Radiology support.'],
 'sourceAttribution':[{'sourceKind':s['sourceKind'],'sourceLabel':s['sourceLabel'],'sourceUrl':s['sourceUrl'],'cachedAt':s['cachedAt'],'packageFile':s['sourceLabel']+'_source_package.txt','metadataFile':s['sourceLabel']+'_metadata.json'} for s in m['sources']],
 'claimProvenance':claims,'caseClusters':clusters,'additionalDuplicateDecisions':[extra_duplicate],
 'selectedPrimaryImageIds':primary,'archiveOptionalImageIds':archive,'sourceSelectionPlan':plan,
 'coreValidation':{'status':'notVerified','suppliedAuditableCoreEvidence':False,'reason':'Packages contain a request to find Core content, but no retrieved Core pages or citations.'},
 'reviewEvidence':{'all44PlainImagesVisuallyInspected':True,'auditFile':'_codex_review/image_file_audit.json','contactSheets':[f'_codex_review/paired_{i:02}.jpg' for i in range(1,6)]+['_codex_review/statdx_additions.jpg']},
 'inputFiles':[{'filename':n,'sha256':sha(B/n)} for n in ['RadPrimer_source_package.txt','STATdx_source_package.txt','RadPrimer_metadata.json','STATdx_metadata.json','metadata.json','master_source_request.md','image_evidence_manifest.json']]}

differential=ra.split('DIFFERENTIAL DIAGNOSIS',1)[1].split('ESSENTIAL INFORMATION',1)[0].strip()
parts=[f'=== TOPIC ===\nPRIMARY TOPIC: {m["articleTitle"]}\nSOURCE BASIS: RadPrimer + STATdx master source\nPurpose: curated upstream source package for later image-recognition learning. No cards or lecture are generated.',
 '=== CANONICAL RADPRIMER HIERARCHY ===\n'+' > '.join(m['canonicalHierarchy'])+'\ndeckPath: '+m['canonicalDeckPath']+'\nRouting is copied from metadata.json. Corebook is a deck root, not a claim of Core Radiology verification.',
 '=== SOURCE SELECTION ===\n[RadPrimer] Canonical hierarchy, ranked differential and article backbone.\n[Both] Essential Information is identical in the two extracts and is retained once.\n[STATdx] Selected image renditions cover the entire RadPrimer image set, with the same publisher IDs and visually matching images. Three distinct additional entries retain the CT-to-explant toxicity case and an alternate lymphoma example.\n23 images are selected; 21 literal duplicate renditions remain in the optional recovery registry. Each whole RadPrimer case group has an equivalent selected STATdx group.',
 '=== DIFFERENTIAL DIAGNOSIS [RadPrimer] ===\n'+differential,
 '=== ESSENTIAL INFORMATION [Both] ===\n'+essential,
 '=== INTEGRATED IMAGE-INTERPRETATION NOTES ===\n'
 '[Both] Steatosis: prioritize geographic/perivascular distribution, vessels passing without displacement and opposed-phase signal loss. STATdx images 1-4 retain different patterns and CT/MR confirmation. The arterial/venous comparison in STATdx image 2 shows transient adjacent enhancement.\n'
 '[Both] Hepatitis/toxicity: diffuse low attenuation alone can resemble steatosis; retain edema, ascites, volume loss and exposure context. STATdx image 6 illustrates fulminant hepatitis and image 9 the separate fatal alcohol/acetaminophen case.\n'
 '[STATdx] STATdx images 10-11 add a different patient whose CT appearance was indistinguishable from steatosis but whose explant showed massive hemorrhagic necrosis and acute inflammation. Subsequent ascites/liver failure and urgent transplantation are this case\'s clinical course. Preserve CT and gross specimen together.\n'
 '[Both] Vascular clues: distinguish early reflux into dilated hepatic veins/IVC and mottled congestion in STATdx image 7 from the flow defect and wedge-shaped infarcts in STATdx image 8. STATdx image 23 preserves the thrombosed hepatic veins, narrowed IVC, enlarged caudate and peripheral injury pattern.\n'
 '[Both] Infiltration can mimic fat on CT: the melanoma CT/US pair is STATdx images 12-13, and the noncontrast/contrast lymphoma pair is STATdx images 14-15. Their companion examinations expose focal lesions. [STATdx] Retain image 16 as a distinct lymphoma recognition example.\n'
 '[Both] Granulomatous and infectious considerations: the article describes hepatic/splenic granulomas and nodes for sarcoidosis, and microabscess-like lesions in immunocompromised patients. STATdx image 19 supplies granulomas/nodal context. Images 17-18 are a same-patient CT/MR nodules pair with no definite cause named in the supplied captions; preserve that uncertainty.\n'
 '[Both] The infiltrative-HCC differential includes heterogeneity, hypervascular foci and mass effect on contrast imaging. STATdx image 20 contributes a CT/diffusion/arterial/venous composite; restricted diffusion is caption-reported, and no ADC panel is supplied. Its caption does not explicitly confirm HCC.\n'
 '[Both] Wilson disease is listed as a low-attenuation differential. STATdx image 21 shows caption-supported severe steatosis/cirrhosis and an elastogram, but the caption leaves the disease unnamed. Treat a Wilson association as article context, not proven case identification.\n'
 '[Both] A sharply demarcated radiation field helps distinguish radiation hepatitis; STATdx image 22 preserves the post-treatment context. The type IV glycogen-storage case in STATdx image 24 explicitly includes an adenoma; keep that statement case-specific.',
 '=== MODALITY AND EVIDENCE LIMITS ===\n'
 '[Both] NECT may show fat-like low attenuation in steatosis, lymphoma and other infiltrative processes. Contrast imaging, ultrasound and MR provide the specific comparisons staged here.\n'
 '[Both] Ultrasound material comprises Doppler infarction assessment and the melanoma metastasis comparison. MR material includes chemical shift, T2 fat suppression, diffusion, enhancement phases and elastography. No numerical MR stiffness cutoff is supplied.\n'
 '[STATdx] Pathology support is a gross explant photograph and caption-described necrosis/inflammation; microscopic histology is not supplied. The source gives a transplant outcome, not general transplant criteria.\n'
 'No auditable Core Radiology evidence, nuclear-medicine protocol or formal management algorithm is supplied. Do not add unsupported mechanisms, histology, thresholds or treatment advice.',
 '=== ATOMIC CASE AND COMPOSITE GROUPS ===\n'+'\n'.join(f"[STATdx] {labels(c['selectedImageIds'])}: {c['context']}" for c in clusters),
 '=== SELECTED IMAGE LIBRARY ===\nSource-qualified filenames are download targets; source arrow-icon markup is preserved in the registry raw captions. Plain staged images were reviewed; annotated URLs are retained for later downloads.'
]
for e in registry:
    if e['masterImageId'] not in primary:continue
    parts.append(f"{e['displayLabel']} [STATdx]\n  Teaching group: {e['topic']}\n  Image: {e['plainFilename']}\n  Image_Annotated: {e['annotatedFilename']}\n  Caption: {e['teachingCaption']}\n  Context: {e['caseContext']}")
parts.append('=== OPTIONAL DUPLICATE RECOVERY INDEX ===\n'+'\n'.join(f"{label(r)}: same image as {label(s)}; retained in the registry for recovery." for r,s in mapping.items())+'\nSTATdx image 5: same CT slice as STATdx image 1; the selected rendition preserves all teaching content.')
parts.append('=== GENERATION GUARDRAILS ===\nUse only the selected library by default. Retain distinct same-disease images as reinforcement and keep companions/composite panels together. Use clean labels such as STATdx image 10 in prose; exact filenames and short IDs stay in traceability fields. Route future material through the canonical RadPrimer hierarchy above. No cards or lecture are part of this package.')
parts.append('=== SOURCE ATTRIBUTION ===\n'+'\n'.join(s['sourceLabel']+': '+s['sourceUrl'] for s in m['sources'])+'\n[Both] means the provided extracts agree; shared images are not independent confirmation. Core cross-check: not verified from supplied evidence.')
package='\n\n'.join(parts).strip()
(B/'master_source_package.txt').write_text(package,encoding='utf-8',newline='\n')
manifest['packageSha256']=sha(B/'master_source_package.txt')
write('image_registry.json',registry);write('master_source_manifest.json',manifest)
write('master_source_import.json',{'version':1,'articleTitle':m['articleTitle'],'createdAt':now,'packageText':package,'manifest':manifest,'imageRegistry':registry,
 'sourceSelectionPlan':plan,'selectedPrimaryImageIds':primary,'archiveOptionalImageIds':archive})

report=f'''# Master source synthesis: {m['articleTitle']}

The curated master retains 23 selected image entries and 21 optional duplicate entries. All 44 source records remain in the registry. RadPrimer supplies the canonical hierarchy and differential order; STATdx supplies the selected image renditions and its additional caption depth. No cards or lecture were generated.

## Import and source comparison

The repository importer copied the newest completed browser bundle into this folder. The queue pointer names this folder. All six requested inputs were read and compared, along with the image evidence manifest. The standalone source metadata and registries exactly match their copies in metadata.json; image_evidence_manifest.json matches metadata.json imageEvidence. All package image numbers/captions match their source registries.

- Canonical hierarchy: {' > '.join(m['canonicalHierarchy'])}
- Canonical deck path: {m['canonicalDeckPath']}
- The hierarchy is copied exactly from metadata.json, including All Categories and Basic. STATdx breadcrumbs are provenance only. The unrelated saved manual MSK deck path was not used.
- RadPrimer uniquely provides the explicit common/less-common differential list. Both Essential Information blocks are identical; the master includes this block once with [Both] attribution.
- STATdx adds a separate toxicity CT/gross-explant pair and a distinct lymphoma CT example. Its nominal fourth extra entry is a repeated steatosis slice.
- No auditable Core pages or citations were supplied. Corebook is routing metadata only.

## Image coverage gate

STATdx fully covers all 20 RadPrimer images. Each is classified exactDuplicate based on matching stable publisher IDs AND inspection of the actual staged plain images. Counts: exact duplicate 20; near duplicate 0; conceptual replacement 0; not covered 0. These counts describe the cross-source RadPrimer gate, not the number of distinct same-disease examples retained.

All 44 staged JPEGs decoded successfully and were inspected in five paired comparison sheets plus the additions sheet. RadPrimer renditions are 900 x 900; STATdx renditions are 1000 x 1000. Their SHA256 hashes differ: these are equivalent image-content renditions, not byte-identical files. Larger dimensions alone are not proof of greater original resolution. All dimensions, file hashes, pixel hashes, paths, stable IDs and per-pair visual observations are recorded in the registry/manifest and _codex_review/image_file_audit.json. Annotated URLs were preserved, but annotated files were not staged and were not visually audited.

| RadPrimer entry | Selected equivalent | Classification | Stable publisher ID |
|---|---|---|---|
'''
report+='\n'.join(f"| {c['radPrimerImageId']} | {c['replacementImageId']} | Exact duplicate | {c['evidence']['sameStableSourceImageId']} |" for c in coverage)
report+='''

The 20 RadPrimer entries are optional archives only because complete equivalent STATdx images and case clusters remain selected. The original source files and all evidence images are retained unchanged; archive is a selection flag, not deletion.

## Additional STATdx entries

| Entry | Assessment | Decision |
|---|---|---|
| SDX-05 | Same exact CT slice as SDX-01 / RP-01 despite a different source ID; full-size visual review confirms identical vessel branching, stomach, vertebra, ribs and skin contour. Rendition is softer. | Optional duplicate archive. |
| SDX-10 | Conceptual replacement/alternate toxic injury example relative to RP-08; distinct anatomy and a different, transplant-linked course. | Primary recognition reinforcement. |
| SDX-11 | Gross explant photograph absent from RadPrimer. Explicit same patient as SDX-10. | Primary; retain CT/explant pair atomically. |
| SDX-16 | Conceptually overlapping lymphoma example with distinct NECT anatomy and liver/spleen low attenuation. | Primary recognition reinforcement. |

No near duplicate, alternate patient, different slice, modality, stage, or conceptual replacement was excluded as redundant. Steatosis variants, both toxicity cases and additional lymphoma appearances are retained.

## Cluster preservation and documented split

All RadPrimer source clusters are replaced as complete equivalent STATdx clusters. There is one intentional selected/archive split within the conservatively grouped repeated steatosis views: SDX-05 is archived while SDX-01 remains selected. This split is safe because the two entries are the same CT slice/screenshot; no temporal, adjacent-slice, follow-up, procedure or phase information is lost. Its shorter caption adds no separate clinical fact. No other source case cluster was intentionally split.

Source group fields are empty. Grouping comes from explicit same-patient captions and visible composites; contextual or conservative inferences are marked in each case cluster. The retained groups are:

'''
report+='\n'.join(f"- {c['clusterId']} ({', '.join(c['selectedImageIds'])}): {c['context']}" for c in clusters)
report+='''

## Source gaps and interpretation limits

- SDX-17/18 (RP-13/14) explicitly form a same-patient CT/MR nodules pair, but the supplied captions and empty group metadata do not name the cause. Do not invent a confirmed infectious or granulomatous diagnosis.
- SDX-20 (RP-16) shows the article's infiltrative-tumor pattern. HCC is contextual, not an explicitly confirmed case diagnosis. Diffusion restriction is source-caption reported; no ADC panel is staged.
- SDX-21 (RP-17) supports severe steatosis and cirrhosis. The caption says “the disease” without naming it; Wilson disease is contextual and should not be asserted as independently verified for this case.
- SDX-04 describes normal in-phase MR but stages only the opposed-phase image. Preserve the description without inventing another file.
- SDX-10/11 support a source-specific urgent-transplant outcome, not general transplantation criteria. Microscopic histology and a nuclear-medicine protocol are absent.
- Type IV glycogen-storage disease and adenoma are caption-supported for SDX-24 only; do not generalize to all glycogen-storage subtypes.

## Extension handoff and verification

Import master_source_import.json. It contains version, articleTitle, createdAt, packageText, manifest, imageRegistry, sourceSelectionPlan, selectedPrimaryImageIds and archiveOptionalImageIds. packageText is exactly master_source_package.txt. Hierarchy, selection lists and sourceSelectionPlan are synchronized across files.

Selected IDs are SDX-01 through SDX-24 except SDX-05 (23 entries). Optional archive IDs are RP-01 through RP-20 and SDX-05 (21 entries). The download plan contains 46 source-qualified primary variant filenames/URLs: 23 plain and 23 annotated. All 88 possible registry variant filenames are unique. Narrative-facing references use clean source-qualified labels; IDs appear in filenames and traceability.

Validation is recorded in _codex_review/validation_results.json. The completion marker is written only after the source-preservation, output-consistency, hierarchy, image-evidence, case-cluster and actual extension import/download-helper checks pass. These checks do not perform a live browser import or remote image download.
'''
(B/'master_source_report.md').write_text(report,encoding='utf-8',newline='\n')
print(json.dumps({'createdFiveArtifacts':True,'selectedImages':len(primary),'optionalArchives':len(archive),'variantDownloads':len(files),'caseClusters':len(clusters),'completionMarker':'Written by validation only'}))
