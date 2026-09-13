import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {Workbook} from '@oai/artifact-tool';

const review=path.dirname(fileURLToPath(import.meta.url)), B=path.dirname(review);
const read=n=>fs.readFile(path.join(B,n),'utf8');
const json=async n=>JSON.parse(await read(n));
const writeJson=(n,v)=>fs.writeFile(path.join(B,n),JSON.stringify(v,null,2)+'\n','utf8');
// A later, read-only Anki comparison trims the already audited 57-note version.
// Keep this as a mode of the original builder so the original source audit is reproducible.
if(process.argv.includes('--preview-corebook')) {
 const current=(await read('corrected_cards.tsv')).trimEnd().split(/\r?\n/).map(r=>r.split('\t'));
 const wb=Workbook.create(), ws=wb.worksheets.add('Question review');
 const plain=s=>s.replace(/<br\s*\/?\s*>/gi,' ').replace(/<[^>]+>/g,'');
 const sample=[20,22,23,24,53,55].map(n=>{
  const r=current[n-1], q=[3,10,12,14].find(i=>r[i]);
  return [String(n),plain(r[q]),plain(r[q+1])];
 });
 ws.getRange('A1:C7').values=[['Prior row','Question','Answer'],...sample];
 ws.getRange('A1:C7').format.wrapText=true;
 ws.getRange('A1:A7').format.columnWidthPx=70;
 ws.getRange('B1:B7').format.columnWidthPx=390;
 ws.getRange('C1:C7').format.columnWidthPx=600;
 ws.getRange('A2:C7').format.rowHeightPx=125;
 const preview=await wb.render({sheetName:'Question review',range:'A1:C7',scale:1,format:'png'});
 await fs.writeFile(path.join(review,'before_dedup_question_preview.png'),new Uint8Array(await preview.arrayBuffer()));
 console.log('Read-only question preview saved.');
 process.exit(0);
}
if(process.argv.includes('--deduplicate-corebook')) {
 const archiveName='before_corebook_dedup_2026-09-12', archive=path.join(review,archiveName);
 await fs.mkdir(archive,{recursive:true});
 for(const name of ['corrected_cards.tsv','corrected_cards_anki_import.tsv','audit_report.md','_codex_audit_done.txt']) {
  try { await fs.copyFile(path.join(B,name),path.join(archive,name),fs.constants.COPYFILE_EXCL); }
  catch(e) { if(e.code!=='EEXIST')throw e; }
 }
 const prior=await fs.readFile(path.join(archive,'corrected_cards.tsv'),'utf8');
 assert.equal(crypto.createHash('sha256').update(prior).digest('hex'),'8b947a8b143b13c286522c974146781c567c48d59a87026d0e06c125b46a8cc9');
 const rows=prior.split(/\r?\n/).filter(Boolean).map(r=>r.split('\t'));
 assert.equal(rows.length,57);assert(rows.every(r=>r.length===22));
 const bank=await json('corebook_snapshot.json'), m=await json('metadata.json');
 const entries=new Map(bank.entries.map(e=>[e.entryId,e]));
 assert.equal(bank.entries.length,3144);
 assert(!bank.entries.some(e=>rows.some(r=>e.clinicalContext===r[0])),'Bundle IDs already owned; reassess import strategy.');
 const plain=s=>s.replace(/<br\s*\/?\s*>/gi,' ').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
 const question=r=>plain(r[[3,10,12,14].find(i=>r[i])]);
 const owned=new Map([
  [18,[['1774483006823','1774483006824'],'The retained ultrasound HCC mechanisms already explain portal-to-arterial neovascularity, nodule progression and the high-grade dysplastic overlap.']],
  [19,[['1777601408312','1788581475672','1788581475656'],'Reduced sulfur-colloid uptake, nonabsolute photopenia and the Kupffer-cell basis are already covered across retained adenoma/FNH notes; another tracer prompt adds repeated retrieval.']],
  [20,[['1775211606441','1786846399514'],'The same transferable clot-versus-solid-tissue pitfall is already tested: intracystic complexity does not establish tumor; look for true enhancement or internal vascularity. Liver examples remain as images.']],
  [21,[['1777601408292','1788581475679','1777601408272'],'Chemical-shift loss as the lipid test and hemorrhagic adenoma foci are already represented. The corrected blood/fat caveat remains in the article summary and image explanations.']],
  [23,[['1777601408299','1788581475666','1777601408294'],'Young noncirrhotic female substrate, hemorrhagic hypervascular adenoma and rupture risk already shift the retained adenoma differential.']],
  [24,[['1788581475667','1772927802589'],'The HCC-risk substrate and requirement for the full multiphasic pattern are already asked in retained liver cards.']],
  [26,[['1788912163462','1788912163467'],'The retained cystic-liver deck explicitly asks how ADPKD changes interpretation and how renal/family findings classify a diffusely cystic liver.']],
  [35,[['1788581475678','1777601408305'],'Same adenoma arterial enhancement, later iso/hypoenhancement, hemorrhagic/fat heterogeneity and late pseudocapsule objective.']],
  [36,[['1777601408311'],'The existing adenoma US question already states variable echogenicity and the lack of a specific sonographic diagnostic pattern.']],
  [37,[['1788919341923','1777601408316'],'FNH versus adenoma HIDA uptake is already tested. The prior audit physiology clarification is preserved in the full summary; this is not a new independent tracer question.']],
  [38,[['1788919341924','1777601408314'],'Retained notes already test adenoma size/growth reporting and qualified management using size, sex and subtype.']],
  [39,[['1774483006838','1772927802589'],'The same HCC arterial-enhancement/washout/capsule pattern is already explicitly retrieved.']],
  [40,[['1772927802597','1772927802599','1773372068903'],'HCC T2 signal, diffusion restriction and dynamic enhancement are already covered in retained MRI and cirrhosis questions.']],
  [43,[['1788581475677','1788991063082'],'Same report-critical tumor-in-vein question, including enhancement/Doppler assessment and staging implications.']],
  [44,[['1775211606441','1786846399514','1788912163464'],'Repeats the nonenhancing-clot discriminator already owned and the same objective as omitted prior row 20. The retained simple hepatic cyst question supplies the baseline CT appearance.']],
  [45,[['1786846399511','1786846399514'],'The existing hemorrhagic-cyst mechanism and trap already teach echogenic blood, organizing fibrin and avascular clot versus a solid nodule. Distinct hepatic US recognition images are preserved.']],
  [46,[['1788912163437','1775211606455'],'An existing liver image question explicitly asks about lower T2 signal from hemorrhage in hepatic cysts; the general stage-dependent blood versus simple-fluid MR rule is also already tested.']],
  [47,[['1788912163467','1788912163437','1775211606455'],'Combines the already-owned polycystic liver distribution with already-owned hemorrhagic-cyst signal behavior; the actual mixed-signal hepatic image remains selected.']],
  [50,[['1788581475682','1773604534795'],'Portal-phase detection of most metastases versus arterial imaging for hypervascular primaries is already tested.']],
  [51,[['1788581475683','1773604534791'],'Same metastatic T1/T2 pattern and T1-bright blood/melanin exception.']],
  [52,[['1788581475684'],'Same variable metastatic ultrasound appearance with a hypoechoic target rim.']],
  [56,[['1777601408299','1788581475666','1788581475667','1772927802589'],'The comparison recombines retained adenoma/HCC pretest and enhancement discriminators; it also repeats prior rows 23 and 24. The hemorrhagic image cases still exercise the comparison.']],
  [57,[['1780459346789','1773604534758'],'Sentinel clot localizing the bleeding source is already tested in splenic trauma and explicitly taught in an owned hemorrhagic hepatic metastasis case.']]
 ]);
 const internal=new Map([
  [25,[22,'The coagulopathic fracture-versus-trauma discriminator is retained once in the focused trap. The preserved liver-trauma image groups continue to teach linear defects.']],
  [48,[22,'Hematocrit sign, multisite bleeding and the coagulopathy interpretation are already in the retained trap; do not add a second reverse appearance prompt.']],
  [53,[55,'The retained pregnancy/laboratory question already includes the same hematoma, active-extravasation and wedge-infarct CT findings.']]
 ]);
 const extra=new Map([
  [22,['Recognize coagulopathic fracture-like liver defects using trauma history, hematocrit layering and multisite bleeding.','No retained Corebook question tests this hepatic coagulopathy mimic. The two overlapping prompts inside this bundle are omitted.',[]]],
  [27,['Avoid excluding hepatic bleeding solely because attenuation is below 60 HU.','Existing hemoperitoneum cards mention high attenuation, but do not test the source-specific erroneous >60-HU exclusion rule. Retain the counterexample as a focused pitfall.',['1780459346789','1772318680197']]],
  [28,['Choose arterial and portal-venous CT for stable hepatic trauma and assess bleeding extent.','Retains the liver-trauma acquisition decision. Splenic phase teaching includes organ-specific enhancement behavior and does not substitute for the hepatic protocol and reporting task.',['1780459346788']]],
  [29,['Assign hepatic vascular-injury grade from contained versus intraperitoneal active extravasation.','Liver grade III/IV differs from the owned splenic IV/V vascular criteria. Organ-specific grading must not be transferred from spleen.',['1780459346791']]],
  [30,['Grade subcapsular hepatic hematoma by surface extent and rupture.','This is one hepatic grading dimension. Although low-grade thresholds overlap the splenic framework, separate organ grading cannot be assumed and the retained liver prompt stays atomic.',['1780459346791']]],
  [31,['Grade hepatic laceration by depth and the grade-II length qualifier.','The hepatic length qualifier and grading context differ from the owned splenic grading framework; this is distinct from hematoma size or bleeding compartment.',['1780459346791']]],
  [32,['Grade intraparenchymal hepatic hematoma using the liver size/rupture criteria.','Hepatic 10-cm grading threshold differs from the owned splenic 5-cm threshold. Retain the explicitly labeled AAST completion.',['1780459346791']]],
  [33,['Distinguish severe hepatic lobar disruption and central hepatic venous injury grades.','Lobar-disruption percentages and retrohepatic IVC/central-vein injury are liver-specific; they are not covered by splenic devascularization grades.',['1780459346791']]],
  [34,['Combine multiple hepatic injuries using the highest grade and limited one-grade advancement rule.','No retained question asks the hepatic multiple-injury combination rule. It is a separate reporting pitfall from measuring an individual injury.',[]]],
  [41,['Recognize peripheral high Doppler flow in HCC and its arteriovenous-shunting basis.','Owned HCC ultrasound notes cover echogenicity and tumor-in-vein. This retained modality question contributes peripheral intratumoral Doppler flow and its shunting basis; it does not repeat another CT/MRI hallmark prompt.',['1774483006827','1774483006828']]],
  [42,['Interpret an HCC sulfur-colloid cold defect as nonspecific in the clinical substrate.','The owned nuclear questions focus on adenoma/FNH. This HCC tracer question adds the malignant cold-defect interpretation and its nonspecificity without treating uptake as diagnostic.',['1777601408312','1788919341922']]],
  [49,['Use specific cancer history to retain hemorrhagic metastasis in the bleeding-liver-mass differential.','Owned questions identify hypervascular primaries and phase selection; this one asks the hemorrhagic complication and avoids falsely restricting a bleeding mass to adenoma/HCC.',['1788919341919','1773604534795']]],
  [54,['Recognize how angiography localizes active HELLP-associated hepatic bleeding for possible embolization.','Retains a distinct procedure/management objective and the case-specific coil outcome. It is separate from diagnosing HELLP using pregnancy and laboratory findings.',[]]],
  [55,['Integrate obstetric/laboratory context with hepatic hemorrhage and infarction to recognize HELLP.','No retained bank question tests this HELLP interpretation pivot. One overlapping CT appearance prompt is omitted inside this bundle.',[]]]
 ]);
 const keep=rows.map((r,i)=>i+1).filter(n=>!owned.has(n)&&!internal.has(n));
 assert.equal(keep.length,31);assert.equal(owned.size,23);assert.equal(internal.size,3);
 const decisionRows=keep.map(n=>{
  const r=rows[n-1];
  if(n<=17)return {clinicalContext:r[0],disposition:'distinctImage',learningObjective:plain(r[4])+' — source image recognition',rationale:'Preserve this complete source image group as recognition reinforcement. No exact file or decoded-pixel match was found among 1,305 readable existing Corebook media files; captions alone were not used to label images duplicates.',matchedEntryIds:[],priorCorrectedRow:n};
  const [learningObjective,rationale,matchedEntryIds]=extra.get(n);
  return {clinicalContext:r[0],disposition:'newConcept',learningObjective,rationale,matchedEntryIds,priorCorrectedRow:n};
 });
 const skipped=[...owned].map(([n,[matchedEntryIds,rationale]])=>({clinicalContext:rows[n-1][0],question:question(rows[n-1]),disposition:'coveredByExisting',matchedEntryIds,rationale,priorCorrectedRow:n}));
 const within=[...internal].map(([n,[target,rationale]])=>({clinicalContext:rows[n-1][0],question:question(rows[n-1]),disposition:'coveredWithinBundle',coveredByClinicalContext:rows[target-1][0],rationale,priorCorrectedRow:n}));
 for(const d of [...decisionRows,...skipped])for(const id of d.matchedEntryIds)assert(entries.has(id));
 const wb=Workbook.create(), ws=wb.worksheets.add('Cards');
 const selected=keep.map(n=>rows[n-1]);
 ws.getRange(`A1:V${selected.length}`).values=selected;wb.recalculate();
 const output=ws.getRange(`A1:V${selected.length}`).values.map(r=>r.map(v=>v??''));
 assert.deepEqual(output,selected,'Literal values/HTML must survive the artifact-tool roundtrip.');
 const inspection=await wb.inspect({kind:'table',range:'Cards!O19:P22',include:'values',tableMaxRows:4,tableMaxCols:2,maxChars:2500});
 await fs.writeFile(path.join(review,'dedup_artifact_inspection.ndjson'),inspection.ndjson,'utf8');
 // Remove only the superseded completion marker, after its exact backup exists.
 await fs.rm(path.join(B,'_codex_audit_done.txt'),{force:true});
 const tsv=output.map(r=>r.join('\t')).join('\n')+'\n';
 await fs.writeFile(path.join(B,'corrected_cards.tsv'),tsv,'utf8');
 await fs.writeFile(path.join(B,'corrected_cards_anki_import.tsv'),['#separator:tab','#html:true','#notetype:'+m.anki.noteType,'#deck:'+m.anki.deckName,''].join('\n')+tsv,'utf8');
 const reviewRecord={snapshotId:bank.snapshotId,scopeReviewed:'Corebook::GI::Liver',semanticReviewComplete:true,fullOrganReviewComplete:true,crossCategoryReviewComplete:true,decisions:decisionRows,skippedQuestions:skipped,withinBundleOmissions:within,reviewMethod:'Read all related GI liver entries, additional US liver content, and cross-category lexical/targeted candidates. Semantic judgments use learning objective and answer, not exact wording or card type. Anki is evidence of ownership, not medical source authority.',relatedOrganEntryIds:bank.entries.filter(e=>e.deck.startsWith('Corebook::GI::Liver::')).map(e=>e.entryId),removedHistoryLimit:'First live baseline: no earlier deletions inferred.',imageEvidence:'_codex_review/live_image_overlap.json',priorCorrectedSha256:crypto.createHash('sha256').update(prior).digest('hex'),priorCorrectedNotes:57,finalNotes:31,retainedImageGroups:17,retainedConceptualNotes:14,changedRetainedFields:[],ankiModified:false};
 await writeJson('card_overlap_review.json',reviewRecord);
 const sourceAudit=await json('_codex_review/row_audit.json');
 await writeJson('_codex_review/dedup_row_audit.json',rows.map((r,i)=>{
  const n=i+1, newRow=keep.indexOf(n)+1, old=sourceAudit.find(e=>e.outputRow===n);
  return {priorCorrectedRow:n,clinicalContext:r[0],question:question(r),action:newRow?'retainedUnchanged':'omitted',finalRow:newRow||null,changedFields:[],sourceBasis:old?.sourceBasis||'Prior completed source/image audit',usefulnessCategory:old?.usefulnessCategory||'image recognition',overlapDecision:[...decisionRows,...skipped,...within].find(e=>e.clinicalContext===r[0])};
 }));
 const esc=s=>String(s).replaceAll('|','\\|').replaceAll('\n',' ');
 const report=[
  '# Card audit: Focal Liver Lesion With Hemorrhage',
  '',
  '## Current result',
  '',
  '**57 previously audited notes → 31 final notes.** Removed 26 text questions: 23 repeat concepts represented in current Anki cards and 3 repeat another retained question within this bundle. Kept 17 UNKNOWN image groups and 14 conceptual notes (1 Boards Trap and 13 High-Yield). No notes were added in this pass.',
  '',
  'All 22 fields of every retained note are unchanged, including Clinical_Context, question/answer, image HTML, raw captions, source qualifications and the full repeated article summary. The five retained grading IDs created during the previous source audit remain unchanged. Original staged inputs are preserved. No live Anki cards, notes, templates or review state were changed.',
  '',
  '## Authoritative comparison',
  '',
  `Read ${bank.cardCount} current Corebook cards from Anki; snapshot ${bank.snapshotId}, captured ${bank.capturedAt}. Reviewed all 397 entries under Corebook::GI::Liver, additional ultrasound liver content and cross-category candidates. None of this bundle\'s 57 Clinical_Context values is currently owned. Generated files were not treated as accepted cards. This first snapshot cannot recover earlier deletion history.`,
  '',
  'The review compared the fact actually retrieved and the answer across Mechanism, Boards Trap, High-Yield and image notes. Different wording or a different card category did not justify repeating a concept. Existing Anki content establishes ownership, not independent medical correctness.',
  '',
  '## Retained conceptual questions',
  '',
  '| Final row | Prior corrected row | Question | Why it stays |',
  '|---|---|---|---|',
  ...decisionRows.filter(d=>d.priorCorrectedRow>17).map(d=>`| ${keep.indexOf(d.priorCorrectedRow)+1} | ${d.priorCorrectedRow} | ${esc(question(rows[d.priorCorrectedRow-1]))} | ${esc(d.rationale)} |`),
  '',
  '## Omitted questions and traceability',
  '',
  'Row numbers below refer to the preserved 57-note corrected version, not the original 54-row generated file. Actual matched Anki questions/answers and deck names are in corebook_snapshot.json; stable references and decisions are in card_overlap_review.json.',
  '',
  '| Prior row / ID | Omitted question | Coverage and reason |',
  '|---|---|---|',
  ...[...skipped,...within].sort((a,b)=>a.priorCorrectedRow-b.priorCorrectedRow).map(d=>`| ${d.priorCorrectedRow} / ${esc(d.clinicalContext)} | ${esc(d.question)} | ${esc(d.rationale)} ${d.matchedEntryIds?'Anki card IDs: '+d.matchedEntryIds.join(', '):'Retained bundle ID: '+d.coveredByClinicalContext}. |`),
  '',
  '## Image, caption and media preservation',
  '',
  'All 17 atomic image groups remain in the same order, containing all 23 selected STATdx images. No same-patient, phase, procedure, adjacent-slice or follow-up group was split. The 23 stackCap captions and all Image, Image_Annotated and Original_Caption fields remain raw-equal to the source. All inline arrow tags are preserved.',
  '',
  'Compared the 46 diagnostic files against current Corebook image filenames using exact file SHA-256 and decoded RGB pixel/dimension hashes. No exact matches were found among 1,305 readable files. Two unrelated existing references could not be compared: missing carpet_lesionO2.jpeg and a remote ResearchGate VGAM schematic. This is not a claim that every resized, recropped or recompressed image was visually unique; useful alternate images remain recognition reinforcement. No image was called an exact duplicate from captions alone.',
  '',
  'The final media audit checks the exact 46 diagnostic filenames and eight auxiliary caption icons separately. Auxiliary icons are retained in media/. Their absence from the diagnostic download registry does not justify removing tags. The current bundle has no missing media.',
  '',
  '## Source basis and import behavior',
  '',
  'The prior source audit compared source_package.txt, generated_cards.tsv, metadata.json, audit_instructions.md and structured core_evidence.txt (USED). It directly checked the named Core textbook pages and labeled AAST additions. This pass introduces no new medical claims. Retained AAST protocol/length/hematoma-size clarifications remain explicitly labeled in their answers; the corrected HIDA and blood/fat qualifications remain in the article summary. The full earlier source report is preserved in '+archiveName+'/audit_report.md under _codex_review.',
  '',
  'Liver grading remains divided into six focused questions. Do not substitute the splenic AAST grades: vascular grades and hematoma-size thresholds differ. Shared low-grade thresholds are retained as part of the explicitly hepatic grading task, rather than requiring an unsupported transfer between organs.',
  '',
  'Differential_Q and Differentials remain blank; the mini-differentials stay at the top of Imaging_Differentiation on UNKNOWN backs. This prevents legacy Differential Drill generation without changing the installed note type. The clean TSV has no field header and preserves the trailing Tags column.',
  '',
  `The Anki TSV has #separator:tab, #html:true, #notetype:${m.anki.noteType} and #deck:${m.anki.deckName}. No import was performed.`,
  '',
  '## Verification and archived version',
  '',
  'The final source/media and preservation results are recorded in _codex_review/dedup_validation_results.json. The required live-bank gate is recorded in corebook_validation.json and binds the final TSVs and overlap review by SHA-256. The completion marker is written only after both checks pass.',
  '',
  `The prior corrected TSV, Anki TSV, report and completion marker are preserved in _codex_review/${archiveName}/. The previous audit\'s 57-note counts are historical and do not describe this final import.`,
  ''
 ].join('\n');
 await fs.writeFile(path.join(B,'audit_report.md'),report,'utf8');
 console.log(JSON.stringify({priorNotes:57,finalNotes:31,removedOwnedConcepts:23,removedWithinBundle:3,imageGroups:17,conceptualNotes:14,retainedFieldsChanged:0,completionMarker:'pending validation'}));
 process.exit(0);
}
const fields='Clinical_Context Image Image_Annotated Question Most_Likely_Diagnosis Entity_Label Differential_Q Differentials Imaging_Differentiation Original_Caption Mechanism_Q Mechanism Boards_Trap_Q Boards_Trap High_Yield_Q High_Yield_A Radiopaedia_Link Radiopaedia_Case_Context Radiopaedia_Case_Summary Radiopaedia_Case_Differential summary Tags'.split(' ');
// Trim line endings only: trailing tabs represent required empty fields.
const input=(await read('generated_cards.tsv')).replace(/^\uFEFF/,'').split(/\r?\n/).filter(r=>r.length).map(r=>r.split('\t'));
assert.equal(input.length,54);assert(input.every(r=>r.length===22));
const m=await json('metadata.json'), media=await json('_codex_review/media_audit.json');
const source=await read('source_package.txt');
const sourceRegistry=JSON.parse(source.split('=== MASTER IMAGE REGISTRY ===')[1].split('=== MASTER SOURCE MANIFEST ===')[0].trim());
const registry=new Map(m.imageRegistry.map(e=>[e.masterImageId,e]));
for(const e of sourceRegistry)assert.equal(e.caption,registry.get(e.masterImageId).caption);
const lookup=new Map(m.imageRegistry.flatMap(e=>[[e.plainFilename,e],[e.annotatedFilename,e]]));
const clone=input.map(r=>[...r]);
const changes=new Map();
function reason(n,s){const r=changes.get(n)||[];if(!r.includes(s))r.push(s);changes.set(n,r);}
function set(n,field,value,why){const i=fields.indexOf(field);assert(i>=0);if(clone[n-1][i]!==value){clone[n-1][i]=value;reason(n,why);}}
function replace(n,field,from,to,why){const v=clone[n-1][fields.indexOf(field)];assert(v.includes(from),`row ${n}: missing replacement target`);set(n,field,v.replace(from,to),why);}
function hy(n,q,a,why){set(n,'High_Yield_Q',q,why);set(n,'High_Yield_A',a,why);}

// Differential lists belong on UNKNOWN backs; the active collection is locked.
for(let n=1;n<=17;n++){
 const list=clone[n-1][7];assert(list && !clone[n-1][6]);
 set(n,'Imaging_Differentiation','<b>Mini-differential:</b><br>'+list+'<br><br>'+clone[n-1][8],
 'Moved mini-differential to the UNKNOWN back and cleared legacy drill trigger.');
 set(n,'Differentials','','Moved mini-differential to the UNKNOWN back and cleared legacy drill trigger.');
}
replace(1,'Imaging_Differentiation','Core liver injury grading treats contained active bleeding as grade III and extraparenchymal active bleeding into the peritoneum as grade IV.',
 'Core/AAST vascular criteria are grade III for a hepatic vascular injury or active bleeding contained within liver parenchyma and grade IV for active bleeding extending into the peritoneum; another injury can establish a higher grade. Hemoperitoneum alone does not establish active extraparenchymal bleeding.',
 'Clarified vascular grading versus hemoperitoneum and the possibility of a higher injury grade.');
replace(2,'Imaging_Differentiation',' The two views are retained because literal slice identity is uncertain, not as a time-lapse series.',' These are comparison views, not a documented time-lapse series.',
 'Removed the image-retention audit rationale while retaining necessary chronology limits.');
replace(4,'Imaging_Differentiation',', making this CT example a useful recognition variant','',
 'Removed generator/recognition-variant commentary from the learner explanation.');
replace(5,'Imaging_Differentiation','In these source examples, persistent T2 hyperintensity supports hemorrhage rather than fat. Core separately notes that intracellular lipid in adenoma can show T1 hyperintensity with opposed-phase signal loss.',
 'The captions attribute the foci to hemorrhage, but the corresponding T2 images are not supplied. Clarification from Core chemical-shift imaging: assess intracellular lipid by opposed-phase signal loss; T1/T2 brightness alone is not a definitive blood-versus-fat test.',
 'Preserved source diagnoses while removing an overgeneralized T2-brightness discriminator.');
set(18,'Mechanism','In cirrhosis, Core describes progression from a regenerative nodule to a dysplastic nodule and then HCC. Portal-dominant nodules usually lack arterial hyperenhancement. Increasing tumor neovascularity creates arterialization; HCC may then show arterial hyperenhancement with later washout. High-grade dysplastic nodules can also arterialize, so arterial enhancement alone is not definitive. Radiology pivot: evaluate the full enhancement pattern in the cirrhotic liver.',
 'Focused the mechanism on neovascularization and preserved the high-grade dysplasia overlap.');
set(19,'Mechanism_Q','Why are hepatic adenomas usually photopenic on Tc-99m sulfur-colloid imaging, and why is this finding not absolute?',
 'Separated Kupffer-cell/sulfur-colloid physiology from the HIDA behavior card.');
set(19,'Mechanism','Sulfur colloid is taken up by reticuloendothelial cells, including hepatic Kupffer cells (Core Nucs:462). Adenoma has less functional Kupffer-cell activity than normal liver, so uptake is usually reduced. Core GI:114 describes scattered Kupffer cells and GI:115 explicitly notes that adenomas are not always photopenic. Radiology pivot: a cold defect is a supporting, nonspecific finding; it neither proves adenoma nor excludes FNH.',
 'Explained the tissue-to-tracer mechanism and reconciled the textbook\'s absolute versus qualified Kupffer-cell wording.');
set(21,'Boards_Trap','Trap: Calling every T1-bright focus lipid.<br>Safety check: Use chemical-shift imaging to look for opposed-phase signal loss from intracellular lipid; interpret the remaining sequences together.<br>Discriminator: Core describes this lipid-related signal loss in adenoma. The supplied captions diagnose hemorrhage in their T1-bright examples, but their referenced T2 images are not staged.<br>Clarification: T2 brightness alone is not a definitive blood-versus-fat test; both the sequence behavior and clinical context matter.',
 'Corrected the fat-versus-blood pitfall without changing any raw source caption.');
hy(23,'In a young woman without cirrhosis, how should spontaneous bleeding within or around a hepatic mass change the differential?',
 'Strongly favor hepatic adenoma. RadPrimer describes this constellation as almost diagnostic in that clinical setting.<br>Interpretation pivot: Use the patient substrate and full enhancement pattern; hemorrhage alone does not establish adenoma.',
 'Qualified the source\'s likelihood shorthand while retaining the actionable pretest clue.');
hy(24,'How should cirrhosis or chronic hepatitis change interpretation of a hypervascular hepatic mass?',
 'The background liver disease raises concern for HCC. Look for the complete multiphasic pattern, including nonperipheral washout and an enhancing capsule.<br>Interpretation pivot: The risk substrate changes the differential; arterial hyperenhancement alone does not establish HCC, because high-grade dysplastic nodules and other lesions may arterialize (Core GI:105-107).',
 'Replaced an absolute HCC-until-proven-otherwise slogan with a supported risk-plus-pattern discriminator.');
hy(25,'What CT morphology favors hepatic laceration over a rounded hemorrhagic mass?',
 'A linear or stellate parenchymal defect favors laceration, especially with other traumatic findings.<br>Pitfall: Coagulopathic hemorrhage can also create fracture-like hepatic defects, so trauma history and bleeding elsewhere remain important.',
 'Replaced right/left-lobe percentage trivia with an image morphology discriminator.');
hy(26,'How does coexisting polycystic kidney disease change interpretation of innumerable hepatic cysts?',
 'It supports autosomal dominant polycystic liver disease rather than isolated sporadic liver cysts (Core GI:119).<br>Imaging pivot: Assess the renal findings when interpreting a diffusely cystic liver. Some hepatic cysts may be T1 bright from hemorrhage, as in the supplied liver MRI.',
 'Replaced 40-percent recall with a pretest/imaging-association clue.');
hy(27,'Does a hemorrhagic hepatic process require blood attenuation above 60 HU on NECT?',
 'No. The article gives heterogeneous attenuation &gt;60 HU as one possible appearance of hemorrhage; the melanoma example separately reports hemoperitoneum at 35 HU.<br>Pitfall: A single attenuation threshold must not exclude blood. Interpret attenuation with the lesion, sentinel clot and distribution of fluid.',
 'Focused an overloaded CT/MRI/extension list on the source-supported attenuation pitfall.');
hy(28,'Which CT approach is preferred for suspected hepatic trauma in a hemodynamically stable patient?',
 'Dual-phase contrast CT. The AAST 2018 publication specifies arterial and portal venous phases to improve detection of vascular injury.<br>Report pivot: Assess active bleeding and its extent; distinguish blood already present in the peritoneum from active contrast extravasation into it.<br>Outside clarification: arterial-plus-portal-venous phase detail is from AAST 2018.',
 'Separated protocol choice from morphology and labeled the phase detail from the original AAST publication.');
hy(29,'How does the location of active hepatic bleeding change the AAST 2018 CT vascular-injury grade?',
 'Grade III vascular criterion: hepatic vascular injury or active bleeding contained within liver parenchyma.<br>Grade IV vascular criterion: active bleeding extends from the liver into the peritoneum.<br>Report pivot: Describe the bleeding compartment; other injuries may assign a higher grade. Hemoperitoneum alone is not the grade-IV active-bleeding criterion.',
 'Split the five-grade list into focused grading questions; kept this original ID for the bleeding-compartment question.');
hy(33,'What HIDA behavior classically supports FNH rather than hepatic adenoma?',
 'Core describes HIDA uptake in FNH and usually little uptake in adenoma (GI:114-115). This is a supporting tracer clue, not a definitive diagnosis.<br>Outside physiology clarification (direct Core Nucs:465 check): IDA tracers are transported into hepatocytes. Biliary architecture affects subsequent handling; bile ductules are not the cells that initially take up HIDA.',
 'Separated HIDA from sulfur-colloid recall and corrected the implied site of tracer uptake.');
hy(34,'Why should suspected hepatic adenoma size be stated explicitly in the report?',
 'Core emphasizes hemorrhage risk and describes adenomas &gt;5 cm as usually resected.<br>Report pivot: Record maximum size and interval growth because they influence management.<br>Outside clarification (ACG 2024): size is not a universal automatic-surgery rule. Men and beta-catenin-mutated adenomas warrant resection irrespective of size; lesions &gt;5 cm in women are generally observed after risk-factor modification before resection if still indicated.',
 'Retained the source-supported size pivot while labeling current management qualifications.');
hy(45,'Which clinical cancer history should keep metastasis in the differential of a hemorrhagic hepatic mass?',
 'RadPrimer lists lung cancer, renal cell carcinoma, pancreatic neuroendocrine tumor and melanoma. Hemorrhage is uncommon in metastases but is often associated with hypervascular lesions.<br>Interpretation pivot: A bleeding liver mass in a patient with one of these primaries need not be an adenoma or HCC; correlate vascularity and the known cancer history.',
 'Reframed a most-common list as a pretest clue that changes interpretation.');
hy(51,'In a pregnant or postpartum patient with RUQ pain, how do hemolysis, elevated liver enzymes and low platelets change interpretation of hepatic hemorrhage?',
 'They support HELLP syndrome as the cause of intrahepatic/subcapsular hematoma, possible active extravasation and wedge-shaped infarcts.<br>Report pivot: Search for active bleeding and infarction; imaging findings require obstetric and laboratory correlation.',
 'Made the syndrome question test interpretation rather than isolated acronym recall.');
hy(54,'Which clues favor adenoma versus HCC when a hemorrhagic hepatic mass is hypervascular?',
 'Adenoma: spontaneous bleeding in a young woman without cirrhosis strongly favors it; fat, multiplicity and encapsulation may support the diagnosis.<br>HCC: cirrhotic substrate plus arterial hyperenhancement, washout and capsule favor HCC; large tumors may rupture.<br>Pitfall: These findings overlap. Use the patient substrate and complete multiphasic examination rather than hemorrhage or arterial enhancement alone.',
 'Kept a deliberate structured comparison and qualified overlapping imaging signs.');

let summary=input[0][20];assert(input.every(r=>r[20]===summary));
const beforeHida='sulfur colloid is usually photopenic and HIDA shows little uptake because bile ducts are absent.';
assert(summary.includes(beforeHida));
summary=summary.replace(beforeHida,'sulfur-colloid uptake is usually reduced; Core describes typically little HIDA uptake. IDA uptake occurs in hepatocytes, so absent ductules should not be equated with absent initial hepatocyte uptake.');
const beforeFat='Do not equate T1 hyperintensity with fat: the adenoma MRI examples remained hyperintense on T2 and were attributed to hemorrhage; intracellular lipid is assessed with opposed-phase signal loss.';
assert(summary.includes(beforeFat));
summary=summary.replace(beforeFat,'Do not equate T1 hyperintensity with fat. The source captions attribute the adenoma foci to hemorrhage, but their referenced T2 images are not staged. Intracellular lipid is assessed by opposed-phase signal loss; T2 brightness alone is not a definitive blood-versus-fat test.');
for(let n=1;n<=54;n++)set(n,'summary',summary,'Preserved the repeated article summary; corrected only the HIDA mechanism and T2 blood/fat overgeneralization.');

const deleted=new Map([
 [31,'Near-identical text-only blood-versus-fat recall duplicates the corrected Boards Trap in original row 21; no image or unique discriminator is lost.'],
 [52,'Reverse HELLP-acronym recall duplicates the interpretation-focused HELLP card in original row 51.'],
 [53,'Amyloidosis rarity ranking does not provide a useful hemorrhage discriminator; nonspecific hypoattenuation adds little. Amyloidosis remains in the article-level summary/differential.']
]);
const allCodes=new Set(input.map(r=>r[0].match(/[A-Z0-9]{12}$/)?.[0]));
function randomCode(){let id;do{id=crypto.randomBytes(9).toString('base64url').replace(/[-_]/g,'').toUpperCase().slice(0,12);}while(id.length!==12||allCodes.has(id)||!/[A-Z]/.test(id)||!/[0-9]/.test(id));allCodes.add(id);return id;}
const added=[];
function add(key,q,a,why,sourceBasis,category){const r=Array(22).fill('');r[0]=randomCode();r[14]=q;r[15]=a;r[20]=summary;added.push({key,row:r,reason:why,sourceBasis,category});}
add('hematoma_grading','How does subcapsular hepatic hematoma extent affect AAST CT grading?',
 'Less than 10% of the liver surface: grade I. From 10% through 50%: grade II. More than 50%, or a ruptured subcapsular hematoma: grade III.<br>Report pivot: Describe surface involvement and rupture; use the highest applicable injury grade.',
 'Focused split from the overloaded original grading card.','Core GI:120; AAST 2018 Table 2','report-critical grading');
add('laceration_grading','How does hepatic laceration depth affect AAST grades I-III?',
 'Depth &lt;1 cm: grade I. Depth 1-3 cm: grade II. Depth &gt;3 cm: grade III.<br>Outside clarification (AAST 2018): the grade-II criterion also specifies length &le;10 cm.<br>Report pivot: Measure depth and length; vascular injury or major lobar disruption can establish a higher grade.',
 'Focused split from the overloaded original grading card; restored the AAST length qualifier omitted by Core.','Core GI:120; AAST 2018 Table 2','report-critical grading');
add('intraparenchymal_hematoma','How does intraparenchymal hepatic hematoma size affect AAST CT grading?',
 'An intraparenchymal hematoma &lt;10 cm meets a grade-II criterion in Core.<br>Outside clarification (AAST 2018): an intraparenchymal hematoma &gt;10 cm meets a grade-III criterion; rupture also meets grade III.<br>Report pivot: Measure the hematoma and identify rupture. Apply a higher grade if another finding warrants it.',
 'Preserved the intraparenchymal size criterion from the original overloaded note and supplied the labeled grade-III completion.','Core GI:120; AAST 2018 Table 2','report-critical grading');
add('high_grade_injury','Which hepatic disruption or venous-injury findings define AAST grades IV and V?',
 'Grade IV: disruption of 25-75% of a hepatic lobe. Grade V: disruption of more than 75%, or injury to the retrohepatic IVC/central major hepatic veins.<br>Report pivot: Quantify lobar involvement and inspect the major hepatic venous outflow.',
 'Focused high-grade injury split; preserves major venous-injury assessment.','Core GI:120','report-critical grading');
add('multiple_injuries','How should multiple hepatic injuries be combined into a final AAST grade?',
 'Use the highest applicable injury grade rather than averaging. Multiple grade-I or grade-II injuries advance one grade, up to grade III.<br>Report pivot: Do not automatically escalate an already high-grade injury solely because more than one lesion is present.',
 'Preserves the original multiple-injury rule as one grading pitfall.','Core GI:120; AAST 2018 explanatory text','report-critical pitfall');
add('sentinel_clot','What does a sentinel clot immediately adjacent to a hepatic mass contribute when hemoperitoneum is present?',
 'It localizes the likely source of bleeding to the adjacent lesion.<br>Pitfall: It does not identify the lesion histology; the supplied examples include HCC and melanoma metastasis.<br>Report pivot: Identify the relationship between the clot and lesion while assessing for active extravasation.',
 'Adds a missing standalone localization question already supported by several image captions.','STATdx images 8-11 and 20; RadPrimer equivalents','report-critical localization');

const retained=clone.map((r,i)=>({inputRow:i+1,row:r})).filter(e=>!deleted.has(e.inputRow));
// Keep original relative order, with the grading splits immediately after the parent.
const assembled=[];
for(const e of retained){assembled.push(e);if(e.inputRow===29)for(const a of added.filter(a=>a.key!=='sentinel_clot'))assembled.push({added:a,row:a.row});}
assembled.push({added:added.find(a=>a.key==='sentinel_clot'),row:added.find(a=>a.key==='sentinel_clot').row});
let corrected=assembled.map(e=>e.row);
assert.equal(corrected.length,57);

// Treat every column as literal text, including HTML and random identifiers.
const workbook=Workbook.create(), sheet=workbook.worksheets.add('Cards');
sheet.getRange(`A1:V${corrected.length}`).values=corrected;
workbook.recalculate();
const roundtrip=sheet.getRange(`A1:V${corrected.length}`).values.map(r=>r.map(v=>v??''));
assert.deepEqual(roundtrip,corrected,'Artifact matrix changed literal card fields');
const inspected=await workbook.inspect({kind:'table',range:'Cards!O18:P22',include:'values',tableMaxRows:5,tableMaxCols:2,maxChars:1600});
await fs.writeFile(path.join(review,'artifact_inspection.ndjson'),inspected.ndjson,'utf8');
corrected=roundtrip;
const tsv=corrected.map(r=>r.join('\t')).join('\n')+'\n';
const headers=['#separator:tab','#html:true','#notetype:'+m.anki.noteType,'#deck:'+m.anki.deckName];
await fs.writeFile(path.join(B,'corrected_cards.tsv'),tsv,'utf8');
await fs.writeFile(path.join(B,'corrected_cards_anki_import.tsv'),headers.join('\n')+'\n'+tsv,'utf8');

const categories={23:'pretest clue',24:'pretest clue/differential',25:'modality appearance/pitfall',26:'pretest clue',27:'attenuation pitfall',28:'modality/protocol',29:'report-critical grading',30:'contrast behavior',32:'ultrasound specificity',33:'tracer behavior',34:'management/reporting',35:'contrast behavior',36:'MRI appearance',37:'ultrasound/Doppler appearance',38:'tracer behavior/pitfall',39:'staging/reporting',40:'contrast behavior/pitfall',41:'ultrasound appearance',42:'MRI appearance',43:'MRI appearance',44:'differential discriminator',45:'pretest clue',46:'contrast phase',47:'MRI appearance/pitfall',48:'ultrasound appearance',49:'report-critical appearance',50:'procedure/management',51:'pretest clue',54:'structured differential comparison'};
const coreBasis={18:'Core GI:105-107',19:'Core GI:114-115; Nucs:462,463,465',21:'Core GI:98,114-115; source MRI captions',24:'Core GI:105-107',26:'Core GI:119',29:'Core GI:120; AAST 2018',30:'Core GI:115',32:'Core GI:115',33:'Core GI:114-115; Nucs:465',34:'Core GI:115 plus labeled ACG 2024 clarification',35:'Core GI:106-107',36:'Core GI:106',37:'Core GI:106',38:'Core Nucs:462',39:'Core GI:106',40:'Core GI:118 plus source cyst caption',41:'Core GI:118-119 plus source ultrasound caption',42:'Core GI:118 plus source T2 caption',43:'Core GI:119 plus source polycystic-liver caption',46:'Core GI:98,108',47:'Core GI:108',48:'Core GI:108'};
const rowAudit=[];
for(let i=0;i<input.length;i++){
 const n=i+1,after=assembled.findIndex(e=>e.inputRow===n);
 const changed=fields.filter((f,c)=>clone[i][c]!==input[i][c]);
 rowAudit.push({inputRow:n,clinicalContext:input[i][0],id:input[i][0].match(/[A-Z0-9]{12}$/)[0],
 action:deleted.has(n)?'deleted':changed.length?'revised':'retained',outputRow:after>=0?after+1:null,
 changedFields:deleted.has(n)?[]:changed,reasons:deleted.has(n)?[deleted.get(n)]:(changes.get(n)||['Passes source/quality checks.']),
 usefulnessCategory:categories[n]||(n<=17?'image recognition':n<=19?'mechanism':n<=22?'pitfall':null),
 sourceBasis:coreBasis[n]||'RadPrimer/STATdx article and source image captions',
 highYieldQuestion:input[i][14]||null,highYieldGate:input[i][14]?(deleted.has(n)?'removed':'passed'):null});
}
for(const a of added)rowAudit.push({inputRow:null,id:a.row[0],action:'added',outputRow:assembled.findIndex(e=>e.added?.key===a.key)+1,reasons:[a.reason],sourceBasis:a.sourceBasis,usefulnessCategory:a.category,highYieldQuestion:a.row[14],highYieldGate:'passed'});
await writeJson('_codex_review/row_audit.json',rowAudit);
const packageInfo={inputRows:54,outputRows:57,retainedOriginalNotes:51,deletedNotes:3,addedNotes:6,
 cardTypes:{unknown:17,mechanism:2,boardsTrap:3,highYield:35,differentialDrill:0},
 expectedHeaders:headers,fields,primaryImageIds:m.masterImageIds,sourceCaptionCount:23,
 originalClinicalContextsPreserved:true,originalImageFieldsPreserved:true,originalCaptionFieldsPreserved:true,
 allMediaLocallyVerified:media.every(x=>x.available),recoveredIcons:media.filter(x=>x.recoveredFile).map(x=>x.filename),
 externalClarifications:[{id:'AAST2018',url:'https://www.aast.org/asset/1EDF1B04-6B52-4E7B-9130ACA30413089D/',scope:'Arterial/portal venous protocol detail and grade-II laceration length qualifier; cross-check of grading.'},{id:'ACG2024',url:'https://gi.org/wp-content/uploads/2025/04/GuidelineHighlight_FLL.pdf',scope:'Adenoma management qualifications; labeled outside clarification in the size/reporting card.'}]};
await writeJson('_codex_review/audit_summary.json',packageInfo);

const report=['# Card-quality audit: Focal Liver Lesion With Hemorrhage','',
 '## Result','',
 '54 input notes → 57 corrected notes: 51 original notes retained with their exact Clinical_Context values, 3 weak/redundant text notes removed, and 6 focused High-Yield notes added. Final types: 17 UNKNOWN, 2 Mechanism, 3 Boards Trap, 35 High-Yield, and no Differential Drill. The no-header 22-column TSV schema and column order are unchanged.',
 '', '## Source basis','',
 '- Imported the newest complete browser bundle with import-latest-radprimer-audit-bundle.ps1 and read the updated queue pointer. All six staged files remain unchanged.',
 '- Compared source_package.txt, generated_cards.tsv, metadata.json, audit_instructions.md and core_evidence.txt. The Core evidence status is USED with a named PDF and page ranges; it is not unstructured metadata-only validation.',
 '- Checked the cited local textbook directly: C:/Users/josem.000/Documents/junzi-shi-core-radiology-a-visual-approach-to.pdf. Printed page numbers are 12 less than the PDF page index: GI:98 (PDF 110), GI:105-108 (117-120), GI:114-115 (126-127), GI:118-120 (130-132), and Nucs:462-465 (474-477). The liver-trauma grading page was rendered and visually checked. Extracted verification pages are in _codex_review/core_pages.json and core_additional_pages.json.',
 '- Shared RadPrimer/STATdx article facts and source captions remain the basis for hemorrhage, HELLP, coagulopathy, sentinel clot and reported case outcomes. No unprovided Core support is claimed for those details.',
 '', '## High-signal corrections','',
 '- Original row 29 attempted all five liver-injury grades at once. Its original ID now tests active-bleeding compartment. Five added notes separate subcapsular hematoma extent, intraparenchymal hematoma size, laceration depth, major lobar/venous injury, and combination of multiple injuries. Related facts remain structured comparisons, not unrelated multi-part prompts.',
 '- Replaced right-versus-left injury percentages and the ADPKD/ADPLD percentage with morphology and renal-association clues that change interpretation.',
 '- Removed original row 31 (duplicates the corrected blood/fat Boards Trap), row 52 (reverse HELLP acronym recall), and row 53 (weak amyloidosis rarity ranking). Amyloidosis remains in the repeated article summary/differential.',
 '- Added a focused sentinel-clot localization question supported by the HCC/melanoma captions.',
 '- Replaced absolute HCC/adenoma likelihood slogans with patient-substrate and complete-imaging-pattern reasoning.',
 '- Corrected the MRI explanation: preserve the captions\' hemorrhage attribution, but do not teach T2 brightness as a definitive blood/fat separator. Chemical-shift signal loss is the source-supported intracellular-lipid test. Referenced T2 companions are not supplied.',
 '- Separated sulfur-colloid/Kupffer-cell physiology from HIDA behavior. Core GI:114-115 describes scattered Kupffer cells and qualified photopenia; Nucs:463 uses an absolute formulation. The corrected cards use the qualified account. Core Nucs:465 confirms that IDA enters hepatocytes, so the explanation no longer attributes initial uptake to ductules.',
 '- Preserved the complete article-level summary on every retained/added note. Only its HIDA mechanism and overgeneralized T2 blood/fat sentence were corrected; repetition was not penalized.',
 '', '## Outside clarifications and source limits','',
 'The AAST publication confirms arterial plus portal venous imaging, the grade-II laceration length qualifier, and the bleeding-compartment distinctions. Protocol/length details added beyond the captured digest are explicitly labeled outside clarification. [AAST 2018 original publication, Table 2](https://www.aast.org/asset/1EDF1B04-6B52-4E7B-9130ACA30413089D/).',
 'The adenoma size card keeps Core\'s >5-cm teaching point while explicitly labeling current management qualifications: sex, subtype, growth and risk-factor modification matter. This is not a universal automatic-resection rule. [ACG 2024 focal liver lesion guideline highlights](https://gi.org/wp-content/uploads/2025/04/GuidelineHighlight_FLL.pdf).',
 'The local textbook omits the >10-cm intraparenchymal hematoma criterion in its grade-III digest, whereas AAST Table 2 includes it. The dedicated intraparenchymal-hematoma card labels this completion as outside clarification. The published <10-cm and >10-cm inequalities are preserved; no unsupported exact-10-cm boundary is invented.',
 '', '## Differential behavior, IDs and grouping','',
 'Differential_Q is blank throughout; no standalone Differential Drill was requested. The installed Anki collection could not be queried because the database was locked. Used the requested import-safe fallback: Differentials is blank throughout, and each of the 17 mini-differentials is preserved verbatim at the top of Imaging_Differentiation on the UNKNOWN back. No Anki template, collection, review state or existing note was modified.',
 'All 54 input IDs were valid, unique, random-looking 12-character trailing identifiers. Exact Clinical_Context strings are preserved for all 51 retained original notes. Six new notes use new cryptographically random identifiers. No counter-style or row-derived IDs were introduced.',
 'All 17 original image notes and their image-group order are preserved: [1], [2,3], [4], [5], [6,7], [8,9], [10], [11], [12], [13], [14], [15], [16], [17], [18], [19,20], [21,22,23]. No cluster was split, no selected image was removed, and no distinct image was replaced. Source-confirmed versus unconfirmed patient/procedure relationships remain qualified.',
 '', '## Raw-caption and media integrity','',
 'All 23 stackCap strings already matched the raw metadata/source-package registry captions character-for-character, including spacing, punctuation, HTML and inline arrow tags. They were not repaired or normalized. Each complete Image and Image_Annotated field is byte-for-byte unchanged. Original_Caption was blank in all input rows because captions are in the annotated stacks; those fields remain exactly blank. No caption-only change affected any note ID, group or unrelated field.',
 'Verified 46 exact diagnostic <img src> filenames against downloadFiles and the selected image registry. Every file decoded successfully from Downloads/RadPrimer and the existing Anki collection.media; corresponding hashes agree. All 23 selected images are covered by the UNKNOWN groups.',
 'Eight caption-icon filenames were checked separately from diagnostic media. All eight were recovered byte-for-byte from the existing Anki collection.media into this bundle\'s media/ directory. Their original tags remain intact. All 54 unique image references are locally available and decode successfully; there are no unresolved media filenames in this audit.',
 '', '| Recovered auxiliary filename | Bundle path |','|---|---|',
 ...media.filter(x=>x.recoveredFile).map(x=>`| ${x.filename} | ${x.recoveredFile} |`),
 '', 'Image download/source URL and local filename-list bookkeeping is absent from learner-facing text. The image references themselves remain as <img> tags; useful source captions and annotation icons were preserved. The image-retention rationale was removed from the biopsy explanation while its non-time-lapse context remains.',
 '', '## Per-note audit','',
 'Row numbers below refer to generated_cards.tsv. Detailed field-level changes, preserved IDs, output row mapping, source bases and High-Yield usefulness categories are recorded in _codex_review/row_audit.json.',
 '', '| Input row | Action | Usefulness gate / rationale |','|---|---|---|'];
for(const a of rowAudit){
 const why=a.inputRow===null?a.reasons[0]:(deleted.has(a.inputRow)?a.reasons[0]:(a.highYieldGate==='passed'?a.usefulnessCategory+'; '+a.reasons.filter(x=>!x.startsWith('Preserved the repeated')).join(' '):a.reasons.filter(x=>!x.startsWith('Preserved the repeated')).join(' ')||'Source-supported note retained.'));
 report.push(`| ${a.inputRow??'Added'} | ${a.action} | ${why.replaceAll('|','/')} |`);
}
report.push('', '## Import and validation','',
 'Use corrected_cards_anki_import.tsv for note type core_rad_notetype_v2 and deck Corebook::GI::Liver::Focal Liver Lesion With Hemorrhage. It prepends the four requested Anki directives and contains no field header row. corrected_cards.tsv is the plain no-header audit output.',
 'The validation step checks all 22 fields, original ID preservation, group/image order, raw caption equality, auxiliary-icon recovery hashes, source-supported selection, empty drill triggers, repeated-summary consistency, changed-field scope and exact Anki header/body agreement. _codex_audit_done.txt is written only after validation passes.',
 'Local media integrity is complete for these references. This audit does not claim a live Anki import or a verified installed-template render; the locked collection was not modified.');
await fs.writeFile(path.join(B,'audit_report.md'),report.join('\n')+'\n','utf8');
console.log(JSON.stringify({written:['corrected_cards.tsv','corrected_cards_anki_import.tsv','audit_report.md'],...packageInfo.cardTypes,inputRows:54,outputRows:57,removed:3,added:6,completionMarker:'pending validation'},null,2));
