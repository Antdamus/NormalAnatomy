from pathlib import Path
from datetime import datetime, timezone
from copy import deepcopy
import hashlib, json, re

B = Path(__file__).resolve().parent.parent
def read(n): return json.loads((B/n).read_text(encoding='utf-8-sig'))
def write(n, value): (B/n).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def ids(ns, prefix='SDX'): return [f'{prefix}-{n:02}' for n in ns]
def label(mid): return ('RadPrimer' if mid.startswith('RP') else 'STATdx')+' image '+str(int(mid.split('-')[1]))
def labels(mids): return ', '.join(map(label,mids))
def clean(s): return re.sub(r'\s+([.,;])',r'\1',re.sub(r'\s+',' ',re.sub(r'<img\b[^>]*>','',s))).strip()

m,rp,sd=[read(n) for n in ['metadata.json','RadPrimer_metadata.json','STATdx_metadata.json']]
raw=rp['imageRegistry']+sd['imageRegistry']
byid={e['masterImageId']:e for e in raw}
audit=read('_codex_review/image_file_audit.json')
files={e['masterImageId']:e for e in audit['files']}
rt,st=[(B/(n+'_source_package.txt')).read_text(encoding='utf-8-sig') for n in ['RadPrimer','STATdx']]
ra,sa=[t.split('=== ARTICLE ===')[1].split('=== IMAGES')[0].strip() for t in [rt,st]]
essential=ra.split('ESSENTIAL INFORMATION',1)[1].strip()
assert essential==sa.split('ESSENTIAL INFORMATION',1)[1].strip()
assert m['canonicalHierarchy']==rp['breadcrumbTrail']
assert len(raw)==43 and len(files)==43
for source,meta,txt in zip(m['sources'],[rp,sd],[rt,st]):
    assert source['metadata']==meta and source['imageRegistry']==meta['imageRegistry']
    caps=re.findall(r'IMAGE_(\d+):[^\n]*\n.*?    Caption: (.*?)(?=\n\nIMAGE_|\n\n=== SOURCE ATTRIBUTION)',txt,re.S)
    assert len(caps)==len(meta['imageRegistry'])
    for (n,cap),e in zip(caps,meta['imageRegistry']):
        assert int(n)==e['sourceImageNumber'] and cap.strip()==e['caption'].strip()
assert read('image_evidence_manifest.json')==m['imageEvidence']
now=datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00','Z')

# Observations recorded after inspecting all 43 actual source files in contact sheets.
observations=[
 'Same axial CT slice: broad hepatic defect, bright central extravasation, rib fragments, gastric contents and vertebral landmarks match.',
 'Same axial NECT slice: oblique dense biopsy tract, lateral subcapsular collection, spleen contour, gastric staples and vertebra match.',
 'Same axial contrast CT slice: right-lobe hypervascular mass, large crescentic subcapsular collection and renal/vascular landmarks match.',
 'Same axial NECT slice: lateral-segment mass with central dense component, contrast-filled stomach and splenic landmarks match.',
 'Same axial T1 MR slice: round right-lobe mass, central bright hemorrhagic focus, rim and surrounding organ contours match.',
 'Same superior arterial CT slice: branching tumor vessels, peripheral clot, ascites and diaphragmatic landmarks match.',
 'Same lower arterial CT slice: mass portion, dense sentinel clot, splenic contour, aorta and vertebral landmarks match; distinct from the preceding slice.',
 'Same axial NECT slice: hepatic mass and adjacent hyperdense clot, liver dome, spleen and vertebral contours match.',
 'Same coronal CT reconstruction: encapsulated inferior right-lobe mass, perihepatic clot, ascites, surgical clips and bowel landmarks match.',
 'Same axial CT slice: huge thin-walled right-lobe cyst, dependent denser material, vessels and left renal landmarks match.',
 'Same ultrasound frame: internal organizing clot and fibrin pattern, cyst outline, overlying tissue and acoustic field match.',
 'Same fat-suppressed T2 MR slice: bright complex cystic lesion, dependent dark layer, septal contours and spine match.',
 'Same opposed-phase T1 MR slice: multiple dark and bright hepatic cysts, dominant anterior bright cyst and splenic contours match.',
 'Same axial contrast CT slice: hepatic hematocrit level, hyperdense bleeding focus, associated renal hemorrhage and bowel landmarks match.',
 'Same axial contrast CT slice: fracture-like hepatic defects, rounded central collection, subcapsular blood and gastric/splenic landmarks match.',
 'Same axial contrast CT slice: right-lobe metastatic mass, subcapsular collection, aortic enhancement and renal landmarks match.',
 'Same axial contrast CT slice: heterogeneous melanoma metastasis, lesion contour, perihepatic fluid, spleen and gastric contents match.',
 'Same adjacent-level contrast CT slice: melanoma lesion, surrounding sentinel clot, hemoperitoneum and splenic landmarks match; distinct from the preceding image.',
 'Same axial contrast CT slice: massive subcapsular/perihepatic collection, bleeding focus, heterogeneously enhancing liver and distended stomach match.',
 'Same axial contrast CT slice: postpartum subcapsular hematoma, geographic hepatic infarcts, gastric and splenic contours match.'
]
coverage=[]
for p,note in zip(audit['stableIdCandidatePairs'],observations):
    rid,sid=p['radPrimerImageId'],p['statdxImageId']
    a,b=files[rid],files[sid]
    coverage.append({'radPrimerImageId':rid,'statdxImageIds':[sid],'replacementImageId':sid,
      'classification':'exactDuplicate','classificationLabel':'exact duplicate','confidence':'high',
      'selectedAction':'archive RadPrimer copy; retain equivalent STATdx image',
      'reason':'Same stable publisher image ID and visually matching image/slice. Source export size and encoding differ.',
      'visualObservation':note,'evidence':{'sameStableSourceImageId':p['stableImageId'],
      'visualReviewCompleted':True,'contactSheet':p['contactSheet'],'radPrimerEvidenceFilename':a['evidenceFilename'],
      'statdxEvidenceFilename':b['evidenceFilename'],'radPrimerSha256':a['sha256'],'statdxSha256':b['sha256'],
      'byteIdentical':p['sameFileHash'],'rgbPixelIdentical':p['sameRgbPixelHash'],
      'radPrimerDimensions':a['dimensions'],'statdxDimensions':b['dimensions']}})
covby={c['radPrimerImageId']:c for c in coverage}
primary=ids(range(1,24)); archive=ids(range(1,21),'RP')
rp_by_sd={c['replacementImageId']:c['radPrimerImageId'] for c in coverage}

# Confirmed cases and conservative companion groups are distinguished explicitly.
specs=[
 ('trauma',[1],'Hepatic Trauma','singleImage','Traumatic laceration, active bleeding, hemoperitoneum and rib fractures.'),
 ('post_biopsy',[2,3],'Hepatic Trauma','probableSameCase','Very similar anatomy and biopsy-related hemorrhage; exact slice identity is uncertain. Keep both views. Biopsy and falling hematocrit are source history, not an imaged time-lapse.'),
 ('adenoma_ct_subcapsular',[4],'Hepatic Adenoma','singleImage','Hypervascular mass with spontaneous subcapsular hemorrhage in a young woman.'),
 ('adenoma_ct_intratumoral',[5],'Hepatic Adenoma','singleImage','Acute central high-attenuation hematoma in a lateral-segment mass.'),
 ('adenoma_mr',[6,7],'Hepatic Adenoma','conservativeModalityCompanions','Distinct T1 and fat-suppressed T1 examples; patient identity and acquisition relationship are not established. Preserve both for comparison without asserting a same-patient sequence.'),
 ('hcc_rupture',[8,9],'Hepatocellular Carcinoma','explicitSamePatient','Caption explicitly states same patient. Two different arterial-phase slices show ruptured HCC and sentinel clot. Angiographic confirmation and coil embolization are reported, but no HCC angiogram or post-treatment frame is staged.'),
 ('hcc_nect',[10],'Hepatocellular Carcinoma','singleImage','Separate 60-year-old man with alcoholic liver disease, mass and sentinel clot on NECT.'),
 ('hcc_coronal',[11],'Hepatocellular Carcinoma','singleImage','Separate woman with cirrhosis: coronal view of mass, clot and ascites.'),
 ('cyst_ct',[12],'Hepatic Cyst','singleImage','Hemorrhage in a thin-walled cyst; hemorrhagic ascites on other sections is caption-only context, with those additional sections absent.'),
 ('cyst_us',[13],'Hepatic Cyst','singleImage','Organizing clot and fibrin strands on ultrasound; no same-patient link to the CT or MR cyst examples supplied.'),
 ('cyst_mr',[14],'Hepatic Cyst','singleImage','Dependent T2-dark material in a complex cystic lesion, described as subacute hemorrhage.'),
 ('polycystic',[15],'Autosomal Dominant Polycystic Disease, Liver','singleImage','T1-dark simple-fluid cysts and T1-bright hemorrhagic cysts in an enlarged liver.'),
 ('coagulopathy_multisite',[16],'Coagulopathic Hemorrhage, Liver','singleImage','Hematocrit level, active bleeding and simultaneous hepatic/renal hemorrhage.'),
 ('anticoagulant',[17],'Coagulopathic Hemorrhage, Liver','singleImage','Anticoagulant-associated fracture-like defects without trauma. Resolution after medication withdrawal and absence of underlying mass are source-reported follow-up; no follow-up image is staged.'),
 ('net_metastasis',[18],'Hepatic Metastases','singleImage','Pancreatic neuroendocrine metastasis with spontaneous subcapsular hemorrhage.'),
 ('melanoma',[19,20],'Hepatic Metastases','probableAdjacentSlices','Closely matching lesion/organ anatomy suggests companion levels, but captions do not explicitly confirm same patient. Keep together without assigning a verified patient identity. Possible intratumoral bleeding in the first view remains qualified; the second shows stronger sentinel-clot/hemoperitoneum evidence.'),
 ('hellp',[21,22,23],'HELLP Syndrome','ambiguousProcedureCompanions','Keep both obstetric CT examples and the selective hepatic arteriogram together. The angiogram caption says this woman, but its exact CT patient link is unspecified; do not assert that all three images show one patient. Active hemorrhage and coil embolization are source-reported; no post-embolization endpoint image is supplied.')
]
clusters=[]; clusterby={}
for key,nums,diagnosis,relationship,context in specs:
    sm=ids(nums); rm=[rp_by_sd[s] for s in sm if s in rp_by_sd]
    c={'clusterId':'CL-'+key,'diagnosis':diagnosis,'sourceMembers':{'RadPrimer':rm,'STATdx':sm},
       'selectedImageIds':sm,'archiveImageIds':rm,'atomic':True,'relationship':relationship,
       'samePatientConfirmed':relationship=='explicitSamePatient','context':context,
       'selectionDecision':'Retain every STATdx member; replace all matching RadPrimer members as a complete equivalent set.',
       'replacementMappings':[{'archivedImageId':r,'selectedImageId':covby[r]['replacementImageId']} for r in rm]}
    clusters.append(c)
    for mid in rm+sm: clusterby[mid]=c

notes={
 1:'Axial contrast CT: traumatic laceration, active extravasation, hemoperitoneum and adjacent rib fractures.',
 2:'Axial noncontrast CT: dense post-biopsy tract and subcapsular hematoma; retain with STATdx image 3.',
 3:'Very similar post-biopsy view retained as near-duplicate reinforcement. Stable IDs differ and export appearance differs; literal slice identity is not established confidently enough to archive it.',
 4:'Contrast CT adenoma-pattern example: young woman, hypervascular mass and spontaneous subcapsular blood.',
 5:'Noncontrast CT adenoma-pattern example: acute central hyperattenuating hemorrhage within a mass.',
 6:'T1 MRI: hemorrhagic foci in a hepatic mass. T2 behavior is described in the caption but its corresponding T2 image is not supplied.',
 7:'Distinct fat-suppressed T1 MRI example with peripheral bright foci and source-confirmed adenoma. Retain as modality/recognition reinforcement; reported T2 findings are caption context.',
 8:'First of two source-confirmed same-patient arterial-phase views of ruptured HCC; keep with STATdx image 9.',
 9:'Second arterial-phase view in the same patient as STATdx image 8; preserve reported angiographic confirmation and coil embolization without implying an angiogram is displayed here.',
 10:'Alternate HCC-pattern example on NECT: mass, hyperdense sentinel clot and alcoholic liver disease.',
 11:'Alternate HCC-pattern example on coronal contrast CT: encapsulated mass, sentinel clot and ascites.',
 12:'CT hemorrhagic cyst: thin wall with denser intracystic material; other-section hemorrhagic ascites is source-reported only.',
 13:'Ultrasound hemorrhagic cyst: organizing hematoma with fibrin strands.',
 14:'Fat-suppressed T2 MRI hemorrhagic cyst: dependent dark material; source describes subacute hemorrhage.',
 15:'Polycystic liver: bright hemorrhagic cysts among dark simple-fluid cysts on T1 opposed-phase MRI.',
 16:'Coagulopathic bleeding pattern: hematocrit level, active bleeding and multisite hepatic/renal hemorrhage.',
 17:'Anticoagulant-associated hepatic hemorrhage may resemble traumatic defects. Medication withdrawal/resolution is caption-reported history, not a displayed follow-up series.',
 18:'Pancreatic neuroendocrine metastasis with spontaneous subcapsular hemorrhage.',
 19:'Melanoma metastasis with heterogeneous high density; preserve the caption uncertainty that this perhaps represents intratumoral bleeding. Keep with STATdx image 20 as a conservative companion set.',
 20:'Melanoma metastasis with adjacent sentinel clot and extensive hemoperitoneum reported as 35 HU; retain with STATdx image 19 without claiming a proven same-patient relationship.',
 21:'Obstetric/HELLP-pattern CT: massive subcapsular/perihepatic hematoma, active bleeding and heterogeneous hepatic enhancement.',
 22:'Postpartum CT: subcapsular hematoma plus hepatic infarcts. Retain with the HELLP comparison/procedure set without inventing patient linkage.',
 23:'Selective hepatic arteriogram in HELLP: medial liver displacement and multifocal active hemorrhage, reportedly treated with coils. Specific CT linkage and post-treatment imaging are not supplied.'}
registry=[]
for original in raw:
    e=deepcopy(original); mid=e['masterImageId']; c=clusterby[mid]
    e.update({'displayLabel':label(mid),'originalPlainFilename':original['plainFilename'],
      'originalAnnotatedFilename':original['annotatedFilename'],'originalGroup':original.get('group',''),
      'originalGroupNumbers':original.get('groupNumbers',[]),'sourceMetadataFile':e['sourceLabel']+'_metadata.json',
      'sourcePackageFile':e['sourceLabel']+'_source_package.txt','sourceUrl':next(s['sourceUrl'] for s in m['sources'] if s['sourceKind']==e['sourceKind']),
      'caseClusterId':c['clusterId'],'caseClusterContext':c['context'],'group':c['clusterId'],
      'groupNumbers':[byid[x]['sourceImageNumber'] for x in c['sourceMembers'][e['sourceLabel']]],
      'groupMasterImageIds':c['sourceMembers'][e['sourceLabel']], 'atomicCluster':True,
      'diagnosis':c['diagnosis'],'teachingCaption':clean(e['caption']),
      'sourceAnnotationTokens':re.findall(r'<img\b[^>]*src="([^"]+)"',e['caption'])})
    for v in ['plain','annotated']: e[v+'Filename']=f'{mid}_{e["sourceLabel"]}_{v}_{original[v+"Filename"]}'
    e['filename']=e['plainFilename']
    e['visualEvidence'].update({'visuallyInspected':True,'inspectionMethod':'All staged files visually inspected in paired contact sheets; STATdx 2 and 3 additionally viewed individually at original resolution.',
      'sha256':files[mid]['sha256'],'rgbPixelSha256':files[mid]['rgbPixelSha256'],
      'dimensions':files[mid]['dimensions'],'decodedSuccessfully':True,'inspectedAt':now,
      'contactSheet':covby[mid]['evidence']['contactSheet'] if mid in covby else (covby[rp_by_sd[mid]]['evidence']['contactSheet'] if mid in rp_by_sd else '_codex_review/supplement_context.jpg'),
      'annotatedVariantInspected':False})
    if mid in archive:
        coverage_entry=covby[mid]
        e.update({'downloadRecommendation':'archiveOptionalDuplicate','usedFor':[],
          'duplicateClassification':'exactDuplicate','duplicateOf':coverage_entry['replacementImageId'],
          'duplicateEvidence':coverage_entry['evidence'],'radPrimerCoverageClassification':'exactDuplicate',
          'archiveReason':'Exact duplicate of the selected STATdx image: same stable publisher image ID and visually matching image/slice, with size/encoding differences only. Complete equivalent case coverage retained.',
          'selectionReason':'Retain as optional source recovery; the equivalent larger STATdx export is primary.'})
    else:
        n=e['sourceImageNumber']; role=['imageRecognition', 'primaryExample']
        if n in [3,5,6,7,10,11,13,14,15,17,19,20,22]: role+=['recognitionReinforcement','alternateExample']
        if n in [6,7,10,11,13,14,15,23]: role+=['modalityVariant']
        if n in [8,9,19,20]: role+=['companionView']
        if n==23: role+=['procedureContext','managementContext']
        if n==14: role+=['stageVariant']
        e.update({'downloadRecommendation':'primaryTeachingSet','usedFor':role,'teachingRole':notes[n],
          'selectionReason':'Equivalent source coverage with a 1000 x 1000 staged export; preserve original anatomy and source numbering.' if mid in rp_by_sd else notes[n],
          'equivalentRadPrimerImageIds':[rp_by_sd[mid]] if mid in rp_by_sd else []})
        if n==9: e['teachingCaption']=e['teachingCaption'].replace('in the same patient','in the same patient as STATdx image 8')
        if n==23: e['teachingCaption']=e['teachingCaption'].replace('In this woman','In a woman')
    registry.append(e)
reg={e['masterImageId']:e for e in registry}
supplement_decisions=[
 {'imageId':'SDX-03','relatedImageIds':['RP-02','SDX-02'],'classification':'nearDuplicate','confidence':'moderate',
  'exactIdentityUncertain':True,'selected':True,'usedFor':['recognitionReinforcement'],
  'evidence':{'differentStableSourceImageIds':True,'byteIdentical':False,'originalFilesViewedIndividually':True,
  'contactSheet':'_codex_review/supplement_context.jpg'},'reason':notes[3]},
 {'imageId':'SDX-07','relatedImageIds':['RP-05','SDX-06'],'classification':'conceptualReplacement','selected':True,
  'usedFor':['recognitionReinforcement','modalityVariant'],'reason':'Different stable ID and clearly different MR appearance. Supplements the hemorrhagic adenoma teaching need; does not replace or remove the existing T1 example.'},
 {'imageId':'SDX-23','relatedImageIds':['RP-19','RP-20','SDX-21','SDX-22'],'classification':'notCovered','selected':True,
  'direction':'Additional STATdx image not represented in the RadPrimer image set','usedFor':['procedureContext','managementContext'],
  'reason':'Distinct selective hepatic arteriogram adds HELLP active-bleeding and embolization context; RadPrimer provides CT examples only.'}
]
reg['SDX-03']['duplicateClassification']='nearDuplicate'
reg['SDX-03']['duplicateEvidence']=supplement_decisions[0]['evidence']
reg['SDX-03']['relatedImageIds']=['RP-02','SDX-02']

download_files=[{'masterImageId':e['masterImageId'],'sourceKind':e['sourceKind'],'sourceLabel':e['sourceLabel'],
 'sourceImageNumber':e['sourceImageNumber'],'imageNumber':e['sourceImageNumber'],'variant':v,
 'filename':e[v+'Filename'],'url':e[v+'Url'],'downloadRecommendation':'primaryTeachingSet'}
 for e in registry if e['masterImageId'] in primary for v in ['plain','annotated']]
plan={
 'textSelection':{'RadPrimer':{'keep':['Canonical hierarchy and supplied deck route','Common/less-common differential order','Complete essential-information backbone','Original image captions and equivalent-source mappings'],
 'downweightOrSkip':['Source-extraction boilerplate','Unrelated cached manualDeckRoot','Unsupplied Core-validation request text']},
 'STATdx':{'keep':['Corroborating essential information, merged once with [Both] attribution','All distinct or uncertain-duplicate image examples','Additional biopsy view, fat-suppressed T1 adenoma image and HELLP angiogram','Caption-specific modality, sentinel-clot, follow-up and embolization detail'],
 'downweightOrSkip':['Repeated identical essential-information prose','STATdx breadcrumbs as canonical routing','Duplicated captions as a second teaching instance'] }},
 'imageCurationPolicy':'Archive only exact duplicate/recovery or unusable images by default. Near duplicates, alternate examples and conceptual replacements remain selected as recognition reinforcement unless literal image/slice identity or unusability is established.',
 'duplicateEvidencePolicy':'Exact-duplicate decisions require actual image_evidence review, a shared stable source image ID, hashes or explicit manual/source confirmation. Captions/diagnoses alone are insufficient. Different file hashes do not preclude the same view exported at a different size. Uncertain literal identity stays primary.',
 'caseClusterGuardrails':{'atomic':True,'rules':['Keep same-patient, follow-up, procedure, adjacent-slice, comparison-view and time-lapse clusters intact.','Replace a source cluster only with a complete equivalent cluster or document a safe split.','Distinguish explicit same-patient evidence from probable/ambiguous links. Never invent patient identity, chronology, acquisition phase or treatment frames.'],
 'intentionalSplits':[],'statement':'No source case cluster was intentionally split. All STATdx companion sets remain selected; RadPrimer duplicates are replaced as complete equivalent sets.',
 'clusterIds':[c['clusterId'] for c in clusters]},
 'imageDownloadPlan':{'mode':'curatedPrimaryOnly','primaryTeachingSet':{'RadPrimer':[],'STATdx':primary},
 'archiveOptionalDuplicates':{'RadPrimer':archive,'STATdx':[]},'selectedPrimaryImageIds':primary,'archiveOptionalImageIds':archive,
 'primaryImageCount':23,'primaryVariantDownloadCount':46,'variants':['plain','annotated'],
 'filenamePolicy':'<masterImageId>_<sourceLabel>_<plain|annotated>_<originalFilename>; stable source numbers are never renumbered.',
 'archiveDownloadsByDefault':False,'remoteDownloadStatus':'planned; no new remote downloads attempted',
 'stagedEvidenceStatus':'All 43 plain evidence files decoded, hashed and visually inspected; annotated variants are referenced by original URLs but not staged or visually inspected.',
 'files':download_files},
 'generatorInstructions':['This artifact is a source package only; do not generate cards or a lecture as part of this synthesis.','For later narrative/cards use selectedPrimaryImageIds by default and retain all reinforcement examples.','Use clean display labels such as STATdx image 7; reserve short master IDs for metadata, filenames and traceability.','Use metadata.json canonicalHierarchy exactly and the supplied canonicalDeckPath for routing; local groups may only extend that route.','Preserve [RadPrimer], [STATdx] and [Both] attribution. The shared text is not two independent validations.','Use teachingCaption for clean prose; caption retains original wording and arrow markup. Keep original uncertainty and absent-companion qualifications.','Preserve atomic companion groups and caption-reported procedure/follow-up context; do not turn them into invented time-lapse series.','No auditable Core Radiology pages were supplied. Corebook in the routing is a deck label, not evidence of Core validation.','Do not turn case-specific attenuation, MRI signal, diagnostic-likelihood or treatment descriptions into universal diagnostic or management rules.']}

gate={'performedBeforeMerge':True,'statdxFullyCoversRadPrimerImageSet':True,'radPrimerImageCount':20,
 'coveredRadPrimerImageCount':20,'classificationCounts':{'exactDuplicate':20,'nearDuplicate':0,'conceptualReplacement':0,'notCovered':0},
 'radPrimerImageCoverage':coverage,'allEvidenceFilesVisuallyInspected':True,'evidenceFileCount':43,
 'byteIdenticalPairCount':0,'sameStableIdAndVisualViewPairCount':20,
 'conclusion':'STATdx fully covers every RadPrimer image with a matching stable ID and visually equivalent view. All 20 RadPrimer copies are optional recovery archives. Retain all 23 STATdx images, including the uncertain near-duplicate biopsy view.'}

diff=ra.split('DIFFERENTIAL DIAGNOSIS',1)[1].split('ESSENTIAL INFORMATION',1)[0].strip()
package=[
 '=== TOPIC ===','PRIMARY TOPIC: '+m['articleTitle'],'Source package: RadPrimer + STATdx master source','Artifact scope: fused master source only; no cards or lecture.',
 '', '=== CANONICAL RADPRIMER ROUTING ===','breadcrumb: '+' > '.join(m['canonicalHierarchy']),
 'canonicalHierarchy: '+json.dumps(m['canonicalHierarchy'],ensure_ascii=False),'deckPath: '+m['canonicalDeckPath'],
 'Routing copied from metadata.json. Local diagnosis groups below do not change this hierarchy.',
 '', '=== SOURCE BASIS AND SELECTION ===',
 '[RadPrimer] Canonical hierarchy, common/less-common differential ordering and article backbone.',
 '[Both] Essential-information text is identical across the staged packages and is merged once below.',
 '[STATdx] Selected image library, including all equivalent RadPrimer views plus the additional biopsy, fat-suppressed MRI and HELLP angiography examples.',
 'All 20 RadPrimer images have same-ID, visually matching STATdx counterparts. Retain 23 STATdx images and archive 20 RadPrimer exact copies for optional recovery. Similar but uncertain biopsy views both remain selected.',
 'The stable IDs, full captions with annotation markup, evidence hashes, source URLs and source-qualified filenames remain in the registry and manifest.',
 'Core validation: no auditable Core Radiology text/pages supplied. The Corebook deck name is routing only. No Core-specific claim is verified.',
 '', '=== ARTICLE ===','TITLE: '+m['articleTitle'],'','DIFFERENTIAL DIAGNOSIS [RadPrimer]',diff,
 '', 'ESSENTIAL INFORMATION [Both]',essential,
 '', '=== SOURCE-GROUNDED IMAGE AND CAPTION DEPTH ===',
 '[Both] Hepatic trauma: STATdx image 1 demonstrates laceration, active bleeding, hemoperitoneum and rib fractures. STATdx image 2 shows a dense biopsy tract and subcapsular hematoma after a fall in hematocrit. [STATdx] STATdx image 3 supplies a very similar biopsy-related view, retained because literal identity remains uncertain.',
 '[Both] Adenoma-pattern images span subcapsular bleeding with a hypervascular mass (STATdx image 4), central hyperdense intratumoral blood on NECT (STATdx image 5) and bright foci on T1 MRI (STATdx image 6). [STATdx] STATdx image 7 adds a visually distinct fat-suppressed T1 example and explicitly names hepatic adenoma.',
 '[Both] HCC: STATdx image 8 and STATdx image 9 are explicitly the same patient, showing different arterial-phase levels with tumor vessels, ascites, sentinel clot and capsular rupture. The second caption reports angiographic confirmation and coil embolization; no angiographic frame from that HCC case is supplied. STATdx image 10 adds NECT and STATdx image 11 a coronal example in other described patients.',
 '[Both] Hemorrhagic cysts: STATdx image 12 shows denser material in a thin-walled cyst; STATdx image 13 shows organizing clot and fibrin strands by ultrasound; STATdx image 14 shows dependent T2-dark material described as subacute hemorrhage. Do not assume these are the same patient. STATdx image 15 contrasts T1-dark simple-fluid cysts with T1-bright hemorrhagic cysts in polycystic liver.',
 '[Both] Coagulopathy: STATdx image 16 demonstrates a hematocrit level, active bleeding and multisite hepatic/renal hemorrhage. STATdx image 17 shows anticoagulant-associated fracture-like defects without trauma; resolution after medication withdrawal and absence of an underlying mass are source-reported follow-up, with no follow-up frame supplied.',
 '[Both] Metastases: STATdx image 18 shows spontaneous subcapsular bleeding from a pancreatic neuroendocrine metastasis. The melanoma caption for STATdx image 19 says the high density perhaps indicates bleeding; preserve that uncertainty. STATdx image 20 provides sentinel clot and extensive hemoperitoneum, reported as 35 HU. Preserve these visually related melanoma views together without declaring a confirmed same-patient series.',
 '[Both] HELLP: STATdx image 21 shows massive subcapsular/perihepatic hemorrhage and active bleeding; STATdx image 22 shows postpartum hematoma with infarcts. [STATdx] STATdx image 23 adds selective arteriography, medial liver displacement by hematoma, active hemorrhage and a caption-reported coil-embolization treatment. The precise CT-to-angiogram patient link is not supplied; retain the whole comparison/procedure set.',
 '[RadPrimer] Amyloidosis remains in the less-common differential. [Both] The text describes rupture as extremely rare; neither staged image set contains a labeled amyloidosis example.',
 '', '=== INTERPRETATION AND SOURCE LIMITS ===',
 '[Both] The source uses > 60 HU on NECT as a possible appearance of hemorrhage. The 35-HU hemoperitoneum in the melanoma caption is a different case/context; preserve both without inventing a universal attenuation threshold.',
 '[Both] The source describes T1/T2 hyperintense hemorrhagic foci, while the cyst caption also describes T2-hypointense dependent blood. Keep the stated sequence and case/stage context. The corresponding T2 images mentioned in the T1 adenoma captions are not staged; do not claim to have inspected them.',
 '[Both] The adenoma wording almost diagnostic and the caption attribution of T1/T2 signal to hemorrhage rather than fat are preserved source statements. They must not be generalized beyond their supplied clinical/sequence context or presented as independently validated rules.',
 '[Both] Embolization and medication withdrawal are reported outcomes in specific source cases. No treatment algorithm, dose, risk threshold or independent management guideline is supplied.',
 '', '=== ATOMIC IMAGE GROUPS ==='
]
for c in clusters:
    if len(c['selectedImageIds'])>1: package.append(labels(c['selectedImageIds'])+': '+c['context'])
package+=['No source case cluster was intentionally split. No imaged time-lapse or complete before/after treatment sequence is supplied.','',
 '=== SELECTED IMAGE LIBRARY ===',
 'Use the clean source-qualified display label in prose. Image filenames intentionally retain short master IDs. Original arrow-to-finding placement is retained in each registry caption; the marker list below preserves source token order.']
for e in registry:
    if e['masterImageId'] not in primary: continue
    package+=['',e['displayLabel']+' [STATdx]','  Local diagnosis group: '+e['diagnosis'],
      '  Image: '+e['plainFilename'],'  Image_Annotated: '+e['annotatedFilename'],
      '  Caption: '+e['teachingCaption'],'  Source annotation tokens, original order: '+', '.join(e['sourceAnnotationTokens']),
      '  Teaching/context note: '+e['teachingRole']]
package+=['','=== OPTIONAL DUPLICATE RECOVERY INDEX ===','These RadPrimer copies stay in the registry for audit/recovery and are excluded from default image downloads.']
for c in coverage: package.append(label(c['radPrimerImageId'])+' -> '+label(c['replacementImageId'])+': same stable publisher image ID and visually matching image/slice.')
package+=['','=== SOURCE ATTRIBUTION ===']
for s in m['sources']: package.append(s['sourceLabel']+': '+s['sourceUrl'])
package+=['Primary source backbone: RadPrimer. Shared article text: [Both]. Selected image files: STATdx. Core cross-check: not supplied/verified.']
package_text='\n'.join(package).strip()
(B/'master_source_package.txt').write_text(package_text,encoding='utf-8',newline='\n')

inputs=['RadPrimer_source_package.txt','STATdx_source_package.txt','RadPrimer_metadata.json','STATdx_metadata.json','metadata.json','master_source_request.md','image_evidence_manifest.json','_master_source_request_complete.txt']
manifest={'version':1,'articleTitle':m['articleTitle'],'createdAt':now,'sourceBundleCreatedAt':m['createdAt'],
 'artifactType':'masterSourcePackage','canonicalHierarchy':deepcopy(m['canonicalHierarchy']),
 'canonicalHierarchySource':deepcopy(m['canonicalHierarchySource']),'canonicalDeckPath':m['canonicalDeckPath'],
 'sourcePriority':{'canonicalHierarchy':'RadPrimer','textBackbone':'RadPrimer','sharedText':'Both','supplementalDepth':'STATdx',
 'selectedImageSource':'STATdx','reason':'STATdx provides full same-ID/visual coverage and larger staged exports; text hierarchy remains RadPrimer.'},
 'sourceCoverage':{'text':{'essentialInformationIdentical':True,'differentialHierarchySource':'RadPrimer','radPrimerTopicCoveragePreserved':True,
 'comparisonSummary':'RadPrimer adds common/less-common differential hierarchy; essential information matches exactly. STATdx adds three source image entries and caption detail.'},
 'imageCoverageGate':gate,'supplementalImageDecisions':supplement_decisions,'unillustratedDiagnoses':['Amyloidosis']},
 'imageCountBySource':{'RadPrimer':20,'STATdx':23},'selectedImageCountBySource':{'RadPrimer':0,'STATdx':23},
 'archiveImageCountBySource':{'RadPrimer':20,'STATdx':0},'selectedPrimaryImageCount':23,'archiveOptionalImageCount':20,
 'sourceAttributionRules':{'RadPrimer':'Canonical route, differential hierarchy and original RP image provenance.','STATdx':'Supplementary source detail and selected SDX image provenance.','Both':'Text present in both staged source packages; not independent clinical validation.',
 'displayLabels':'Use RadPrimer image N or STATdx image N in prose; reserve RP-NN/SDX-NN for registry, filenames and traceability.'},
 'selectedPrimaryImageIds':primary,'archiveOptionalImageIds':archive,'sourceSelectionPlan':plan,'caseClusters':clusters,
 'sources':[{'sourceKind':s['sourceKind'],'sourceLabel':s['sourceLabel'],'sourceUrl':s['sourceUrl'],'cachedAt':s['cachedAt'],'packageFile':s['sourceLabel']+'_source_package.txt','metadataFile':s['sourceLabel']+'_metadata.json'} for s in m['sources']],
 'sourceComparisonNotes':['STATdx top-level breadcrumbs are provenance, not routing.','Both Anki blocks have the canonical GI route and an unrelated cached manualDeckRoot; the latter is ignored.','No nonempty original group/case identifiers are supplied; caption/visual context is preserved with explicitly qualified cluster relationships.'],
 'coreValidation':{'suppliedAuditableCoreEvidence':False,'status':'notSupplied','note':'Core request boilerplate is not evidence; Corebook is retained solely as the supplied route.'},
 'inputFiles':[{'filename':n,'sha256':sha(B/n)} for n in inputs], 'packageSha256':sha(B/'master_source_package.txt'),
 'imageEvidenceAudit':'_codex_review/image_file_audit.json','validationReport':'_codex_review/validation_results.json',
 'limitations':['Only staged plain image evidence was visually inspected; annotated URLs/filenames are preserved but those variants were not downloaded or verified.','External clinical guideline and Core validation are outside this source-bundle synthesis.','Possible same-slice identity of STATdx 2/3 remains uncertain; both retained.','Inferred companion sets do not establish patient identity or unstaged chronology.'],
 'generatedCards':False,'generatedLecture':False}
write('master_source_manifest.json',manifest)
write('image_registry.json',registry)
write('master_source_import.json',{'version':1,'articleTitle':m['articleTitle'],'createdAt':now,'packageText':package_text,
 'manifest':manifest,'imageRegistry':registry,'sourceSelectionPlan':plan,'selectedPrimaryImageIds':primary,'archiveOptionalImageIds':archive})

report=['# Master-source synthesis report','',m['articleTitle'],'',
 '## Result','',
 'STATdx fully covers all 20 RadPrimer images. The master retains 23 STATdx images and archives 20 exact RadPrimer copies for optional recovery. All 43 source entries remain in the registry. Default download plan: 46 source-qualified files (plain and annotated variants for 23 selected images).',
 '','## Import and source comparison','',
 '- Ran edge_radprimer_extension/tools/import-latest-master-source-bundle.ps1 from the workspace. The newest completed Downloads bundle is the user-named bundle. Read the updated master_source_queue/_latest_master_source_bundle.txt pointer.',
 '- Compared both source packages, both per-source metadata files, metadata.json, master_source_request.md and the image evidence manifest. Embedded and standalone metadata agree; all package captions match the corresponding source registries.',
 '- RadPrimer supplies the common/less-common differential ordering. Both essential-information sections match exactly, so the master keeps one copy with [Both] attribution. STATdx contributes three extra image entries and their captions.',
 '- Source annotation markup is preserved unchanged in registry caption fields. Clean teaching captions omit raw image-token markup; package marker lists retain the original order.',
 '- No auditable Core pages are included. The extraction boilerplate requesting a Core cross-check does not establish Core support.',
 '', '## Canonical routing','',
 'canonicalHierarchy: `'+json.dumps(m['canonicalHierarchy'])+'`','',
 'canonicalDeckPath: `'+m['canonicalDeckPath']+'`','',
 'Both values are copied exactly from metadata.json. STATdx top-level breadcrumbs and the unrelated cached manualDeckRoot do not influence routing. No IMAIOS chunks were generated.',
 '', '## Visual evidence and coverage gate','',
 'Decoded and visually inspected all 43 actual staged images through five paired contact sheets and one supplemental-context sheet; STATdx images 2 and 3 were additionally opened individually at original size. File SHA-256, decoded RGB hashes, dimensions and filenames are recorded in _codex_review/image_file_audit.json and image_registry.json.',
 'Every RadPrimer-to-STATdx exact decision has a shared stable publisher image ID plus matching anatomy, slice/view and finding configuration. RadPrimer exports are 900 x 900; STATdx exports are 1000 x 1000. None of the 20 pairs has identical file or decoded RGB hashes. Exact means the same source image/view in different source exports, not byte-identical content. Larger export dimensions do not prove additional intrinsic diagnostic resolution.',
 '', '| RadPrimer ID | Selected counterpart | Classification | Visual observation |','|---|---|---|---|']
for c in coverage: report.append(f'| {c["radPrimerImageId"]} | {c["replacementImageId"]} | exact duplicate | {c["visualObservation"]} |')
report+=['','Coverage counts: exact duplicate 20; near duplicate 0; conceptual replacement 0; not covered 0. This count is for the RadPrimer-to-STATdx coverage gate; supplemental relationships below are a separate assessment.',
 '', '## Supplemental curation','',
 '- SDX-03 remains primary as a near duplicate of the post-biopsy view represented by RP-02/SDX-02. Full-size review shows highly similar anatomy with differing rendering/contrast and a different stable ID. Literal same-slice identity is uncertain. No unique patient, slice level or timepoint is asserted; conservative retention follows the requested reinforcement policy.',
 '- SDX-07 remains primary as a conceptual replacement/supplement to the hemorrhagic-adenoma teaching need, with clearly different fat-suppressed T1 appearance. SDX-06 is also retained. Patient linkage is not established.',
 '- SDX-23 remains primary as additional HELLP selective angiography/procedure context not illustrated in RadPrimer. Preserve the reported embolization without inventing a post-treatment image.',
 '- Every alternate HCC, cyst, coagulopathy, metastatic and obstetric example remains selected. No unusable images were identified. Nothing was excluded merely because its diagnosis or caption resembled another image.',
 '', '## Cluster integrity and procedure context','',
 'No source case cluster was intentionally split. All STATdx members remain selected; RadPrimer members are replaced with complete equivalent STATdx sets. Each registry entry records original grouping fields and the qualified synthesized group.',
 '', '| Cluster | Selected members | Relationship and context |','|---|---|---|']
for c in clusters: report.append('| '+c['clusterId']+' | '+', '.join(c['selectedImageIds'])+' | '+c['relationship']+': '+c['context']+' |')
report+=['','No completed follow-up/time-lapse sequence is present. The HCC angiogram, cyst other sections, adenoma T2 companions, anticoagulant-resolution follow-up and post-embolization endpoints are caption references, not additional staged images.',
 '', '## Source qualifications retained','',
 '- The possible >60-HU NECT appearance and the melanoma case with 35-HU hemoperitoneum concern different contexts; neither is silently converted to a universal cutoff.',
 '- T1/T2-bright hemorrhagic foci and T2-dark dependent cyst contents retain their sequence/case wording. The adenoma fat-versus-blood caption inference and almost-diagnostic wording are not promoted to independently verified universal rules.',
 '- The melanoma SDX-19 caption remains uncertain (perhaps hemorrhage), while SDX-20 describes stronger sentinel-clot/hemoperitoneum evidence. These remain separate selected views.',
 '- Amyloidosis remains in the differential but lacks a labeled source image. No image or clinical fact was invented to fill that gap.',
 '', '## Extension handoff and verification','',
 'Import master_source_import.json. It embeds packageText exactly matching master_source_package.txt, plus the manifest, all 43 registry entries, explicit primary/archive IDs and the complete sourceSelectionPlan.imageDownloadPlan.',
 'The validation script checks serialized artifact agreement, source preservation, exact routing, all evidence hashes, duplicate decisions, cluster completeness, source-qualified labels/filenames, source-copy fidelity and the installed extension import/download helpers. Its results are written to _codex_review/validation_results.json; the done marker is written only after all checks pass.',
 'The intended default plan is 23 selected images / 46 variant URLs and 20 archived recovery records. Actual authenticated image downloads and live browser import are later extension operations. Annotated variants have preserved URLs but were not visually inspected in this synthesis.',
 '', '## Deliverables','',
 '- master_source_package.txt','- master_source_manifest.json','- image_registry.json','- master_source_import.json','- master_source_report.md','- _codex_master_source_done.txt (written after validation)',
 '', 'No cards or lecture were generated.']
(B/'master_source_report.md').write_text('\n'.join(report)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({'outputsWritten':5,'registry':len(registry),'primary':len(primary),'archive':len(archive),'variantDownloads':len(download_files),'clusters':len(clusters),'packageCharacters':len(package_text),'completionMarker':'deferred until validation'}))
