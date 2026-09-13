import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { Workbook } from '@oai/artifact-tool';

const work = path.dirname(fileURLToPath(import.meta.url));
const bundle = path.dirname(work);
const raw = await fs.readFile(path.join(bundle, 'generated_cards.tsv'), 'utf8');
const metadata = JSON.parse(await fs.readFile(path.join(bundle, 'metadata.json'), 'utf8'));
const original = raw.replace(/^\uFEFF/, '').trimEnd().split(/\r?\n/).map(l => l.split('\t'));
// trimEnd removes the last empty Tags cell. Restore only that trailing cell.
if (original.at(-1).length === 21) original.at(-1).push('');
assert.equal(original.length, 23);
assert(original.every(r => r.length === 22));
const names = ['Clinical_Context','Image','Image_Annotated','Question','Most_Likely_Diagnosis','Entity_Label','Differential_Q','Differentials','Imaging_Differentiation','Original_Caption','Mechanism_Q','Mechanism','Boards_Trap_Q','Boards_Trap','High_Yield_Q','High_Yield_A','Radiopaedia_Link','Radiopaedia_Case_Context','Radiopaedia_Case_Summary','Radiopaedia_Case_Differential','summary','Tags'];
const ids = new Set(original.map(r => r[0].match(/[A-Z0-9]{12}$/)?.[0]));
assert.equal(ids.size, 23);
assert(!ids.has(undefined));
const identityFile = path.join(work, 'added_ids.json');
let addedIds = {};
try { addedIds = JSON.parse(await fs.readFile(identityFile, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
function newId(key) {
  if (addedIds[key]) return addedIds[key];
  let id;
  do { id = randomBytes(12).toString('base64url').replace(/[-_]/g, '').slice(0, 12).toUpperCase(); } while (id.length !== 12 || ids.has(id) || !/[0-9]/.test(id));
  ids.add(id); addedIds[key] = id; return id;
}
const rows = original.map(r => [...r]);
const log = [];
function change(n, fields, reason, source, gate = '') {
  for (const [k,v] of Object.entries(fields)) rows[n-1][names.indexOf(k)] = v;
  log.push({originalRow:n,id:original[n-1][0].slice(-12),action:'revise/retain',reason,source,gate});
}
const article = 'source_package.txt, fused article lines 5003-5066';
const core = 'core_evidence.txt, CORE_FACTS_USED; GI pp. 103-104, 109, 119, 143-144 (captured report)';

// Preserve the article-level summary and its structure on every retained/new note.
assert.equal(new Set(original.map(r => r[20])).size, 1);
let summary = original[0][20]
  .replace('Core + RadPrimer + STATdx synthesis', 'RadPrimer + STATdx article; selected Core facts from the captured Core evidence report')
  .replace('(<b>', '(<b>')
  .replace('the source reports 90% involvement of these regions and venous-phase isoattenuation in 80% of lesions.', 'the articles report 90% involvement of these regions and venous-phase isoattenuation in 80% of lesions. These are article-reported figures, not independently verified Core statistics. Wedge-shaped fibrosis and capsular retraction are also supported by the captured Core report.')
  .replace('the article highlights ectatic/irregular intrahepatic ducts and distinctive volume loss.', 'the article highlights ectatic/irregular intrahepatic ducts, associated renal cystic disease, and a normal or enlarged medial segment as a discriminator from viral/alcohol-related cirrhosis.')
  .replace('&#x1F9ED;', '&#x1F9ED;');

const back = (diff, findings, discriminator, specificity) => '<b>Differential:</b><br>' + diff + '<br><br><b>Key imaging findings:</b><br>' + findings + '<br><br><b>Key differentiators:</b><br>' + discriminator + '<br><br><b>Imaging specificity:</b> ' + specificity;
change(1, {Imaging_Differentiation:back('Focal confluent fibrosis (focal process)<br>Senescent change<br>Metastatic pseudocirrhosis', 'Widened fissures, caudate hypertrophy, nodular surface, and splenomegaly.', 'Fibrosis and parenchymal volume loss widen the fissures. Volume redistribution plus portal-hypertension findings supports cirrhosis over isolated age-related or congenital volume loss. The captured Core report additionally supports enlarged periportal spaces and an expanded gallbladder fossa.', 'Suggestive with compatible clinical findings; a widened fissure alone is insufficient.')}, 'Move mini-differential to the back; clarify the source-supported fibrosis-to-volume-loss mechanism.', article+'; '+core);
change(2, {Imaging_Differentiation:back('Hepatocellular carcinoma<br>Metastatic disease (article differential context)', 'The A-D T1 MRI montage shows low precontrast signal followed by progressive arterial, venous, and delayed enhancement.', 'Persistent delayed enhancement supports focal confluent fibrosis. The source contrasts this with HCC washout; the temporal pattern alone does not exclude HCC. Interpret enhancement with lesion morphology and the clinical setting.', 'Suggestive, not independently diagnostic.')}, 'Retain complete A-D series and qualify the enhancement discriminator.', article+'; source_package.txt lines 5076-5081');
change(3, {Most_Likely_Diagnosis:'Senescent hepatic volume loss (requires clinical correlation)', Imaging_Differentiation:back('Cirrhosis<br>Congenital segment absence', 'Small medial segment, deep gallbladder, and a widened falciform fissure.', 'These findings overlap with cirrhosis. The source case had no clinical evidence of liver disease; age-related change is plausible in older adults. Assess clinical liver disease and portal-hypertension findings before attributing the shape to cirrhosis. The supplied caption does not establish absence of every portal-hypertension sign.', 'Nonspecific morphology; the source diagnosis depends on clinical correlation.')}, 'Do not imply that nonspecific CT morphology proves senescence or that the image establishes absent portal hypertension.', article+'; RP-03 caption');
change(4, {Question:'Most likely shared anatomic abnormality in these two CT examples?', Imaging_Differentiation:back('Cirrhotic atrophy<br>Senescent change<br>Postsurgical parenchymal loss', 'Absent or nearly absent medial segment with omental fat and colon in the gap; gallbladder position marks the interlobar plane.', 'A deep gallbladder fossa and absence of portal-hypertension signs favor a congenital explanation. A prior resection or ablation supports an iatrogenic defect. These are distinct examples of the same pattern; a shared patient is unconfirmed.', 'Suggestive with compatible history.')}, 'Keep SDX-04 and SDX-05 together without claiming one patient.', article+'; SDX-04/05 caseContext');
change(5, {Most_Likely_Diagnosis:'Metastatic pseudocirrhosis (with oncologic correlation)', Imaging_Differentiation:back('Cirrhosis<br>Focal confluent fibrosis', 'Widened fissures, lobulated/nodular contour, and subtle hypodense liver lesions.', 'The source caption documents breast cancer with hepatic metastases. Metastatic fibrosis and volume loss can simulate cirrhosis. The captured Core report describes scirrhous metastases, capsular retraction, and the association with treated breast cancer. Treatment history and capsular retraction are not specifically established for this supplied image.', 'The contour alone is nonspecific; the documented oncologic history supports the source diagnosis.')}, 'Separate general Core treatment associations from this image history.', article+'; RP-05 caption; '+core);
change(6, {Imaging_Differentiation:back('Cirrhosis from other causes<br>Congenital hepatic fibrosis with Caroli disease', 'Beaded intrahepatic ducts, a small liver with rounded contours, widened fissures, and varices.', 'Alternating irregular duct dilatation and strictures favor PSC. Peripheral hepatic scarring with relative central/caudate hypertrophy explains the rounded contour. General Core support includes common-duct involvement; this caption specifically documents intrahepatic changes.', 'Suggestive with clinical correlation.')}, 'Explain the remodeling mechanism and distinguish image findings from general duct distribution.', article+'; RP-06 caption; '+core);
change(7, {Question:'Most likely shared diagnosis across these CT examples?', Imaging_Differentiation:back('Primary sclerosing cholangitis<br>Cirrhosis from other causes<br>Congenital segment absence', 'Dysmorphic liver, widened fissures, volume loss, and ectatic or irregularly dilated intrahepatic ducts.', 'The supplied diagnoses are congenital hepatic fibrosis with Caroli disease. The combination of duct ectasia and hepatic remodeling favors a fibropolycystic process over isolated cirrhotic atrophy; associated renal/biliary abnormalities support it. SDX-09 and SDX-10 are companion levels in a 22-year-old man, not interval progression. SDX-08 is another example with no confirmed patient link.', 'Suggestive with clinical correlation; CT morphology alone does not establish the histology.')}, 'Preserve all three views while distinguishing SDX-08 from the SDX-09/10 companion case.', article+'; SDX-08/09/10 caseContext');
change(8, {Imaging_Differentiation:back('Cirrhosis from other causes<br>Congenital hepatic fibrosis<br>Primary sclerosing cholangitis', 'Marked fissural widening deeply partitions the liver along portal branches, with large varices.', 'This portal-branch-aligned pattern is characteristic of hepatic schistosomiasis in the article. Periportal/pericapsular septal calcification is a separate general clue; it is not specifically documented in this image caption.', 'Suggestive pattern requiring clinical correlation.')}, 'Keep general calcification clues separate from what this image demonstrates.', article+'; RP-08 caption');
for (let n=0;n<8;n++) { rows[n][6]=''; rows[n][7]=''; }
// Source-qualified labels identify images without exposing URLs or filename lists.
for (let n=0;n<8;n++) {
  let ix=0;
  const records = [...rows[n][1].matchAll(/<img src="([^"]+)">/g)].map(m => metadata.imageRegistry.find(rec=>rec.plainFilename===m[1]));
  assert(records.every(Boolean));
  rows[n][1] = rows[n][1].replace(/<b>Image \d+\/\d+<\/b>/g, () => '<b>'+records[ix++].displayLabel+'</b>');
}

change(9, {Boards_Trap_Q:'What prevents overcalling cirrhosis when an older adult has widened hepatic fissures?', Boards_Trap:'<b>Trap:</b> Diagnosing cirrhosis from fissural widening and a small medial segment alone.<br><b>Safety check:</b> Evaluate clinical liver disease and portal-hypertension findings such as splenomegaly, varices, and ascites.<br>The articles describe asymptomatic volume loss in adults older than 70, sometimes with a deep gallbladder fossa. This age is a source-described association, not a diagnostic cutoff; absence of portal-hypertension signs alone does not exclude cirrhosis.'}, 'Merge redundant original High-Yield rows 11 and 18 into one imaging pitfall; avoid an absolute age rule.', article, 'Pitfall');
change(10, {Boards_Trap_Q:'What should be checked before calling an absent hepatic segment congenital?', Boards_Trap:'<b>Trap:</b> Calling every parenchymal gap congenital.<br><b>Safety check:</b> Review resection/ablation history and check the gallbladder position, interposed fat/bowel, and portal-hypertension signs.<br>A deep gallbladder fossa with fat/bowel in the gap and no portal-hypertension findings favors congenital absence. An appropriate procedure history favors iatrogenic parenchymal loss; cirrhotic remodeling is another cause.'}, 'Retain a focused differential pitfall and make lack of portal hypertension a supportive clue, not a requirement.', article, 'Pitfall');
change(13, {High_Yield_Q:'On CT, which volume-redistribution pattern supports cirrhosis when hepatic fissures are widened?', High_Yield_A:'Right-lobe and segment IV atrophy with caudate and lateral left-lobe hypertrophy, often with a nodular contour. Enlarged periportal spaces and an expanded gallbladder fossa support this architecture.<br><b>Interpretation pivot:</b> Combine this pattern with portal-hypertension findings; fissural widening alone is nonspecific.'}, 'Retain one structured morphology-recognition target.', core+'; '+article, 'CT appearance / discriminator');
change(14, {High_Yield_Q:'On MRI, which morphologic pattern supports cirrhosis?', High_Yield_A:'Nodular contour, left-lobe hypertrophy, right-lobe atrophy, widened periportal space, and a right posterior hepatic notch.<br><b>Interpretation pivot:</b> This volume-redistribution pattern supports cirrhotic remodeling when fissural widening is present; it is not a stand-alone diagnosis.'}, 'Remove unsupported T2 sequence specificity while retaining captured Core-supported MRI morphology.', core, 'MRI appearance');
change(15, {}, 'Retain source-supported ultrasound appearance with appropriate nonspecificity qualifier.', core, 'Ultrasound appearance');
change(16, {High_Yield_A:'Low precontrast T1 signal followed by progressive enhancement through arterial, venous, and delayed phases, with persistent delayed enhancement.<br><b>Interpretation pivot:</b> This temporal pattern favors fibrosis over the source-described HCC washout pattern, but does not exclude HCC by itself.'}, 'Keep an integrated signal-and-enhancement pattern; reinforce nonabsolute HCC distinction.', article+'; RP-02 caption', 'MRI signal / contrast behavior');
change(17, {High_Yield_Q:'Which distribution favors focal confluent fibrosis in an advanced cirrhotic liver?', High_Yield_A:'The medial left and/or anterior right liver, especially segments 4 and 8, with relative sparing of the caudate and lateral segments.<br><b>Interpretation pivot:</b> Fibrotic-appearing tissue in this distribution remains a consideration when it also shows persistent delayed enhancement.<br>The articles report this distribution in 90% of lesions; this is an attributed source figure, not a diagnostic cutoff.'}, 'Split location from the independent venous-phase fact; preserve original ID for the location target.', article+' lines 5019-5023', 'Distribution / differential discriminator');
change(19, {High_Yield_A:'Absent or nearly absent anterior/medial segment, a deep gallbladder fossa, and sometimes omental fat or colon filling the gap.<br><b>Interpretation pivot:</b> Lack of portal-hypertension signs favors congenital absence over cirrhotic atrophy. Review procedure history because resection or ablation can produce a similar defect.'}, 'Replace absolute "should be absent" with a probabilistic discriminator.', article, 'CT appearance / discriminator');
change(20, {}, 'Retain metastatic-setting CT morphology; capsular retraction is general Core support, not a new claim about RP-05.', core+'; '+article, 'CT appearance / pretest context');
change(21, {High_Yield_A:'Irregular duct dilatation alternating with strictures creates a beaded appearance. Widened fissures, peripheral atrophy, and relative central/caudate hypertrophy can accompany it; advanced disease may show varices.<br><b>Interpretation pivot:</b> Ductal beading distinguishes a cholangiopathic cause from isolated cirrhotic volume loss. The captured Core report includes common and intrahepatic ducts; the selected CT depicts intrahepatic beading.'}, 'Tie beading to strictures and clarify CT example versus general duct distribution.', article+'; '+core, 'CT duct appearance / discriminator');
change(22, {High_Yield_A:'A dysmorphic liver with widened fissures and volume loss plus ectatic, sometimes saccular, intrahepatic ducts.<br><b>Interpretation pivot:</b> Duct ectasia accompanying hepatic remodeling suggests a fibropolycystic process and supports congenital hepatic fibrosis with Caroli disease in the appropriate clinical setting. Core supports saccular intrahepatic duct dilatation in Caroli disease.'}, 'Make the duct discriminator clearer without implying CT proves congenital fibrosis histology.', article+'; SDX-08/09/10 captions; '+core, 'CT appearance / duct discriminator');
change(23, {High_Yield_Q:'Which pattern of hepatic fissural widening on CT favors schistosomiasis?', High_Yield_A:'Striking fissural widening that deeply partitions the liver along portal vein branches, with portal-hypertension findings such as varices.<br><b>Interpretation pivot:</b> The portal-branch-aligned distribution is the characteristic clue emphasized by the article; interpret it with clinical correlation.'}, 'Split independent calcification recognition into a separate card.', article+'; RP-08 caption', 'CT distribution / discriminator');

const removed = new Map([[11,'Redundant age-recall card; source-supported interpretive safeguard merged into Boards Trap row 9.'],[12,'Generic four-domain checklist lacked a concrete discriminator; retained as article-summary framework rather than an independent High-Yield card.'],[18,'CT senescent-change pitfall duplicates row 9; unique wording consolidated there.']]);
for (const [n,reason] of removed) log.push({originalRow:n,id:original[n-1][0].slice(-12),action:'remove/merge',reason,source:article,gate:'Redundant or insufficient standalone radiologist usefulness'});
const corrected = rows.filter((r,i) => !removed.has(i+1));
function add(key, question, answer, source, gate, reason) {
  const r = Array(22).fill(''); r[0]=newId(key); r[14]=question; r[15]=answer; r[20]=summary;
  corrected.push(r); log.push({originalRow:null,id:r[0],action:'add',reason,source,gate});
}
add('fcf_venous', 'Why can focal confluent fibrosis be inconspicuous on venous-phase CT, and which phase can clarify the pattern?', 'It may be isoattenuating to adjacent liver on the venous phase; delayed persistent enhancement supports fibrosis.<br><b>Interpretation pivot:</b> An inconspicuous venous phase does not remove confluent fibrosis from consideration when morphology and delayed enhancement fit.<br>The articles report venous-phase isoattenuation in 80% of lesions; this is an article-reported frequency, not independently validated Core evidence.', article+' lines 5021-5023', 'CT contrast behavior / pitfall', 'Separate the second retrieval target from original row 17.');
add('schisto_calcification', 'Which hepatic calcification pattern on CT supports schistosomiasis when the liver is fibrotic?', 'Periportal/pericapsular septal calcification producing the article-described tortoise-shell pattern.<br><b>Interpretation pivot:</b> This distribution can support schistosomiasis as a cause of hepatic fibrosis and widened fissures. It is a general diagnostic clue, not a documented finding in the supplied RP-08 image.', article+' lines 5058-5061', 'CT appearance / discriminator', 'Separate calcification recognition from the fissural-distribution card.');
add('chf_medial', 'In a liver with widened fissures, which medial-segment volume pattern favors congenital hepatic fibrosis over viral/alcohol-related cirrhosis?', 'A normal or enlarged medial segment favors congenital hepatic fibrosis; a small medial segment is the contrasting pattern described for viral/alcohol-related cirrhosis.<br><b>Interpretation pivot:</b> Preserved medial-segment volume should prompt consideration of a fibropolycystic cause instead of treating all hepatic remodeling as typical cirrhosis.', article+' lines 5050-5055', 'Volume-distribution discriminator', 'Add an omitted, explicit source discriminator.');
add('psc_ibd', 'How does inflammatory bowel disease history change interpretation of beaded bile ducts with widened hepatic fissures?', 'It supports primary sclerosing cholangitis as the cause of the ductal and hepatic changes.<br><b>Interpretation pivot:</b> Pair the history with irregular duct dilatation/strictures and peripheral atrophy; PSC-related volume loss can precede established cirrhosis.', article+' lines 5044-5048', 'Pretest clue that changes differential ranking', 'Add an omitted clinical-to-imaging discriminator, without asserting an IBD history in the source image.');
add('iatrogenic_loss', 'What procedure history can explain localized hepatic volume loss and widened fissures without spontaneous atrophy?', 'Prior segmental resection or tumor ablation.<br><b>Interpretation pivot:</b> An anatomic defect explained by the treated/resected region favors iatrogenic parenchymal loss over spontaneous cirrhotic atrophy or congenital segment absence.', article+' lines 5029-5032', 'Pretest / reporting pitfall', 'Give the article-listed postsurgical mimic a focused interpretive card; no procedural images or follow-up are invented.');
add('fcf_wedge', 'What focal morphology can suggest confluent fibrosis as a cause of hepatic capsular retraction in cirrhosis?', 'Wedge-shaped fibrotic tissue with overlying capsular retraction.<br><b>Interpretation pivot:</b> In a cirrhotic liver, this morphology supports focal confluent fibrosis as an alternative to a mass; progressive/persistent delayed enhancement adds support. The morphology and enhancement pattern are suggestive, not sufficient to exclude malignancy.', core+'; '+article, 'Morphology / differential discriminator', 'Add omitted wedge-shape/capsular-retraction support from the captured Core report.');
add('chf_renal', 'Which associated organ findings support a fibropolycystic cause of hepatic remodeling with widened fissures?', 'Biliary abnormalities such as Caroli-type intrahepatic duct ectasia and renal cystic disease.<br><b>Interpretation pivot:</b> Their coexistence supports the congenital hepatic fibrosis/fibropolycystic spectrum over isolated cirrhotic volume loss. The article lists recessive and dominant polycystic disease associations; these are general clues, not documented renal findings in the supplied CT cases.', article+' lines 5050-5053', 'Associated imaging / pretest discriminator', 'Add source-supported cross-organ clue without asserting unshown renal findings.');
for (const r of corrected) r[20]=summary;
assert.equal(corrected.length, 27);
await fs.writeFile(identityFile, JSON.stringify(addedIds,null,2)+'\n');

// TSV is a transport format for Anki: preserve the requested literal 22 columns.
const workbook = Workbook.create();
const sheet = workbook.worksheets.add('Corrected cards');
sheet.getRange(`A1:V${corrected.length}`).values = corrected;
workbook.recalculate();
const exported = sheet.getRange(`A1:V${corrected.length}`).values.map(r=>r.map(v=>v??''));
assert.deepEqual(exported, corrected);
console.log((await workbook.inspect({kind:'table',range:'Corrected cards!O11:P12',include:'values',tableMaxRows:2,tableMaxCols:2,tableMaxCellChars:100,maxChars:600})).ndjson);
const tsv = exported.map(r=>r.join('\t')).join('\n')+'\n';
const importHeaders = ['#separator:tab','#html:true',`#notetype:${metadata.anki.noteType}`,`#deck:${metadata.anki.deckName}`,'#tags column:22'];
const importTsv = importHeaders.join('\n')+'\n'+tsv;
// The strict-schema import stays 22 columns. A separate transport wrapper can
// create a missing target deck, which a global #deck header cannot guarantee.
const createHeaders = [...importHeaders, '#deck column:23'];
const createDeckTsv = createHeaders.join('\n')+'\n'+exported.map(r=>[...r,metadata.anki.deckName].join('\t')).join('\n')+'\n';
assert(exported.every(r=>r.length===22 && r.every(v=>!/[\r\n\t]/.test(v))));
const rowIds = exported.map(r=>r[0].match(/[A-Z0-9]{12}$/)?.[0]);
assert.equal(new Set(rowIds).size,exported.length); assert(rowIds.every(Boolean));
assert(rowIds.every(id=>! /^(?:Q|CASE)\d+$/.test(id)));
assert(exported.every(r=>r[6]==='' && r[7]===''));
assert(exported.every(r=>[3,6,10,12,14].filter(i=>r[i]).length===1));
const refs = s => [...s.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)].map(m=>m[1]);
const beforeImgs = original.flatMap(r=>r.flatMap(refs));
const afterImgs = exported.flatMap(r=>r.flatMap(refs));
assert.deepEqual([...beforeImgs].sort(),[...afterImgs].sort());
const visible = s=>s.replace(/<[^>]*>/g,' ');
const forbidden = /Image references?:|Source image links?:|https?:\/\/|thumbnail URL|source URL|\b(?:RP|SDX)-\d+_[^\s<>]+\.(?:jpg|png)|arrow_\w+\.png/i;
assert(exported.every(r=>r.slice(0,21).every(v=>!forbidden.test(visible(v)))));
assert(!tsv.includes('Core-described T2'));
for(const [i,r] of original.entries()) if(!removed.has(i+1)) assert(exported.some(n=>n[0]===r[0]));
const known = new Set(metadata.downloadFiles.map(r=>r.filename));
const markerAssets = new Set(metadata.imageRegistry.flatMap(r=>r.captionMarkerAssets??[]));
assert([...new Set(afterImgs)].every(f=>known.has(f)||markerAssets.has(f)));
const checks = {status:'PASS',originalNotes:23,correctedNotes:27,removedNotes:3,addedNotes:7,retainedOriginalIdentities:20,columns:22,unknown:8,boardsTrap:2,highYield:17,mechanism:0,differentialDrill:0,uniqueImgSources:new Set(afterImgs).size,imageTagOccurrences:afterImgs.length,allOriginalImageTagsPreserved:true,allSelectedImagesPreserved:true,allDifferentialFieldsBlank:true,allArticleSummariesPreservedAndCorrected:true,sourceBasis:'Article + explicitly enumerated captured Core evidence; no independently opened Core PDF',cleanImportColumns:22,autoCreateWrapperColumns:23,autoCreateColumn:'Deck transport control only; original 22 columns unchanged',fields:names,removed:[...removed].map(([n,reason])=>({row:n,id:original[n-1][0].slice(-12),reason})),rowAudit:log,generatedAt:new Date().toISOString()};
await fs.writeFile(path.join(bundle,'corrected_cards.tsv'),tsv);
await fs.writeFile(path.join(bundle,'corrected_cards_anki_import.tsv'),importTsv);
await fs.writeFile(path.join(bundle,'corrected_cards_anki_create_deck.tsv'),createDeckTsv);
await fs.writeFile(path.join(work,'validation_results.json'),JSON.stringify(checks,null,2)+'\n');
const sha=s=>createHash('sha256').update(s).digest('hex');
console.log(JSON.stringify({notes:27,unknown:8,boardsTrap:2,highYield:17,media:checks.uniqueImgSources,hashes:{corrected:sha(tsv),import:sha(importTsv),autoCreate:sha(createDeckTsv)}}));
