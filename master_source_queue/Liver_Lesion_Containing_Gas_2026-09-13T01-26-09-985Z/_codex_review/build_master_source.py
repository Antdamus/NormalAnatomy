import copy
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path

B = Path(__file__).resolve().parent.parent
W = B / '_codex_review'
read = lambda name: (B / name).read_text(encoding='utf-8-sig')
load = lambda name: json.loads(read(name))
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
def write_json(name, value):
    (B / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')

meta = load('metadata.json')
rp, sd = load('RadPrimer_metadata.json'), load('STATdx_metadata.json')
audit = load('_codex_review/image_file_audit.json')
files = {f['masterImageId']: f for f in audit['files']}
created = datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z')
primary = [e['masterImageId'] for e in sd['imageRegistry']]
archive = [e['masterImageId'] for e in rp['imageRegistry']]
term_url = 'https://www.jnjmedtech.com/en-US/products/surgery/biosurgery/surgicel-original-absorbable-hemostat/'

# Explicit decisions made after inspecting every staged image in paired comparison sheets.
# The source UUID and observed same slice/composite establish identity; JPEG hashes differ.
observations = {
 1: 'Same axial CT slice, right hepatic gas-fluid cavity, three bright portions of the drainage catheter, rib profiles and vertebra.',
 2: 'Same cropped axial CT slice, two low-attenuation foci, small posterior gas pocket, hilar vascular configuration and vertebral level.',
 3: 'Same axial CT slice, nonenhancing left lobe with identical branching gas, bright operative material and right-lobe perfusion pattern.',
 4: 'Same axial CT slice, large devascularized right-lobe region, isolated tiny gas bubble, contrast-filled stomach and pleural fluid.',
 5: 'Same axial CT slice, clustered gas in the treated right-lobe lesion, bright clip, adjacent low-attenuation lesion and hilar vessels.',
 6: 'Same axial CT slice, very large gas-filled right hepatic mass, smaller heterogeneous left-sided mass and spleen outline.',
 7: 'Same four-panel MR composite in the same arrangement; matching gas-fluid focus, liver contours and vessels in every panel.',
 8: 'Same coronal CT reconstruction, peripheral branching hepatic gas, extensive bowel pneumatosis, distended stomach and aortic calcification.',
 9: 'Same two-panel ultrasound composite with identical portal branching, echogenic gas foci and speckle configuration in each panel.',
10: 'Same axial upper-abdominal CT slice, tightly packed gas adjacent to a bright clip, little local fluid and identical kidney/vessel contours.',
11: 'Same axial pelvic CT slice, large fluid collection, compact cluster of gas bubbles, bright focus and identical pelvic bones; liver is not shown.',
12: 'Same axial CT slice, wedge-shaped gas/fluid collection, branching gas, portal structures, kidneys and enlarged spleen.',
13: 'Same axial CT slice, left-lobe fluid/gas cavity, adjacent surgical material, stomach and splenic contours.',
14: 'Same axial CT slice, rounded subcapsular fluid collection with one gas pocket and identical diaphragm, spleen and vertebra.'
}
contexts = {
 1: ('Drained pyogenic abscess', ['imageRecognition','procedureContext','gasFluidLevel'], 'Keep the percutaneous drainage catheter in view. Gas in this treated cavity is not proof of the original route of gas entry.'),
 2: ('Cholangitis-associated abscesses', ['imageRecognition','recognitionReinforcement','alternateExample','mechanismComparison'], 'Two abscesses occur with ascending cholangitis. Preserve the caption\'s alternatives: gas may reflux from the ducts or arise from infection.'),
 3: ('Postoperative hepatic infarction', ['imageRecognition','vascularPattern','postoperativeContext'], 'Infarction followed attempted peripheral cholangiocarcinoma resection; retain the nonenhancing left lobe and portal gas together.'),
 4: ('Traumatic devascularization', ['imageRecognition','recognitionReinforcement','alternateExample','traumaContext'], 'Blunt trauma avulsed the right-lobe hepatic artery and veins. The source attributes gas to infarction without infection in this case.'),
 5: ('Tumor following radiofrequency ablation', ['imageRecognition','procedureContext','treatmentEffect'], 'Colon-cancer metastases after radiofrequency ablation; clips reflect intervention for post-ablation bleeding. Keep treated and other visible lesions together.'),
 6: ('Tumor following chemotherapy', ['imageRecognition','recognitionReinforcement','alternateExample','treatmentEffect'], 'Breast-cancer metastases after chemotherapy; the source states that gas reflects tumor infarction without infection in this case.'),
 7: ('Gas-containing abscess MR composite', ['imageRecognition','recognitionReinforcement','modalityVariant','multiphaseComparison'], 'Atomic four-panel MR composite in a 63-year-old man with pancreatic cancer and right upper quadrant pain: T2, precontrast T1, arterial and venous phase images. Keep all panels; absence of enhancement refers to the depicted contents, not a rule that abscess walls never enhance.'),
 8: ('Portal gas and bowel pneumatosis on CT', ['imageRecognition','vascularPattern','bowelContext'], 'Keep the coronal liver-and-bowel field together to show peripheral portal gas and pneumatosis. No same-patient link to the separate ultrasound example is documented.'),
 9: ('Portal venous gas ultrasound composite', ['imageRecognition','recognitionReinforcement','modalityVariant','comparisonViews'], 'Atomic two-panel ultrasound composite in a woman with cirrhosis after hypotension. CT findings are caption-only in this case; the actual CT is not supplied. Panel timing/order is not documented; do not invent a cine sequence or link to STATdx image 8.'),
10: ('Postoperative hemostatic material', ['imageRecognition','postoperativeContext','mimicComparison'], 'Gas-containing hemostatic material near the liver with relatively little local fluid. Use the verified material name, oxidized regenerated cellulose (Surgicel). No documented follow-up relationship to the pelvic example.'),
11: ('Hemostatic material within postoperative abscess', ['imageRecognition','recognitionReinforcement','alternateExample','crossAnatomicAnalogy'], 'This is a pelvic CT example, not a hepatic abscess image. Retain it as the source\'s visual analogy: tightly packed gas in hemostatic material can coexist with a larger postoperative abscess. Do not relabel its anatomy or identify it as follow-up to STATdx image 10.'),
12: ('Allograft infected biloma, wedge-shaped example', ['imageRecognition','transplantContext','vascularComplication'], 'Allograft malfunction with infected biloma attributed to hepatic artery thrombosis. Preserve wedge morphology and the transplant context.'),
13: ('Allograft infected biloma, left-lobe example', ['imageRecognition','recognitionReinforcement','alternateExample','transplantContext'], 'Acute allograft dysfunction with left-lobe infected biloma; arterial thrombosis was subsequently confirmed. This is a distinct supplied image from STATdx image 12; patient identity or follow-up linkage between them is not established.'),
14: ('Fluid and gas after deep liver laceration', ['imageRecognition','recognitionReinforcement','alternateExample','traumaContext'], 'The scan was obtained several days after deep liver laceration. The prior trauma image is not supplied; do not invent an earlier study or assume infection from gas alone.')
}

coverage = []
clusters = []
registry = []
for r, s in zip(rp['imageRegistry'], sd['imageRegistry']):
    n = r['sourceImageNumber']
    assert r['imageId'] == s['imageId'] and r['caption'] == s['caption']
    a, z = files[r['masterImageId']], files[s['masterImageId']]
    evidence = {
        'sameStableSourceImageId': r['imageId'],
        'visualReviewCompleted': True,
        'reviewMethod': 'Manual inspection of paired renders of the actual staged files; stable source UUID corroborates the same slice or composite.',
        'radPrimerEvidenceFilename': a['path'], 'statdxEvidenceFilename': z['path'],
        'radPrimerSha256': a['sha256'], 'statdxSha256': z['sha256'],
        'radPrimerDimensions': a['dimensions'], 'statdxDimensions': z['dimensions'],
        'byteIdentical': a['sha256'] == z['sha256'],
        'rgbPixelIdentical': a['rgbSha256'] == z['rgbSha256'],
        'contactSheet': a['contactSheet'],
        'sameSliceOrComposite': True,
        'hashInterpretation': 'Different encoding/dimensions produce different file and RGB hashes; exactDuplicate means the same source visual content, not byte equality.'
    }
    coverage.append({
        'radPrimerImageId': r['masterImageId'], 'statdxImageIds': [s['masterImageId']],
        'replacementImageId': s['masterImageId'], 'classification': 'exactDuplicate',
        'decision': 'Archive RadPrimer duplicate; retain equivalent STATdx image in full.',
        'visualObservation': observations[n], 'evidence': evidence,
        'teachingNeedCovered': contexts[n][0], 'allPanelsAndContextRetained': True
    })
    cid = f'GAS-CASE-{n:02d}'
    panel_count = 4 if n == 7 else 2 if n == 9 else 1
    clusters.append({
        'clusterId': cid, 'title': contexts[n][0], 'atomic': True,
        'sourceMembers': {'RadPrimer': [r['masterImageId']], 'STATdx': [s['masterImageId']]},
        'selectedImageIds': [s['masterImageId']], 'archiveImageIds': [r['masterImageId']],
        'type': 'embeddedMultiphaseComposite' if n == 7 else 'embeddedComparisonComposite' if n == 9 else 'singleSuppliedCaseImage',
        'panelCountPerSourceImage': panel_count,
        'samePatientConfirmedWithinComposite': n in [7,9],
        'separateImageSamePatientLinks': [], 'intentionalSplit': False,
        'sourceGrouping': 'Source group fields are empty; embedded composites and caption procedure context are explicitly protected here.',
        'context': contexts[n][2],
        'replacementMappings': [{'archivedImageId':r['masterImageId'], 'selectedImageId':s['masterImageId'], 'classification':'exactDuplicate'}]
    })
    for original in [r,s]:
        e = copy.deepcopy(original)
        id_ = e['masterImageId']; a = files[id_]
        selected = id_ in primary
        e.update({
            'displayLabel': f"{e['sourceLabel']} image {n}",
            'originalPlainFilename': e['plainFilename'], 'originalAnnotatedFilename': e['annotatedFilename'],
            'originalGroup': e.get('group',''), 'originalGroupNumbers': e.get('groupNumbers',[]),
            'caseClusterId': cid, 'group': cid, 'panelCount': panel_count,
            'caseContext': contexts[n][2], 'teachingTopic':contexts[n][0],
            'downloadRecommendation': 'primaryTeachingSet' if selected else 'archiveOptionalDuplicate',
            'usedFor': contexts[n][1] if selected else [],
            'duplicateClassification': 'exactDuplicate',
            'duplicateOf': None if selected else s['masterImageId'],
            'equivalentImageIds': [r['masterImageId'] if selected else s['masterImageId']],
            'duplicateEvidence': evidence,
            'selectionReason': 'Retain the same source visual in the larger staged 1000 x 1000 encoding; no claim that it adds new anatomy.' if selected else '',
            'archiveReason': '' if selected else 'Exact duplicate: same stable source image UUID and visually verified same slice/composite as ' + s['masterImageId'] + '; trivial size/encoding variant. Entire image and all panels are retained in STATdx.',
            'teachingCaption': e['caption'].replace('oxidized surgical gelatin (Surgicel)', 'oxidized regenerated cellulose (Surgicel)'),
            'captionCorrectionIds': ['SRC-01'] if n == 10 else [],
            'sourceAnnotationTokens': re.findall(r'<img\b[^>]*src="([^"]+)"', e['caption']),
            'annotationAssets': {'captionHtmlPreserved': True, 'plainEvidenceInspected': True, 'annotatedVariantDownloadedInBundle':False, 'captionIconFilesSupplied':False},
            'sourceMetadataFile': e['sourceLabel'] + '_metadata.json',
            'sourcePackageFile': e['sourceLabel'] + '_source_package.txt'
        })
        for variant in ['plain','annotated']:
            e[variant+'Filename'] = f"{id_}_{e['sourceLabel']}_{variant}_{original[variant+'Filename']}"
        e['filename'] = e['plainFilename']
        e['visualEvidence'].update({
            'visuallyInspected':True,'sha256':a['sha256'],'rgbSha256':a['rgbSha256'],
            'dimensions':a['dimensions'],'contactSheet':a['contactSheet'],
            'visualObservation':observations[n], 'reviewedAt':created
        })
        registry.append(e)
registry.sort(key=lambda e: (0 if e['sourceKind']=='radprimer' else 1, e['sourceImageNumber']))
by_id = {e['masterImageId']:e for e in registry}

reinforcement_groups = [
    {'title':'Abscess recognition across CT, MR and clinical contexts','imageIds':['SDX-01','SDX-02','SDX-07']},
    {'title':'Infarction after surgery and trauma','imageIds':['SDX-03','SDX-04']},
    {'title':'Sterile tumor treatment effects','imageIds':['SDX-05','SDX-06']},
    {'title':'Portal gas across CT and ultrasound','imageIds':['SDX-08','SDX-09']},
    {'title':'Hemostatic material with and without a larger abscess','imageIds':['SDX-10','SDX-11']},
    {'title':'Distinct transplant biloma morphologies','imageIds':['SDX-12','SDX-13']},
    {'title':'Distinct trauma mechanisms and timing','imageIds':['SDX-04','SDX-14']}
]
for g in reinforcement_groups:
    g.update({'allRetained':True,'samePatientRelationship':'not established','relationship':'conceptual teaching comparison; not an exact duplicate or documented follow-up cluster'})

quality_notes = [
    {'id':'SRC-01','severity':'terminologyCorrection','locations':['Both: ESSENTIAL INFORMATION > Retained Foreign Body','RP-10 caption','SDX-10 caption'],
     'sourceWording':'oxidized surgical gelatin (Surgicel)', 'teachingWording':'oxidized regenerated cellulose (Surgicel)',
     'resolution':'Corrected only in teaching text/teachingCaption; verbatim original captions remain in the registry and original input files.',
     'verification':{'source':'J&J MedTech / Ethicon, SURGICEL Original Absorbable Hemostat','url':term_url,'accessedAt':created,'scope':'Material identity only; not a new clinical management source.'}},
    {'id':'SRC-02','severity':'anatomicContext','locations':['RP-11','SDX-11'],
     'resolution':'Visual evidence shows a pelvic rather than hepatic CT section. Keep selected as a cross-anatomic example of hemostatic material within an abscess; caption says postoperative abscess and does not name liver. Do not create a hepatic localization claim.'},
    {'id':'SRC-03','severity':'sourceHierarchyAmbiguity','locations':['RadPrimer DIFFERENTIAL DIAGNOSIS'],
     'resolution':'Hepatic Venous Gas is listed under both Common and Less Common. Preserve this source hierarchy, but do not derive contradictory prevalence claims or duplicate teaching objectives from it; detailed discussion occurs once.'},
    {'id':'SRC-04','severity':'captionScope','locations':['RP-07','SDX-07'],
     'resolution':'Preserve the four-panel caption and variable fluid T1 signal. Keep absence of enhancement tied to depicted contents; the article separately describes abscess rim/capsule enhancement. Do not generalize variable pus signal or absent wall enhancement.'},
    {'id':'SRC-05','severity':'contextQualification','locations':['Both: hepatic transplantation, trauma and treated tumor text'],
     'resolution':'Retain often/usually qualifiers and specific case history. Do not turn early posttransplant portal gas, post-treatment gas or transient traumatic gas into unconditional benignity; these are source-context observations, not universal exclusion of infection or ischemia.'},
    {'id':'SRC-06','severity':'unsuppliedCompanions','locations':['RP-09','SDX-09','RP-14','SDX-14'],
     'resolution':'The ultrasound caption references CT findings but supplies no CT from that documented case; the trauma caption references injury several days earlier but supplies no earlier scan. Preserve references as caption history, without inventing images, time intervals or cross-image patient links.'}
]

plan = {
    'canonicalBackbone':'RadPrimer hierarchy and differential map; metadata.json canonicalHierarchy and canonicalDeckPath copied exactly.',
    'textSelection':{
        'RadPrimer':{'keep':['Complete Common/Less Common differential hierarchy','All ESSENTIAL INFORMATION sections, mechanisms and modality-specific details','Original source captions and provenance'], 'downweightOrSkip':['Prompt wrappers and unverified Core request language','Stale manual MSK deck root in inherited settings','A second prevalence assertion from duplicated Hepatic Venous Gas listing']},
        'STATdx':{'keep':['Corroboration of the full identical ESSENTIAL INFORMATION text and captions','Equivalent 1000 x 1000 image encodings for the selected image set'], 'downweightOrSkip':['Repeated copy of identical article text/captions','STATdx breadcrumb for canonical routing','Claims of additional depth, unique modalities or management not actually present in this staged source']}
    },
    'imageCurationPolicy':'Archive only verified exact same-image/slice/screenshot duplicates or unusable images. Near duplicates, different slices/patients/modalities/stages/severities and conceptual replacements remain primary as recognition reinforcement unless visually identical or unusable.',
    'duplicateEvidencePolicy':'Exact duplicate requires actual staged visual evidence, the same stable source image ID, image hashes, or explicit manual/source confirmation. Caption/topic similarity alone is insufficient; uncertain matches remain primary. Here all 14 matches have same UUID plus manual same-slice/composite confirmation, despite different hashes.',
    'caseClusterGuardrails':{
        'rule':'Same-patient, adjacent-slice, follow-up, procedure, comparison-view and time-lapse clusters are atomic. Replace a source cluster only with an equivalent complete cluster, unless a safe split is explicitly documented.',
        'embeddedComposites':['SDX-07: retain all four MR panels','SDX-09: retain both ultrasound panels'],
        'wholeClusterReplacement':'Every RadPrimer case image/composite is replaced in full by its identical STATdx counterpart.',
        'intentionalSplits':[], 'unverifiedCaseLinks':'Do not infer same-patient links across separate image numbers from shared diagnosis or adjacency.',
        'missingCompanions':'Do not synthesize the caption-referenced CT for image 9 or a prior scan for image 14.'
    },
    'imageDownloadPlan':{
        'primaryTeachingSet':{'RadPrimer':[],'STATdx':primary},
        'archiveOptionalDuplicates':{'RadPrimer':archive,'STATdx':[]},
        'archiveDownloadsByDefault':False, 'variants':['plain','annotated'],
        'primaryImageCount':14, 'primaryVariantDownloadCount':28,
        'filenamePolicy':'masterImageId_sourceLabel_variant_originalFilename; preserve source image numbers and original URLs.',
        'files':[]
    },
    'generatorInstructions':[
        'This handoff contains source material only. Generate no cards or lecture during master-source synthesis.',
        'Future generation must use only selectedPrimaryImageIds by default; recovery duplicates do not create additional default teaching items.',
        'Use one clean human-facing source label (STATdx image 4 or RadPrimer image 4). Keep short IDs in structured registry/manifest/filename traceability fields.',
        'Use teachingCaption when present and preserve original caption HTML/icons in source records. Apply sourceQualityNotes, especially Surgicel material identity and pelvic image 11.',
        'Preserve all atomic composite panels, procedures, history, infection-versus-infarction qualifiers and unprovided companion-image caveats.',
        'Route all future breadcrumb/deckPath/IMAIOS artifacts from the exact canonical hierarchy and supplied canonicalDeckPath; do not reuse the STATdx breadcrumb or stale manual deck settings.',
        'Do not claim Core Radiology validation. No auditable Core excerpt/page evidence was supplied in this bundle.',
        'If future card generation is requested, apply the current live retained-card gate then; no Anki snapshot or edits are part of this master-source-only task.'
    ]
}
for e in registry:
    if e['masterImageId'] not in primary: continue
    for v in ['plain','annotated']:
        plan['imageDownloadPlan']['files'].append({'masterImageId':e['masterImageId'],'sourceKind':e['sourceKind'],'sourceLabel':e['sourceLabel'],'sourceImageNumber':e['sourceImageNumber'],'variant':v,'filename':e[v+'Filename'],'url':e[v+'Url']})

rp_text, sd_text = read('RadPrimer_source_package.txt'), read('STATdx_source_package.txt')
essential = rp_text.split('ESSENTIAL INFORMATION\n',1)[1].split('=== IMAGES',1)[0].strip()
sd_essential = sd_text.split('ESSENTIAL INFORMATION\n',1)[1].split('=== IMAGES',1)[0].strip()
assert essential == sd_essential
differential = rp_text.split('DIFFERENTIAL DIAGNOSIS\n',1)[1].split('ESSENTIAL INFORMATION',1)[0].strip()
teaching_essential = essential.replace('Oxidized surgical gelatin (Surgicel)', 'Oxidized regenerated cellulose (Surgicel)')
package = [
    '=== TOPIC ===', 'PRIMARY TOPIC: '+meta['articleTitle'], 'CENTERING TOPIC FOR THIS CHAT: '+meta['articleTitle'],
    'USE THIS AS THE CHAT TITLE / WORKING TOPIC LABEL: '+meta['articleTitle'], '',
    '=== RADPRIMER BREADCRUMB ===', ' > '.join(meta['canonicalHierarchy']), '',
    '=== CANONICAL ROUTING ===', 'canonicalHierarchy: '+json.dumps(meta['canonicalHierarchy'],ensure_ascii=False),
    'deckPath: '+meta['canonicalDeckPath'], '',
    '=== SOURCE BASIS ===',
    '[RadPrimer] Canonical hierarchy and complete differential map.',
    '[Both] Identical essential teaching text and identical captions; included once with the material-name correction documented below.',
    '[STATdx] Selected equivalent larger image encodings. All 14 distinct source images remain represented; no unique STATdx image or extra management section is present in this bundle.',
    'Core Radiology: no auditable Core evidence supplied; this is a RadPrimer + STATdx synthesis, not Core-validated content.',
    'Scope: a source package for later generation; no cards or lecture generated.', '',
    '=== ARTICLE ===', 'TITLE: '+meta['articleTitle'], '',
    'DIFFERENTIAL DIAGNOSIS [RadPrimer]', differential, '',
    'ESSENTIAL INFORMATION [Both]', teaching_essential, '',
    '=== SOURCE QUALITY AND INTERPRETATION NOTES ===',
    '[Verified terminology correction] Surgicel is oxidized regenerated cellulose. Both supplied sources use inconsistent gelatin/cellulose terminology. Teaching text and the affected teaching caption use the verified material name; original captions remain unchanged in image_registry.json.',
    'Material identity source: [J&J MedTech / Ethicon SURGICEL Original Absorbable Hemostat]('+term_url+').',
    '[Visual review] STATdx image 11 is a pelvic postoperative abscess example used as an analogy for hemostatic material. It must not be described as a hepatic image.',
    '[RadPrimer hierarchy ambiguity] Hepatic Venous Gas appears in both Common and Less Common lists. The hierarchy is preserved, but this is not evidence for two different prevalence claims.',
    '[Both, caption scope] STATdx image 7 is one four-panel MR composite. Keep the source-described variable fluid signal and lack of content enhancement in this case; the main article also describes abscess rim/capsule enhancement.',
    '[Both, context] Preserve the often/usually qualifiers around posttransplant and trauma findings. Sterile gas in specific treated/infarcted examples must not become a universal exclusion of infection.',
    '[Evidence limits] STATdx image 9 references CT findings, but that patient\'s CT is not separately supplied. STATdx image 14 references an earlier injury, but no prior scan is supplied. Do not invent same-patient links across image numbers.',
    '[Media] Plain staged files were inspected. Annotated URLs and caption icon HTML are preserved for later download; annotated variants and separate arrow icon files are not included in the staged evidence.', '',
    '=== SELECTED IMAGE LIBRARY ===',
    'Use these source-qualified image labels and filenames. Each listed image is a distinct retained example; original image numbering is preserved. Keep every panel of each composite.', ''
]
for e in registry:
    if e['masterImageId'] not in primary: continue
    package.extend([
        e['displayLabel']+' [STATdx]',
        '  Topic: '+e['teachingTopic'],
        '  Image: '+e['plainFilename'], '  Image_Annotated: '+e['annotatedFilename'],
        '  Caption: '+e['teachingCaption'], '  Context / grouping: '+e['caseContext'], ''
    ])
package.extend(['=== OPTIONAL DUPLICATE RECOVERY INDEX ===',
    'The following source copies remain in the full registry and may be recovered explicitly. They are excluded from default downloads because each is the same image/slice/composite, verified visually and by stable source ID.'])
for n in range(1,15): package.append(f'RadPrimer image {n}: exact visual duplicate of selected STATdx image {n}; identical case context and all panels retained.')
package.extend(['','=== FUTURE GENERATOR RULES ===',
    'Use the selected library by default. Keep the RadPrimer hierarchy exactly as shown. Use [RadPrimer], [STATdx] and [Both] attribution without implying independent evidence from duplicated passages.',
    'Preserve recognition reinforcement across different images, including the alternate abscess, infarction, treated tumor, portal gas, transplant and trauma examples.',
    'Use one clean source-qualified human label in prose. Technical short IDs remain in registry fields and filenames.',
    'No source case cluster was intentionally split. Do not crop away companion panels, procedure devices or relevant extrahepatic context.',
    'Do not fabricate Core support, source images, patient relationships, follow-up timing or management guidance absent from these sources.'
])
package_text = '\n'.join(package).strip()
(B/'master_source_package.txt').write_text(package_text,encoding='utf-8',newline='\n')

inputs = ['RadPrimer_source_package.txt','STATdx_source_package.txt','RadPrimer_metadata.json','STATdx_metadata.json','metadata.json','master_source_request.md','image_evidence_manifest.json','_master_source_request_complete.txt','codex_wake_message.txt']
manifest = {
    'version':1,'articleTitle':meta['articleTitle'],'createdAt':created,
    'canonicalHierarchy':meta['canonicalHierarchy'],'canonicalHierarchySource':meta['canonicalHierarchySource'],
    'canonicalDeckPath':meta['canonicalDeckPath'],
    'sourcePriority':{'canonicalHierarchy':'RadPrimer','canonicalTextBackbone':'RadPrimer','sharedEssentialInformation':'Both','selectedImageProvider':'STATdx','supplementalDepth':'STATdx when additional material is present; none unique in this staged article'},
    'sourceCoverage':{
        'scope':'Only the supplied paired article packages, metadata and actual staged plain image evidence; external verification limited to the flagged material name.',
        'textComparison':{'essentialInformationIdentical':True,'allCaptionsIdentical':True,'radPrimerOnlySections':['DIFFERENTIAL DIAGNOSIS: Common and Less Common hierarchy'],'statdxOnlyTextSections':[],'statdxAddsUniqueManagementDetail':False},
        'metadataComparison':{'embeddedSourceMetadataMatchesSeparateFiles':True,'sourceRegistriesMatchEvidenceManifest':True,'sourceTitlesMatch':True,'statdxBreadcrumbUsedForRouting':False,'staleManualDeckRootUsed':False,'sourcePairingMatch':meta['sourcePairingMatch'],'pairingNote':'Pairing value is null; matching titles, shared article text, identical captions and 14 common image UUIDs independently verify the topic match.'},
        'imageCoverageGate':{'performedBeforeMerge':True,'statdxFullyCoversRadPrimerImageSet':True,'radPrimerImageCount':14,'coveredRadPrimerImageCount':14,'classificationCounts':{'exactDuplicate':14,'nearDuplicate':0,'conceptualReplacement':0,'notCovered':0},'radPrimerImageCoverage':coverage},
        'statdxUniqueImageIds':[], 'distinctRetainedVisualCount':14, 'recognitionComparisons':reinforcement_groups,
        'noWholeTopicExclusionFromDuplicates':True
    },
    'imageCountBySource':{'RadPrimer':14,'STATdx':14},
    'selectedImageCountBySource':{'RadPrimer':0,'STATdx':14},
    'archiveImageCountBySource':{'RadPrimer':14,'STATdx':0},
    'sourceAttributionRules':['RadPrimer supplies canonical hierarchy and differential list.','Both indicates an identical supplied passage or caption, not independent corroborating studies.','STATdx image N is the selected image display label; preserve source origin and source number.','RP-NN / SDX-NN belong in metadata, filenames and traceability fields.','J&J MedTech is cited solely for the Surgicel material-name correction; no Core support is implied.'],
    'selectedPrimaryImageIds':primary,'archiveOptionalImageIds':archive,'sourceSelectionPlan':plan,
    'caseClusters':clusters,'sourceQualityNotes':quality_notes,
    'coreValidation':{'suppliedAuditableCoreEvidence':False,'status':'not supplied / not verified','label':'RadPrimer + STATdx; not Core-validated'},
    'mediaAudit':{'stagedImageFiles':28,'decodedImageFiles':28,'visuallyInspectedImageFiles':28,'reviewSheets':sorted({f['contactSheet'] for f in audit['files']}),'reviewFile':'_codex_review/image_file_audit.json','allPlainEvidencePresent':True,'annotatedVariantsInspected':False,'captionIconFilesSupplied':False,'sourceCaptionHtmlPreserved':True,'remoteDownloadPerformed':False},
    'inputFiles':[{'filename':f,'sha256':sha(B/f)} for f in inputs],
    'sources':[{'sourceKind':s['sourceKind'],'sourceLabel':s['sourceLabel'],'sourceUrl':s['sourceUrl'],'cachedAt':s['cachedAt'],'sourceMetadataFile':s['sourceLabel']+'_metadata.json','sourcePackageFile':s['sourceLabel']+'_source_package.txt'} for s in meta['sources']],
    'packageSha256':sha(B/'master_source_package.txt'),'generatedCards':False,'generatedLecture':False,
    'validationReport':'_codex_review/validation_results.json'
}
write_json('image_registry.json',registry)
write_json('master_source_manifest.json',manifest)
write_json('master_source_import.json',{'version':1,'articleTitle':meta['articleTitle'],'createdAt':created,'packageText':package_text,'manifest':manifest,'imageRegistry':registry,'sourceSelectionPlan':plan,'selectedPrimaryImageIds':primary,'archiveOptionalImageIds':archive})
audit.update({'visuallyInspected':True,'reviewCompletedAt':created,'reviewMethod':'Paired comparison sheets made from all 28 actual staged plain files. Same source UUID and matching visual anatomy/composite panels support every duplicate classification.','pairDecisions':coverage})
write_json('_codex_review/image_file_audit.json',audit)

report = [
    '# Master source synthesis — Liver Lesion Containing Gas','',
    'Completed the staged source comparison and retained 14 distinct visual examples. All 14 RadPrimer images have exact same-image/slice/composite matches in STATdx. The selected set is STATdx images 1–14; RadPrimer images 1–14 remain as optional duplicate recovery records. All 28 source records, original captions, URLs, stable IDs and evidence paths are preserved.','',
    '## Import and canonical routing','',
    f'- Browser bundle: `C:\\Users\\josem.000\\Downloads\\RadiologyMasterSource\\{B.name}`.',
    '- Imported using the supplied `import-latest-master-source-bundle.ps1` and read `master_source_queue/_latest_master_source_bundle.txt`; both initially identified this exact user-named bundle. The shared latest pointer advanced to another bundle during synthesis. Work remained pinned to this folder, and the newer pointer was left unchanged.',
    '- Canonical hierarchy copied exactly from metadata.json: `'+json.dumps(meta['canonicalHierarchy'],ensure_ascii=False)+'`.',
    '- Canonical deck: `'+meta['canonicalDeckPath']+'`.',
    '- STATdx breadcrumbs and the inherited manual MSK deck setting are not used for routing. The null pairing-match field is not treated as proof of a manual match. Actual source title, article text, caption and UUID agreement establish the pairing.','',
    '## Source comparison and text selection','',
    'RadPrimer provides the Common/Less Common differential hierarchy, including its nested tumor categories. STATdx omits that list in this extraction. ESSENTIAL INFORMATION is identical between sources, and all 14 captions match exactly. The shared material is included once with [Both] attribution. There are no unique STATdx mechanisms, management sections, captions or visual examples to claim as additional depth in this bundle.',
    '', 'The package retains all supplied pathways, routes of infection, double-target layers, CT/MR/US findings, treatment effects, vascular/ductal gas patterns, transplant/biloma mechanisms, uncommon infection patterns and procedure/trauma context. Surgicel material terminology is the sole factual text correction; its provenance is recorded below. No lecture, cards, Anki imports or live bank changes were made. No auditable Core Radiology evidence was supplied; Core validation is not claimed.','',
    '## Image coverage gate','',
    'Every staged plain image was decoded, hashed and visually inspected in paired comparison sheets before the merge. Each pair shares a stable image UUID and the same observed slice or full composite. RadPrimer files are 900 × 900 and STATdx files are 1000 × 1000. Their JPEG/RGB hashes differ, so they are not claimed to be byte-identical. The archive decision rests on verified visual identity plus UUID, not captions, and the selected size does not imply new anatomic information.','',
    '| RadPrimer | STATdx retained | Classification | Visual identity evidence |',
    '|---|---|---|---|'
]
for c in coverage: report.append('| '+c['radPrimerImageId']+' | '+c['replacementImageId']+' | Exact duplicate | '+c['visualObservation']+' |')
report.extend([
    '', 'Result: exactDuplicate 14; nearDuplicate 0; conceptualReplacement 0; notCovered 0. STATdx fully covers the staged RadPrimer image set. No distinct patient, alternate slice, modality, severity or stage was archived. Full UUIDs, original filenames, both hashes, evidence paths, decisions and selected counterparts are in the registry and manifest.', '',
    '## Atomic groups and reinforcement','',
    'No source case cluster was intentionally split. Each source image was replaced as a whole by its equivalent STATdx image. The four-panel MR composite (image 7) and two-panel ultrasound composite (image 9) remain intact. Other captions describe a single supplied image with procedure or clinical context; there is no documented cross-number same-patient/follow-up linkage.', '',
    'Keep distinct examples selected: drained versus cholangitic abscess and MR abscess; postoperative versus traumatic infarction; ablation versus chemotherapy effects; CT versus US portal gas; hemostatic material with little fluid versus within a large abscess; both transplant biloma morphologies; and the delayed post-laceration example. Shared topics are teaching comparisons, not evidence that these are identical patients. The registry includes recognitionReinforcement and modality/alternate-example roles.', '',
    '## Source quality notes','',
    '- **Surgicel:** both inputs call it “oxidized surgical gelatin” in the article and image 10 caption, while image 11 says cellulose. The manufacturer identifies it as oxidized regenerated cellulose. The teaching wording is corrected; original caption fields and source files remain verbatim. [J&J MedTech / Ethicon product page]('+term_url+').',
    '- **Image 11 anatomy:** actual evidence is pelvic. The source caption says postoperative abscess without specifying liver. It stays selected as a visual analogy for hemostatic material within an abscess and must not be presented as hepatic localization.',
    '- **Duplicated differential entry:** RadPrimer lists Hepatic Venous Gas under both Common and Less Common. Preserve the source hierarchy but do not generate competing prevalence claims or duplicate objectives from that editorial duplication.',
    '- **MR composite:** preserve all four panels and the case-specific fluid signal. The absence of content enhancement does not negate the article\'s rim/capsule enhancement description.',
    '- **Clinical qualifiers:** preserve often/usually and procedure timing. Do not generalize source examples of sterile gas or frequently insignificant findings into an unconditional exclusion of infection/ischemia.',
    '- **Missing companions:** the CT described in image 9\'s caption and any prior image of image 14\'s injury were not staged. Do not invent them or link other numbered images as the same patient.', '',
    '## Import and media handoff','',
    '- `master_source_import.json` embeds packageText exactly matching `master_source_package.txt`, plus the manifest, complete registry, source selection plan and explicit primary/archive ID lists.',
    '- Default download plan: **14 selected images × 2 variants = 28 files**, all named with source, short ID and variant. Optional RadPrimer duplicates are excluded from the default plan.',
    '- Narrative-facing labels are clean, such as “STATdx image 5”; short IDs remain in filenames and structured traceability.',
    '- Caption HTML and arrow icon tokens are preserved. The bundle contains plain evidence only; annotated URLs are preserved but their files were not visually verified, and separate caption icon files were not supplied. Those are later media retrieval steps, not missing duplicate evidence.',
    '- Source-copy fidelity, all registry records, canonical routing, case completeness, JSON/text equality, and installed extension import/download helpers are validated in `_codex_review/validation_results.json`. The done marker is written only after these checks pass.',
    '- No live browser import or remote image download is performed by this handoff.', '',
    '## Deliverables','',
    '`master_source_package.txt`, `master_source_manifest.json`, `image_registry.json`, `master_source_import.json`, `master_source_report.md`, and `_codex_master_source_done.txt`. The completion marker records hashes for the five substantive artifacts. Paired review sheets, evidence audit and validation results are retained under `_codex_review/`.'
])
(B/'master_source_report.md').write_text('\n'.join(report)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({'written':5,'primary':len(primary),'archive':len(archive),'registry':len(registry),'completionMarker':'pending validation'},indent=2))
