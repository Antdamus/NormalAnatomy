from pathlib import Path
from datetime import datetime, timezone
from copy import deepcopy
import json, re, hashlib

B = Path(__file__).resolve().parent.parent
R = B/'_codex_review'
def read(name): return json.loads((B/name).read_text(encoding='utf-8-sig'))
def dump(name, value): (B/name).write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n', encoding='utf-8', newline='\n')
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def ids(nums, prefix='SDX'): return [f'{prefix}-{n:02}' for n in nums]
def label(mid):
    p,n=mid.split('-')
    return f"{'RadPrimer' if p=='RP' else 'STATdx'} image {int(n)}"
def labels(mids): return ', '.join(label(x) for x in mids)
now = datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00','Z')
m=read('metadata.json'); rp=read('RadPrimer_metadata.json'); sd=read('STATdx_metadata.json')
audit=read('_codex_review/image_file_audit.json'); am={x['masterImageId']:x for x in audit}
raw=rp['imageRegistry']+sd['imageRegistry']; byid={x['masterImageId']:x for x in raw}
rptext=(B/'RadPrimer_source_package.txt').read_text(encoding='utf-8-sig')
sdtext=(B/'STATdx_source_package.txt').read_text(encoding='utf-8-sig')
def article(t): return t.split('=== ARTICLE ===')[1].split('=== IMAGES')[0].strip()
ra,sa=article(rptext),article(sdtext)
assert ra.split('ESSENTIAL INFORMATION',1)[1]==sa.split('ESSENTIAL INFORMATION',1)[1]
assert m['canonicalHierarchy']==rp['breadcrumbTrail']
for metadata in [rp,sd]:
    embedded=next(x for x in m['sources'] if x['sourceLabel']==metadata['imageRegistry'][0]['sourceLabel'])
    assert embedded['metadata']==metadata and embedded['imageRegistry']==metadata['imageRegistry']
    text=rptext if metadata is rp else sdtext
    packages=re.findall(r'IMAGE_(\d+):[^\n]*\n.*?    Caption: (.*?)(?=\n\nIMAGE_|\n\n=== SOURCE ATTRIBUTION)',text,re.S)
    assert len(packages)==len(metadata['imageRegistry'])
    for (n,cap),entry in zip(packages,metadata['imageRegistry']):
        assert int(n)==entry['sourceImageNumber'] and cap.strip()==entry['caption'].strip()

# Visual review is completed before constructing the coverage gate.
pairnums=[1,6,7,8,12,13,16,17,18,19,22,23,24,25,26,27,28,29,32,33,34,35,36,37,38,39,40,41]
observations=[
 'Identical two-panel hepatic-dome hemangioma/venous-retention composite and divider.',
 'Identical two-panel right-lobe FNH arterial/portal CT composite.',
 'Identical arterial MR slice with avid FNH and central scar.',
 'Identical portal-phase MR slice with near-isointense FNH and visible scar.',
 'Identical CT slice with early left portal-vein filling and left-lobe enhancement after biopsy.',
 'Identical two-panel peripheral arterial hyperenhancement/venous normalization MR composite.',
 'Identical arterial CT slice with wedge-shaped peripheral hyperperfusion.',
 'Identical portal CT slice showing metastases in the same THAD case.',
 'Identical arterial CT slice of the heterogeneous HCC.',
 'Identical four-panel T2/diffusion/arterial/venous HCC MR composite.',
 'Identical CT slice with numerous hypervascular and ring-enhancing metastases.',
 'Identical CT slice showing the pancreatic primary and hepatic metastases.',
 'Identical arterial gadoxetate MR slice with enhancing encapsulated adenoma.',
 'Identical delayed gadoxetate MR slice of the inflammatory adenoma.',
 'Identical arterial CT slice with enlarged HHT vessels and heterogeneous enhancement.',
 'Identical portal CT slice with homogeneous liver and dilated hepatic veins/IVC.',
 'Identical arterial CT slice with regenerative nodules, ascites and occluded IVC.',
 'Identical portal CT slice with persistent regenerative-nodule enhancement and collaterals.',
 'Identical arterial CT slice with lobulated fibrolamellar tumor and calcified scar.',
 'Identical portal CT slice of the same heterogeneous fibrolamellar tumor.',
 'Identical arterial CT slice of the large mass and enhancing porta-hepatis nodes.',
 'Identical delayed CT slice with persistent enhancement in proven cholangiocarcinoma.',
 'Identical CT slice showing fat and hypervascular tissue in hepatic angiomyolipoma.',
 'Identical CT slice of multiple irregularly enhancing angiosarcoma lesions.',
 'Identical axial CT slice with focal left-lobe enhancement and chest-wall collaterals.',
 'Identical coronal CT reconstruction demonstrating SVC occlusion and collateral routes.',
 'Identical arterial CT slice with continuous ring enhancement in peliosis.',
 'Identical later CT slice showing progressive peliosis fill-in.'
]
coverage=[]
for i,(sn,note) in enumerate(zip(pairnums,observations),1):
    r,s=f'RP-{i:02}',f'SDX-{sn:02}'
    assert byid[r]['imageId']==byid[s]['imageId']
    assert byid[r]['caption']==byid[s]['caption']
    coverage.append({'radPrimerImageId':r,'statdxImageIds':[s], 'classification':'exactDuplicate',
        'classificationLabel':'exact duplicate','confidence':'high','replacementImageId':s,
        'reason':'Same stable publisher image ID and visually identical image/slice/composite; source rendition size differs.',
        'visualObservation':note,'evidence':{'sameStableSourceImageId':byid[r]['imageId'],
            'radPrimerEvidence':am[r],'statdxEvidence':am[s], 'byteIdentical':False,
            'visualReviewCompleted':True,'contactSheet':f'_codex_review/paired_{(i-1)//4+1:02}.jpg'},
        'radPrimerDisposition':'archiveOptionalDuplicate','statdxDisposition':'primaryTeachingSet'})

# Conservative case clusters preserve phases, adjacent slices, procedures, and composite panels.
cluster_specs=[
 ('hemangioma_dome',[1], 'Hepatic Cavernous Hemangioma','Arterial/venous CT composite','Two panels in one source image; keep the composite intact.','source composite and caption'),
 ('hemangioma_multiphase',[2,3,4,5], 'Hepatic Cavernous Hemangioma','NECT, arterial and portal CT','Same lesion/location and anatomy across the CT phase sequence. Image 5 repeats the portal slice in image 4.','visual review and sequential source captions; same-case grouping inferred conservatively'),
 ('fnh_ct_composite',[6], 'Focal Nodular Hyperplasia','Arterial/portal CT composite','Cloud-like arterial enhancement and portal blending; no clear scar in this example.','source composite and caption'),
 ('fnh_mr',[7,8], 'Focal Nodular Hyperplasia','Arterial then portal T1 C+ FS MR','Preserve arterial enhancement and portal isointensity with the small central scar.','sequential captions and corresponding anatomy; same-case grouping inferred conservatively'),
 ('fnh_ct_scar',[9,10], 'Focal Nodular Hyperplasia','Arterial then portal CT','Retain the left-lobe lesion with central scar and its portal-phase appearance.','sequential captions and matching lesion; same-case grouping inferred conservatively'),
 ('fnh_ct_draining_veins',[11], 'Focal Nodular Hyperplasia','Arterial CT','Alternate FNH example with central scar and early draining veins.','source caption and visually distinct example'),
 ('ap_shunt_biopsy',[12], 'Arterioportal Shunt','Arterial CT after biopsy','Early portal-branch opacification and left-lobe enhancement; do not discard the biopsy context.','source caption'),
 ('ap_shunt_mr_composite',[13], 'Arterioportal Shunt','Arterial/venous MR composite','Preserve both panels showing transient peripheral enhancement in hepatitis C cirrhosis.','source composite and caption'),
 ('ap_shunt_small_focus',[14], 'Arterioportal Shunt','Arterial CT','Retain small arterial-only focus in cirrhosis; other phases are described, not staged as companions.','source caption; diagnostic grouping inferred from article placement'),
 ('ap_shunt_wedge',[15], 'Arterioportal Shunt','Arterial CT','Retain the capsular wedge-shaped shunt example as recognition reinforcement.','source caption'),
 ('thad_metastases',[16,17], 'Transient Hepatic Attenuation Difference','Arterial then portal CT','Same patient: arterial perfusion wedges and portal-phase metastases causing the perfusion abnormality.','explicit same-patient caption'),
 ('hcc_ct',[18], 'Hepatocellular Carcinoma','Arterial CT','Keep arterial hypervascularity; washout is described in the caption, not supplied as a separate companion.','source caption'),
 ('hcc_mr_composite',[19], 'Hepatocellular Carcinoma','T2, diffusion, arterial and venous MR composite','Keep all four panels together to preserve diffusion and enhancement context.','source composite and caption'),
 ('hcc_mosaic',[20,21], 'Hepatocellular Carcinoma','Arterial then portal CT','Large mosaic HCC with portal-phase near-isodensity and residual necrosis; retain both phases.','sequential captions and corresponding anatomy; same-case grouping inferred conservatively'),
 ('metastases_endocrine',[22], 'Hepatic Metastases','Arterial CT','Numerous hypervascular/ring-enhancing metastases from a pancreatic endocrine tumor.','source caption'),
 ('metastases_glucagonoma',[23], 'Hepatic Metastases','Arterial CT','Primary pancreatic glucagonoma and liver metastases visible together; patient identity is not assumed to match image 22.','source caption'),
 ('adenoma_gadoxetate',[24,25], 'Hepatic Adenoma','Arterial then delayed gadoxetate MR','Same patient with inflammatory adenoma; keep capsule, arterial enhancement and delayed relative hypointensity together.','explicit same-patient caption'),
 ('hht_ct',[26,27], 'Hereditary Hemorrhagic Telangiectasia','Arterial then portal CT','Same patient: abnormal arterial enhancement and early venous filling followed by homogeneous portal enhancement.','explicit same-patient caption'),
 ('regenerative_ct',[28,29], 'Nodular Regenerative Hyperplasia','Arterial then portal CT','Same Budd-Chiari patient: nodules, IVC occlusion, ascites and collaterals with persistent enhancement.','explicit same-patient caption'),
 ('regenerative_mr',[30,31], 'Nodular Regenerative Hyperplasia','Arterial then portal MR','Keep both phase/slice views; arterial halos and persistent portal hyperintensity add an MR example.','sequential captions and corresponding disease/anatomy; same-case grouping inferred conservatively'),
 ('fibrolamellar_ct',[32,33], 'Fibrolamellar Hepatocellular Carcinoma','Arterial then portal CT','Same 22-year-old patient: lobulated mass, calcified scar, persistent heterogeneity; nodes described on other images.','explicit same-patient caption'),
 ('cholangiocarcinoma_ct',[34,35], 'Cholangiocarcinoma (Peripheral)','Arterial then delayed CT','Same patient: mass/nodal hypervascularity and persistent enhancement; biopsy/resection confirmed the diagnosis.','explicit same-patient caption'),
 ('aml_ct',[36], 'Hepatic Angiomyolipoma','Arterial CT','Preserve visible fat, hypervascular tissue and source context of renal AMLs/possible tuberous sclerosis.','source caption'),
 ('angiosarcoma_ct',[37], 'Angiosarcoma, Liver','CECT','Keep irregular tumor enhancement and source-described splenic lesions/rapid fatal progression; no follow-up images were supplied.','source caption'),
 ('svc_collaterals',[38,39], 'Superior Vena Cava Obstruction, Abdominal Manifestations','Axial and coronal arterial CT','Same patient: focal hepatic enhancement and collaterals must remain linked to the coronal SVC obstruction.','explicit same-patient caption'),
 ('peliosis_ct',[40,41], 'Peliosis Hepatis','Arterial then later contrast CT','Keep continuous ring enhancement and progressive fill-in together. Do not rename the later phase more precisely than the source.','sequential captions and matching lesion; same-case grouping inferred conservatively')
]
replacement={c['radPrimerImageId']:c['replacementImageId'] for c in coverage}
reverse={s:r for r,s in replacement.items()}
clusters=[]; cluster_for={}
for key,nums,diagnosis,phase,context,basis in cluster_specs:
    ss=ids(nums); rr=[reverse[s] for s in ss if s in reverse]
    c={'clusterId':key,'diagnosis':diagnosis,'phaseOrViewOrder':phase,'context':context,
       'groupingEvidence':basis,'groupingWasPresentInMetadata':False,'atomic':True,
       'sourceMembers':{'RadPrimer':rr,'STATdx':ss},'selectedImageIds':[s for s in ss if s!='SDX-05'],
       'archiveImageIds':rr+(['SDX-05'] if 'SDX-05' in ss else []),
       'replacementMappings':[{ 'archivedImageId':r,'selectedImageId':replacement[r]} for r in rr],
       'sourceClusterSplit':key=='hemangioma_multiphase'}
    if key=='hemangioma_multiphase': c['replacementMappings'].append({'archivedImageId':'SDX-05','selectedImageId':'SDX-04'})
    clusters.append(c)
    for x in rr+ss: cluster_for[x]=c
assert set(cluster_for)==set(byid)
within_duplicate={'archivedImageId':'SDX-05','replacementImageId':'SDX-04','classification':'exactDuplicate',
 'classificationLabel':'exact duplicate','confidence':'high','sameStableSourceImageId':False,'byteIdentical':False,
 'visualReviewCompleted':True,'reviewMethod':'Both original 1000 x 1000 evidence files viewed individually at native size, as well as supplemental contact sheet 01.',
 'visualObservation':'Same portal-venous CT slice: lesion contour/internal pattern, hepatic vessels, portal confluence, pancreas, bowel contents and vertebral details coincide. Brightness/contrast rendition differs; there is no additional slice, phase, projection or lesion depiction.',
 'evidence':[am['SDX-04'],am['SDX-05']],
 'numericCorroboration':{'grayscalePixelCorrelation':0.9853276035900618,'grayscaleMeanAbsoluteDifference':12.113332,'interpretation':'Corroboration only, not the basis of classification; neither files nor decoded pixels are identical.'},
 'clusterId':'hemangioma_multiphase',
 'safeSplitReason':'Only a second rendition of the same portal-venous slice is archived. The complete NECT/arterial/portal sequence survives as SDX-02, SDX-03, SDX-04. The broader caption from SDX-05 is carried into the selected SDX-04 teaching caption. The source annotation URLs and original caption remain in the registry; annotation rendering itself was not staged or visually verified.'}
supplement=ids([2,3,4,5,9,10,11,14,15,20,21,30,31])
selected=ids([n for n in range(1,42) if n!=5]); archived=ids(range(1,29),'RP')+['SDX-05']
registry=[]
for entry in raw:
    e=deepcopy(entry); mid=e['masterImageId']; c=cluster_for[mid]
    e['displayLabel']=label(mid)
    e['sourceImageId']=e['imageId']
    e['originalPlainFilename']=e['plainFilename']; e['originalAnnotatedFilename']=e['annotatedFilename']
    e['originalGroup']=e.get('group',''); e['group']=c['clusterId']; e['caseClusterId']=c['clusterId']
    e['plainFilename']=f"{mid}_{e['sourceLabel']}_plain_{e['originalPlainFilename']}"
    e['annotatedFilename']=f"{mid}_{e['sourceLabel']}_annotated_{e['originalAnnotatedFilename']}"
    e['filename']=e['plainFilename']
    e['captionOriginal']=e['caption']; e['teachingCaption']=e['caption']
    e['diagnosis']=c['diagnosis']; e['clusterContext']=c['context']; e['clusterMemberImageIds']=c['sourceMembers'][e['sourceLabel']]
    e['visualEvidence'].update({k:am[mid][k] for k in ['sha256','pixelSha256','width','height','bytes','format']})
    e['visualEvidence'].update({'visuallyInspected':True,'reviewedAt':now,'reviewer':'Codex',
        'reviewMethod':'Source evidence viewed in labeled contact sheets; native-size originals also viewed for SDX-04 and SDX-05.'})
    e['downloadRecommendation']='primaryTeachingSet' if mid in selected else 'archiveOptionalDuplicate'
    if mid in selected:
        e['usedFor']=['imageRecognition','differentialDiscrimination']
        if len(c['selectedImageIds'])>1: e['usedFor']+=['phaseComparison','caseContext']
        if mid in supplement: e['usedFor']+=['recognitionReinforcement','alternateExample']
        if mid in ['SDX-30','SDX-31']: e['usedFor']+=['modalityVariant']
        if mid in ['SDX-20','SDX-21']: e['usedFor']+=['severityVariant']
        if mid in ['SDX-01','SDX-06','SDX-13','SDX-19']: e['usedFor']+=['atomicComposite','phaseComparison']
        if mid=='SDX-12': e['usedFor']+=['procedureContext']
        if mid in reverse:
            e['exactDuplicateSourceIds']=[reverse[mid]]
            e['selectionReason']='Selected complete STATdx rendition of the identical shared publisher image; staged size 1000 x 1000 versus RadPrimer 900 x 900.'
        else: e['selectionReason']='Visually distinct supplemental example or required phase/slice companion, retained for recognition reinforcement.'
        e['duplicateOf']=None
    else:
        e['usedFor']=['exactDuplicateRecovery']
        e['duplicateOf']=replacement[mid] if mid.startswith('RP-') else 'SDX-04'
        e['archiveReason']='Exact duplicate of the same image/slice/composite in '+e['duplicateOf']+'; keep this source entry and evidence for traceability/recovery.'
    if mid.startswith('RP-'):
        e['coverageClassification']='exactDuplicate'; e['statdxCoverageImageIds']=[replacement[mid]]
        e['duplicateEvidence']=next(x['evidence'] for x in coverage if x['radPrimerImageId']==mid)
    elif mid=='SDX-05': e['duplicateEvidence']=within_duplicate
    if mid=='SDX-04':
        e['exactDuplicateSourceIds']=['SDX-05']
        e['captionSupplementSourceImageIds']=['SDX-05']
        e['teachingCaption']=e['caption']+' Supplemental caption from STATdx image 5: the same small hypervascular mass is described as blood-pool equivalent on NECT, arterial and portal venous images.'
    registry.append(e)

curation_policy='Archive only verified exact duplicates, same-image/slice/screenshot renditions, or unusable images. Keep near duplicates, alternate examples, distinct phases/slices/modalities and conceptual replacements selected for recognition reinforcement. When identity is uncertain, retain the image.'
duplicate_policy='ExactDuplicate requires actual image_evidence visual review, same stable publisher source image ID, matching image hashes, or explicit source/manual confirmation. Captions or diagnostic similarity alone never establish exact identity. Hash inequality is recorded for these different renditions and is not represented as byte identity.'
generator_rules=[
 'Use the canonicalHierarchy and canonicalDeckPath copied from metadata.json. RadPrimer supplies the differential ordering and article backbone; STATdx breadcrumbs and stale manualDeckRoot settings never determine routing.',
 'Generate narrative/cards only upon a later explicit request; this bundle itself contains source synthesis only.',
 'Use only selectedPrimaryImageIds by default. Archived copies do not drive additional cards or repeated examples.',
 'Use clean human-facing source labels such as RadPrimer image 5 or STATdx image 4. Keep masterImageId codes in registry/manifest/filenames/traceability; do not append both label forms in ordinary prose.',
 'Preserve all selected case-cluster companions, their order, captions, arrows/annotation references and composite panels. Different phases and adjacent slices are not duplicates merely because the diagnosis is the same.',
 'Describe unshown phases, history and pathology as source-caption information; do not imply they were independently observed in the staged plain image.',
 'Use original source attribution. Essential Information is supported by both supplied extracts; the differential list is RadPrimer-specific in this export. Supplemental image-caption information is STATdx.',
 'Core Radiology is not verified by these inputs. The Corebook routing root is a supplied organizational name and is not evidence of textbook support.',
 'No independent management recommendations, modern guideline thresholds, patient facts, new diagnosis certainty or phase timing may be invented. Source percentages and broad statements remain source-attributed and are not independently current-validated.',
 'Use plain images for recognition and corresponding annotated URLs/filenames for explanations when later downloaded; only plain images were staged and reviewed.'
]
plan={
 'textSelection':{
   'RadPrimer':{'keep':['Exact canonical hierarchy and deck routing','Complete Common/Less Common differential list in source order','All Essential Information sections as the canonical article backbone','Shared captions and procedure/case context through their exact image crosswalk'],
       'downweightOrSkip':['Export instructions and repeated topic headers','Unverified Core cross-check request','Stale manualDeckRoot setting unrelated to this topic']},
   'STATdx':{'keep':['Matching Essential Information as corroborating source attribution','Distinct supplemental image examples and their captions','Higher-pixel-dimension renditions of shared images','SDX-05 caption nuance retained with SDX-04'],
       'downweightOrSkip':['Second copy of identical Essential Information','STATdx breadcrumbs for canonical routing','One exact repeated portal slice, SDX-05; caption retained']},
   'newTextDepthFinding':'The Essential Information bodies are identical. The staged STATdx text does not add a separate mechanism, management, or guideline section. Supplemental depth comes from the image captions and retained examples.'},
 'imageCurationPolicy':curation_policy,'duplicateEvidencePolicy':duplicate_policy,
 'caseClusterGuardrails':{'policy':'Source case/phase/procedure/follow-up/adjacent-slice/composite groups are atomic unless an explicit safe split is documented.',
    'sourceGroupsWereEmpty':True,'groupingMethod':'Conservative editorial case grouping from supplied captions and actual image anatomy; explicit and inferred bases are recorded separately.',
    'wholeClusterReplacement':'Every RadPrimer source cluster is replaced in full by its identical STATdx members; no RadPrimer case is partially replaced.',
    'intentionalSplits':[within_duplicate],'clusters':clusters,
    'timeLapseOrFollowUp':'No actual longitudinal time-lapse or follow-up image series was identified. Contrast phase sequences, composites, biopsy history and source-described clinical outcomes are preserved without inventing missing images.'},
 'imageDownloadPlan':{
    'defaultSelection':'primaryTeachingSet','filenamePolicy':'{masterImageId}_{sourceLabel}_{plain|annotated}_{originalFilename}',
    'primaryTeachingSet':{'RadPrimer':[],'STATdx':selected},
    'recognitionReinforcement':{'RadPrimer':[],'STATdx':[x for x in supplement if x in selected]},
    'archiveOptionalDuplicates':{'RadPrimer':ids(range(1,29),'RP'),'STATdx':['SDX-05']},
    'downloadVariants':['plain','annotated'],'primaryImageCount':40,'primaryVariantFileCount':80,
    'downloadedDuringSynthesis':False,'stagedEvidenceFilesInspected':69,
    'files':[{'masterImageId':e['masterImageId'],'sourceKind':e['sourceKind'],'sourceLabel':e['sourceLabel'],
       'variant':v,'filename':e[v+'Filename'],'url':e[v+'Url'],'downloadRecommendation':e['downloadRecommendation']}
       for e in registry if e['masterImageId'] in selected for v in ['plain','annotated']]},
 'generatorInstructions':generator_rules}

source_files=['RadPrimer_source_package.txt','STATdx_source_package.txt','RadPrimer_metadata.json','STATdx_metadata.json','metadata.json','master_source_request.md','image_evidence_manifest.json','_master_source_request_complete.txt']
provenance=[{'filename':n,'sha256':sha(B/n),'bytes':(B/n).stat().st_size} for n in source_files]
source_details=[{'sourceKind':s['sourceKind'],'sourceLabel':s['sourceLabel'],'sourceUrl':s['sourceUrl'],'cachedAt':s['cachedAt'],
   'originalBreadcrumbs':(rp if s['sourceKind']=='radprimer' else sd)['breadcrumbTrail'],
   'metadataFile':s['sourceLabel']+'_metadata.json','packageFile':s['sourceLabel']+'_source_package.txt'} for s in m['sources']]
manifest={'version':1,'articleTitle':m['articleTitle'],'createdAt':now,'bundleCreatedAt':m['createdAt'],
 'canonicalHierarchy':deepcopy(m['canonicalHierarchy']),'canonicalHierarchySource':m['canonicalHierarchySource'],
 'canonicalDeckPath':m['canonicalDeckPath'],
 'sourcePriority':{'canonicalHierarchy':'RadPrimer','articleBackbone':'RadPrimer','commonTextAttribution':'Both',
     'supplementalDepth':'STATdx image captions and distinct examples','selectedImageRenditions':'STATdx after full image-coverage verification'},
 'sourceCoverage':{'text':{'RadPrimerDifferentialListRetained':True,'essentialInformationIdentical':True,
     'statdxDifferentialListPresentInExport':False,'statdxAdditionalStandaloneManagementText':False},
     'imageCoverageGate':{'performedBeforeMerge':True,'radPrimerImageCount':28,'statdxImageCount':41,'statdxFullyCoversRadPrimerImageSet':True,
       'classificationCounts':{'exactDuplicate':28,'nearDuplicate':0,'conceptualReplacement':0,'notCovered':0},
       'radPrimerImageCoverage':coverage,'withinStatdxDuplicateDecisions':[within_duplicate]},
     'statdxAdditionalSourceEntries':supplement,'statdxAdditionalSelectedEntries':[x for x in supplement if x in selected]},
 'imageCountBySource':{'RadPrimer':28,'STATdx':41},
 'selectedImageCountBySource':{'RadPrimer':0,'STATdx':40},'archiveImageCountBySource':{'RadPrimer':28,'STATdx':1},
 'imageCounts':{'registryEntries':69,'selectedPrimaryImages':40,'archiveOptionalImages':29,'inspectedEvidenceFiles':69,'unusableImages':0},
 'sourceAttributionRules':generator_rules[3:4]+generator_rules[6:8],
 'coreValidation':{'status':'notVerified','auditableCoreEvidencePresent':False,'reason':'The exports contain a generic Core cross-check request but no auditable textbook pages, excerpts or citations.'},
 'selectedPrimaryImageIds':selected,'archiveOptionalImageIds':archived,'sourceSelectionPlan':plan,
 'caseClusters':clusters,'sources':source_details,'inputFiles':provenance,
 'evidenceReview':{'completed':True,'reviewedAt':now,'evidenceFileCount':69,'allEvidenceFilesDecoded':True,
    'allEvidenceFilesVisuallyInspected':True,'contactSheets':[f'_codex_review/paired_{n:02}.jpg' for n in range(1,8)]+[f'_codex_review/supplemental_{n:02}.jpg' for n in range(1,4)],
    'fileAudit':'_codex_review/image_file_audit.json','hashEqualityClaimed':False,
    'annotatedVariantsVisuallyReviewed':False,'limitation':'Only staged plain image renditions were inspected. Annotated source URLs are preserved for later extension download.'},
 'contentScope':'Master-source synthesis only; no cards, lecture, clinical advice or new guideline research generated.'}

supp_notes={
 'Hepatic Cavernous Hemangioma':'[STATdx] STATdx images 2, 3 and 4 add the unenhanced, arterial and portal comparison for a small blood-pool-equivalent lesion. STATdx image 5 repeats the portal slice; its broader phase-comparison caption is retained with STATdx image 4.',
 'Focal Nodular Hyperplasia':'[STATdx] STATdx images 9 and 10 add an arterial/portal CT pair with a central scar. STATdx image 11 adds a visually distinct example with central scar and early draining veins. These reinforce the shared scar-positive MR and scar-inconspicuous CT examples.',
 'Arterioportal Shunt':'[STATdx] STATdx image 14 adds a small arterial-only focus in cirrhosis; STATdx image 15 adds a peripheral capsular wedge. Preserve these distinct appearances alongside the biopsy-related fistula and the MR phase-comparison example.',
 'Hepatocellular Carcinoma':'[STATdx] STATdx images 20 and 21 add a large mosaic HCC with portal-phase near-isodensity except for necrosis. Keep this source-specific appearance alongside the classic washout example and the multiparametric MR composite; do not infer that every HCC example visibly demonstrates washout.',
 'Nodular Regenerative Hyperplasia':'[STATdx] STATdx images 30 and 31 add MR examples in Budd-Chiari syndrome, including hypointense halos around some arterial-phase nodules and persistent portal-phase hyperintensity. Keep both phase/slice views as a unit.'}
parts=['=== TOPIC ===',f"PRIMARY TOPIC: {m['articleTitle']}",f"CENTERING TOPIC FOR THIS CHAT: {m['articleTitle']}",
 '','=== RADPRIMER BREADCRUMB ===',' > '.join(m['canonicalHierarchy']),
 '','=== CANONICAL ROUTING ===',f"canonicalHierarchy: {json.dumps(m['canonicalHierarchy'],ensure_ascii=False)}",f"deckPath: {m['canonicalDeckPath']}",
 '','=== SOURCE SCOPE AND ATTRIBUTION ===',
 '[RadPrimer] Canonical hierarchy, differential list and article backbone.',
 '[Both] The Essential Information text is identical in the supplied RadPrimer and STATdx extracts. Shared-image captions are also identical.',
 '[STATdx] Supplemental image-caption detail and selected image renditions. All RadPrimer image content is represented by exact STATdx counterparts.',
 'Core Radiology support: not verified; no auditable Core pages or excerpts were supplied. The supplied Corebook deck root is routing metadata only.',
 'This is the fused source package for future generation. It is not a card set or lecture.',
 '','=== ARTICLE ===',ra.replace('DIFFERENTIAL DIAGNOSIS','DIFFERENTIAL DIAGNOSIS [RadPrimer]',1).replace('ESSENTIAL INFORMATION','ESSENTIAL INFORMATION [Both]',1),
 '','=== SUPPLEMENTAL SOURCE DETAIL ===']
for title,note in supp_notes.items(): parts.extend([title,note,''])
parts+=['=== SELECTED IMAGE LIBRARY ===',
 'Human-facing labels preserve source and original numbering. The filename fields below are machine traceability fields. Captions retain original source annotation tokens; only the plain evidence was staged.',
 'Use each case group with its selected companions and keep every composite image intact. Descriptions of unshown phases, pathology, other images and clinical outcome remain source-caption information.','']
regmap={e['masterImageId']:e for e in registry}
for c in clusters:
    parts.extend([f"CASE GROUP: {c['diagnosis']} — {c['phaseOrViewOrder']}",f"Case context: {c['context']}",f"Selected images: {labels(c['selectedImageIds'])}"])
    for mid in c['selectedImageIds']:
        e=regmap[mid]
        attr='[Both; displayed image from STATdx]' if mid in reverse else '[STATdx]'
        parts.extend(['',f"{e['displayLabel']} {attr}",f"  Image: {e['plainFilename']}",f"  Image_Annotated: {e['annotatedFilename']}",f"  Caption: {e['teachingCaption']}"])
    parts.append('')
parts+=['=== OPTIONAL DUPLICATE RECOVERY INDEX ===','These source entries remain in the registry and evidence archive; they are excluded from default download/use because the same image content is selected.','']
for c in coverage: parts.append(f"{label(c['radPrimerImageId'])}: exact duplicate image content represented by {label(c['replacementImageId'])}.")
parts+=['STATdx image 5: repeated portal-venous slice represented by STATdx image 4; its caption nuance is incorporated above.',
 '','=== FUTURE GENERATION RULES ===']+generator_rules
parts+=['','=== SOURCE REFERENCES ===']+[f"[{s['sourceLabel']}] {s['sourceUrl']}" for s in source_details]
package='\n'.join(parts).strip()
(B/'master_source_package.txt').write_text(package,encoding='utf-8',newline='\n')
manifest['packageSha256']=sha(B/'master_source_package.txt')
dump('master_source_manifest.json',manifest); dump('image_registry.json',registry)
imp={'version':1,'articleTitle':m['articleTitle'],'createdAt':now,'packageText':package,'manifest':manifest,'imageRegistry':registry,
   'sourceSelectionPlan':plan,'selectedPrimaryImageIds':selected,'archiveOptionalImageIds':archived}
dump('master_source_import.json',imp)

report=[f"# Master source report — {m['articleTitle']}",'',
 'Completed the source comparison, actual-image evidence review and master-source synthesis. RadPrimer remains the canonical hierarchy and text backbone. The primary set contains **40 STATdx images**; **29 exact duplicate source entries** remain available for optional recovery (28 RadPrimer copies and STATdx image 5). All 69 source entries remain in the registry. No cards or lecture were generated.','',
 '## Import and source comparison','',
 f"Imported the newest complete browser request with `edge_radprimer_extension/tools/import-latest-master-source-bundle.ps1`; then read `master_source_queue/_latest_master_source_bundle.txt`. Imported folder: `{B.name}`.",'',
 f"Canonical hierarchy copied exactly from metadata.json: `{json.dumps(m['canonicalHierarchy'],ensure_ascii=False)}`.",
 f"Canonical deck path copied exactly: `{m['canonicalDeckPath']}`.",'',
 '- Compared both source packages, both standalone source metadata files, combined metadata, the request, the evidence manifest and actual images.',
 '- Both embedded source metadata and image registries exactly match their standalone files; package image numbering/captions match source metadata.',
 '- RadPrimer uniquely supplies the explicit Common/Less Common differential list in this export. The Essential Information sections otherwise match exactly. That text is retained once with [Both] attribution.',
 '- STATdx contributes 13 additional source entries; 12 remain primary after removal of its internal repeated slice. These supply multiphase hemangioma, central-scar/early-vein FNH, arterioportal shunts, mosaic HCC and regenerative-nodule MR examples.',
 '- STATdx provides no additional standalone management or mechanism section in this bundle. No unsupported management detail was added.',
 '- STATdx article breadcrumbs are retained as source provenance only. The unrelated saved manualDeckRoot was not used. No IMAIOS artifact was requested or generated.',
 '- Core cross-check boilerplate is not auditable Core evidence; Core support remains unverified.','',
 '## Image evidence and coverage gate','',
 'All 69 staged plain JPEG files decoded successfully and were visually inspected in 10 labeled contact sheets derived from those files. STATdx images 4 and 5 were also viewed individually at their native 1000 × 1000 size. No caption-only duplicate decision was used.',
 'All 28 RadPrimer entries have a one-to-one STATdx counterpart with the **same stable publisher image UUID and the same visually observed slice or composite**. RadPrimer renditions are 900 × 900 and STATdx renditions are 1000 × 1000. These are exact image-content duplicates, not byte-identical files; all file hashes differ. The larger supplied rendition is selected consistently, and each whole RadPrimer cluster is replaced by the corresponding STATdx cluster.',
 'Coverage counts: exact duplicate 28; near duplicate 0; conceptual replacement 0; not covered 0. STATdx fully covers the RadPrimer image set. Hashes, dimensions, source IDs, evidence paths and per-pair observations are recorded in the manifest and registry.','',
 '| RadPrimer entry | Selected counterpart | Classification | Visual content confirmed |','|---|---|---|---|']
for c in coverage: report.append(f"| {c['radPrimerImageId']} | {c['replacementImageId']} | Exact duplicate | {c['visualObservation']} |")
report+=['','## Additional STATdx examples retained','',
 '| IDs | Contribution |','|---|---|',
 '| SDX-02, SDX-03, SDX-04 | Hemangioma NECT/arterial/portal sequence; SDX-05 caption retained with SDX-04. |',
 '| SDX-09, SDX-10, SDX-11 | Additional FNH CT phase pair and distinct scar/early-draining-vein example. |',
 '| SDX-14, SDX-15 | Small arterial-only focus and capsular wedge-shaped shunt examples. |',
 '| SDX-20, SDX-21 | Large mosaic HCC and portal-phase necrosis/near-isodensity. |',
 '| SDX-30, SDX-31 | Regenerative-nodule MR phase/slice pair with halos and persistent enhancement. |','',
 'These distinct examples and phase/slice companions are recognition reinforcement, not a reason to discard other examples. No unusable images were found.','',
 '## Case clusters and the one documented safe split','',
 'Source group fields were empty. Case groups were reconstructed conservatively from captions and actual image anatomy; the registry/manifest distinguish explicit same-patient language from inferred pairing. All composite panels remain intact. No RadPrimer source case cluster was partially replaced.','',
 '**One intentional selected/archived split:** SDX-02/03/04/05. SDX-05 is archived as the same portal-venous slice shown by SDX-04. Native-image review confirmed matching lesion texture/contour, hepatic vessels, portal confluence, pancreas, bowel contents and vertebral details. The image UUIDs and hashes differ and brightness/contrast differs, but there is no new slice, phase or view. Pixel correlation (0.9853) corroborates visual review and is not used alone to declare identity.','',
 'The split is safe because SDX-02/03/04 preserve the entire supplied NECT → arterial → portal sequence. The more comprehensive SDX-05 phase-comparison caption is retained in SDX-04 teachingCaption and packageText. SDX-05 original caption, plain/annotated URLs, evidence and source-qualified filenames remain available in the registry for recovery. Annotated variants were not staged; no claim is made that their annotation overlays match.','',
 'Every other source case cluster remains selected in full or is replaced in full by exact counterparts. No longitudinal time-lapse/follow-up image series was supplied; contrast phases, biopsy context, comparison views and source-described clinical outcomes are preserved.','',
 '| Case group | Selected images | Archived counterparts | Grouping basis |','|---|---|---|---|']
for c in clusters: report.append(f"| {c['clusterId']} | {', '.join(c['selectedImageIds'])} | {', '.join(c['archiveImageIds']) or 'None'} | {c['groupingEvidence']} |")
report+=['','## Extension handoff and validation','',
 '- Import `master_source_import.json`. It contains the exact package text, manifest, complete 69-entry array, curation plan and explicit selected/archive ID lists.',
 '- Download plan selects 40 primary images and 80 variant files (plain plus annotated), with source-qualified filenames such as `SDX-04_STATdx_plain_Focal_Hypervascular_Liver_Lesion4.jpg`.',
 '- Primary and archive sets are disjoint and exhaustive. Download URLs and original source filenames/UUIDs are preserved; no filename collisions are introduced.',
 '- Narrative-facing labels use one source-qualified label at a time. Short codes appear in machine filenames, registry, manifest and this traceability report.',
 '- Actual extension import normalization and download selection are checked in `_codex_review/validation_results.json` before writing the completion marker.',
 '- This task stages the import artifact; it does not import into a live browser or download the future full/annotated image set.',
 '- Source-specific frequencies and broad diagnostic claims were retained as supplied source material; no external clinical-guideline update was performed.',
 '', '## Outputs','']
for n in ['master_source_package.txt','master_source_manifest.json','image_registry.json','master_source_import.json','master_source_report.md','_codex_master_source_done.txt']:
    report.append(f'- [{n}]({n})')
(B/'master_source_report.md').write_text('\n'.join(report)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({'created':now,'registry':len(registry),'selected':len(selected),'archive':len(archived),'clusters':len(clusters),'packageChars':len(package),'outputsWritten':5,'completionMarker':'pending validation'},indent=2))
