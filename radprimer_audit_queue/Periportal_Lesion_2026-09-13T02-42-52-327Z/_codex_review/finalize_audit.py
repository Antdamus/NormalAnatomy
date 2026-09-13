from pathlib import Path
import json, re, hashlib, html, collections
from datetime import datetime, timezone

B=Path(__file__).resolve().parents[1]
R=B/'_codex_review'
MASTER=B.parents[1]/'master_source_queue/Periportal_Lesion_2026-09-13T01-30-56-923Z'
M=json.loads((B/'metadata.json').read_text(encoding='utf-8-sig'))
S=json.loads((B/'corebook_snapshot.json').read_text(encoding='utf-8-sig'))
original=[r.split('\t') for r in (B/'generated_cards.tsv').read_text(encoding='utf-8-sig').splitlines()]
rows=[r.copy() for r in original]
FIELDS=['Clinical_Context','Image','Image_Annotated','Question','Most_Likely_Diagnosis','Entity_Label','Differential_Q','Differentials','Imaging_Differentiation','Original_Caption','Mechanism_Q','Mechanism','Boards_Trap_Q','Boards_Trap','High_Yield_Q','High_Yield_A','Radiopaedia_Link','Radiopaedia_Case_Context','Radiopaedia_Case_Summary','Radiopaedia_Case_Differential','summary','Tags']
reg={e['masterImageId']:e for e in M['imageRegistry']}
byfile={e['plainFilename']:e for e in reg.values()}
def write_json(p,v):p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def mids(r):return [byfile[n]['masterImageId'] for n in re.findall(r'<img\b[^>]*src="([^"]+)"',r[1])]
def question(r):return next(r[i] for i in [3,10,12,14] if r[i])

# Compare immutable captions to both original source metadata and original source text.
caption_checks=[]
for source in ['RadPrimer','STATdx']:
    sm=json.loads((MASTER/f'{source}_metadata.json').read_text(encoding='utf-8-sig'))
    st=(MASTER/f'{source}_source_package.txt').read_text(encoding='utf-8-sig')
    for e in sm['imageRegistry']:
        x=reg[e['masterImageId']]
        assert x['caption']==e['caption'],x['masterImageId']
        assert e['caption'] in st,x['masterImageId']
        assert e['caption'] in (B/'source_package.txt').read_text(encoding='utf-8-sig')
        caption_checks.append(dict(masterImageId=x['masterImageId'],rawCaptionSha256=hashlib.sha256(x['caption'].encode()).hexdigest(),sourceMetadataEqual=True,originalSourcePackageContainsExactCaption=True))

ddx={
1:'Ascending cholangitis; choledocholithiasis with obstruction; recurrent pyogenic cholangitis',
2:'Cavernous transformation; portosystemic collaterals; dilated bile ducts',
3:'Intrahepatic portosystemic shunt; cavernous transformation; dilated bile ducts',
4:'Recanalized paraumbilical vein; other portosystemic collaterals; dilated bile ducts',
5:'Lymphoma; metastases; periportal edema',
6:'Pneumobilia; portal venous gas; hepatic artery calcification',
7:'Choledocholithiasis; pneumobilia; adjacent vascular structures',
8:'Metastasis; lymphoma; cholangiocarcinoma',
9:'Peribiliary cysts; dilated bile ducts; Caroli disease',
10:'Schistosomal periportal fibrosis; periportal edema; biliary dilation',
11:'Recurrent pyogenic cholangitis; choledocholithiasis; vascular channels',
12:'Hepatic artery calcification; pneumobilia; ductal stones',
13:'Cystic duct remnant; peribiliary cysts; biliary dilation',
14:'Biliary dilation; periportal edema; thrombosed portal branches',
15:'Biliary dilation; periportal edema; thrombosed portal branches',
16:'Resuscitation-related edema; periportal hemorrhage; passive congestion',
17:'Resuscitation-related edema; periportal hemorrhage; passive congestion',
18:'Passive congestion; volume-overload edema; portal vein thrombosis',
19:'Acute hepatitis; hypervolemia; ascending cholangitis',
20:'Cholangitic hepatic abscesses; nonbiliary pyogenic abscesses',
21:'Ascending cholangitis with abscess; uncomplicated postoperative pneumobilia',
22:'PSC; AIDS cholangiopathy; chemotherapy-related cholangiopathy',
23:'Recurrent pyogenic cholangitis; choledocholithiasis; PSC',
24:'Complicated recurrent pyogenic cholangitis; uncomplicated pneumobilia; isolated choledocholithiasis',
25:'AIDS cholangiopathy; PSC; chemotherapy-related cholangiopathy',
26:'Chemotherapy-related cholangiopathy; PSC; ascending cholangitis',
27:'Ischemic biliary necrosis with bilomas; expected postoperative periportal edema; ascending cholangitis',
28:'Expected postoperative edema; biliary necrosis; vascular complication',
29:'Traumatic periportal hemorrhage; resuscitation-related edema',
30:'Peribiliary cysts; biliary dilation; Caroli disease',
31:'Thrombosed portal branches; biliary dilation; periportal edema',
32:'Perivascular steatosis; periportal edema; infiltrative disease',
33:'Portal vein tumor thrombus; bland portal vein thrombosis; biliary dilation',
34:'Hilar cholangiocarcinoma; dominant PSC stricture; inflammatory pseudotumor',
36:'Cholangiocarcinoma; inflammatory pseudotumor; lymphoid infiltration'}

for n,r in enumerate(rows[:36],1):
    images=[reg[k] for k in mids(r)]
    r[2]=''.join('<div class="stackItem"><b>'+e['displayLabel']+'</b><br><img src="'+e['annotatedFilename']+'"><div class="stackCap">'+e['caption']+'</div></div>' for e in images)
    r[9]=''.join('<div class="captionBlock"><b>'+e['displayLabel']+'</b><br><div class="originalCaption">'+e['caption']+'</div></div>' for e in images)
    if n in ddx:r[8]='<b>Mini-differential:</b> '+ddx[n]+'.<br>'+r[8]
    r[6]=r[7]=''

def edit(n,**changes):
    for k,v in changes.items():rows[n-1][FIELDS.index(k)]=v

edit(5,Question='How is the known lymphoma distributed in this liver?',Most_Likely_Diagnosis='Periportal involvement by predominantly hypovascular, markedly hypoechoic lymphoma masses')
edit(8,Question='In a patient with ovarian cancer, what explains the left periportal abnormality?')
edit(12,Question='In a patient with end-stage renal disease, what explains these branching echogenic structures?')
edit(13,Question='After cholecystectomy, what does this porta-hepatis cystic structure most likely represent?')
edit(14,Question='Which periportal fluid-containing structure is enlarged on this MR image?',Most_Likely_Diagnosis='Dilated intrahepatic bile ducts',Imaging_Differentiation=rows[13][8]+'<br>The source case has an obstructing ductal stone; that cause is not established by this displayed slice alone.')
edit(15,Question='Which periportal pattern is shown on this CT image?',Most_Likely_Diagnosis='Intrahepatic biliary ductal dilation',Imaging_Differentiation=rows[14][8]+'<br>The displayed hepatic slice establishes ductal dilation; the pancreatic primary is source-provided case information, not a visible finding on this slice.')
edit(16,Question='After aggressive IV fluid resuscitation for trauma, what explains this periportal pattern?')
edit(17,Question='After aggressive IV fluid resuscitation for trauma, what explains these periportal findings?')
edit(18,Question='In this patient with congestive heart failure, what hepatic process is shown?')
edit(19,Question='Which hepatic inflammatory pattern is suggested by these combined CT findings?',Most_Likely_Diagnosis='Periportal and gallbladder-wall edema, compatible with acute hepatitis (viral hepatitis in the source case)')
edit(20,Question='What biliary infectious complication is illustrated by these CT and transhepatic cholangiographic examples?',Imaging_Differentiation=rows[19][8]+'<br>The CT and cholangiogram are preserved as companion examples of this complication; the source does not establish a shared patient or an interval between them.')
edit(21,Question='After Whipple resection, what complication is suggested by these CT findings?')
edit(22,Question='In a patient with ulcerative colitis, what cholangiopathy is shown by the MR images?',Imaging_Differentiation=rows[21][8]+'<br>The MRCP and T1 images are explicitly from the same patient. The ERCP is a companion example without a documented patient link or interval; its distal stricture alone does not distinguish PSC from AIDS cholangiopathy.')
edit(24,Question='In a patient with recurrent bouts of cholangitis and sepsis, what complication pattern is shown?')
edit(25,Question='In a patient with AIDS and right upper quadrant pain, what biliary disorder is suggested?')
edit(26,Question='After hepatic intraarterial chemotherapy, what treatment complication is shown?',Imaging_Differentiation=rows[25][8]+'<br>These treatment-related examples are kept together; a shared patient or treatment interval is not documented.')
edit(27,Question='In a liver transplant recipient, what biliary complication does this CT suggest?',Most_Likely_Diagnosis='Biliary necrosis with intrahepatic bilomas; evaluate for hepatic-artery compromise')
edit(28,Question='In a recent liver transplant recipient, how should this isolated periportal finding be interpreted?')
edit(30,Question='In advanced cirrhosis, what do these CT and MR periportal fluid structures most likely represent?')
edit(31,Question='After autologous bone marrow transplantation, what vascular abnormality is mimicking dilated bile ducts?')
edit(34,Question='What level of biliary obstruction is shown?',Most_Likely_Diagnosis='Obstruction near the confluence of the right and left hepatic ducts (hilar cholangiocarcinoma in the source case)')
edit(36,Question='How should this infiltrative periportal pattern be interpreted?',Most_Likely_Diagnosis='Periportal infiltrative tissue mimicking cholangiocarcinoma (inflammatory pseudotumor on surgical pathology)',Imaging_Differentiation=rows[35][8]+'<br>The resection diagnosis is source-confirmed; this CT does not establish inflammatory histology or prove IgG4-related disease.')

# Focus text notes on new causal/interpretive objectives; avoid extra quizzes on the same image answer.
edit(37,Mechanism='Loose areolar tissue and lymphatic channels surround the portal triad. Increased hepatic extracellular-fluid/lymph production or impaired lymphatic clearance distends this interstitium, creating a circumferential low-attenuation or fluid-signal collar.<br>By comparison, a dilated bile duct usually runs along one side of its accompanying portal vein. The two findings can coexist. Other periportal tracking material can be bile or blood, depending on the process.<br><small>Source: STATdx periportal lucency/edema text.</small>')
edit(38,Mechanism=rows[37][11]+'<br>Periportal blood is generally confined to the injured lobe and accompanies a laceration or hematoma; fluid resuscitation can produce diffuse edema without that focal injury pattern.<br><small>Source: STATdx hepatic trauma and periportal edema text.</small>')
edit(39,Mechanism=rows[38][11]+'<br><small>Source: STATdx posttransplant liver; Core GI 121 corroborates the expected postoperative appearance.</small>')
edit(41,Mechanism=rows[40][11]+'<br><small>Source: RadPrimer hepatic schistosomiasis text.</small>')
edit(42,Mechanism=rows[41][11]+'<br><small>Source: STATdx peribiliary-gland origin; RadPrimer noncommunication with the biliary tree.</small>')
edit(47,Boards_Trap=rows[46][13]+'<br><small>Source: Core GI 125 and 142; the spiky waveform belongs to portal venous gas.</small>')
edit(51,High_Yield_Q='Which contrast CT/MR duct-wall findings support ascending cholangitis?',High_Yield_A='Thickened, hyperenhancing bile-duct walls with periductal edema/inflammation support cholangitis, especially with intraluminal debris or an obstructing stone.<br>Interpretation pivot: duct-centered inflammatory findings support infection; duct dilation alone does not. Imaging can be normal, so absence of these findings does not exclude clinically suspected cholangitis.<br><small>Source: Core GI 143 and the STATdx ascending cholangitis text.</small>')
edit(52,High_Yield_A=rows[51][15]+'<br>Imaging may also be normal; this pattern does not identify the viral cause.<br><small>Source: Core GI 116; RadPrimer acute viral hepatitis.</small>')
edit(54,High_Yield_A=rows[53][15]+'<br><small>Source: RadPrimer focal fatty sparing.</small>')
edit(62,High_Yield_A=rows[61][15]+'<br><small>Source: RadPrimer iatrogenic material.</small>')

keep_text={37,38,39,41,42,47,51,52,54,62}
keep=[n for n in range(1,70) if (n<=36 and n!=35) or n in keep_text]
final=[rows[n-1] for n in keep]

owned_skips={
35:(['1773604534753'],'STATdx image 33 is the identical MR slice already owned as HepaticMetastasesandLymphoma25.jpg: visually matched vessel branching, periportal mass, spine and liver margins, despite 1000 versus 900 pixel raster sizes. No atomic companion is lost.'),
40:(['1788912163477','1788912163444'],'The retained allograft biloma/necrosis objective already triggers hepatic-arterial assessment. Keep the distinct CT case, but do not add another text card for the same pivot.'),
44:(['1774482104541','1774265241596'],'The retained portal-occlusion/biliary-dilation cards already teach the vascular-versus-duct mimic and Doppler/anatomic check. Reversing the direction is not a new objective; the distinct two-slice CT case remains.'),
53:(['1788991063068'],'The retained hepatitis card already teaches nonspecific periportal and gallbladder edema on cross-sectional imaging. New ultrasound starry-sky detail is retained separately.'),
56:(['1773977424082','1773977424083','1773977424098','1773745498079'],'Owned CBD-stone recognition and Doppler cards plus the small-stone shadowing caveat cover this objective. Preserve the distinct source image; remove the redundant text row, including its malformed literal less-than HTML.'),
65:(['1774488691690'],'The retained image note already identifies direct portal-to-hepatic-vein shunting. Preserve the distinct RadPrimer ultrasound example; a matching text recognition question adds no different objective.')}
consolidations={
43:([37],'Circumferential edema versus a one-sided duct is already explained in the retained edema mechanism.'),
45:([39],'Expected postoperative lymphatic edema is retained once with its mechanism and interpretation.'),
46:([42],'Noncommunicating portal-parallel cysts are retained once with their glandular origin.'),
48:([38],'Resuscitation edema versus focal injury-related blood is integrated into the volume-expansion mechanism.'),
49:([36],'The malignant mimic and pathology limitation are taught on the image back; no separate paraphrased trap.'),
50:([1],'The same thick-walled, debris-containing duct recognition objective is retained with the actual ultrasound.'),
55:([47],'Central versus peripheral gas and the portal-venous spiky waveform remain one structured comparison.'),
57:([9,42],'Actual US recognition and the single gland-origin/noncommunication mechanism cover the proposed text objective.'),
58:([30,42],'Actual CT/MR recognition and the single gland-origin/noncommunication mechanism cover this repeat.'),
59:([10,41],'US fibrotic mantle recognition and its egg-related mechanism remain; additional descriptive synonyms do not require another card.'),
60:([11],'The intact grayscale/Doppler case already tests stones/sludge in avascular dilated intrahepatic ducts.'),
61:([23,24],'The intact MR stone case and CT complication case already test these patterns.'),
63:([12],'Fixed branching arterial calcification is retained on the source ultrasound with renal-disease context.'),
64:([13],'The cystic-duct remnant recognition objective is retained with the actual postoperative ultrasound.'),
66:([38],'The edema collar plus distended IVC is incorporated into the retained resuscitation mechanism.'),
67:([26],'The preserved treatment-related CT group already teaches the arterial-chemotherapy pretest clue and PSC mimic.'),
68:([39],'Expected postoperative edema and the graft-injury pitfall are retained once with the lymphatic mechanism.'),
69:([37],'The duct/portal-vein relationship is already taught in the retained edema mechanism.')}
assert set(range(1,70))-set(keep)==set(owned_skips)|set(consolidations)

related={2:['1774482104551'],3:['1774488691690'],4:['1774312720968','1774312720969'],5:['1773604534753','1773604534805'],7:['1773977424082','1773977424083'],10:['1789039972732'],14:['1774265241590'],15:['1774265241590'],18:['1788991063046','1788991063069'],19:['1788991063068'],22:['1779987161466','1779987161467','1779987161493'],23:['1773977424092'],25:['1779987161493'],26:['1779987161488'],27:['1788912163444','1788912163477'],30:['1788912163450'],31:['1774482104541'],32:['1788991063044','1788991063067'],33:['1772927802563','1772927802567'],34:['1779987161465']}
text_objectives={
37:('Explain lymphatic/interstitial expansion producing a circumferential periportal collar and distinguish its geometry from a duct.','Adds the periportal interstitial mechanism. Existing duct/Doppler cards do not explain extravascular lymphatic edema.', ['1774265241596']),
38:('Explain resuscitation-related lymph overload and interpret diffuse edema with IVC distention against focal traumatic blood.','Adds the volume-expansion causal pathway and structured trauma differential; image cases alone do not teach lymph production exceeding drainage.',[]),
39:('Explain expected early posttransplant edema through disrupted lymphatic drainage while connections reform.','Adds the lymphatic postoperative mechanism; retained biloma/arterial-complication cards concern a different process. Repeated postoperative trap and high-yield rows were consolidated.', ['1788912163477']),
41:('Explain embolized schistosomal eggs causing periportal fibrosis and echogenic portal-tract mantling on ultrasound.','Adds a source-supported histopathologic-to-ultrasound mechanism beyond the owned CT fissural-widening objective.', ['1789039972744']),
42:('Explain dilated peribiliary glands as the origin of noncommunicating portal-parallel cysts.','Adds glandular origin/architecture; renal sinus noncommunication is a different organ and mechanism. Redundant US/CT/MR text pattern cards were consolidated.', ['1775090998916','1775090998918']),
47:('Differentiate central pneumobilia from peripheral portal venous gas and identify the portal-venous spiky waveform.','Adds a structured cross-modality discriminator and source-verified portal Doppler feature; gallbladder gas/instrumentation pitfalls do not cover this liver vascular distribution.', ['1773370637388']),
51:('Recognize contrast enhancement and thickening of bile-duct walls as supportive, nonexclusive evidence of ascending cholangitis.','Adds infection-centered contrast CT/MR wall assessment. Owned PSC wall activity concerns chronic sclerosing disease; current abscess images teach complications rather than this contrast-wall interpretation.', ['1779987161488']),
52:('Recognize nonspecific starry-sky portal-triad echogenicity with gallbladder edema on ultrasound in acute hepatitis.','The retained hepatitis card explicitly lacks starry-sky ultrasound; this is a newly auditable, modality-specific appearance, not a paraphrase of its CT/MR edema answer.', ['1788991063068']),
54:('Distinguish focal fatty sparing as a hypoechoic area within echogenic fatty liver with preserved vessel course on ultrasound.','Adds the ultrasound appearance of sparing relative to its fatty background. Owned CT/MR fat-distribution and chemical-shift cards do not teach this reversed sonographic contrast.', ['1788991063067','1777778693817']),
62:('Recognize smooth highly reflective periportal hardware on ultrasound using procedure history.','Adds a source-supported ultrasound mimic of gas, stone and vascular calcium; the staged CT chemotherapy clips do not supply the same modality recognition objective.',[])}
active={e['entryId'] for e in S['entries']}
decisions=[]
for n,r in zip(keep,final):
    if n<=36:
        matches=related.get(n,[])
        assert set(matches)<=active,(n,matches)
        images=mids(r)
        decisions.append(dict(clinicalContext=r[0],originalRow=n,disposition='distinctImage',learningObjective='Recognize '+html.unescape(re.sub('<[^>]+>',' ',r[4]))+' using '+', '.join(reg[k]['displayLabel'] for k in images)+'.',rationale='Preserve this visually reviewed source image or atomic group as recognition reinforcement. Exact-file/decoded-pixel checks and perceptual retrieval against current Anki media found no established identical image for this group. Related diagnoses or text objectives do not prove image identity. Original grouping/order and source captions are preserved; uncertain patient links are qualified.',matchedEntryIds=matches,masterImageIds=images,mediaEvidence='_codex_review/media_audit.json'))
    else:
        objective,why,matches=text_objectives[n]
        assert set(matches)<=active,(n,matches)
        decisions.append(dict(clinicalContext=r[0],originalRow=n,disposition='newConcept',learningObjective=objective,rationale=why,matchedEntryIds=matches))
review=dict(snapshotId=S['snapshotId'],scopeReviewed='Corebook::GI::Liver',semanticReviewComplete=True,fullOrganReviewComplete=True,crossCategoryReviewComplete=True,
    reviewCoverage=dict(currentCards=S['cardCount'],completeLiverEntries=526,globalCandidateEntries=106,additionalBiliaryOrCrossTopicEntries=135,distinctEntriesRead=767,allCorebookSearched=True,removedHistoryEntries=len(S['removedEntries']),removedHistoryInterpretation='No recorded removals in this snapshot; no inference about deletions before the history baseline.',reviewFiles=['_codex_review/organ_review.json','_codex_review/global_review.json','_codex_review/extra_biliary_review.json']),decisions=decisions,
    skippedQuestions=[dict(originalRow=n,clinicalContext=original[n-1][0],question=question(original[n-1]),disposition='coveredByExisting',matchedEntryIds=ids,rationale=why) for n,(ids,why) in owned_skips.items()],
    intraBatchConsolidations=[dict(originalRow=n,clinicalContext=original[n-1][0],question=question(original[n-1]),retainedOriginalRows=targets,rationale=why) for n,(targets,why) in consolidations.items()],existingNoteUpdateProposals=[],ankiModified=False)
write_json(B/'card_overlap_review.json',review)
body='\n'.join('\t'.join(r) for r in final)+'\n'
(B/'corrected_cards.tsv').write_text(body,encoding='utf-8',newline='\n')
headers='\n'.join(['#separator:tab','#html:true','#notetype:'+M['anki']['noteType'],'#deck:'+M['anki']['deckName']])+'\n'
(B/'corrected_cards_anki_import.tsv').write_text(headers+body,encoding='utf-8',newline='\n')

changes=[]
for n in keep:
    changes.append(dict(originalRow=n,clinicalContext=rows[n-1][0],changedFields=[FIELDS[j] for j in range(22) if original[n-1][j]!=rows[n-1][j]],masterImageIds=mids(rows[n-1]) if n<=36 else []))
write_json(R/'field_change_log.json',changes)
write_json(R/'caption_source_comparison.json',caption_checks)
write_json(R/'image_selection_review.json',dict(selectedPrimaryImageIds=[k for r in final for k in mids(r)] ,archiveOptionalImageIds=['SDX-33'],archiveReason=owned_skips[35][1],matchedEntryId='1773604534753',sameSourceImageDespiteRasterResize=True,byteIdentical=False,visualEvidence='live_comparison_1.jpg',atomicGroupsSplit=0))

# Independent output invariants, raw caption checks, exact file checks and unchanged-field checks.
checks=[]
for n,r in zip(keep,final):
    assert len(r)==22
    assert r[0]==original[n-1][0]
    assert re.fullmatch(r'[A-Z0-9]{12}',r[0].split()[-1])
    assert not re.fullmatch(r'(?:Q|CASE)\d+',r[0].split()[-1])
    assert r[1]==original[n-1][1]
    assert r[20]==original[n-1][20]
    assert not r[6] and not r[7]
    assert sum(bool(r[j]) for j in [3,10,12,14])==1
    assert sum(bool(r[j]) for j in [4,11,13,15])==1
    for j,f in enumerate(r):
        assert '\t' not in f and '\n' not in f and '\r' not in f
        visible=html.unescape(re.sub(r'<[^>]+>',' ',f))
        assert not re.search(r'Image references?:|Source image links?:|https?://|(?:RP-|SDX-)\d+.*\.jpg',visible,re.I),(n,FIELDS[j])
        for name in re.findall(r'<img\b[^>]*src="([^"]+)"',f):assert (B/'media'/name).is_file(),name
    if n<=36:
        images=[reg[k] for k in mids(r)]
        extracted=re.findall(r'<div class="stackCap">(.*?)</div>',r[2])
        cap_extracted=re.findall(r'<div class="originalCaption">(.*?)</div>',r[9])
        assert extracted==cap_extracted==[e['caption'] for e in images]
        annotated=[name for name in re.findall(r'<img\b[^>]*src="([^"]+)"',r[2]) if not name.startswith('arrow_')]
        assert annotated==[e['annotatedFilename'] for e in images]
        for e in images:assert set(e['clusterImageIds'])<=set(mids(r)),e['masterImageId']
        checks.append(dict(originalRow=n,masterImageIds=mids(r),rawOriginalCaptionEqual=True,rawStackCapEqual=True,plainImageFieldUnchanged=True,annotatedOrderMatches=True))
assert len({r[0].split()[-1] for r in final})==len(final)
assert len(final)==45 and len(checks)==35
assert len([k for r in final for k in mids(r)])==47
media=json.loads((R/'media_audit.json').read_text(encoding='utf-8'))
assert not media['missingCaptionIcons']
for a in media['assets']:assert sha(B/'media'/a['filename'])==a['sha256']
validation=dict(status='passed',validatedAt=datetime.now(timezone.utc).isoformat(),finalNotes=45,imageNotes=35,textNotes=10,selectedDistinctSourceImages=47,diagnosticAssetsVerified=96,auxiliaryCaptionIconsVerified=9,referencedDiagnosticAssets=94,missingReferencedMedia=[],captionChecks=checks,all48SourceCaptionsCompared=True,unchangedSummary=True,allFinalClinicalContextIdsUnchanged=True,atomicGroupsSplit=0,columns=22,standaloneDifferentialDrills=0,outputSha256={f:sha(B/f) for f in ['corrected_cards.tsv','corrected_cards_anki_import.tsv','card_overlap_review.json']},corebookGate='Run corebook_card_guard.py validate before completion marker.')
write_json(R/'source_media_validation.json',validation)
print(json.dumps({k:validation[k] for k in ['status','finalNotes','imageNotes','textNotes','selectedDistinctSourceImages','diagnosticAssetsVerified','auxiliaryCaptionIconsVerified']},indent=2))
