from pathlib import Path
import json,re,secrets,string,hashlib
from copy import deepcopy

B=Path(__file__).resolve().parent.parent
R=B/'_codex_review'
original=json.loads((R/'original_rows.json').read_text(encoding='utf-8'))
fields=list(original[0])
rows=deepcopy(original)
changes={i:[] for i in range(1,len(rows)+1)}
def edit(n,field,value,reason):
    rows[n-1][field]=value
    changes[n].append({'field':field,'reason':reason})

edit(4,'Imaging_Differentiation','Key imaging findings: Homogeneous arterial enhancement, near-isointensity to liver on portal venous MRI, and a persistent small central scar.<br>Key differentiators: FNH typically returns toward background liver signal after the arterial phase. Fibrolamellar HCC is usually large and heterogeneous with a fibrotic scar; adenoma may be heterogeneous from fat or hemorrhage.<br>Imaging specificity: Strongly suggestive.','Keep the explanation focused on the displayed dynamic MRI; remove the oversimplified bile-duct explanation and unshown hepatobiliary behavior.')
edit(9,'Imaging_Differentiation','Key imaging findings: Small arterial-only hypervascular focus, described as absent on NECT and portal venous images.<br>Key differentiators: Small arterioportal shunts in cirrhosis are often ≤1.5 cm and may disappear on later phases. Peripheral wedge-shaped geometry, no corresponding precontrast T1/T2 abnormality, and early portal-branch filling favor shunting when present.<br>Imaging specificity: Suggestive in the supplied case; arterial hyperenhancement alone does not establish HCC or a shunt.','Avoid excessive certainty from a single arterial image; distinguish described companion findings from findings actually shown.')
for n in [12,13]:
    edit(n,'Imaging_Differentiation',rows[n-1]['Imaging_Differentiation'].replace('Strongly suggestive to diagnostic in the appropriate high-risk context.','Strongly suggestive in the supplied cirrhotic patient.'),'Remove imaging-only diagnostic overclaim without complete study criteria.')
edit(14,'Imaging_Differentiation',rows[13]['Imaging_Differentiation'].replace('Mosaic architecture is a recognized ancillary HCC feature in Core.','The STATdx caption identifies mosaic hypervascular architecture as typical of a large HCC.'),'Mosaic appearance is supported by the STATdx case caption; the captured Core fact list does not establish the claimed Core attribution.')
edit(17,'Imaging_Differentiation','Key imaging findings: Arterial hypervascularity with a capsule and relative hypointensity on the supplied delayed gadoxetate image.<br>Key differentiators: Adenoma can be heterogeneous from fat, necrosis, or hemorrhage. Typical FNH shows homogeneous arterial enhancement and returns toward background liver on portal images. Gadoxetate hepatobiliary retention is a separate supportive FNH discriminator, but this source labels the second image only as delayed.<br>Imaging specificity: Supports adenoma in this source case. Inflammatory subtype is the reported final diagnosis; these two images alone do not establish subtype.','Remove unrelated nuclear-medicine facts and avoid equating a generic delayed image with a timed hepatobiliary acquisition or imaging-proven subtype.')
edit(20,'Imaging_Differentiation','Key imaging findings: Multiple arterial hypervascular nodules, some with hypointense halos, and persistent portal-phase hyperintensity.<br>Key differentiators: Persistent portal enhancement in Budd-Chiari supports large regenerative nodules. Interpret the nodules alongside hepatic venous outflow obstruction and collateral vessels before favoring multifocal HCC.<br>Imaging specificity: Requires correlation with the vascular background.','Correct the reversed reading of the source phrase: the nodules are distinctive in retaining enhancement, not unusually unlikely to retain it.')
edit(23,'Differentials','Hepatic Adenoma<br>Hepatocellular Carcinoma','Remove lipoma, which is not supported in the captured differential and does not explain the hypervascular soft-tissue component.')

edit(27,'Mechanism_Q','How does increasing neovascularity during hepatocarcinogenesis explain arterial hyperenhancement?','Focus on a single supported vascular mechanism.')
edit(27,'Mechanism','Progression from regenerative nodule to dysplastic nodule to HCC is accompanied by increasing neovascularity. Increasing arterial tumor supply produces arterial hyperenhancement. Portal/delayed relative washout and an enhancing capsule are associated imaging findings, assessed separately.','Remove unsupported nodule-supply details and the incorrect causal claim that the same vascular remodeling explains venous invasion.')
edit(29,'Mechanism_Q','What explains typical FNH uptake of gadoxetate on hepatobiliary-phase MRI?','Separate the uptake mechanism from unrelated HIDA behavior.')
edit(29,'Mechanism','FNH contains functioning hepatocytes and usually retains gadoxetate, giving iso- or hyperintensity relative to liver on hepatobiliary-phase imaging.<br><b>Outside clarification (Sciarra et al., 2019):</b> Hepatocyte uptake transporters, including OATP1B3, explain uptake; bile ductules alone are not the uptake mechanism. Transporter expression can be retained in some adenomas, particularly beta-catenin-activated lesions, so hepatobiliary brightness is not exclusive to FNH.','Clarify the biological link using a cited primary radiology-pathology study; remove unsupported hamartoma labeling and avoid an absolute FNH-versus-adenoma rule.')
edit(30,'Mechanism','<b>Outside histology clarification (EASL, 2016):</b> Hemangiomas contain endothelial-lined cavernous vascular spaces. Peripheral nodular enhancement and progressive inward filling represent contrast entering these blood-filled spaces. The enhanced portions therefore follow the blood pool rather than background liver across phases.','Label the histology as outside clarification; preserve the source-supported enhancement explanation without unsupported detailed feeder-artery anatomy.')
edit(37,'High_Yield_Q','How do oral contraceptive or anabolic steroid exposure change the differential for a hypervascular hepatic mass?','Make the pretest clue, not general sex-prevalence trivia, the learning target.')
edit(37,'High_Yield_A','They raise hepatic adenoma in the differential, especially when the lesion is heterogeneous or contains fat or hemorrhage. The article highlights young women using oral contraceptives and individuals using anabolic steroids; exposure alone is not diagnostic.','Use the exact article-supported associations without adding duration or unsupported prevalence strength.')
edit(38,'High_Yield_Q','In HHT, which additional diagnosis should be considered for a focal FNH-like hypervascular hepatic mass?','Replace pure numerical recall with an interpretation-changing pretest clue.')
edit(38,'High_Yield_A','Focal nodular hyperplasia. The article reports markedly increased FNH prevalence in HHT (about 100-fold); this raises FNH in the differential when a focal mass has the matching enhancement pattern. Do not assume every HHT hepatic finding is simply diffuse shunting.','Retain the source-specific statistic as context rather than the answer target.')
edit(40,'High_Yield_Q','What dynamic contrast-enhancement pattern strongly supports hepatic cavernous hemangioma?','Split dynamic enhancement from unenhanced MRI signal.')
edit(40,'High_Yield_A','Discontinuous peripheral nodular enhancement with progressive centripetal fill-in; the enhancing portions remain approximately equivalent to blood pool across phases. Compare enhancement with vessels, not only with liver.','Preserve the central blood-pool discriminator; move T2 signal to a separate note and remove unsupported fat-saturation elaboration.')
edit(41,'High_Yield_A','A circumscribed, homogeneously echogenic mass with no detectable color-Doppler flow; posterior acoustic enhancement may occur. This supports hemangioma in the appropriate context, but absent Doppler signal does not mean the lesion lacks vascular spaces.','Remove the uncaptured target/halo assertion and replace the misleading avascular label with no detectable Doppler flow.')
edit(42,'High_Yield_A','Bright homogeneous arterial enhancement with near-isodensity/isointensity to liver on unenhanced, portal venous, and delayed images; a central scar may be present. Returning toward background liver after the arterial phase favors FNH over a lesion that remains blood-pool equivalent or washes out.','Keep the supported phase pattern; remove late scar-enhancement detail not documented among the captured Core facts.')
edit(43,'High_Yield_Q','How does hepatobiliary-phase gadoxetate behavior help distinguish typical FNH from hepatic adenoma?','Keep the contrast discriminator separate from the detailed mechanism card.')
edit(43,'High_Yield_A','Typical FNH retains gadoxetate and is iso- or hyperintense relative to liver on hepatobiliary-phase MRI; many adenomas are hypointense.<br><b>Outside clarification (Sciarra et al., 2019):</b> Some adenomas retain hepatocyte uptake transporters and enhance on this phase. Retention supports FNH but does not prove it.','Avoid a categorical duct-based distinction or an absolute retention rule.')
edit(46,'High_Yield_A','A peripheral wedge of arterial hyperenhancement that normalizes on portal venous imaging is a perfusion pattern. When the territory is large or segmental, search for a mass or other cause of portal-branch compression or occlusion and report that cause.','Focus the card on the report-critical search; remove the easily overgeneralized instruction to ignore subcapsular findings.')
edit(47,'High_Yield_A','Arterial hyperenhancement with relative portal/delayed washout; an enhancing capsule may provide additional support. This combination strongly favors HCC in an appropriate at-risk liver. Capsule is not required in every HCC, and individual examples may lack uniform visible washout.','Remove mandatory encapsulation and unsupported phase-detection claims; retain the characteristic pattern without implying all HCCs are identical.')
edit(49,'High_Yield_Q','What finding within venous thrombus should raise tumor in vein in a patient with HCC?','Focus the front on one report-critical discriminator.')
edit(49,'High_Yield_A','Enhancement or internal Doppler flow within thrombus suggests tumor in vein. Inspect and report involvement of the portal veins, hepatic veins, and IVC. This is different from simply seeing a nonenhancing filling defect.','Keep the captured Core vascular discriminator; remove bile ducts from a question describing vascular structures.')
edit(51,'High_Yield_A','Multiplicity, heterogeneity, and ring enhancement favor metastatic malignancy. Look for a hypervascular extrahepatic primary when this pattern is present; a matching pancreatic neuroendocrine mass is shown in the source examples.','Remove generic MRI signal and ultrasound target assertions not supported by the captured source evidence.')
edit(52,'High_Yield_A','Usually arterial hyperenhancement with later iso- or hypoenhancement relative to liver. Fat, necrosis, or hemorrhage can make the mass heterogeneous; these components may be more evident on MRI than CT. A capsule is shown in the source case.','Remove uncaptured fibrous pseudocapsule and late-enhancement detail; keep source-backed appearance.')
edit(53,'High_Yield_Q','What is the usual sulfur-colloid appearance of hepatic adenoma?','Split independent tracer findings and remove unsupported nonspecific ultrasound content.')
edit(53,'High_Yield_A','Usually photopenic on sulfur-colloid imaging, according to the captured Core evidence. Photopenia is supportive context, not a stand-alone diagnosis.','Keep only the tracer fact explicitly documented in the Core evidence report.')
edit(54,'High_Yield_Q','Why are size and interval growth important when reporting a hepatic adenoma?','Reframe textbook threshold recall as a report-critical management pivot.')
edit(54,'High_Yield_A','The captured Core evidence flags lesions >5 cm because of hemorrhage risk. Report maximum diameter, growth, and hemorrhagic features.<br><b>Outside management clarification (EASL, 2016):</b> Management also depends on sex and progression. In women, persistent size ≥5 cm or growth after 6 months of lifestyle modification supports resection; in men, resection is recommended regardless of size.','Preserve the Core risk threshold while preventing an unconditional size-only management rule; clearly label the guideline clarification.')
edit(57,'High_Yield_A','A large heterogeneous hepatic mass in a young noncirrhotic patient, often with a large central scar that may calcify. The captured Core evidence describes the fibrotic scar as T1/T2 hypointense. This constellation favors fibrolamellar HCC over typical FNH.','Remove capsular-retraction claim not documented in the captured Core facts.')
edit(58,'High_Yield_A','Delayed/progressive persistent enhancement, sometimes with capsular retraction, favors peripheral mass-forming cholangiocarcinoma. Unlike typical hemangioma, enhancement need not match blood pool; the source case becomes denser than liver and vessels on delayed imaging. HCC more characteristically shows washout.','Remove the absolute implication that retraction excludes HCC and unsupported tissue-mechanism wording.')

deleted={39:'Redundant four-pattern omnibus that conflates blood-pool behavior of vessels/vascular lesions with transient parenchymal arterioportal perfusion. The discrete hemangioma, FNH, HCC, shunt and cholangiocarcinoma notes retain the supported teaching.',
         44:'Overloaded FNH ultrasound/sulfur-colloid/HIDA card. Spoke-wheel flow, one-third sulfur-colloid yield and FNH HIDA visualization are not stated in the captured Core fact list or the article. Listing a card family in CORE_DERIVED_CARDS is not fact-level support.'}

# Preserve all valid existing identifiers; allocate short independent random IDs only for new notes.
idpath=R/'new_note_ids.json'
newids=json.loads(idpath.read_text()) if idpath.exists() else {}
existing=set(re.search(r'\b([A-Z2-7]{12})$',r['Clinical_Context']).group(1) for r in original)
def newid(key):
    if key not in newids:
        v=''.join(secrets.choice(string.ascii_uppercase+'234567') for _ in range(12))
        while v in existing or v in newids.values(): v=''.join(secrets.choice(string.ascii_uppercase+'234567') for _ in range(12))
        newids[key]=v
    return newids[key]

new_specs=[
 ('hemangioma_t2',40,'split','For a suspected hepatic hemangioma, what unenhanced MRI signal feature is supportive?','T2 hyperintensity supports hemangioma when the dynamic enhancement pattern also matches blood pool. T2 brightness alone is not specific.','modality appearance','Captured Core fact: hemangioma is typically T2 hyperintense.'),
 ('adenoma_hida',53,'split','What HIDA uptake behavior is typical of hepatic adenoma?','Hepatic adenoma generally lacks HIDA uptake in the captured Core evidence. The report also notes absence of bile ducts; tracer behavior should be interpreted with the lesion’s CT/MRI findings.','tracer behavior','Captured Core fact: adenoma generally lacks HIDA uptake.'),
 ('hcc_mosaic',47,'added','Does portal-phase near-isodensity exclude HCC in a large mosaic hypervascular liver mass?','No. The STATdx example shows mosaic arterial hypervascularity and portal-phase near-isodensity except for necrotic areas. Uniform visible washout is not demonstrated in every HCC example.','pitfall','STATdx images 20 and 21 and their captions.'),
 ('fontan_nodules',56,'added','After Fontan palliation, what benign explanation should remain in the differential for multiple FNH-like hypervascular liver nodules?','Large regenerative nodules (the multiacinar form of nodular regenerative hyperplasia). The article associates them with Fontan physiology and Budd-Chiari; correlate the nodules with the vascular background rather than assuming every hypervascular nodule is malignant.','pretest clue','Article: Nodular Regenerative Hyperplasia; congenital heart disease after Fontan procedure and FNH-like large regenerative nodules.')
]
add_after={}
new_ledger=[]
for key,parent,kind,q,a,gate,basis in new_specs:
    n={k:'' for k in fields}; n.update(Clinical_Context=newid(key),High_Yield_Q=q,High_Yield_A=a,summary=original[0]['summary'])
    add_after.setdefault(parent,[]).append(n)
    new_ledger.append({'id':n['Clinical_Context'],'kind':kind,'parentOriginalRow':parent,'question':q,'usefulnessGate':gate,'sourceBasis':basis})
idpath.write_text(json.dumps(newids,indent=2)+'\n',encoding='utf-8')

# Source basis remains Core + article; retain the complete repeated article summary.
summary=original[0]['summary'].replace('Core was used only for the retrieved liver-mass sections documented in the audit block;', 'Core support is limited to the facts recorded in the captured evidence report; outside clarifications are individually labeled in affected answers;')

output=[]; origins=[]
for n,row in enumerate(rows,1):
    if n in deleted: continue
    if row['Differentials']:
        row['Imaging_Differentiation']='<b>Mini-differential:</b><br>'+row['Differentials']+'<br><br>'+row['Imaging_Differentiation']
        row['Differentials']=''; row['Differential_Q']=''
        changes[n].append({'field':'Differentials → Imaging_Differentiation','reason':'Put the mini-differential at the top of the UNKNOWN back while disabling legacy Differential Drill triggers.'})
    # Source captions and their inline annotation media are immutable.
    for field in fields:
        if field in {'summary', 'Original_Caption', 'Image_Annotated'}: continue
        row[field]=row[field].replace('<=','≤')
    for field in ['Original_Caption', 'Image_Annotated']:
        assert row[field] == original[n-1][field]
    row['summary']=summary
    output.append(row); origins.append(n)
    for newrow in add_after.get(n,[]):
        newrow['summary']=summary; output.append(newrow); origins.append(None)

gate_map={36:'pretest clue',37:'pretest clue',38:'pretest clue',40:'contrast behavior',41:'modality appearance',42:'contrast behavior',43:'differential discriminator',45:'differential discriminator',46:'report-critical pivot',47:'contrast behavior',48:'modality appearance',49:'report-critical pivot',50:'pretest clue',51:'differential discriminator',52:'modality appearance',53:'tracer behavior',54:'management/reporting pivot',55:'modality appearance',56:'differential discriminator',57:'modality appearance',58:'differential discriminator',59:'modality appearance',60:'pitfall',61:'pitfall',62:'contrast behavior'}
source_map={36:'Core fact: fibrolamellar HCC in young noncirrhotic patients; article FL-HCC',37:'Article: Hepatic Adenoma',38:'Article: HHT and FNH enrichment',40:'Both article and Core: hemangioma enhancement',41:'Core fact: hemangioma ultrasound',42:'Both article and Core: FNH enhancement',43:'Core fact: typical FNH hepatobiliary retention; outside exception Sciarra 2019',45:'Article: Arterioportal Shunt',46:'Article: THAD and portal-flow obstruction',47:'Both article and Core: HCC enhancement',48:'Core HCC T2/diffusion fact and STATdx image 19',49:'Core fact: HCC tumor in vein',50:'Core hypervascular metastatic primaries and article endocrine/melanoma/RCC',51:'Article: Hepatic Metastases; STATdx images 22/23',52:'Article Adenoma and Core dynamic enhancement fact',53:'Core fact: adenoma sulfur-colloid photopenia',54:'Core >5 cm hemorrhage threshold; outside EASL management nuance',55:'Article HHT and STATdx 26/27',56:'Article NRH and STATdx 28-31',57:'Article FL-HCC and Core fibrotic-scar signal',58:'Article peripheral cholangiocarcinoma and Core delayed enhancement',59:'Article Hepatic Angiomyolipoma',60:'Article Angiosarcoma and STATdx 37',61:'Article SVC obstruction and STATdx 38/39',62:'Article Peliosis and STATdx 40/41'}
ledger=[]
for n,r in enumerate(original,1):
    ledger.append({'originalRow':n,'clinicalContext':r['Clinical_Context'],'disposition':'deleted' if n in deleted else ('revised' if changes[n] else 'retained'),
        'reason':deleted.get(n,'Audited against article, image captions and captured Core facts.'), 'changes':changes[n],
        'highYieldGate':gate_map.get(n,'removed: see reason' if n in deleted else None),'sourceBasis':source_map.get(n)})
result={'fields':fields,'rows':output,'originalRowByOutput':origins,'rowAudit':ledger,'newRows':new_ledger,
        'counts':{'originalNotes':62,'correctedNotes':len(output),'deletedNotes':len(deleted),'splitAdditionalNotes':2,'addedGapNotes':2,'originalCaptionArrowReferencesPreserved':122,'unknownNotes':26,'mechanismNotes':5,'boardsTrapNotes':4,'highYieldNotes':sum(bool(r['High_Yield_Q']) for r in output)},
        'summaryPolicy':'Repeated article summary retained with all clinical sections; only Source Basis wording updated to delimit captured Core support and acknowledge labeled outside clarification.',
        'outsideSources':[
            {'name':'Sciarra et al. Liver Int. 2019;39:158-167','url':'https://pubmed.ncbi.nlm.nih.gov/30218633/','doi':'10.1111/liv.13964','scope':'Transporter-based hepatobiliary uptake and uptake-positive adenoma exception','originalRows':[29,43]},
            {'name':'EASL Clinical Practice Guidelines on the management of benign liver tumours, 2016','url':'https://easl.eu/wp-content/uploads/2016/10/EASL-CPG-on-Management-of-benign-liver-tumours.pdf','scope':'Hemangioma endothelial-lined spaces and sex/size/growth-dependent adenoma management','originalRows':[30,54]},
            {'name':'Anki Manual: Text Files','url':'https://docs.ankiweb.net/importing/text-files.html','scope':'Import headers, HTML/TSV escaping and tags-column mapping'}]}
assert len(output)==64 and len({r['Clinical_Context'] for r in output})==64
assert sum(len(re.findall(r'<img[^>]+arrow_', r[f])) for r in output for f in ['Image_Annotated','Original_Caption'])==122
(R/'correction_data.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(result['counts'],indent=2))
