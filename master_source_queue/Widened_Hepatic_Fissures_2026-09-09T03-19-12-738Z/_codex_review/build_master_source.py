from pathlib import Path
from datetime import datetime, timezone
import json, hashlib, re, struct, copy

B = Path(__file__).resolve().parent.parent
W = B / '_codex_review'
def now(): return datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
def read(n): return (B / n).read_text(encoding='utf-8-sig')
def jread(n): return json.loads(read(n))
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def write(n, s): (B / n).write_text(s, encoding='utf-8', newline='\n')
def jout(n, o): write(n, json.dumps(o, ensure_ascii=False, indent=2) + '\n')
def dimensions(p):
    data = p.read_bytes()
    assert data[:2] == b'\xff\xd8', p
    i = 2
    while i < len(data):
        assert data[i] == 255
        while data[i] == 255: i += 1
        marker = data[i]; i += 1
        if marker in (0xD8, 0xD9): continue
        length = struct.unpack('>H', data[i:i+2])[0]
        if marker in (0xC0, 0xC1, 0xC2):
            h, w = struct.unpack('>HH', data[i+3:i+7]); return {'width': w, 'height': h}
        i += length
    raise ValueError(p)

meta = jread('metadata.json')
rp, sd = jread('RadPrimer_metadata.json'), jread('STATdx_metadata.json')
em = jread('image_evidence_manifest.json')
originals = rp['imageRegistry'] + sd['imageRegistry']
byid = {e['masterImageId']: e for e in originals}
assert len(originals) == 19 and len(byid) == 19
assert meta['canonicalHierarchy'] == rp['breadcrumbTrail']
assert em == meta['imageEvidence']
assert len(em['entries']) == 19
essential = lambda n: read(n).split('ESSENTIAL INFORMATION')[1].split('=== IMAGES')[0].strip()
assert essential('RadPrimer_source_package.txt') == essential('STATdx_source_package.txt')
source_audit = []
for src in meta['sources']:
    single = jread(src['sourceLabel'] + '_metadata.json')
    assert src['metadata'] == single
    assert src['imageRegistry'] == single['imageRegistry']
    assert src['imageEvidence'] == single['imageEvidence']
    caps = re.findall(r'IMAGE_(\d+):[^\n]*\n[\s\S]*?    Caption: ([\s\S]*?)(?=\n\nIMAGE_|\n\n=== SOURCE ATTRIBUTION)', read(src['sourceLabel'] + '_source_package.txt'))
    assert len(caps) == len(single['imageRegistry'])
    for (num, cap), entry in zip(caps, single['imageRegistry']):
        assert int(num) == entry['sourceImageNumber']
        assert cap.strip() == entry['caption'].strip()
    source_audit.append({'sourceLabel': src['sourceLabel'], 'metadataAndEmbeddedMetadataAgree': True,
                         'packageCaptionsAndRegistryAgree': True, 'imageCount': len(caps)})

observations = {
 1: 'Same axial slice: identical caudate contour, fissure geometry, portal branching, right kidney, spleen and vertebral landmarks; only export size/compression differs.',
 2: 'Same complete A–D MRI montage: identical precontrast, arterial, venous and delayed panels, letter positions, dividers and fibrotic region. No panel or phase is missing.',
 3: 'Same axial CT crop: identical medial segment, deep gallbladder, falciform fissure, aortic calcification and rib/vertebral landmarks.',
 4: 'Same axial CECT slice: identical gallbladder, interposed colon and omental fat, portal branching, liver margin and vertebral outline.',
 5: 'Same axial CECT slice: identical lobulated contour, hypodense foci, stomach gas, left-lobe outline and posterior vertebral landmarks.',
 6: 'Same axial CECT slice: identical beaded duct pattern, peripheral hepatic contour, fissure, gastric/variceal structures and thoracic cross-section.',
 7: 'Same axial CECT slice: identical ectatic duct distribution, caudate/IVC configuration, stomach, spleen and rib/vertebral landmarks.',
 8: 'Same axial CECT slice: identical deeply branching fissures, portal structures, large perigastric varices, spleen and vertebral landmarks.'
}
evidence = {}
for entry in originals:
    p = B / entry['visualEvidence']['evidenceFilename']
    assert p.is_file()
    matched = next(e for e in em['entries'] if e['masterImageId'] == entry['masterImageId'])
    for f in ('imageId', 'caption', 'sourceImageNumber'): assert entry[f] == matched[f]
    assert matched['evidenceFilename'] == entry['visualEvidence']['evidenceFilename']
    evidence[entry['masterImageId']] = {**entry['visualEvidence'], 'fileExists': True,
        'sha256': sha(p), 'byteLength': p.stat().st_size, **dimensions(p),
        'visuallyInspected': True, 'reviewMethod': 'Actual staged original JPEG viewed individually with view_image; no caption-only duplicate inference.',
        'inspectedVariant': 'plain', 'annotatedVariantVisuallyInspected': False}

mapping = {1:1, 2:2, 3:3, 4:4, 5:6, 6:7, 7:8, 8:11}
primary = ['RP-01','RP-02','RP-03','RP-05','RP-06','RP-08','SDX-04','SDX-05','SDX-08','SDX-09','SDX-10']
archive = [e['masterImageId'] for e in originals if e['masterImageId'] not in primary]
coverage = []
for r, s in mapping.items():
    rid, sid = f'RP-{r:02}', f'SDX-{s:02}'
    assert byid[rid]['imageId'] == byid[sid]['imageId']
    selected = rid if rid in primary else sid
    coverage.append({'radPrimerImageId':rid, 'statdxImageIds':[sid], 'replacementImageId':sid,
        'classification':'exactDuplicate', 'confidence':'high', 'selectedRepresentativeId': selected,
        'radPrimerDisposition':'primaryTeachingSet' if rid in primary else 'archiveOptionalDuplicate',
        'visualObservation': observations[r],
        'evidence': {'sameStableSourceImageId':byid[rid]['imageId'], 'visualReviewCompleted':True,
            'evidenceFiles':[evidence[rid]['evidenceFilename'],evidence[sid]['evidenceFilename']],
            'sha256ByImageId':{rid:evidence[rid]['sha256'],sid:evidence[sid]['sha256']},
            'byteIdentical':evidence[rid]['sha256']==evidence[sid]['sha256'],
            'interpretation':'Exact same source image/slice/montage, with different server export dimensions/compression; exactDuplicate does not mean identical file bytes.'}})
gate = {'performedBeforeMerge':True, 'completedAt':now(), 'statdxFullyCoversRadPrimerImageSet':True,
    'radPrimerImageCount':8, 'coveredRadPrimerImageCount':8,
    'classificationCounts':{'exactDuplicate':8,'nearDuplicate':0,'conceptualReplacement':0,'notCovered':0},
    'radPrimerImageCoverage':coverage,
    'distinctSupplementalStatdxImageIds':['SDX-05','SDX-09','SDX-10'],
    'sourceImagesVisuallyInspected':19, 'limitation':'Only staged plain images were inspected; annotated URLs are preserved for later extension download.'}
jout('_codex_review/image_visual_review.json', {'reviewedAt':now(), 'images':evidence, 'imageCoverageGate':gate,
    'supplementalObservations':{
      'SDX-05':'Different CT slice/view from SDX-04: changed liver outline, colon lumen, gallbladder cross-section and bony level. Preserve as recognition reinforcement; possible companion case, no proved same-patient identity.',
      'SDX-09':'Distinct superior CT level with visible heart/lung bases and duct dilatation; not the SDX-08 slice. Caption describes a 22-year-old man.',
      'SDX-10':'Distinct inferior CT level with kidneys, portal structures and right-lobe volume loss; not SDX-08 or SDX-09. Matching age/sex/diagnoses in SDX-09/10 imply a companion case; no time interval is supplied.'}})
jout('_codex_review/source_comparison.json', {'checkedAt':now(), 'sources':source_audit,
    'essentialInformationIdentical':True, 'radPrimerOnlyText':'Explicit Common / Less Common differential list.',
    'statdxAddedText':'Captions for images 5, 9 and 10; no additional essential-information mechanisms, management or modality sections.',
    'canonicalHierarchy':meta['canonicalHierarchy'], 'canonicalDeckPath':meta['canonicalDeckPath']})

cluster_specs = [
 ('C01','Cirrhosis',['RP-01'],['SDX-01'],'Single axial CT; no supplied temporal relationship.'),
 ('C02','Confluent fibrosis MRI phases',['RP-02'],['SDX-02'],'Within-image A–D multiphase series is explicitly one patient. Preserve A precontrast, B arterial, C venous and D delayed, all in one composite.'),
 ('C03','Senescent change',['RP-03'],['SDX-03'],'Single axial CT; no supplied temporal relationship.'),
 ('C04','Absent medial segment',['RP-04'],['SDX-04','SDX-05'],'SDX-04/05 are visually distinct CT views of the same pattern. Treat as a possible companion cluster conservatively; same patient and interval are not explicitly confirmed.'),
 ('C05','Metastatic pseudocirrhosis',['RP-05'],['SDX-06'],'Single CT in a woman with breast cancer metastases. No pre/posttherapy sequence or treatment history is supplied for this image.'),
 ('C06','Primary sclerosing cholangitis',['RP-06'],['SDX-07'],'Single axial CT; no supplied temporal relationship.'),
 ('C07','Congenital hepatic fibrosis and Caroli disease',['RP-07'],['SDX-08','SDX-09','SDX-10'],'SDX-09/10 captions imply a companion case in a 22-year-old man; keep both levels together. SDX-08 is a distinct same-disease example with no explicit link to that patient; all three retained as a conservative teaching cluster, not an assertion of shared patient identity.'),
 ('C08','Hepatic schistosomiasis',['RP-08'],['SDX-11'],'Single axial CT; no supplied temporal relationship.')
]
clusters = []
for cid, label, rids, sids, context in cluster_specs:
    members=rids+sids
    clusters.append({'clusterId':cid,'label':label,'atomic':True,'sourceMembers':{'RadPrimer':rids,'STATdx':sids},
        'selectedImageIds':[i for i in members if i in primary], 'archiveImageIds':[i for i in members if i in archive],
        'context':context, 'intentionalSplit':False,
        'replacementMappings':[{'archivedImageId':i,'selectedImageId':next(j for j in members if j in primary and byid[j]['imageId']==byid[i]['imageId'])} for i in members if i in archive]})

correction = {'id':'ERR-01','sourceFiles':['RadPrimer_source_package.txt','STATdx_source_package.txt'],
    'section':'ESSENTIAL INFORMATION > Helpful Clues for Less Common Diagnoses > Schistosomiasis',
    'originalText':'Saccharina japonica causes extensive fibrosis of liver',
    'correctedText':'Schistosoma japonicum infection can cause hepatic fibrosis and portal hypertension.',
    'status':'Editorial organism-name correction; intended replacement inferred from schistosomiasis context and verified against CDC taxonomy/clinical effects.',
    'verificationSource':{'title':'CDC — Clinical Overview of Schistosomiasis','url':'https://www.cdc.gov/schistosomiasis/hcp/clinical-overview/index.html','publishedAt':'2024-03-11','accessedAt':now(),
        'supportedClaim':'S. japonicum is a schistosome associated with hepatic involvement; heavy infections can lead to liver fibrosis and portal hypertension.'},
    'originalSourceFilesModified':False}

registry=[]
for original in originals:
    e=copy.deepcopy(original); mid=e['masterImageId']; c=next(c for c in clusters if mid in c['sourceMembers']['RadPrimer']+c['sourceMembers']['STATdx'])
    e['displayLabel']=f"{e['sourceLabel']} image {e['sourceImageNumber']}"
    e['sourceImageId']=e['imageId']; e['sourceMetadataFile']=e['sourceLabel']+'_metadata.json'
    e['sourcePackageFile']=e['sourceLabel']+'_source_package.txt'
    e['sourceArticleUrl']=next(s['sourceUrl'] for s in meta['sources'] if s['sourceLabel']==e['sourceLabel'])
    for v in ('plain','annotated'):
        e['original'+v.capitalize()+'Filename']=original[v+'Filename']
        e[v+'Filename']=f"{mid}_{e['sourceLabel']}_{v}_{original[v+'Filename']}"
    e['filename']=e['plainFilename']; e['visualEvidence']=evidence[mid]
    e['originalGroup']=e['group']; e['group']=c['clusterId']; e['caseClusterId']=c['clusterId']; e['caseContext']=c['context']
    e['captionMarkerAssets']=re.findall(r'<img src="([^"]+)"\s*>',e['caption'])
    e['teachingCaption']=re.sub(r'<img src="([^"]+)"\s*>',r'[source marker: \1]',e['caption'])
    e['downloadRecommendation']='primaryTeachingSet' if mid in primary else 'archiveOptionalDuplicate'
    e['usedFor']=['imageRecognition','differentialDiagnosis'] if mid in primary else ['exactDuplicateRecovery']
    if mid in ('SDX-05','SDX-08','SDX-09','SDX-10'): e['usedFor']+=['recognitionReinforcement','alternateExample']
    if mid=='RP-02': e['usedFor']+=['modalityVariant','multiphaseComparison','mechanism']; e['panels']={'A':'precontrast T1','B':'arterial postcontrast','C':'venous postcontrast','D':'delayed postcontrast'}
    if mid in ('SDX-09','SDX-10'): e['usedFor']+=['companionView']; e['requiredCompanionImageIds']=[i for i in ('SDX-09','SDX-10') if i!=mid]
    if mid in ('SDX-04','SDX-05'): e['requiredCompanionImageIds']=[i for i in ('SDX-04','SDX-05') if i!=mid]
    if mid=='SDX-09': e['teachingCaption']+=' Keep with STATdx image 10 as the caption-implied companion case; no interval or treatment change is specified.'
    if mid=='SDX-10': e['teachingCaption']+=' Keep with STATdx image 9 as the caption-implied companion case; do not interpret the different CT level as disease progression.'
    if mid in ('SDX-04','SDX-05'): e['teachingCaption']+=' Keep STATdx image 4 and STATdx image 5 together as distinct companion-pattern views; shared patient identity is unconfirmed.'
    rel=next((x for x in coverage if mid in [x['radPrimerImageId']]+x['statdxImageIds']),None)
    if rel:
        e['duplicateClassification']='exactDuplicate'; e['equivalentImageIds']=[i for i in [rel['radPrimerImageId']]+rel['statdxImageIds'] if i!=mid]
        e['duplicateEvidence']=rel['evidence']; e['visualObservation']=rel['visualObservation']
    else:
        e['duplicateClassification']='notExactDuplicate'; e['relationshipToBackbone']='conceptualReplacement'
        e['relationshipNote']='Additional visually distinct source example/view retained as recognition reinforcement; does not remove a canonical teaching image.'
    if mid in archive:
        e['duplicateOf']=next(i for i in primary if byid[i]['imageId']==e['imageId'])
        e['archiveReason']='Exact duplicate of '+e['duplicateOf']+': same stable source image ID and visually confirmed same image/slice/montage. Optional recovery only; all source evidence remains intact.'
    registry.append(e)
get={e['masterImageId']:e for e in registry}
files=[{'masterImageId':e['masterImageId'],'sourceKind':e['sourceKind'],'sourceLabel':e['sourceLabel'],'sourceImageNumber':e['sourceImageNumber'],
        'variant':v,'filename':e[v+'Filename'],'url':e[v+'Url'],'downloadRecommendation':'primaryTeachingSet'}
       for e in registry if e['masterImageId'] in primary for v in ('plain','annotated')]
plan={
 'textSelection':{'RadPrimer':{'role':'canonical hierarchy and article backbone','keep':['Common / Less Common differential grouping and order','All essential-information mechanisms, recognition clues and differential distinctions, with ERR-01 corrected','Original captions, phase labels and source traceability'],
                            'downweightOrSkip':['Extraction/chat instructions','Stale manual MSK deck setting','Unverified Core cross-check request','Incorrect organism phrase documented in ERR-01']},
                  'STATdx':{'role':'supplemental visual examples and caption detail','keep':['Three distinct added CT images: SDX-05, SDX-09, SDX-10','Whole conservative SDX-04/05 and SDX-08/09/10 teaching clusters','Caption-specific age, diagnosis and anatomical detail'],
                            'downweightOrSkip':['Verbatim repeated essential-information text','Eight redundant source-image copies after representative selection','STATdx navigation breadcrumb for routing']}},
 'imageCurationPolicy':'Archive only proven exact/same-image/same-slice/same-screenshot duplicates or unusable images. Near duplicates, alternate examples and conceptual replacements remain primary as recognition reinforcement unless visually identical or unusable.',
 'duplicateEvidencePolicy':'Exact duplicate decisions require actual staged visual evidence, same stable source image ID, image hashes or explicit source/manual confirmation. Caption/topic similarity alone is insufficient; uncertain matches stay primary. Here all eight duplicate relationships were visually checked and share stable IDs; byte hashes differ across export variants.',
 'caseClusterGuardrails':{'rule':'Same-patient, follow-up, adjacent-slice, procedure, comparison and time-lapse groups are atomic. Replace an entire equivalent cluster or document an explicitly safe split. Never infer chronology from image number.',
    'intentionalSplits':[],'summary':'No source case cluster was intentionally split. Retain whole MRI montage, both SDX-04/05 views and all SDX-08/09/10 views. Archive equivalent complete RP-04 and RP-07 singleton representatives; preserve all standalone canonical representatives elsewhere.',
    'caseIdentityUncertainty':'SDX-04/05 are a possible companion group. SDX-09/10 are caption-implied companions. SDX-08 is not asserted to be the same patient as SDX-09/10.'},
 'imageDownloadPlan':{'mode':'curatedPrimaryOnly','primaryTeachingSet':{'RadPrimer':[i for i in primary if i.startswith('RP-')],'STATdx':[i for i in primary if i.startswith('SDX-')]},
    'archiveOptionalDuplicates':{'RadPrimer':[i for i in archive if i.startswith('RP-')],'STATdx':[i for i in archive if i.startswith('SDX-')]},
    'defaultImageCount':11,'defaultVariantFileCount':22,'variants':['plain','annotated'],'filenamePolicy':'<masterImageId>_<sourceLabel>_<variant>_<originalFilename>',
    'files':files,'evidenceFilesAreAuditInputs':True,'downloadState':'Plan only; source URLs retained, no new remote image download performed.'},
 'generatorInstructions':['This deliverable is source material only; do not generate cards or a lecture now.',
    'Use only selectedPrimaryImageIds by default; archives are duplicate recovery, not additional teaching examples.',
    'Use one clean human-facing source label such as RadPrimer image 5 or STATdx image 4. Keep short codes in registry, filenames and traceability fields.',
    'Use metadata.json canonicalHierarchy exactly; retain its supplied canonicalDeckPath. Corebook is a routing label, not evidence that Core Radiology was checked.',
    'If a later IMAIOS library is requested, derive routing from the exact canonical hierarchy plus only the local parent group; no IMAIOS library is created here.',
    'Teach repeated mechanisms once; retain visually distinct examples for recognition. Keep phase labels and companion views intact.',
    'Preserve original caption attribution. Source arrow filenames are markers, not independently downloaded assets; do not imply plain images contain arrow overlays.',
    'Apply ERR-01. Preserve source-reported frequency figures as attributed source claims; do not invent page citations, sensitivity estimates, histology examples, modality findings or management protocols.',
    'The supplied HCC comparison is a pattern discriminator; do not turn absence of washout into a universal exclusion rule. No Core evidence was provided.']}

package=f'''=== TOPIC ===
PRIMARY TOPIC: {meta['articleTitle']}
Source package only: fused reference material for later image-recognition learning.

=== CANONICAL RADPRIMER BREADCRUMB ===
{' > '.join(meta['canonicalHierarchy'])}
canonicalHierarchy: {json.dumps(meta['canonicalHierarchy'], ensure_ascii=False)}
deckPath: {meta['canonicalDeckPath']}
Routing authority: metadata.json. The supplied deck path is preserved exactly.

=== SOURCE BASIS ===
[RadPrimer] supplies the canonical hierarchy, differential grouping and article backbone.
[Both] supply identical essential-information text and eight shared source images.
[STATdx] adds three visually distinct CT images and their captions. The selected library uses six RadPrimer and five STATdx images to keep companion groups intact.
Core Radiology: no auditable pages or excerpts supplied. The Corebook deck-root label does not establish Core verification.

=== ARTICLE ===
TITLE: Widened Hepatic Fissures

DIFFERENTIAL DIAGNOSIS [RadPrimer ordering]
- Common: Cirrhosis; Focal Confluent Fibrosis; Senescent Change; Postsurgical (Mimic).
- Less Common: Congenital Absence of Hepatic Segments; Liver Metastases; Primary Sclerosing Cholangitis; Congenital Hepatic Fibrosis; Schistosomiasis.

ESSENTIAL INFORMATION
Key Differential Diagnosis Issues [Both]
- Widened fissures reflect congenital, acquired or iatrogenic loss of hepatic parenchyma. Identify the accompanying volume distribution, ductal changes, portal-hypertension findings and clinical context.

Helpful Clues for Common Diagnoses
1. Cirrhosis [Both]
- Fissural widening indicates fibrosis and volume loss; the sources describe this as a sensitive sign, without providing a numerical sensitivity.
- Look for caudate enlargement and portal-hypertension findings: splenomegaly, varices and ascites.
- Selected example: RadPrimer image 1.

2. Focal Confluent Fibrosis [Both]
- Common in advanced cirrhosis. The sources report 90% involvement of the medial left and/or anterior right segments, naming segments 8 and 4, with sparing of caudate and lateral segments.
- The sources report venous-phase isoattenuation to adjacent liver in 80% of lesions.
- Delayed persistent enhancement supports fibrosis. The supplied differential contrasts progressive/persistent enhancement with HCC washout; use this as a pattern distinction, not a stand-alone rule excluding HCC.
- RadPrimer image 2 preserves an entire T1 MRI series: A precontrast, B arterial, C venous and D delayed. Low T1 signal followed by progressive enhancement demonstrates the fibrotic pattern. Keep all four panels together.

3. Senescent Change [Both]
- Adults older than 70 may have asymptomatic hepatic volume loss and widened fissures.
- Do not diagnose cirrhosis from this appearance without clinical correlation. RadPrimer image 3 depicts a small medial segment and deep gallbladder in a man without clinical evidence of liver disease.

4. Postsurgical (Mimic) [Both]
- Segment resection or tumor ablation can explain parenchymal loss. Preserve history-based differentiation from spontaneous atrophy.
- No dedicated postoperative, ablation or procedural image series is supplied.

Helpful Clues for Less Common Diagnoses
5. Congenital Absence of Hepatic Segments [Both]
- The sources identify anterior and medial segments as the most commonly involved locations.
- Look for a deep gallbladder fossa and absence of portal-hypertension signs.
- STATdx image 4 and STATdx image 5 show absent/nearly absent medial segment with omental fat and colon occupying the gap. Their appearances differ; retain both. Shared patient identity is unconfirmed.

6. Liver Metastases [Both]
- Some cancers, including breast cancer, can induce fibrosis and volume loss that simulate cirrhosis (pseudocirrhosis).
- Tumor volume loss and fibrosis can also follow systemic or arterial chemotherapy/chemoembolization, as described by the sources. Do not assign a treatment cause to a specific image without its history.
- RadPrimer image 5 shows nodular/lobulated hepatic morphology and subtle hypodense metastases in a woman with breast cancer. No paired treatment-response study is supplied.

7. Primary Sclerosing Cholangitis [Both]
- Volume loss can precede established cirrhosis.
- Peripheral atrophy with hypertrophy of the deeper right and caudate regions produces rounded contours.
- Look for irregular duct dilatation and strictures; correlate with inflammatory bowel disease history.
- RadPrimer image 6 shows beaded intrahepatic ductal dilatation, rounded hepatic morphology, widened fissures and varices.

8. Congenital Hepatic Fibrosis [Both]
- Part of the congenital fibropolycystic liver-disease spectrum; causes portal hypertension and can simulate or progress to cirrhosis.
- Look for associated biliary/renal abnormalities, including Caroli disease and recessive or dominant polycystic disease.
- Enlarged tortuous hepatic arteries are a described clue. A normal or enlarged medial segment contrasts with the small medial segment described in viral/alcohol-related cirrhosis.
- STATdx image 8 provides an ectatic-duct example. STATdx image 9 and STATdx image 10 add distinct CT levels in a caption-implied companion case involving a 22-year-old man, demonstrating duct irregularity and volume loss. Keep both views; no progression or treatment interval is stated.
- STATdx image 8 is not established as the same patient as the later two views.

9. Schistosomiasis [Both, with documented editorial correction]
- Hepatic schistosomiasis may produce extensive fibrosis and striking fissural widening along portal branches. Look for periportal/pericapsular septal calcification and the source-described tortoise-shell pattern.
- RadPrimer image 8 demonstrates marked fissural widening and portal-hypertension findings. The caption does not specifically claim calcifications in this image; do not conflate the general diagnostic clue with a documented image finding.
- Editorial correction: both extracted texts incorrectly name the organism “Saccharina japonica.” The intended schistosome is inferred to be Schistosoma japonicum; CDC confirms its hepatic involvement and potential for fibrosis/portal hypertension. See [CDC — Clinical Overview of Schistosomiasis](https://www.cdc.gov/schistosomiasis/hcp/clinical-overview/index.html). Original source text remains unchanged for audit.

=== MODALITY AND SCOPE BOUNDARIES ===
[Both] CT provides the supplied morphology/duct/portal-hypertension examples; the four-panel T1 MRI example supplies temporal enhancement information for confluent fibrosis.
No dedicated ultrasound, nuclear-medicine, histology, treatment algorithm or procedure/follow-up sequence is supplied. Do not infer that missing material was reviewed or generate additional source claims.
Source-reported 90% and 80% figures above are preserved as attributed statements; their primary studies were not supplied or independently validated.

=== SELECTED IMAGE LIBRARY ===
Eleven selected source-image records. Plain and annotated filenames below are the extension's planned download targets; only plain evidence previews are currently staged. Source marker tokens preserve original arrow references without inventing their shape or position.
'''
teaching_order=['RP-01','RP-02','RP-03','SDX-04','SDX-05','RP-05','RP-06','SDX-08','SDX-09','SDX-10','RP-08']
for mid in teaching_order:
    e=get[mid]
    display_context=e['caseContext']
    for phrase, replacement in [('SDX-04/05','STATdx image 4 and STATdx image 5'),('SDX-09/10','STATdx image 9 and STATdx image 10')]:
        display_context=display_context.replace(phrase,replacement)
    display_context=re.sub(r'\b(?:RP|SDX)-\d{2}\b',lambda m:get[m[0]]['displayLabel'],display_context)
    package+=f"\n{e['displayLabel']} [{e['sourceLabel']}]\n  Image: {e['plainFilename']}\n  Image_Annotated: {e['annotatedFilename']}\n  Caption: {e['teachingCaption']}\n  Context: {display_context}\n"
package+='\n=== OPTIONAL DUPLICATE RECOVERY INDEX ===\nThese exact duplicate copies remain in the registry and evidence folder but do not drive default teaching or downloads.\n'
for mid in archive:
    e=get[mid]; package+=f"- {e['displayLabel']}: same image as {get[e['duplicateOf']]['displayLabel']}; optional recovery copy.\n"
package+='\n=== SOURCE ATTRIBUTION AND FUTURE USE ===\nUse [RadPrimer], [STATdx] or [Both] for source claims; image labels always identify the actual selected source. The eight shared image pairs were checked visually and by stable source IDs. The registry retains original captions, source numbers, URLs, evidence filenames, hashes and all archived records.\nNo source case cluster was intentionally split. Preserve the MRI phase montage and selected CT companion groups. No cards, lecture or IMAIOS library are included.\n'
package=package.strip()
write('master_source_package.txt',package)
manifest={'version':1,'articleTitle':meta['articleTitle'],'createdAt':now(),'bundleCreatedAt':meta['createdAt'],
 'canonicalHierarchy':copy.deepcopy(meta['canonicalHierarchy']),'canonicalHierarchySource':meta['canonicalHierarchySource'],'canonicalDeckPath':meta['canonicalDeckPath'],
 'sourcePriority':['RadPrimer','STATdx'],'sourceCoverage':{'text':'RadPrimer differential grouping retained; identical essential information fused once; STATdx contributes three distinct image/caption additions.','imageCoverageGate':gate},
 'imageCountBySource':{'RadPrimer':8,'STATdx':11},'selectedImageCountBySource':{'RadPrimer':6,'STATdx':5},'archiveImageCountBySource':{'RadPrimer':2,'STATdx':6},
 'totalSourceImageCount':19,'selectedPrimaryImageCount':11,'archiveOptionalImageCount':8,
 'sourceAttributionRules':['Use [RadPrimer], [STATdx] and [Both] accurately.','Use source-qualified clean display labels for prose; stable short IDs for traceability and filenames.','External verification supports ERR-01 only, not an additional radiology source.','No supplied auditable Core Radiology evidence.'],
 'sources':[{k:s[k] for k in ('sourceKind','sourceLabel','sourceUrl','cachedAt')} for s in meta['sources']],
 'sourceBreadcrumbsForAuditOnly':meta['sourceBreadcrumbs'],'selectedPrimaryImageIds':primary,'archiveOptionalImageIds':archive,
 'sourceSelectionPlan':plan,'caseClusters':clusters,'editorialCorrections':[correction],
 'coreValidation':{'suppliedAuditableCoreEvidence':False,'status':'Not verified; no Core-specific teaching claim added.'},
 'inputFiles':[{'filename':n,'sha256':sha(B/n)} for n in ['RadPrimer_source_package.txt','STATdx_source_package.txt','RadPrimer_metadata.json','STATdx_metadata.json','metadata.json','master_source_request.md','image_evidence_manifest.json']],
 'packageSha256':sha(B/'master_source_package.txt'),'scope':'Master source synthesis only; no cards, lecture, IMAIOS library or live extension import.'}
jout('master_source_manifest.json',manifest)
jout('image_registry.json',registry)
jout('master_source_import.json',{'version':1,'articleTitle':meta['articleTitle'],'createdAt':manifest['createdAt'],
 'packageText':package,'manifest':manifest,'imageRegistry':registry,'sourceSelectionPlan':plan,
 'selectedPrimaryImageIds':primary,'archiveOptionalImageIds':archive})

report=f'''# Widened Hepatic Fissures — master source report

Imported the newest complete browser request using the repository importer. The queue pointer identifies this bundle. All 19 actual staged JPEGs were individually viewed before the coverage gate and synthesis.

## Outcome

STATdx fully covers all eight RadPrimer source images as exact same-image counterparts. Select 11 images (6 RadPrimer, 5 STATdx); retain 8 exact duplicate copies as optional archives. All three distinct STATdx additions remain primary. No evidence image is deleted or moved. The extension plan contains 22 downloads: plain and annotated variants for the 11 selected images.

Canonical hierarchy: `{json.dumps(meta['canonicalHierarchy'],ensure_ascii=False)}`.

Supplied deck path: `{meta['canonicalDeckPath']}`. Both are copied from metadata.json. STATdx navigation and the stale manual MSK deck setting are retained only as source audit data, never as master routing. Corebook is a deck-root label, not a claim of Core Radiology verification.

## Source comparison

RadPrimer supplies the explicit Common / Less Common differential list and canonical article order. Essential-information text in the two packages is identical. STATdx adds captions and distinct images 5, 9 and 10, but no additional mechanism, management, ultrasound, nuclear-medicine or histology section. Source captions and IDs agree with both standalone source metadata and embedded metadata.json source records. The image evidence manifest agrees with metadata.json.

Fused text retains the diagnostic distinctions, source-reported percentages and CT/MRI context once. Neither a new lecture nor cards are generated. Every original caption, URL and source number is preserved in the registry.

## Image coverage gate

Classification totals for RadPrimer: 8 exact duplicate; 0 near duplicate; 0 conceptual replacement; 0 not covered. Matching captions were not used as proof. Every pair has the same stable source UUID and visually identical source image/slice/montage. Files have different bytes and export dimensions; hashes identify each evidence file rather than falsely implying byte identity.

| RadPrimer | STATdx counterpart | Classification | Primary representative | Evidence observation |
|---|---|---|---|---|
'''
for c in coverage:
    report+=f"| {c['radPrimerImageId']} | {c['replacementImageId']} | exact duplicate | {c['selectedRepresentativeId']} | {c['visualObservation']} |\n"
report+='''
Detailed UUIDs, evidence paths, dimensions, SHA-256 values and pairwise decisions are in image_registry.json, the manifest and _codex_review/image_visual_review.json. All decisions refer to the actual staged plain JPEGs. Annotated images were not staged or visually inspected; their original source URLs are retained for future downloads.

## Primary selection and atomic groups

Singleton teaching examples retain the RadPrimer copy because it is adequate and matches the canonical backbone. Full STATdx groups are selected for absent medial segment and congenital hepatic fibrosis/Caroli disease; the equivalent RadPrimer singleton is archived, preserving its exact visual information in the selected STATdx copy.

- RP-02 is the entire A–D multiphase MRI composite; no panel is separated or lost.
- SDX-04 and SDX-05 are distinct CT views, conservatively retained together. Same patient and time interval are not explicitly documented. SDX-05 is not an exact duplicate merely because it teaches the same pattern.
- SDX-09 and SDX-10 have matching age, sex and disease captions, implying a companion case; the different levels are retained together. No follow-up interval or progression is asserted.
- SDX-08 remains selected with that topic group as a distinct example. Its identity as the same patient is unconfirmed; the grouping is a conservative teaching decision.
- No source case cluster was intentionally split. Intentional selected/archive cluster splits: none. Shared singleton copies and the complete duplicate MRI composite are represented in full by their selected equivalents.

| Archived copy | Retained equivalent | Concrete exclusion reason |
|---|---|---|
'''
for mid in archive: report+=f"| {mid} | {get[mid]['duplicateOf']} | Exact duplicate: same source UUID and visually confirmed same image/slice/montage; export-size/compression variant only. |\n"
report+='''
## Source correction and limitations

Both source packages contain “Saccharina japonica” in the schistosomiasis paragraph. This appears to be an organism-name substitution error. The master teaching text uses Schistosoma japonicum; the intended substitution is inferred from context. [CDC — Clinical Overview of Schistosomiasis](https://www.cdc.gov/schistosomiasis/hcp/clinical-overview/index.html) confirms S. japonicum hepatic involvement and that heavy infection can cause fibrosis and portal hypertension (page dated March 11, 2024, checked during synthesis). ERR-01 records the original text, correction and verification scope. The original source files are unchanged.

The 90% and 80% confluent-fibrosis figures remain source-attributed; underlying primary studies were not supplied. The source contrast with HCC washout is presented as a pattern discriminator, not a universal exclusion rule. No unsupported Core claim is added. Arrow asset names are preserved exactly in registry captions and as source-marker tokens in the teaching text; arrow shape/location is not invented.

## Extension handoff and validation

Import master_source_import.json. It contains exactly the same packageText as master_source_package.txt, embeds the manifest and full 19-record registry, and repeats the identical selected/archive sets and sourceSelectionPlan. Human-facing captions use one source-qualified display label; short IDs remain in metadata, traceability and planned filenames.

The validation script checks preserved input hashes, the exact canonical hierarchy/deck path, all source records, coverage decisions, complete cluster selection, 11/8 partition, unique filenames and the installed extension's actual import/download helpers. Results are recorded in _codex_review/validation_results.json. The completion marker is written only after those checks pass. This is local compatibility validation; no live browser import or remote image download is claimed.
'''
write('master_source_report.md',report)
print(json.dumps({'built':True,'images':19,'primary':len(primary),'archive':len(archive),'downloads':len(files),'packageChars':len(package)},indent=2))
