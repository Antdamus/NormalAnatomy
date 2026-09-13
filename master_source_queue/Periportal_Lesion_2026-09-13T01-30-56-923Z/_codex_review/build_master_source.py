import copy
import hashlib
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

B = Path(__file__).resolve().parent.parent
W = B / '_codex_review'
def read(name): return (B / name).read_text(encoding='utf-8-sig')
def load(name): return json.loads(read(name))
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def dump(name, data): (B / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
meta = load('metadata.json')
rp, sd = load('RadPrimer_metadata.json'), load('STATdx_metadata.json')
evidence = load('image_evidence_manifest.json')
audit = load('_codex_review/image_evidence_audit.json')
originals = rp['imageRegistry'] + sd['imageRegistry']
by_original = {e['masterImageId']: e for e in originals}
by_audit = {e['masterImageId']: e for e in audit['images']}
now = datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z')

# Decisions were made after visual review of all seven contact sheets generated
# directly from the 48 staged evidence files and after review of both source texts.
# Conceptual replacement describes only partial topic coverage; it never archives.
coverage_data = [
 (1, 'conceptualReplacement', [10,11,12,13], 'Cholangitis wall thickening and intraluminal debris on Doppler US', 'US shows a thick-walled CBD with echogenic debris beside colored vessels. STATdx shows CT abscess/edema and direct cholangiography; it supplies complication detail but no equivalent ultrasound wall/debris view.'),
 (2, 'conceptualReplacement', [28,29], 'Cavernous transformation and collateral flow on Doppler US', 'Tortuous brightly colored hilar channels on US differ from the two CT slices showing portal thrombosis and collateral veins. STATdx partially covers obstruction/collaterals but cannot replace Doppler flow-direction recognition.'),
 (3, 'notCovered', [], 'Intrahepatic right portal-to-right hepatic vein shunt', 'US shows a discrete color-flow communication to a hepatic vein. No STATdx image is labeled or visually demonstrates this specific portosystemic shunt.'),
 (4, 'notCovered', [], 'Recanalized paraumbilical vein along the falciform ligament', 'US shows an anteriorly directed colored vessel from the left portal system. No matching paraumbilical-route demonstration exists in the STATdx set.'),
 (5, 'conceptualReplacement', [33], 'Hypoechoic hypovascular periportal lymphoma masses', 'US shows dark nodules adjacent to colored portal branches. STATdx shows intermediate-signal periportal CLL tissue on MR in a different source case; retain both distinct malignancy examples.'),
 (6, 'conceptualReplacement', [13,19], 'Pneumobilia and ultrasound artifact recognition', 'US shows bright linear biliary foci with posterior artifact. STATdx CTs show low-attenuation ductal gas with infection/abscess; the acoustic recognition pattern is not replaced.'),
 (7, 'conceptualReplacement', [1,17,18], 'Common-bile-duct stones and avascular duct identification', 'US directly shows bright stones in a duct alongside Doppler-positive vessels. STATdx adds MR duct dilation in a stone case and intrahepatic stones; it does not duplicate the common-duct Doppler view or stone location.'),
 (8, 'notCovered', [], 'Ovarian metastasis with left portal-vein occlusion', 'US shows an ill-defined left periportal hypoechoic lesion and absent expected left portal vein. The STATdx malignant examples are HCC/CLL/cholangiocarcinoma, and its metastasis history accompanies postoperative chemotherapy injury rather than an active periportal metastasis.'),
 (9, 'conceptualReplacement', [26,27], 'Peribiliary cysts beside the left portal vein', 'US shows small anechoic cysts alongside flowing portal branches. STATdx shows larger clustered water-density/water-signal lesions on CT/MR in a cirrhotic patient. The different appearances and modalities are useful reinforcement.'),
 (10, 'notCovered', [], 'Schistosomiasis periportal fibrotic mantle', 'US shows thick bright tissue encasing portal structures. No STATdx image is attributed to schistosomiasis; PSC fibrosis is a different diagnosis and is not an image substitute.'),
 (11, 'conceptualReplacement', [17,18,19], 'Recurrent pyogenic cholangitis: stones, sludge and periductal inflammation', 'Grayscale US shows bright stones/debris within ducts and surrounding echogenic tissue. STATdx MR/CT examples supply distinct intrahepatic stone and infection patterns. Preserve the RP-11/RP-12 same-patient grayscale/Doppler pair.'),
 (12, 'conceptualReplacement', [17,18,19], 'Recurrent pyogenic cholangitis: absent intraductal Doppler flow', 'The Doppler companion shows colored neighboring vessels while the duct remains uncolored. STATdx MR/CT cannot demonstrate this Doppler distinction; conceptual coverage is partial and both ultrasound companions remain primary.'),
 (13, 'notCovered', [], 'Hepatic arterial calcification in end-stage renal disease', 'US shows bright branching arterial walls with neighboring color flow. STATdx has no hepatic-artery-calcification example.'),
 (14, 'notCovered', [], 'Post-cholecystectomy cystic-duct remnant', 'US shows a rounded cystic structure beside vascular flow at the porta hepatis. STATdx peribiliary cyst/dilated-duct images do not demonstrate a postoperative cystic-duct remnant.'),
]

rp_topics = [
 'Ascending cholangitis: duct wall and debris', 'Cavernous transformation: Doppler collaterals',
 'Intrahepatic portosystemic shunt', 'Recanalized paraumbilical vein', 'Periportal lymphoma',
 'Pneumobilia', 'Common-bile-duct stones', 'Periportal ovarian metastasis', 'Peribiliary cysts',
 'Hepatic schistosomiasis', 'Recurrent pyogenic cholangitis: grayscale',
 'Recurrent pyogenic cholangitis: Doppler companion', 'Hepatic artery calcification', 'Cystic duct remnant']
sd_topics = [
 'Stone-related dilated ducts beside portal branches', 'Pancreatic-head cancer: obstructed ducts',
 'Hypervolemia after resuscitation: 22-year-old woman', 'Hypervolemia after resuscitation: 18-year-old male',
 'Hypervolemia: distinct CT slice in 18-year-old male', 'Heart failure: periportal edema and IVC',
 'Heart failure: hepatic vein/IVC view', 'Acute viral hepatitis: periportal edema and nodes',
 'Acute viral hepatitis: gallbladder edema and ascites', 'Ascending cholangitis: hepatic abscesses',
 'Transhepatic cholangiography: ducts and abscess cavities', 'Post-Whipple cholangitis: edema, ducts, abscess',
 'Post-Whipple cholangitis: ductal gas and abscess', 'PSC: MRCP beading', 'PSC: periportal T1 fibrosis',
 'ERCP: abnormal arborization and distal CBD stricture', 'Recurrent pyogenic cholangitis: coronal MR calculi',
 'Recurrent pyogenic cholangitis: axial MR calculi', 'Recurrent cholangitis: CT ductal gas and abscess',
 'AIDS-related cholangiopathy on MRCP', 'Hepatic-arterial chemotherapy: postoperative duct changes',
 'Hepatic-arterial chemotherapy: additional ductal appearance', 'Posttransplant biliary necrosis/bilomas',
 'Posttransplant periportal edema', 'Traumatic hematoma/laceration with periportal blood',
 'Cirrhotic peribiliary cysts on CT', 'Cirrhotic peribiliary cysts on T2 MR',
 'Portal thrombosis and collaterals: hypercoagulability', 'Portal thrombosis: companion right-portal-vein slice',
 'Perivascular steatosis', 'HCC with enhancing tumor thrombus', 'Cholangiocarcinoma: hilar duct obstruction',
 'CLL periportal infiltration without venous invasion', 'Inflammatory pseudotumor: malignant mimic']
sd_observations = [
 'Bright branching ducts lie beside darker portal branches on MR; differs from all Doppler US images.',
 'CT shows branching duct dilation alongside contrast-enhanced portal branches; a separate malignant-obstruction example.',
 'CT shows circumferential periportal low attenuation and a distended IVC in a full-abdomen view.',
 'CT shows periportal low-density collars; vascular branching and vertebral level differ from the next slice.',
 'Distinct CT slice: altered portal branching, liver contour and vertebral appearance compared with image 4.',
 'CT shows periportal low attenuation and a broad IVC in a different patient from the resuscitation cases.',
 'More superior CT view shows hepatic veins and enlarged IVC; different anatomy from the companion periportal slice.',
 'CT shows collars around portal branches and porta-hepatis soft tissue; distinct from the gallbladder companion slice.',
 'CT shows striking circumferential gallbladder-wall edema in the explicit hepatitis companion case.',
 'Multiple rounded hepatic cavities with enhancing rims are visible on CT.',
 'Direct contrast cholangiogram displays branching ducts and irregular contrast-filled cavities; a distinct procedural view.',
 'CT shows a large left-lobe cavity, mildly dilated ducts and periportal low attenuation in the postoperative setting.',
 'Related CT view includes obvious ductal gas; liver, vessels, kidneys and vertebra differ from image 12, so this is not the same slice.',
 'MRCP depicts irregular beaded ducts and prominent gallbladder, preserving the cholangiographic pattern.',
 'T1 MR shows dark periportal bands in the explicit PSC companion case; a different sequence and view.',
 'ERCP screenshot shows contrast-filled ducts with abnormal arborization and an endoscope; not the MRCP image.',
 'Coronal MR view shows branching dilated ducts containing numerous signal voids.',
 'Axial MR view shows a different plane through ducts with clustered filling defects; retain as a companion view.',
 'CT shows severely dilated intrahepatic ducts and gas, with abscess in source caption; distinct from post-Whipple cases.',
 'MRCP image shows abnormal ductal arborization and distal narrowing, a separate AIDS-related source case.',
 'Postoperative CT shows altered liver anatomy, clips and irregular duct dilation.',
 'Another CT anatomy/level with ductal dilation after arterial chemotherapy; differs substantially from image 21.',
 'CT shows dilated ducts with poorly defined walls and multiple low-density collections; retains biliary-necrosis context.',
 'CT shows periportal low-attenuation collars in a postoperative liver; visually distinct from the necrosis example.',
 'CT shows irregular left-lobe traumatic low attenuation with branching tracking fluid/blood.',
 'CT shows numerous clustered cystic periportal spaces in a cirrhotic liver.',
 'T2 MR companion shows bright clustered cystic spaces, a different modality and slice from image 26.',
 'CT shows nonenhancing branching portal structures and collateral vessels.',
 'Companion CT at a different level shows the right portal-vein abnormality and collaterals.',
 'CT shows mottled perivascular hepatic low attenuation rather than a smooth water-density collar.',
 'CT shows an expanded portal vessel with internal enhancing tissue and parenchymal tumor in the source case.',
 'MRCP shows prominent intrahepatic ducts with hilar obstruction, distinct from the PSC and AIDS examples.',
 'T2 MR shows intermediate-signal periportal soft tissue surrounding vascular structures; source identifies CLL.',
 'CT shows asymmetric periportal soft tissue narrowing a portal branch; source supplies the pseudotumor pathology outcome.'
]

cluster_specs = [
 ('RP-RPC-US', 'RadPrimer', [11,12], 'Recurrent pyogenic cholangitis: grayscale and Doppler', 'explicitSamePatient', 'RadPrimer image 12 explicitly says same patient. Preserve grayscale stones/sludge and the Doppler no-flow companion.'),
 ('SDX-HYPERVOLEMIA-18', 'STATdx', [4,5], 'Resuscitation-related hypervolemia: 18-year-old male', 'conservativeSameCase', 'Matching age/sex and post-trauma resuscitation context plus related CT anatomy. Shared patient is inferred conservatively, not explicitly documented; slices are distinct.'),
 ('SDX-CHF-78', 'STATdx', [6,7], 'Heart failure: periportal and hepatic-venous views', 'strongCaptionLink', 'Both captions describe a 78-year-old woman with CHF; image 7 says this woman. Preserve both distinct CT levels.'),
 ('SDX-HEPATITIS', 'STATdx', [8,9], 'Acute viral hepatitis: periportal and gallbladder edema', 'explicitSamePatient', 'Image 9 explicitly says same patient. No acquisition interval or treatment response is provided.'),
 ('SDX-ABSCESS-PROCEDURE', 'STATdx', [10,11], 'Cholangitis abscesses: CT and transhepatic cholangiography', 'conservativeProcedureLink', 'Adjacent captions link abscesses with ducts and contrast filling of abscess cavities; retain as a procedure group without claiming proven patient identity or an undocumented outcome.'),
 ('SDX-WHIPPLE', 'STATdx', [12,13], 'Ascending cholangitis after Whipple resection', 'strongCaptionAndVisualLink', 'Matching Whipple/pancreatic-cancer/cholangitis/abscess history and related CT anatomy support a conservative case group; distinct slices preserve gas and edema.'),
 ('SDX-PSC-PROCEDURE', 'STATdx', [14,15,16], 'Sclerosing ductal pattern: MRCP, T1 MR and ERCP', 'mixedExplicitAndConservative', 'Images 14–15 are explicitly the same PSC/ulcerative-colitis patient. Image 16 is conservatively retained as an adjacent ERCP companion; its patient identity is not confirmed.'),
 ('SDX-RPC-MR', 'STATdx', [17,18], 'Intrahepatic calculi: coronal and axial MR', 'conservativeMultiplanarLink', 'Adjacent MR captions show similar intrahepatic stone burden in complementary planes; shared patient is not explicitly documented.'),
 ('SDX-CHEMO', 'STATdx', [21,22], 'Hepatic arterial chemotherapy: duct injury', 'conservativeTreatmentContextLink', 'Adjacent captions share the chemotherapy mechanism. Image 21 includes lobectomy/clips; shared patient and interval are not asserted.'),
 ('SDX-PERIBILIARY-CYSTS', 'STATdx', [26,27], 'Peribiliary cysts: CT and MR', 'explicitSamePatient', 'Image 27 explicitly identifies the same patient and another modality/view.'),
 ('SDX-PVT', 'STATdx', [28,29], 'Portal thrombosis after bone marrow transplantation', 'explicitSamePatient', 'Image 29 explicitly identifies the same patient. Both CT levels and the hypercoagulable history remain together.'),
]
clusters=[]
membership={}
for cid, label, numbers, title, certainty, basis in cluster_specs:
    prefix='RP' if label=='RadPrimer' else 'SDX'
    ids=[f'{prefix}-{n:02}' for n in numbers]
    c={'clusterId':cid,'sourceLabel':label,'title':title,'imageIds':ids,'atomic':True,
       'relationshipEvidence':certainty,'evidenceBasis':basis,'patientIdentityConfirmedForWholeCluster':certainty in ['explicitSamePatient','strongCaptionLink'],
       'chronology':'Source order only; no interval, time-lapse or treatment response is supplied.',
       'selectedImageIds':ids,'archiveImageIds':[],'intentionalSplit':False}
    clusters.append(c)
    for mid in ids: membership[mid]=c
for e in originals:
    mid=e['masterImageId']
    if mid in membership: continue
    label=e['sourceLabel'];n=e['sourceImageNumber']
    topic=(rp_topics if label=='RadPrimer' else sd_topics)[n-1]
    c={'clusterId':mid+'-SINGLE','sourceLabel':label,'title':topic,'imageIds':[mid],'atomic':True,
       'relationshipEvidence':'standaloneSourceExample','evidenceBasis':'No required source companion identified; do not infer patient identity from topic alone.',
       'patientIdentityConfirmedForWholeCluster':False,'chronology':'Single source image; no interval supplied.',
       'selectedImageIds':[mid],'archiveImageIds':[],'intentionalSplit':False}
    clusters.append(c); membership[mid]=c
clusters.sort(key=lambda c: min(list(by_original).index(mid) for mid in c['imageIds']))

coverage=[]
all_sdx=[e['masterImageId'] for e in sd['imageRegistry']]
for n, classification, peers, objective, observation in coverage_data:
    mid=f'RP-{n:02}'; comparable=[f'SDX-{p:02}' for p in peers]
    coverage.append({'radPrimerImageId':mid,'radPrimerDisplayLabel':f'RadPrimer image {n}',
      'classification':classification,'statdxImageIds':comparable,'teachingObjective':objective,
      'coverageExtent':'partialConceptualOnly' if peers else 'notCovered',
      'sameImageOrSlice':False,'fullyReplaced':False,'selected':True,'decision':'retainPrimary',
      'visualObservation':observation,'reason':observation,
      'evidence':{'visuallyInspected':True,'radPrimerEvidenceFile':by_audit[mid]['evidenceFilename'],
        'radPrimerFileSha256':by_audit[mid]['fileSha256'],
        'statdxComparedImageIds':all_sdx,
        'conceptualComparatorEvidence':[by_audit[p] for p in comparable],
        'sameStableSourceImageId':False,'byteIdentical':False,'decodedRgbIdentical':False,
        'auditFile':'_codex_review/image_evidence_audit.json','basis':'Actual staged images inspected via labeled contact sheets; stable IDs, file and decoded RGB hashes also checked. Captions used for diagnosis/case context, not exact-duplicate proof.'}})

registry=[]
for orig in originals:
    e=copy.deepcopy(orig);mid=e['masterImageId'];label=e['sourceLabel'];n=e['sourceImageNumber']
    c=membership[mid];a=by_audit[mid]
    e.update({'displayLabel':f'{label} image {n}', 'originalPlainFilename':orig['plainFilename'],
      'originalAnnotatedFilename':orig['annotatedFilename'],'originalGroup':orig.get('group',''),
      'originalGroupNumbers':orig.get('groupNumbers',[]),
      'plainFilename':f"{mid}_{label}_plain_{orig['plainFilename']}",
      'annotatedFilename':f"{mid}_{label}_annotated_{orig['annotatedFilename']}",
      'downloadRecommendation':'primaryTeachingSet', 'archiveReason':None,'duplicateOf':None,
      'sourceMetadataFile':label+'_metadata.json','sourcePackageFile':label+'_source_package.txt',
      'sourceArticleTitle':rp['articleTitle'] if label=='RadPrimer' else sd['articleTitle'],
      'sourceUrl':next(s['sourceUrl'] for s in meta['sources'] if s['sourceLabel']==label),
      'group':label+': '+c['title'],'caseClusterId':c['clusterId'],'atomicCluster':True,
      'clusterImageIds':c['imageIds'],'clusterEvidenceBasis':c['evidenceBasis'],
      'groupNumbers':[by_original[p]['sourceImageNumber'] for p in c['imageIds']] if len(c['imageIds'])>1 else [],
      'teachingPoint':(rp_topics if label=='RadPrimer' else sd_topics)[n-1],
      'usedFor':['imageRecognition','canonicalAnchor' if label=='RadPrimer' else 'supplementalDepth'],
      'sourceAnnotationTokens':re.findall(r'<img\b[^>]*src="([^"]+)"',e['caption']),
      'teachingCaption':e['caption'],
      'visualObservation':coverage[n-1]['visualObservation'] if label=='RadPrimer' else sd_observations[n-1]})
    e['filename']=e['plainFilename']
    if label=='RadPrimer':
        e['radPrimerCoverageByStatdx']=coverage[n-1]
        e['duplicateClassification']=coverage[n-1]['classification']
        if coverage[n-1]['classification']=='conceptualReplacement':e['usedFor']+=['recognitionReinforcement','modalityVariant']
        else:e['usedFor']+=['uniqueTeachingExample']
    else:
        e['usedFor']+=['recognitionReinforcement','alternateExample']
    if len(c['imageIds'])>1:e['usedFor']+=['atomicCaseCompanion']
    if mid in ['SDX-11','SDX-16']: e['usedFor']+=['procedureContext']
    if mid in ['RP-11','RP-12','SDX-04','SDX-05','SDX-12','SDX-13']:
        e['usedFor']+=['recognitionReinforcement','modalityVariant' if mid.startswith('RP') else 'adjacentSlice']
    e['usedFor']=list(dict.fromkeys(e['usedFor']))
    e['visualEvidence'].update({'visuallyInspected':True,'inspectionMethod':'Actual evidence file displayed in source-qualified contact sheet',
      'contactSheet':f"_codex_review/{label}_contact_{(n-1)//8+1}.jpg",'sha256':a['fileSha256'],
      'decodedRgbSha256':a['decodedRgbSha256'],'dimensions':a['dimensions'],'decodedSuccessfully':True,
      'visualObservation':e['visualObservation'],'annotatedVariantInspected':False})
    registry.append(e)
selected=[e['masterImageId'] for e in registry]
archive=[]

source_consistency=[]
for source in meta['sources']:
    label=source['sourceLabel'];single=rp if label=='RadPrimer' else sd
    assert source['metadata']==single
    assert source.get('imageRegistry',single['imageRegistry'])==single['imageRegistry']
    text=read(label+'_source_package.txt').replace('\r\n','\n')
    captions=re.findall(r'IMAGE_(\d+):[^\n]*\n[\s\S]*?    Caption: ([\s\S]*?)(?=\n\nIMAGE_|\n\n=== SOURCE ATTRIBUTION)',text)
    assert len(captions)==len(single['imageRegistry'])
    for (number,caption), e in zip(captions,single['imageRegistry']):
        assert int(number)==e['sourceImageNumber'] and caption.strip()==e['caption'].strip()
        ev=next(x for x in evidence['entries'] if x['masterImageId']==e['masterImageId'])
        assert ev['imageId']==e['imageId'] and ev['caption']==e['caption']
    source_consistency.append({'sourceLabel':label,'articleTitle':single['articleTitle'],'sourceUrl':source['sourceUrl'],
      'sourcePackage':label+'_source_package.txt','metadataFile':label+'_metadata.json',
      'embeddedMetadataMatches':True,'packageCaptionsMatchRegistry':True,'sourceImageCount':len(captions),
      'sourceBreadcrumbs':single['breadcrumbTrail'],'canonicalRoutingUsed':label=='RadPrimer'})
assert evidence==meta['imageEvidence']

download_files=[]
for e in registry:
    for variant in ['plain','annotated']:
        download_files.append({'masterImageId':e['masterImageId'],'sourceKind':e['sourceKind'],'sourceLabel':e['sourceLabel'],
          'sourceImageNumber':e['sourceImageNumber'],'imageNumber':e['sourceImageNumber'],
          'filename':e[variant+'Filename'],'url':e[variant+'Url'],'variant':variant,
          'caption':e['caption'],'downloadRecommendation':'primaryTeachingSet'})
policy='Archive only verified exact duplicates (same image/slice/screenshot or trivial size/caption variant) or unusable media. Near duplicates, alternate examples and conceptual replacements remain primary recognition reinforcement. No image in this bundle meets an archive criterion.'
duplicate_policy='Exact duplicate requires visual evidence from actual staged files, shared stable image IDs, matching image hashes or explicit manual/source confirmation. Caption/topic similarity alone is insufficient; uncertain similarity stays primary. All 48 evidence images were visually reviewed; no exact duplicate identified.'
selection_plan={
 'textSelection':{
  'RadPrimer':{'keep':'Canonical title/hierarchy; Common and Less Common diagnosis order; all diagnosis-specific US/Doppler clues, locations, evolution and clinical/image context.','downweightOrSkip':'Export prompt boilerplate, stale configured manual MSK deck, and uncorroborated direct-systemic-drainage wording for fatty sparing. No diagnosis is removed.'},
  'STATdx':{'keep':'Fluid/lymphatic mechanism and duct-versus-edema/thrombosis distinctions; CT/MR/procedure detail; hypervolemia, congestion, hepatitis, cholangitis variants, transplant complications, malignancy and pseudotumor.','downweightOrSkip':'Alternate hierarchy as a route; repeated generic overlap; unsupported expansion into management algorithms. Preserve source numerical performance ranges in raw input only, not as general validated claims.'}},
 'imageCurationPolicy':policy,'duplicateEvidencePolicy':duplicate_policy,
 'caseClusterGuardrails':{'atomicRule':'Preserve all same-patient, same-procedure, adjacent-slice, multiplanar, sequence, follow-up and time-lapse companions needed to interpret a case.','explicitSamePatientMustRemainTogether':True,
  'uncertainLinks':'Conservative groups preserve related images without asserting shared patient identity, sequence timing or a treatment response. See each cluster evidenceBasis.',
  'intentionalClusterSplits':[],'summary':'No source case cluster was intentionally split.','multiImageClusterIds':[c['clusterId'] for c in clusters if len(c['imageIds'])>1]},
 'imageDownloadPlan':{'primaryTeachingSet':{'RadPrimer':[e['masterImageId'] for e in registry if e['sourceLabel']=='RadPrimer'],'STATdx':all_sdx},
  'archiveOptionalDuplicates':{'RadPrimer':[],'STATdx':[]},'archiveDownloadsByDefault':False,
  'sourceQualifiedFilenames':True,'filenamePattern':'<masterImageId>_<sourceLabel>_<plain|annotated>_<original filename>',
  'selectedImageCount':48,'variantFileCount':96,'variants':['plain','annotated'],'files':download_files,
  'note':'All 48 reviewed images meet primary selection criteria. The 96-file plan is two variants per image, not 96 independent images. Remote variant downloads have not been executed.'},
 'generatorInstructions':[
  'Create no narrative, lecture or cards during master-source synthesis. Future generation requires a separate request.',
  'Use the exact canonicalHierarchy and canonicalDeckPath from metadata.json; append local groups only if later needed. STATdx article title is provenance, not a new routing root.',
  'Use clean source-qualified labels such as RadPrimer image 5 and STATdx image 4. Keep masterImageId codes in registry, filenames and traceability fields without repeating both forms in prose.',
  'Retain source captions verbatim, including HTML arrow/icon tokens and courtesy credits. Use source-qualified filenames; never infer cross-source identity from image numbers.',
  'Keep all primary images available for recognition learning. Near-duplicate companions, distinct slices and conceptual alternatives are useful; do not prune them as text redundancy.',
  'Preserve atomic case clusters and qualify inferred patient/procedure links. Do not invent a follow-up interval, acquisition phase, treatment response or case diagnosis.',
  'Distinguish broad periportal lesions from periportal edema, bland thrombosis from tumor thrombus, and cysts/ducts from vascular structures.',
  'No auditable Core evidence is supplied. Attribute only RadPrimer/STATdx; Corebook routing is not textbook verification.',
  'Any later Corebook card generation or card-quality audit must separately perform the current live-collection retained-card gate; this source synthesis is not that audit.'
 ]}

input_names=['RadPrimer_source_package.txt','STATdx_source_package.txt','RadPrimer_metadata.json','STATdx_metadata.json','metadata.json','master_source_request.md','image_evidence_manifest.json','_master_source_request_complete.txt']
gate={'performedBeforeMerge':True,'statdxFullyCoversRadPrimerImageSet':False,
 'statdxFullyReplacesRadPrimerTeachingObjectives':False,'classificationCounts':dict(Counter(c['classification'] for c in coverage)),
 'radPrimerImageCoverage':coverage,'allRadPrimerImagesRetained':True,
 'scope':'Each RadPrimer image compared against all 34 STATdx evidence images. Conceptual replacement is partial same-topic support only, not image equivalence or deletion permission.',
 'conclusion':'0 exact duplicates, 0 near duplicates across sources, 8 partial conceptual replacements and 6 not covered. Preserve all 14 RadPrimer images.'}
gate['classificationCounts']={k:gate['classificationCounts'].get(k,0) for k in ['exactDuplicate','nearDuplicate','conceptualReplacement','notCovered']}
within_source=[
 {'imageIds':['RP-11','RP-12'],'classification':'nearDuplicate','reason':'Similar same-patient anatomy, but grayscale and color Doppler screenshots convey different findings. Both retained atomically.'},
 {'imageIds':['SDX-04','SDX-05'],'classification':'nearDuplicate','reason':'Matching resuscitation context and related CT anatomy; different slices with changed portal branching and vertebral morphology. Both retained.'},
 {'imageIds':['SDX-12','SDX-13'],'classification':'nearDuplicate','reason':'Related post-Whipple CT case with different slice anatomy and ductal gas information. Both retained.'}
]
manifest={'version':1,'articleTitle':meta['articleTitle'],'createdAt':now,'sourceBundleCreatedAt':meta['createdAt'],
 'canonicalHierarchy':copy.deepcopy(meta['canonicalHierarchy']),'canonicalHierarchySource':meta['canonicalHierarchySource'],
 'canonicalDeckPath':meta['canonicalDeckPath'],'deckPath':meta['canonicalDeckPath'],
 'sourcePriority':{'canonicalBackbone':'RadPrimer','supplementalDepth':'STATdx','routingAuthority':'metadata.json canonicalHierarchy and canonicalDeckPath'},
 'sourceCoverage':{'textCoverage':'RadPrimer broader US/Doppler lesion differential preserved; STATdx edema/mimic and CT/MR/procedure material integrated under that topic.',
  'sourcePairingMatch':meta['sourcePairingMatch'],'sourceComparison':source_consistency,'imageCoverageGate':gate,
  'withinSourceRetainedNearDuplicates':within_source,
  'textOnlyRadPrimerDiagnoses':['Caroli Disease','Iatrogenic Material (generic US hardware appearance)'],
  'sourceImageGaps':'No staged Caroli central-dot example; STATdx postoperative clips do not constitute a generic ultrasound hardware example.'},
 'imageCountBySource':{'RadPrimer':14,'STATdx':34},'primaryImageCountBySource':{'RadPrimer':14,'STATdx':34},
 'archiveImageCountBySource':{'RadPrimer':0,'STATdx':0},'sourceAttributionRules':selection_plan['generatorInstructions'][2:4]+['Use [RadPrimer], [STATdx] and explicitly marked synthesis of Both. Do not imply verified Core support.'],
 'selectedPrimaryImageIds':selected,'archiveOptionalImageIds':archive,'sourceSelectionPlan':selection_plan,'caseClusters':clusters,
 'imageEvidenceReview':{'visuallyInspectedImageCount':48,'missingImageCount':0,'unusableImageCount':0,'exactDuplicateCount':0,
  'identicalStableIdGroups':audit['identicalGroups']['imageId'],'identicalFileHashGroups':audit['identicalGroups']['fileSha256'],
  'identicalDecodedRgbGroups':audit['identicalGroups']['decodedRgbSha256'],'reviewFile':'_codex_review/image_evidence_audit.json',
  'contactSheets':[f'_codex_review/{label}_contact_{p}.jpg' for label,total in [('RadPrimer',2),('STATdx',5)] for p in range(1,total+1)],
  'evidenceScope':'All staged plain previews decoded and visually inspected. Captions, URLs and annotation tokens preserved. Remote annotated variants and icon asset files were not downloaded or inspected.'},
 'coreValidation':{'suppliedAuditableCoreEvidence':False,'status':'notVerified','claim':'RadPrimer + STATdx only; Corebook is the provided deck route, not Core-textbook evidence.'},
 'sourceQualifications':[
  {'source':'RadPrimer','topic':'Fatty Sparing, Liver','issue':'Direct-systemic-drainage mechanism wording is uncorroborated/ambiguous in the paired extraction.','handling':'Retain raw input and drainage-site associations; do not promote the isolated mechanism sentence.'},
  {'source':'STATdx','topic':'AIDS-related cholangitis','issue':'MR/MRCP sensitivity 85–100% and specificity 92–100% lack an auditable study/population citation in the staged text.','handling':'Preserved in original input; quantitative performance not generalized in master teaching text.'},
  {'source':'STATdx','topic':'Posttransplant edema','issue':'Periportal edema alone is not a sign of rejection; this does not exclude all complications.','handling':'Keep expected edema distinct from the separate biliary-necrosis example.'}],
 'inputFiles':[{'filename':n,'sha256':sha(B/n)} for n in input_names],
 'generatedCards':False,'generatedLecture':False,'liveAnkiModified':False}

by_registry={e['masterImageId']:e for e in registry}
header=f'''=== TOPIC ===
PRIMARY TOPIC: {meta['articleTitle']}
CENTERING TOPIC FOR THIS CHAT: {meta['articleTitle']}
USE THIS AS THE CHAT TITLE / WORKING TOPIC LABEL: {meta['articleTitle']}

=== CANONICAL RADPRIMER BREADCRUMB ===
{' > '.join(meta['canonicalHierarchy'])}
canonicalHierarchy: {json.dumps(meta['canonicalHierarchy'],ensure_ascii=False)}
deckPath: {meta['canonicalDeckPath']}

=== SOURCE BASIS ===
[RadPrimer] Periportal Lesion — canonical differential, ultrasound/Doppler examples and routing.
[STATdx] Periportal Lucency or Edema — manually paired supplement for mechanisms, CT/MR, ductal mimics and procedures.
Core validation: No auditable Core Radiology evidence supplied; this is a RadPrimer + STATdx source package.
Purpose: Fused source reference and curated image library only. No cards or lecture generated.
Image selection: 14 RadPrimer images + 34 STATdx images = 48 primary images; 0 archive images. All actual staged evidence files reviewed. STATdx does not fully cover the RadPrimer image set.

'''
library=['=== SELECTED IMAGE LIBRARY ===','Use the source-qualified display labels below. Source-local numbers are preserved; short codes appear in filenames and machine-readable traceability only. All entries are primary teaching images.','']
for c in clusters:
    library += [f"Teaching group: {c['sourceLabel']} — {c['title']}",f"Companion context: {c['evidenceBasis']}",f"Chronology: {c['chronology']}"]
    for mid in c['imageIds']:
        e=by_registry[mid]
        library += [f"{e['displayLabel']} [{e['sourceLabel']}]",f"  Image: {e['plainFilename']}",f"  Image_Annotated: {e['annotatedFilename']}",
                    f"  Caption: {e['caption']}",f"  Teaching use: {e['teachingPoint']}",'']
    library.append('')
tail=['=== OPTIONAL DUPLICATE ARCHIVE ===','None. No verified exact duplicate or unusable staged image was found.','',
      '=== SOURCE ATTRIBUTION ===']
for s in meta['sources']:tail.append(f"[{s['sourceLabel']}] {s['metadata']['articleTitle']}: {s['sourceUrl']}")
tail.append('Core Radiology: not verified from this bundle.')
package=(header+(W/'synthesis_body.txt').read_text(encoding='utf-8').strip()+'\n\n'+'\n'.join(library+tail)).strip()
(B/'master_source_package.txt').write_bytes(package.encode('utf-8'))
manifest['packageSha256']=sha(B/'master_source_package.txt')
dump('master_source_manifest.json',manifest)
dump('image_registry.json',registry)
dump('master_source_import.json',{'version':1,'articleTitle':meta['articleTitle'],'createdAt':now,'packageText':package,
 'manifest':manifest,'imageRegistry':registry,'sourceSelectionPlan':selection_plan,
 'selectedPrimaryImageIds':selected,'archiveOptionalImageIds':archive})

report=['# Periportal Lesion — master-source report','',
 'Completed the source and actual-image review for the imported browser bundle. **All 48 images are selected: 14 RadPrimer and 34 STATdx. No image is archived.** STATdx does not fully cover the RadPrimer image set. No cards or lecture were generated.','',
 '## Canonical source and routing','',
 f"Canonical hierarchy, copied exactly from metadata.json: `{json.dumps(meta['canonicalHierarchy'])}`.",
 f"Canonical deck path: `{meta['canonicalDeckPath']}`.",
 'RadPrimer remains the title, hierarchy and differential-order authority. STATdx’s manually paired title, “Periportal Lucency or Edema,” is a complementary, narrower topic. Its hierarchy is retained only as source provenance. The stale configured manual MSK deck is not used.','',
 '## Source comparison','',
 'Both source metadata files exactly match their copies embedded in metadata.json. Image numbers and all 48 captions agree between source packages, metadata registries and the evidence manifest. The evidence manifest matches metadata.json. The six requested input documents were compared; originals remain unchanged.','',
 '| Source | Text retained | Image role |','|---|---|---|',
 '| RadPrimer | All 17 differential diagnoses in their original Common/Less Common order; ultrasound/Doppler patterns, locations, temporal descriptions and case histories. | 14 canonical examples, including vascular channels, lymphoma/metastasis, gas/stones, cysts, schistosomiasis, arterial calcification and postoperative remnant. |',
 '| STATdx | Edema mechanism and mimics; added CT/MR/ductal/procedure detail, congestion, hypervolemia, cholangitis variants, transplant changes and malignant/inflammatory mimics. | 34 distinct CT/MR/cholangiography examples, all retained as supplemental depth and recognition reinforcement. |','',
 'The synthesis integrates overlap within RadPrimer’s diagnosis order, then places genuinely additional STATdx topics under the same root. Export prompt boilerplate is removed. The source package remains a reference outline and image library, not a lecture.','',
 '## Image coverage gate','',
 'Performed before writing the fused package. Each RadPrimer image was compared with the 34 STATdx evidence images. There are **0 cross-source exact duplicates, 0 cross-source near duplicates, 8 partial conceptual replacements, and 6 not covered**. A conceptual replacement here only covers part of the topic; it neither reproduces the RadPrimer image nor permits archiving it.','',
 '| RadPrimer image | Classification | STATdx conceptual comparators | Decision and evidence |',
 '|---|---|---|---|']
for c in coverage:
    report.append(f"| {c['radPrimerImageId']} | {c['classification']} | {', '.join(c['statdxImageIds']) or 'None'} | Retain primary. {c['visualObservation']} |")
report += ['', 'All six uncovered images remain: RP-03, RP-04, RP-08, RP-10, RP-13 and RP-14. RP-12’s conceptual comparators do not supply its absent-flow Doppler finding; that unique teaching need is explicitly retained.','',
 '## Actual-media evidence','',
 'All 48 staged plain-image files decoded successfully and were visually inspected in seven labeled contact sheets built from those actual files. File SHA-256, decoded RGB SHA-256, dimensions and stable source IDs are recorded in `_codex_review/image_evidence_audit.json` and in each registry entry. None share a stable image ID, exact file hash or decoded RGB hash. A perceptual-difference screen was used only to identify candidates for visual review, never as proof of duplication.','',
 'No literal duplicate or unusable image was found. RP-11/RP-12 retain different grayscale/Doppler information. SDX-04/SDX-05 and SDX-12/SDX-13 are related but different slices. Their near-duplicate status is within-source reinforcement and is separate from the RadPrimer-versus-STATdx coverage counts.','',
 'The review used staged plain previews. Annotated URLs and all original caption HTML/icon references are preserved, but remote annotated variants and arrow icon asset files were not staged, downloaded or visually verified. This limitation does not justify dropping a plain image.','',
 '## Atomic case and procedure groups','',
 '**No source case cluster was intentionally split.** All companions are selected. The following multi-image groups are explicit or conservatively protected; all other images have standalone atomic registry groups. No unsupported interval, follow-up progression or treatment response has been added.','',
 '| Cluster | Images | Evidence and protection |','|---|---|---|']
for c in clusters:
    if len(c['imageIds'])>1:report.append(f"| {c['clusterId']} | {', '.join(c['imageIds'])} | {c['evidenceBasis']} |")
report += ['', 'Conservative grouping protects context; it does not prove patient identity. In particular, the explicit PSC pair is SDX-14/SDX-15, while the adjoining ERCP SDX-16 is protected without a confirmed same-patient claim. SDX-23 and SDX-24 remain different transplant examples rather than an invented before/after pair.','',
 '## Source qualifications','',
 '- No auditable Core excerpt or page evidence is present. RadPrimer + STATdx attribution is explicit; the Corebook route does not establish textbook validation.',
 '- RadPrimer’s direct-systemic-drainage sentence for fatty sparing is uncorroborated/ambiguous in the paired extraction. The original is preserved, while the master retains supported imaging patterns and drainage-site associations without promoting that isolated mechanism.',
 '- STATdx’s AIDS-related MR/MRCP sensitivity/specificity ranges remain in the raw input. They are not generalized without an auditable study/population basis.',
 '- Caroli disease has text support but no specifically labeled central-dot image in the staged sets. Generic iatrogenic-material US morphology is text-only; postoperative clips in a STATdx CT have their own treatment context.',
 '- The metastasis, HCC, CLL, PSC, schistosomiasis and cystic-duct-remnant examples retain their source diagnoses. Related findings are not relabeled to fill gaps.',
 '- Expected transplant edema is distinguished from the separate biliary-necrosis complication. The pseudotumor case retains its pathology outcome without an invented confirmed IgG4 diagnosis.','',
 '## Extension handoff','',
 'Import **master_source_import.json**. It contains the exact package text, manifest, complete registry, selection plan and selected/archive lists. Narrative-facing image labels use “RadPrimer image N” or “STATdx image N”; short identifiers remain in filenames and traceability fields.','',
 'The primary plan lists 48 image IDs and 96 source-qualified variant downloads: one plain and one annotated file per image. The optional archive list is empty. This is curated retention after inspection, not unreviewed bulk selection. No browser import or remote image download was performed.','',
 'Validation checks the actual installed extension’s single-file and separate-file import helpers and its download selection/naming functions, along with source fidelity, canonical routing, captions, hashes and group completeness. Results are saved in `_codex_review/validation_results.json`; the done marker is written only after these checks pass.','',
 '## Deliverables','',
 '- master_source_package.txt', '- master_source_manifest.json', '- image_registry.json', '- master_source_import.json',
 '- master_source_report.md', '- _codex_master_source_done.txt (written by successful validation)',
 '', 'No Anki edits, cards, lecture, image deletions or downstream generation were performed.']
(B/'master_source_report.md').write_text('\n'.join(report)+'\n',encoding='utf-8')
print(json.dumps({'created':5,'primaryImages':48,'archiveImages':0,'variantDownloads':96,'clusters':len(clusters),'multiImageClusters':sum(len(c['imageIds'])>1 for c in clusters),'packageChars':len(package),'coverage':gate['classificationCounts']},indent=2))
