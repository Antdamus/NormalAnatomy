const assert = require('node:assert/strict');
const nodeTest = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const core = require('../visual-lecture-core.js');
const fixture = require('./visual-lecture-fixture.cjs');
const media = require('../visual-lecture-media.js');
const path = require('node:path');
const privateFixturesAvailable = fixture.available() && [
  '../../master_source_queue/Liver_Lesion_Containing_Gas_2026-09-13T01-26-09-985Z/image_registry.json',
  '../../master_source_queue/Liver_Lesion_Containing_Gas_2026-09-13T01-26-09-985Z/master_source_package.txt',
  '../../master_source_queue/Pancreas_Master_Lecture_Library_2026-09-14/01_pancreas-foundations/master_source_import.json',
  'fixtures/gas-plan-response.json', 'fixtures/gas-narration-response.json', 'fixtures/pancreas-foundations-plan-response.json'
].every(name => fs.existsSync(path.resolve(__dirname, name)));
const test = (name, run) => nodeTest(name, {skip: privateFixturesAvailable ? false : 'Private study fixtures are local only; see README.md.'}, run);
function gasFixture() {
  const base = path.resolve(__dirname,'../../master_source_queue/Liver_Lesion_Containing_Gas_2026-09-13T01-26-09-985Z');
  return { id:'vl-aabbccdd', title:'Liver Lesion Containing Gas', settings:{chatgptTimeoutSec:30},
    registry:JSON.parse(fs.readFileSync(path.join(base,'image_registry.json'),'utf8')).map(i=>({...i,required:i.downloadRecommendation==='primaryTeachingSet'})),
    sourceText:fs.readFileSync(path.join(base,'master_source_package.txt'),'utf8'),
    planDraft:fs.readFileSync(path.join(__dirname,'fixtures/gas-plan-response.json'),'utf8'),
    plan:null,narration:null,status:'error',error:'Unknown case relationship in Pyogenic abscess on CT.' };
}
function narratedGasFixture() {
  const lesson = gasFixture();
  lesson.plan = core.validatePlan(core.parseJSON(lesson.planDraft), lesson.registry, lesson.sourceText);
  lesson.narrationDraft = fs.readFileSync(path.join(__dirname, 'fixtures/gas-narration-response.json'), 'utf8');
  lesson.narration = core.validateNarration(core.parseJSON(lesson.narrationDraft), lesson.plan, lesson.registry);
  lesson.speechifyTitle = lesson.title + ' · ' + lesson.id.slice(-8);
  lesson.status = 'audio-error';
  return lesson;
}

test('legacy reader requires matching narration as well as the topic title', () => {
  const lesson = narratedGasFixture();
  const state = {available:true,title:lesson.title,url:'https://app.speechify.com/reader/old',readerTextSample:lesson.narrationDraft.slice(0,1800)};
  assert.equal(core.matchesLectureReader(lesson,state),true);
  assert.equal(core.matchesLectureReader(lesson,{...state,readerTextSample:'A different lecture about the same topic.'}),false);
  assert.equal(core.matchesLectureReader(lesson,{...state,title:'Different topic'}),false);
  assert.equal(core.matchesLectureReader(lesson,{...state,available:false}),false);
  const live = lesson.narration.segments[3].text.slice(250,900);
  assert.equal(core.matchesLectureReader(lesson,{...state,readerTextSample:'',liveContext:{live:true,text:live}}),true);
  assert.equal(core.matchesLectureReader(lesson,{...state,readerTextSample:'',liveContext:{live:false,text:live}}),false);
  assert.equal(core.matchesLectureReader(lesson,{...state,readerTextSample:'',liveContext:{live:true,text:'STATdx image 1'}}),false);
});

test('the open raw-JSON reader connects, keeps its real cursor, and is repaired from saved prose', async () => {
  const lesson = narratedGasFixture(), env = worker(lesson), actions=[];
  const state={available:true,isPlaying:true,title:lesson.title,url:'https://app.speechify.com/reader/old',readerTextSample:lesson.narrationDraft.slice(0,1800),liveContext:{live:true,text:lesson.narration.segments[0].text.slice(100,800)}};
  env.context.querySpeechifyTabs=async()=>[{id:81}];
  env.context.sendSpeechifyMessageWithInjection=async(id,payload)=>{actions.push(payload.action);return {ok:true,result:state};};
  const connected=await env.context.visualLecturePlayer(lesson.id,'state');
  assert.equal(connected.readerFormat,'structured');
  assert.equal(core.locateLiveCase(lesson.narration.segments,connected.liveContext).caseId,lesson.plan.lectureOrder[0]);
  assert.equal(env.records.get(lesson.id).speechify.tabId,81);
  assert.match(env.records.get(lesson.id).error,/Prepare clean audio/);
  // The verified URL remains usable when paused between highlighted words.
  state.readerTextSample='';state.liveContext=null;
  assert.equal((await env.context.visualLecturePlayer(lesson.id,'play')).readerFormat,'structured');
  const response=await new Promise(resolve=>env.listeners[0]({type:'VISUAL_LECTURE_RESUME',id:lesson.id},{url:'chrome-extension://test/visual-lecture.html'},resolve));
  assert.equal(response.ok,true);assert.equal(env.runs.length,0);assert.equal(env.speech.length,1);
  assert.ok(actions.includes('pause'));
  assert.equal(env.speech[0].text,lesson.narration.text);
  assert.equal(env.records.get(lesson.id).narration.segments.length,8);
  assert.ok(!env.speech[0].text.includes('"schemaVersion"'));
});

test('same-title unrelated reader and a reused tab never receive playback commands', async () => {
  const lesson=narratedGasFixture(),env=worker(lesson),actions=[];
  lesson.speechify={readerUrl:'https://app.speechify.com/reader/old',boundTitle:lesson.title};
  env.records.set(lesson.id,lesson);
  env.context.querySpeechifyTabs=async()=>[{id:81}];
  env.context.sendSpeechifyMessageWithInjection=async(id,payload)=>{actions.push(payload.action);return {ok:true,result:{available:true,title:lesson.title,url:'https://app.speechify.com/reader/different',readerTextSample:'Unrelated explanation.'}};};
  await assert.rejects(env.context.visualLecturePlayer(lesson.id,'play'),/this saved lecture/);
  assert.deepEqual(actions,['state']);
});

test('structured ChatGPT results bypass clipboard and direct Speechify delivery', async () => {
  const source=fs.readFileSync(require.resolve('../chatgpt-paster.js'),'utf8');
  const start=source.indexOf('  const runPrompt = async (');
  const end=source.indexOf('  chrome.runtime.onMessage.addListener',start);
  const raw=narratedGasFixture().narrationDraft;
  const noop=async()=>{};
  const context=vm.createContext({
    localStorage:{removeItem:()=>{}},shouldUseMultipartPrompt:()=>false,
    ensureChatGptProjectTarget:noop,ensureNormalChatSurface:noop,sendProgress:()=>{},
    waitForComposerEditor:async()=>({}),fillVerifiedComposer:async editor=>editor,composerLooksFilled:()=>true,
    submitPrompt:noop,activateCurrentTab:noop,sendRuntimeRequest:noop,
    waitForFinalAssistantResponse:async()=>({text:raw,partial:false}),
    copyToClipboard:()=>{throw new Error('Structured JSON must not be copied to the narration clipboard.');},
    sendSpeechifyCreateMessage:()=>{throw new Error('Structured JSON must not reach Speechify directly.');}
  });
  vm.runInContext(source.slice(start,end)+'\nglobalThis.runPrompt = runPrompt;',context);
  const result=await context.runPrompt({promptText:'Generate organizer narration',autoSubmit:true,waitForResult:true,expectedOutputKind:'visual_lecture_json',completionPayload:{id:'vl-test'},speechify:{autoSave:true}});
  assert.equal(result.assistantText,raw);assert.equal(result.sideEffectsSuppressed,true);
});
test('valid source-grounded map and ordered narration preserve original captions', () => {
  const {lesson, rawNarration} = fixture();
  const captions = JSON.stringify(lesson.registry.map(i => i.caption));
  assert.equal(core.validatePlan(lesson.plan,lesson.registry,lesson.sourceText),lesson.plan);
  assert.equal(core.validateNarration(rawNarration,lesson.plan,lesson.registry).segments.length,3);
  assert.equal(JSON.stringify(lesson.registry.map(i => i.caption)),captions);
});
test('reject unknown images, omitted teaching images and split atomic groups', () => {
  const {lesson} = fixture();
  const wrong = structuredClone(lesson.plan); wrong.cases[0].imageIds[1] = 'RP-999';
  assert.throws(()=>core.validatePlan(wrong,lesson.registry,lesson.sourceText),/Unknown image/);
  const omitted = structuredClone(lesson.plan); omitted.cases[0].imageIds.pop();
  assert.throws(()=>core.validatePlan(omitted,lesson.registry,lesson.sourceText),/omitted/);
  const split = structuredClone(lesson.plan); split.cases[0].imageIds.push('SDX-27'); split.cases[0].modalityLabels['SDX-27']='MRI'; split.cases[1].imageIds.pop();
  split.cases[1].relationship = 'single image';
  assert.throws(()=>core.validatePlan(split,lesson.registry,lesson.sourceText),/Atomic group/);
});
test('patient identity requires explicit source evidence', () => {
  const {lesson} = fixture();
  const plan = structuredClone(lesson.plan); plan.cases[0].relationship='same patient'; plan.cases[0].relationshipEvidence='The same patient has both findings.';
  assert.throws(()=>core.validatePlan(plan,lesson.registry,lesson.sourceText),/source/);
});
test('reject truncated JSON, changed narration order and missing singular image references', () => {
  const {lesson,rawNarration} = fixture();
  assert.throws(()=>core.parseJSON('{"schemaVersion":1'),/complete JSON/);
  const wrong = structuredClone(rawNarration); wrong.segments.reverse();
  assert.throws(()=>core.validateNarration(wrong,lesson.plan,lesson.registry),/order/);
  rawNarration.segments[0].text = 'STATdx images 1 and 2 show ducts.';
  assert.throws(()=>core.validateNarration(rawNarration,lesson.plan,lesson.registry),/explicitly introduce/);
});
test('live alignment ignores time, requires live text, and handles repeated images by context', () => {
  const {lesson} = fixture();
  const segments = lesson.narration.segments;
  const text = segments[1].text.slice(0,160);
  assert.equal(core.locateLiveCase(segments,{live:true,text}).caseId,'cysts');
  assert.equal(core.locateLiveCase(segments,{live:false,text}),null);
  assert.equal(core.locateLiveCase(segments,{live:true,elapsedSeconds:300,imageNumber:26}),null);
  assert.equal(core.locateLiveCase([...segments, {...segments[1],caseId:'other'}],{live:true,text}),null);
  assert.equal(core.locateLiveCase(segments,{live:true,text:segments[0].text.slice(0,160)}).caseId,'ducts');
});
test('organizer and narrator receive full source; narration also receives the exact map', () => {
  const {lesson} = fixture();
  assert.ok(core.planPrompt(lesson).includes(lesson.sourceText));
  assert.ok(core.narrationPrompt(lesson).includes(lesson.sourceText));
  assert.ok(core.narrationPrompt(lesson).includes(JSON.stringify(lesson.plan)));
});
function worker(lesson) {
  const records = new Map([[lesson.id,structuredClone(lesson)]]), listeners=[], runs=[], speech=[], assets=new Map();
  const context = vm.createContext({ VisualLecture:core, VisualLectureMedia:media, console, TextEncoder, URL, Blob, atob, btoa, AbortSignal, crypto:require('node:crypto').webcrypto,
    fetch:async()=>{throw new Error('Unexpected network access in test.');},
    VisualLectureStore:{get:async id=>structuredClone(records.get(id)),put:async value=>records.set(value.id,structuredClone(value)),asset:async key=>assets.get(key),putAsset:async(key,blob)=>assets.set(key,{key,blob})},
    chrome:{runtime:{getURL:p=>'chrome-extension://test/'+p,onMessage:{addListener:fn=>listeners.push(fn)}},tabs:{query:async()=>[],create:async()=>({id:40}),update:async()=>({id:40})}},
    openChatGptAndStart:async(...args)=>runs.push(args), buildSpeechifyPayload:()=>({folder:{id:'folder'}}),
    buildSpeechifyFolderUrl:id=>'https://app.speechify.com/library?folder='+encodeURIComponent(id),
    createSpeechifyLectureFromChatGPT:async args=>{speech.push(args);if(args.onTabReady) await args.onTabReady({id:80});return {readerReady:true,tabId:80,readerUrl:'https://app.speechify.com/reader/1'};},
    querySpeechifyTabs:async()=>[],
  });
  vm.runInContext(fs.readFileSync(require.resolve('../visual-lecture-worker.js'),'utf8'),context);
  return {records,runs,speech,context,listeners,assets};
}

function pancreasFixture() {
  const master = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../master_source_queue/Pancreas_Master_Lecture_Library_2026-09-14/01_pancreas-foundations/master_source_import.json'), 'utf8'));
  const registry = master.imageRegistry.map(image => ({ ...image, required: master.selectedPrimaryImageIds.includes(image.masterImageId) }));
  return { id: 'vl-9d73d1bcbe17d6a684057f37', title: master.articleTitle, registry,
    sourceText: master.packageText + '\n' + JSON.stringify(registry),
    planDraft: fs.readFileSync(path.join(__dirname, 'fixtures/pancreas-foundations-plan-response.json'), 'utf8'),
    planDraftComplete: true, plan: null, narration: null, status: 'error', stage: 'plan', token: 'old',
    settings: { chatgptTimeoutSec: 30 }, error: 'Overview images do not belong to the branch.' };
}

function pancreasRunnerEnvelope() {
  const lesson = pancreasFixture();
  const master = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../master_source_queue/Pancreas_Master_Lecture_Library_2026-09-14/01_pancreas-foundations/master_source_import.json'), 'utf8'));
  const source = fs.readFileSync(require.resolve('../service_worker.js'), 'utf8');
  const context = vm.createContext({ TeachingFramework: require('../teaching-framework.js'), isFirstPassNarrativeMode: () => true });
  vm.runInContext(source.slice(source.indexOf('function buildMasterSourcePromptPackage('), source.indexOf('async function buildMasterSourceExtraction(')), context);
  lesson.sourceText = context.buildMasterSourcePromptPackage({ mode:'narrative', engine:'mixed' }, 'Source capture for a visual lecture. Preserve the complete article and captions.', master);
  lesson.sourceMetadata = {masterSource:{manifest:master.manifest}};
  lesson.teachingFramework = master.teachingFramework;
  lesson.plan = core.validatePlan(core.parseJSON(lesson.planDraft), lesson.registry, lesson.sourceText);
  return {lesson,master};
}

test('real master-source envelopes retain the whole article while removing duplicate download metadata from model requests', () => {
  const {lesson,master} = pancreasRunnerEnvelope(), before = JSON.stringify(lesson);
  const document = core.sourceDocument(lesson);
  assert.equal(document.compacted,true);
  assert.equal(document.text, master.packageText.trim(),'Every character of the full original source package survives');
  assert.deepEqual(document.manifest,master.manifest);
  const organizer = core.planPrompt(lesson), captionSection = organizer.split('=== AUTHORITATIVE IMAGE REGISTRY ===\n\n')[1].split('\n\n=== FULL ORIGINAL SOURCE PACKAGE')[0];
  const images = JSON.parse(captionSection);
  assert.equal(images.length,143); assert.equal(images.filter(i=>i.required!==false).length,133);
  for (const sourceImage of lesson.registry) {
    const image = images.find(i=>i.masterImageId===sourceImage.masterImageId);
    assert.equal(image.caption,sourceImage.caption);
    assert.deepEqual(image.clusterImageIds,sourceImage.clusterImageIds);
  }
  assert.ok(!organizer.includes('"pixelHash"')); assert.ok(!organizer.includes('"annotatedFile"'));
  const allImages = new Set();
  for (const ids of core.narrationBatches(lesson.plan)) {
    const prompt = core.narrationPrompt(lesson,ids);
    assert.ok(prompt.length < 99500, `Pancreas request should fit one message, received ${prompt.length} characters`);
    assert.ok(prompt.includes(master.packageText.trim()));
    assert.ok(prompt.includes(JSON.stringify(master.manifest.editorialCorrections)));
    const registry = JSON.parse(prompt.split('=== IMAGE REGISTRY WITH SPOKEN CALLOUTS ===\n\n')[1].split('\n\n=== FULL ORIGINAL SOURCE PACKAGE')[0]);
    const expectedIds = new Set(lesson.plan.cases.filter(c=>ids.includes(c.id)).flatMap(c=>c.imageIds));
    assert.deepEqual(new Set(registry.map(i=>i.masterImageId)),expectedIds);
    registry.forEach(image=>{allImages.add(image.masterImageId);assert.equal(image.caption,lesson.registry.find(i=>i.masterImageId===image.masterImageId).caption);});
  }
  assert.equal(allImages.size,133);
  assert.equal(JSON.stringify(lesson),before,'The full saved lesson, source and registry must not be altered by prompt projection');
  const mismatch = structuredClone(lesson);mismatch.registry[0].caption='Different source caption';
  assert.equal(core.sourceDocument(mismatch).text,mismatch.sourceText,'Unrecognized or mismatched envelopes must retain the original instead of silently dropping content');
});

test('a saved section-four transport failure resumes that section with compact input and preserves completed sections', async () => {
  const {lesson} = pancreasRunnerEnvelope();
  lesson.narrationProgress={version:1,revision:1,batches:core.narrationBatches(lesson.plan),nextBatch:3,segments:[{caseId:'C01',text:'Previously saved narration.'}]};
  lesson.error=lesson.retryReason='The prompt changed before it could be sent. This message was not sent; retry to rebuild it with its required comparison.';
  const before=structuredClone(lesson.narrationProgress),env=worker(lesson);
  const result=await studyAction(env,lesson,'VISUAL_LECTURE_RESUME');
  assert.equal(result.ok,true,result.error);assert.equal(env.runs.length,1);
  const saved=env.records.get(lesson.id);
  assert.deepEqual(saved.narrationProgress,before);
  assert.equal(saved.generationSummary.sectionNumber,4);assert.equal(saved.generationSummary.sectionCount,9);
  assert.ok(saved.generationSummary.promptCharacters<100000);
  assert.match(env.runs[0][1],/PREPARATION STATUS: section 4 of 9/);
  assert.ok(!env.runs[0][1].includes(lesson.retryReason),'A browser transport failure is not a model content correction');
  assert.equal(env.runs[0][3].completionPayload.sectionNumber,4);
  assert.equal(env.records.get(lesson.id).sourceText,lesson.sourceText);
});

test('actual Pancreas response preserves all images, cross-branch overviews and unassigned modality lists', () => {
  const lesson = pancreasFixture(), original = core.parseJSON(lesson.planDraft), before = JSON.stringify(lesson.registry);
  const plan = core.validatePlan(core.parseJSON(lesson.planDraft), lesson.registry, lesson.sourceText);
  assert.equal(plan.patterns.length, 10); assert.equal(plan.cases.length, 62);
  assert.equal(new Set(plan.cases.flatMap(item => item.imageIds)).size, 133);
  assert.deepEqual(plan.patterns, original.patterns);
  for (const item of plan.cases) {
    assert.deepEqual(item.imageIds, original.cases.find(c => c.id === item.id).imageIds);
    assert.deepEqual(item.modalitySummary, original.cases.find(c => c.id === item.id).modalityLabels);
    assert.ok(item.imageIds.every(id => typeof item.modalityLabels[id] === 'string'));
  }
  const arteries = plan.cases.find(c => c.id === 'C05');
  assert.equal(arteries.modalityLabels['RP-A02-008'], 'Illustration');
  assert.match(arteries.modalityLabels['RP-A02-013'], /CT angiogram/);
  assert.equal(arteries.modalityLabels['RP-A02-010'], 'See original caption for modality', 'Do not guess a mapping from a case-level modality list');
  assert.equal(JSON.stringify(lesson.registry), before);
  const invalid = structuredClone(plan);
  invalid.patterns[0].overviewImageIds = ['RP-A01-008']; // Archived image, no illustrated case.
  assert.throws(() => core.validatePlan(invalid, lesson.registry, lesson.sourceText), /illustrated case/);
});

test('Resume recovers the actual Pancreas draft and begins only the first narration pass', async () => {
  const lesson = pancreasFixture(), env = worker(lesson);
  const response = await studyAction(env, lesson, 'VISUAL_LECTURE_RESUME');
  assert.equal(response.ok, true, response.error);
  const saved = env.records.get(lesson.id);
  assert.equal(saved.planDraft, lesson.planDraft);
  assert.equal(saved.plan.cases.length, 62);
  assert.equal(env.runs.length, 1); assert.equal(env.speech.length, 0);
  assert.equal(env.runs[0][3].completionPayload.stage, 'narration');
  assert.ok(saved.narrationProgress.batches.length > 1);
  assert.deepEqual(saved.narrationProgress.batches.flat(), saved.plan.lectureOrder);
});

test('response recovery validates before saving and never overwrites a map, cached image or late generation', async () => {
  const lesson = pancreasFixture(), env = worker(lesson);
  const key = lesson.id + '/RP-A02-001/plain'; env.assets.set(key, { blob: 'original' });
  const send = (text, url = 'chrome-extension://test/visual-lecture.html') => new Promise(resolve => env.listeners[0](
    { type: 'VISUAL_LECTURE_IMPORT_PLAN_RESPONSE', id: lesson.id, text }, { url }, resolve));
  assert.equal((await send('{')).ok, false);
  assert.equal(env.records.get(lesson.id).token, 'old');
  assert.equal((await send(lesson.planDraft, 'https://example.com')).ok, false);
  const result = await send(lesson.planDraft);
  assert.equal(result.ok, true, result.error); assert.equal(result.result.images, 133);
  const saved = env.records.get(lesson.id);
  assert.equal(saved.status, 'map-ready'); assert.equal(saved.token, '');
  assert.deepEqual(saved.registry, lesson.registry); assert.equal(saved.sourceText, lesson.sourceText);
  assert.equal(env.assets.get(key).blob, 'original'); assert.equal(env.runs.length, 0); assert.equal(env.speech.length, 0);
  assert.equal((await send(lesson.planDraft)).ok, false);
  assert.equal((await env.context.completeVisualLecture({completionPayload:{id:lesson.id,token:'old',stage:'plan'},result:{assistantText:lesson.planDraft}}, {url:'https://chatgpt.com/c/test'})).ignored, true);
});

test('large narration saves ordered passes, resumes after interruption, and creates only one final audio', async () => {
  const lesson = pancreasFixture();
  lesson.plan = core.validatePlan(core.parseJSON(lesson.planDraft), lesson.registry, lesson.sourceText);
  let env = worker(lesson); await env.context.runVisualLectureStage(lesson.id, 'narration');
  const allCaseIds = [];
  const finishPass = async (partial = false) => {
    const saved = env.records.get(lesson.id), ids = saved.narrationProgress.batches[saved.narrationProgress.nextBatch];
    const raw = { schemaVersion:1, segments: ids.map(caseId => ({ caseId, text: saved.plan.cases.find(c => c.id === caseId).imageIds.map(id => {
      const image = saved.registry.find(i => i.masterImageId === id);
      return core.imageReference(image) + '. ' + core.spokenCaption(image.captionHtml || image.caption);
    }).join('\n\n') })) };
    const message = {completionPayload:{id:lesson.id,token:saved.token,stage:'narration'}, result:{assistantText:JSON.stringify(raw),partial}};
    const result = await env.context.completeVisualLecture(message, {url:'https://chatgpt.com/c/test'});
    if (!partial) { assert.equal(result.saved,true,result.error); allCaseIds.push(...ids); }
    return message;
  };
  const first = await finishPass();
  assert.equal(env.speech.length, 0);
  assert.equal((await env.context.completeVisualLecture(first,{url:'https://chatgpt.com/c/test'})).ignored,true);
  const previousSegments = structuredClone(env.records.get(lesson.id).narrationProgress.segments);
  await finishPass(true);
  assert.deepEqual(env.records.get(lesson.id).narrationProgress.segments, previousSegments);
  env = worker(env.records.get(lesson.id)); // Simulate a browser worker restart.
  assert.equal((await studyAction(env,lesson,'VISUAL_LECTURE_RESUME')).ok,true);
  assert.equal(env.records.get(lesson.id).narrationProgress.nextBatch,1);
  while (env.records.get(lesson.id).narrationProgress) await finishPass();
  const saved = env.records.get(lesson.id);
  assert.deepEqual(allCaseIds, lesson.plan.lectureOrder);
  assert.equal(saved.narration.segments.length,62); assert.equal(saved.status,'ready');
  assert.equal(env.speech.length,1); assert.ok(!env.speech[0].text.includes('"schemaVersion"'));
  assert.equal(saved.narrationProgress,undefined);
});

test('article-qualified references disambiguate repeated numbers and validate original HTML arrow cues', () => {
  const registry = ['Anatomy','Inflammation'].map((title,index) => ({masterImageId:'RP-A0'+index+'-001',sourceKind:'radprimer',sourceLabel:'RadPrimer — '+title, sourceImageNumber:1,
    caption:'Caption flattened without icons.',captionHtml:'Axial CT shows the finding <img src="arrow_WS.png">.'}));
  const plan = {patterns:[{id:'p',label:'Compare'}],cases:[{id:'c',patternId:'p',label:'Case',imageIds:registry.map(i=>i.masterImageId)}],lectureOrder:['c']};
  const text = registry.map(i=>core.imageReference(i)+'. The white solid arrow marks the finding.').join('\n');
  assert.doesNotThrow(()=>core.validateNarration({schemaVersion:1,segments:[{caseId:'c',text}]},plan,registry,{requireArrowCues:true}));
  assert.throws(()=>core.validateNarration({schemaVersion:1,segments:[{caseId:'c',text:text.replace('white solid arrow','arrow')}]},plan,registry,{requireArrowCues:true}),/Anatomy image 1.*white solid arrow/);
  const segment = {imageIds:registry.map(i=>i.masterImageId)}, state = {lectureSection:{highlightAvailable:true,source:'explicit-live-image',imageNumber:1,sourceKind:'radprimer'}};
  assert.equal(core.locateLiveImage(registry,segment,state),'');
  assert.equal(core.locateLiveImage(registry,segment,{...state,liveContext:{live:true,text}}),registry[1].masterImageId);
  assert.equal(core.locateLiveImage(registry,{imageIds:[registry[1].masterImageId]},state),registry[1].masterImageId);
});

test('ChatGPT visibly reports failed visual-review handoffs and waits for structured output', () => {
  const source = fs.readFileSync(require.resolve('../chatgpt-paster.js'),'utf8'), overlays = [];
  const context = vm.createContext({ chrome:{runtime:{sendMessage:(_message,callback)=>callback({ok:true,result:{error:'Missing labels'}})}},
    createOrUpdateOverlay:value=>overlays.push(value), copyToClipboard:async()=>true });
  vm.runInContext(source.slice(source.indexOf('  const sendCompletionMessage ='),source.indexOf('  const sendRuntimeRequest =')) + '\nthis.sendCompletionMessage=sendCompletionMessage;',context);
  context.sendCompletionMessage('VISUAL_LECTURE_GENERATED',{id:'lesson'},{assistantText:'saved JSON'});
  assert.match(overlays[0].message,/Missing labels/); assert.equal(overlays[0].text,'saved JSON');
  vm.runInContext(source.slice(source.indexOf('  const outputMatchesExpectation ='),source.indexOf('  const extractCleanMarkdownText ='))+'\nthis.matches=outputMatchesExpectation;',context);
  assert.equal(context.matches('I will organize the images now.','visual_lecture_json'),false);
  assert.equal(context.matches('{"schemaVersion":1','visual_lecture_json'),false);
  assert.equal(context.matches('{"schemaVersion":1,"patterns":[],"cases":[]}','visual_lecture_json'),true);
});
test('plan completion persists map and starts narration; duplicate and stale callbacks cannot start more jobs', async()=>{
  const {lesson}=fixture(); Object.assign(lesson,{status:'organizing',stage:'plan',token:'current',plan:null,narration:null});
  const env=worker(lesson), plan=fixture().lesson.plan;
  const message={completionPayload:{id:lesson.id,token:'current',stage:'plan'},result:{assistantText:JSON.stringify(plan)}};
  await env.context.completeVisualLecture(message,{url:'https://chatgpt.com/c/test'});
  assert.equal(env.records.get(lesson.id).status,'narrating'); assert.equal(env.runs.length,1);
  await env.context.completeVisualLecture(message,{url:'https://chatgpt.com/c/test'});
  assert.equal(env.runs.length,1);
});
test('partial generation is saved as a recoverable draft and never sent to Speechify',async()=>{
  const {lesson,rawNarration}=fixture(); Object.assign(lesson,{status:'narrating',stage:'narration',token:'x',narration:null});
  const env=worker(lesson);
  await env.context.completeVisualLecture({completionPayload:{id:lesson.id,token:'x',stage:'narration'},result:{assistantText:JSON.stringify(rawNarration),partial:true}},{url:'https://chatgpt.com/c/test'});
  assert.equal(env.records.get(lesson.id).status,'error'); assert.ok(env.records.get(lesson.id).narrationDraft); assert.equal(env.speech.length,0);
});
test('successful narration persists first and sends only spoken prose with a unique topic identity',async()=>{
  const {lesson,rawNarration}=fixture(); Object.assign(lesson,{status:'narrating',stage:'narration',token:'x',narration:null});
  const env=worker(lesson);
  await env.context.completeVisualLecture({completionPayload:{id:lesson.id,token:'x',stage:'narration'},result:{assistantText:JSON.stringify(rawNarration)}},{url:'https://chatgpt.com/c/test'});
  assert.equal(env.records.get(lesson.id).status,'ready'); assert.equal(env.speech.length,1);
  assert.equal(env.speech[0].autoSave,true); assert.equal(env.speech[0].openReader,true);
  assert.ok(!env.speech[0].text.includes('"schemaVersion"')); assert.ok(env.speech[0].title.endsWith(lesson.id.slice(-8)));
});
test('wrong lecture cannot receive playback controls',async()=>{
  const {lesson}=fixture(), env=worker(lesson); const actions=[];
  env.context.querySpeechifyTabs=async()=>[{id:80}];
  env.context.sendSpeechifyMessageWithInjection=async(id,payload)=>{actions.push(payload.action);return {ok:true,result:{title:'Another lecture'}};};
  await assert.rejects(env.context.visualLecturePlayer(lesson.id,'play'),/this saved lecture/);
  assert.deepEqual(actions,['state']);
});
test('actual gas response normalizes descriptions without losing cases, panels or source images',()=>{
  const lesson=gasFixture(), captions=JSON.stringify(lesson.registry.map(i=>i.caption));
  const plan=core.validatePlan(core.parseJSON(lesson.planDraft),lesson.registry,lesson.sourceText);
  assert.equal(plan.patterns.length,5);assert.equal(plan.cases.length,8);
  assert.equal(new Set(plan.cases.flatMap(c=>c.imageIds)).size,14);
  assert.equal(plan.cases[0].relationship,'comparison');
  assert.match(plan.cases[0].relationshipDescription,/same-patient relationship not established/);
  assert.equal(plan.cases[1].relationship,'single image');
  assert.match(plan.cases[1].relationshipDescription,/four-panel composite/);
  assert.deepEqual(plan.cases[1].imageIds,['SDX-07']);
  assert.equal(JSON.stringify(lesson.registry.map(i=>i.caption)),captions);
  assert.match(core.planPrompt(lesson),/EXACTLY one of "single image", "same patient", or "comparison"/);
});
test('Resume reuses the legacy saved gas response and launches narration only',async()=>{
  const lesson=gasFixture(), env=worker(lesson);
  const response=await new Promise(resolve=>env.listeners[0]({type:'VISUAL_LECTURE_RESUME',id:lesson.id},{url:'chrome-extension://test/visual-lecture.html'},resolve));
  assert.equal(response.ok,true);assert.equal(env.runs.length,1);
  assert.equal(env.runs[0][3].completionPayload.stage,'narration');
  assert.equal(env.records.get(lesson.id).planDraft,lesson.planDraft);
  assert.equal(env.records.get(lesson.id).status,'narrating');
  assert.ok(env.runs[0][1].includes(lesson.sourceText));
});
test('partial drafts and unrecognized relationships cannot be promoted during recovery',async()=>{
  const lesson=gasFixture();lesson.error='ChatGPT returned an incomplete response.';lesson.planDraftComplete=false;
  const env=worker(lesson);assert.equal(await env.context.recoverSavedVisualPlan(lesson),false);
  const plan=core.parseJSON(lesson.planDraft);plan.cases[0].relationship='same-patient relationship not established';
  assert.throws(()=>core.validatePlan(plan,lesson.registry,lesson.sourceText),/Unknown case relationship/);
  plan.cases[0].relationship='single patient';
  assert.throws(()=>core.validatePlan(plan,lesson.registry,lesson.sourceText),/Unknown case relationship/);
});
test('image validation checks raster bytes instead of trusting the content-type header',async()=>{
  const {lesson,mediaDir}=fixture(), bytes=fs.readFileSync(path.join(mediaDir,lesson.registry[0].plainFilename));
  const blob=await media.imageBlob(new Blob([bytes],{type:'application/octet-stream'}));
  assert.equal(blob.type,'image/jpeg');assert.deepEqual(Buffer.from(await blob.arrayBuffer()),bytes);
  await assert.rejects(media.imageBlob(new Blob(['<!doctype html><title>Sign in</title>'],{type:'image/jpeg'})),/sign-in/);
});
test('image cache uses the matching source session and keeps exact original bytes',async()=>{
  const {lesson,mediaDir}=fixture(), env=worker(lesson), image=lesson.registry[0];
  const bytes=fs.readFileSync(path.join(mediaDir,image.plainFilename));let injected;
  env.context.chrome.tabs.query=async({url})=>{assert.equal(url,'https://app.statdx.com/*');return [{id:55}];};
  env.context.chrome.scripting={executeScript:async request=>{injected=request;return [{result:{base64:bytes.toString('base64'),type:'application/octet-stream'}}];}};
  const result=await env.context.cacheVisualLectureImage(lesson.id,image.masterImageId,'plain');
  assert.equal(result.method,'source-session');assert.equal(injected.world,'MAIN');assert.equal(injected.target.tabId,55);
  assert.equal(injected.args[0],image.plainUrl);
  assert.deepEqual(Buffer.from(await env.assets.get(`${lesson.id}/${image.masterImageId}/plain`).blob.arrayBuffer()),bytes);
});
test('image errors are actionable, and unrelated URLs never get a source-session fetch',async()=>{
  const {lesson}=fixture(), env=worker(lesson), image=lesson.registry[0];
  env.context.fetch=async()=>({ok:true,blob:async()=>new Blob(['<html>login</html>'],{type:'text/html'})});
  await assert.rejects(env.context.cacheVisualLectureImage(lesson.id,image.masterImageId,'plain'),/Open a signed-in STATdx article tab/);
  assert.equal(env.assets.size,0);
  const record=env.records.get(lesson.id);record.registry[0].plainUrl='https://example.com/image.jpg';
  await assert.rejects(env.context.cacheVisualLectureImage(lesson.id,image.masterImageId,'plain'),/Unsupported source/);
});
test('serialized page fetch is same-origin and does not read session credentials',async()=>{
  const {lesson}=fixture(),env=worker(lesson);let options;
  env.context.location={origin:'https://app.statdx.com'};
  env.context.fetch=async(url,opts)=>{options=opts;return {ok:true,arrayBuffer:async()=>new Uint8Array([255,216,255,0]).buffer,headers:{get:()=> 'application/octet-stream'}};};
  const result=await env.context.readVisualLectureSourceImage('https://app.statdx.com/image/thumbnail/example');
  assert.equal(options.credentials,'include');assert.equal(result.base64,'/9j/AA==');
  const blocked=await env.context.readVisualLectureSourceImage('https://app.radprimer.com/images/example');
  assert.match(blocked.error,/source tab changed/);
});


test('saved legacy Speechify folder links use the current library route', () => {
  const source=fs.readFileSync(require.resolve('../service_worker.js'),'utf8');
  const build=source.slice(source.indexOf('function buildSpeechifyFolderUrl('),source.indexOf('function isSpeechifyHost('));
  const parse=source.slice(source.indexOf('function parseSpeechifyFolderUrl('),source.indexOf('function normalizeSettings('));
  const context=vm.createContext({URL,SPEECHIFY_APP_BASE_URL:'https://app.speechify.com/',isSpeechifyHost:host=>host==='app.speechify.com'});
  vm.runInContext(build+'\n'+parse,context);
  assert.equal(context.buildSpeechifyFolderUrl('saved-folder'),'https://app.speechify.com/library?folder=saved-folder');
  assert.equal(context.parseSpeechifyFolderUrl('https://app.speechify.com/?folder=saved-folder').url,'https://app.speechify.com/library?folder=saved-folder');
});


test('audio destination updates only the saved lecture and rejects unrelated or insecure links', async () => {
  const {lesson}=fixture(),env=worker(lesson);
  const source=fs.readFileSync(require.resolve('../service_worker.js'),'utf8');
  env.context.SPEECHIFY_APP_BASE_URL='https://app.speechify.com/';
  vm.runInContext(source.slice(source.indexOf('function buildSpeechifyFolderUrl('),source.indexOf('async function querySpeechifyTabs('))+'\n'+source.slice(source.indexOf('function parseSpeechifyFolderUrl('),source.indexOf('function normalizeSettings(')),env.context);
  const setFolder=folderUrl=>new Promise(resolve=>env.listeners[0]({type:'VISUAL_LECTURE_SET_AUDIO_FOLDER',id:lesson.id,folderUrl},{url:'chrome-extension://test/visual-lecture.html'},resolve));
  assert.equal((await setFolder('http://app.speechify.com/?folder=other')).ok,false);
  assert.equal((await setFolder('https://example.com/?folder=other')).ok,false);
  assert.equal((await setFolder('https://app.speechify.com/?folder=chosen-folder')).ok,true);
  const saved=env.records.get(lesson.id);
  assert.equal(saved.settings.speechifyFolderId,'chosen-folder');
  assert.equal(saved.settings.speechifyFolderUrl,'https://app.speechify.com/library?folder=chosen-folder');
  assert.deepEqual(saved.plan,lesson.plan);assert.deepEqual(saved.narration,lesson.narration);
});


function sourceArrowNarration(lesson) {
  return {schemaVersion:1,segments:lesson.plan.lectureOrder.map(caseId=>({caseId,text:lesson.plan.cases.find(c=>c.id===caseId).imageIds.map(id=>{
    const image=lesson.registry.find(i=>i.masterImageId===id);
    return `${image.sourceLabel} image ${image.sourceImageNumber}. ${core.spokenCaption(image.caption)}`;
  }).join('\n\n')}))};
}
function studyAction(env,lesson,type) {
  return new Promise(resolve=>env.listeners[0]({type,id:lesson.id},{url:'chrome-extension://test/visual-lecture.html'},resolve));
}

test('spoken captions preserve arrow colors/styles, nearby findings, and original source HTML',()=>{
  const caption='The catheter <img src="arrow_WC.png"> lies beside the cavity <img src="/img/arrows/arrow_WS.png">. Unknown marker <img src="arrow_ZZ.png">.';
  assert.equal(core.spokenCaption(caption),'The catheter (white curved arrow) lies beside the cavity (white solid arrow) . Unknown marker (marked callout) .');
  assert.deepEqual(core.captionArrowCodes(caption),['WC','WS','ZZ']);
  assert.equal(core.arrowLabel('CO'),'cyan open arrow');assert.equal(core.arrowLabel('ZZ'),'');
  const lesson=narratedGasFixture(),before=JSON.stringify(lesson.registry),prompt=core.narrationPrompt(lesson);
  assert.match(prompt,/white curved arrow/);assert.match(prompt,/white solid arrow/);
  assert.ok(prompt.includes('spokenCaption'));assert.ok(prompt.includes('drainage catheter'));
  assert.equal(JSON.stringify(lesson.registry),before);
});

test('arrow validation is image-specific and rejects omitted or generic callouts without breaking saved lectures',()=>{
  const lesson=narratedGasFixture(),raw=sourceArrowNarration(lesson);
  const narrated=core.validateNarration(raw,lesson.plan,lesson.registry,{requireArrowCues:true});
  assert.equal(narrated.arrowCuesVersion,1);
  assert.ok(!narrated.text.includes('<img'));assert.ok(!narrated.text.includes('arrow_W'));
  const missing=structuredClone(raw);missing.segments[0].text=missing.segments[0].text.replace('white curved arrow','arrow');
  assert.throws(()=>core.validateNarration(missing,lesson.plan,lesson.registry,{requireArrowCues:true}),/STATdx image 1.*white curved arrow/);
  // The next image still says "white curved arrow"; it must not satisfy image 1's missing cue.
  assert.match(missing.segments[0].text,/white curved arrow/);
  const color=structuredClone(raw);color.segments[0].text=color.segments[0].text.replace('white curved arrow','black curved arrow');
  assert.throws(()=>core.validateNarration(color,lesson.plan,lesson.registry,{requireArrowCues:true}),/white curved arrow/);
  assert.doesNotThrow(()=>core.validateNarration(JSON.parse(lesson.narrationDraft),lesson.plan,lesson.registry));
  assert.throws(()=>core.validateNarration(JSON.parse(lesson.narrationDraft),lesson.plan,lesson.registry,{requireArrowCues:true}),/explain the/);
});

test('regenerate keeps map, media and playable narration while launching only the new narration stage',async()=>{
  const {lesson}=fixture(),env=worker(lesson),original=structuredClone(lesson);
  env.assets.set('cached-original',{blob:new Blob(['original bytes'])});
  const response=await studyAction(env,lesson,'VISUAL_LECTURE_REGENERATE_NARRATION');
  assert.equal(response.ok,true,response.error);assert.equal(env.runs.length,1);
  assert.equal(env.runs[0][3].completionPayload.stage,'narration');
  assert.ok(env.runs[0][1].includes(JSON.stringify(original.plan)));assert.ok(env.runs[0][1].includes(original.sourceText));
  const saved=env.records.get(lesson.id);
  assert.deepEqual(saved.plan,original.plan);assert.deepEqual(saved.registry,original.registry);assert.deepEqual(saved.narration,original.narration);
  assert.equal(saved.pendingNarrationRevision,2);assert.equal(saved.narrationContractVersion,2);
  assert.equal(saved.status,'narrating');assert.equal(env.speech.length,0);assert.equal(env.assets.size,1);
  assert.equal((await studyAction(env,lesson,'VISUAL_LECTURE_REGENERATE_NARRATION')).ok,false);
  assert.equal(env.runs.length,1);
  env.context.querySpeechifyTabs=async()=>[{id:81}];
  env.context.sendSpeechifyMessageWithInjection=async()=>({ok:true,result:{available:true,title:lesson.speechifyTitle,url:'https://app.speechify.com/item/old'}});
  await env.context.visualLecturePlayer(lesson.id,'state');
  assert.equal(env.records.get(lesson.id).status,'narrating','Polling the playable old lecture must not finish regeneration');
});

test('invalid regenerated narration keeps the old lecture and Resume retries narration, never its old audio',async()=>{
  const {lesson,rawNarration}=fixture(),env=worker(lesson);
  await studyAction(env,lesson,'VISUAL_LECTURE_REGENERATE_NARRATION');
  const pending=env.records.get(lesson.id),token=pending.token;
  const result=await env.context.completeVisualLecture({completionPayload:{id:lesson.id,token,stage:'narration'},result:{assistantText:JSON.stringify(rawNarration)}},{url:'https://chatgpt.com/c/test'});
  assert.match(result.error,/explain the/);assert.equal(env.speech.length,0);
  assert.deepEqual(env.records.get(lesson.id).narration,lesson.narration);assert.equal(env.records.get(lesson.id).speechifyTitle,lesson.speechifyTitle);
  assert.equal((await studyAction(env,lesson,'VISUAL_LECTURE_RESUME')).ok,true);
  assert.equal(env.runs.length,2);assert.equal(env.runs[1][3].completionPayload.stage,'narration');
  assert.match(env.runs[1][1],/Previous attempt failed validation/);
  assert.notEqual(env.records.get(lesson.id).token,token);
  const late=await env.context.completeVisualLecture({completionPayload:{id:lesson.id,token,stage:'narration'},result:{assistantText:JSON.stringify(sourceArrowNarration(lesson))}},{url:'https://chatgpt.com/c/test'});
  assert.equal(late.ignored,true);assert.equal(env.speech.length,0);
});

test('valid regeneration archives the old lecture and binds a distinct new audio version',async()=>{
  const {lesson}=fixture();lesson.speechify={readerUrl:'https://app.speechify.com/item/old',boundTitle:lesson.speechifyTitle};
  const env=worker(lesson),raw=sourceArrowNarration(lesson);
  await studyAction(env,lesson,'VISUAL_LECTURE_REGENERATE_NARRATION');
  const pending=env.records.get(lesson.id);
  await env.context.completeVisualLecture({completionPayload:{id:lesson.id,token:pending.token,stage:'narration'},result:{assistantText:JSON.stringify(raw)}},{url:'https://chatgpt.com/c/test'});
  const saved=env.records.get(lesson.id);
  assert.equal(saved.status,'ready');assert.equal(saved.narrationRevision,2);assert.equal(saved.pendingNarrationRevision,undefined);
  assert.equal(saved.lectureHistory.length,1);assert.deepEqual(saved.lectureHistory[0].narration,lesson.narration);
  assert.equal(saved.lectureHistory[0].speechify.readerUrl,lesson.speechify.readerUrl);
  assert.deepEqual(saved.plan,lesson.plan);assert.deepEqual(saved.registry,lesson.registry);
  assert.equal(env.speech.length,1);assert.match(env.speech[0].title,/lecture 2$/);
  assert.match(env.speech[0].text,/white (?:open|solid|curved) arrow/);
  assert.equal(core.matchesLectureReader(saved,{available:true,title:lesson.speechifyTitle,url:lesson.speechify.readerUrl,readerTextSample:saved.narration.text.slice(0,1800)}),false);
  assert.equal(core.matchesLectureReader(saved,{available:true,title:lesson.title,url:'https://app.speechify.com/item/legacy',readerTextSample:saved.narration.text.slice(0,1800)}),false);
  assert.equal(core.matchesLectureReader(saved,{available:true,title:saved.speechifyTitle,url:'https://app.speechify.com/item/new'}),true);
});

test('a new audio save failure preserves the validated text, old version and unchanged map',async()=>{
  const {lesson}=fixture(),env=worker(lesson);
  await studyAction(env,lesson,'VISUAL_LECTURE_REGENERATE_NARRATION');
  env.context.createSpeechifyLectureFromChatGPT=async()=>{throw new Error('Speechify unavailable');};
  const pending=env.records.get(lesson.id);
  await env.context.completeVisualLecture({completionPayload:{id:lesson.id,token:pending.token,stage:'narration'},result:{assistantText:JSON.stringify(sourceArrowNarration(lesson))}},{url:'https://chatgpt.com/c/test'});
  const saved=env.records.get(lesson.id);
  assert.equal(saved.status,'audio-error');assert.equal(saved.narration.arrowCuesVersion,1);
  assert.equal(saved.lectureHistory.length,1);assert.deepEqual(saved.plan,lesson.plan);
  assert.match(saved.speechifyTitle,/lecture 2$/);assert.equal(saved.speechify.readerUrl,undefined);
});


test('a delayed old reader response cannot overwrite the newly regenerated audio binding',async()=>{
  const {lesson}=fixture(),env=worker(lesson),actions=[];
  env.context.querySpeechifyTabs=async()=>[{id:81}];
  env.context.sendSpeechifyMessageWithInjection=async(id,payload)=>{
    actions.push(payload.action);
    env.records.set(lesson.id,{...lesson,narrationRevision:2,speechifyTitle:lesson.speechifyTitle+' · lecture 2',speechify:{},status:'audio-error'});
    return {ok:true,result:{available:true,title:lesson.speechifyTitle,url:'https://app.speechify.com/item/old'}};
  };
  await assert.rejects(env.context.visualLecturePlayer(lesson.id,'play'),/this saved lecture/);
  assert.deepEqual(actions,['state']);
  assert.equal(env.records.get(lesson.id).speechify.readerUrl,undefined);
  assert.match(env.records.get(lesson.id).speechifyTitle,/lecture 2$/);
});

test('Resume after a worker restart retries the pending replacement without losing the old narration',async()=>{
  const {lesson}=fixture(),env=worker({...lesson,status:'error',pendingNarrationRevision:2,narrationContractVersion:2,error:'An incomplete attempt',retryReason:'An incomplete attempt'});
  const result=await studyAction(env,lesson,'VISUAL_LECTURE_RESUME');
  assert.equal(result.ok,true,result.error);assert.equal(env.runs.length,1);assert.equal(env.speech.length,0);
  assert.equal(env.runs[0][3].completionPayload.stage,'narration');
  assert.deepEqual(env.records.get(lesson.id).narration,lesson.narration);
  assert.equal(env.records.get(lesson.id).pendingNarrationRevision,2);
});


test('regeneration inherits the actual reader folder instead of stale runner defaults',async()=>{
  const {lesson}=fixture();
  lesson.settings={...lesson.settings,speechifyFolderUrl:'https://app.speechify.com/library?folder=msk',speechifyFolderId:'msk',speechifyFolderChain:[{id:'pediatrics'}]};
  lesson.speechify={tabId:81,readerUrl:'https://app.speechify.com/item/current?folder=gi-liver-basic',boundTitle:lesson.speechifyTitle};
  const env=worker(lesson);
  await studyAction(env,lesson,'VISUAL_LECTURE_REGENERATE_NARRATION');
  const pending=env.records.get(lesson.id);
  assert.equal(pending.settings.speechifyFolderId,'gi-liver-basic');assert.deepEqual(pending.settings.speechifyFolderChain,[]);
  await env.context.completeVisualLecture({completionPayload:{id:lesson.id,token:pending.token,stage:'narration'},result:{assistantText:JSON.stringify(sourceArrowNarration(lesson))}},{url:'https://chatgpt.com/c/test'});
  assert.equal(env.speech[0].folder.id,'gi-liver-basic');assert.equal(env.speech[0].reuseTabId,81);
  assert.equal(env.speech[0].expectedReaderUrl,lesson.speechify.readerUrl);
  assert.equal(env.records.get(lesson.id).speechifyWorkTabId,80);
});

test('a failed save can recover its destination from the previous lecture, but explicit user changes win',async()=>{
  const {lesson}=fixture();lesson.speechify={};
  lesson.lectureHistory=[{speechify:{readerUrl:'https://app.speechify.com/item/old?folder=gi-basic'}}];
  const env=worker(lesson);
  assert.equal(env.context.visualLectureAudioFolder(lesson).id,'gi-basic');
  lesson.audioDestination={source:'user',url:'https://app.speechify.com/library?folder=chosen',id:'chosen'};
  assert.equal(env.context.visualLectureAudioFolder(lesson).id,'chosen');
  env.context.rememberVisualLectureAudioFolder(lesson,{id:'gi-basic'});
  assert.equal(lesson.audioDestination.id,'chosen');
  assert.equal(env.context.visualLectureFolderFromUrl('https://speechify.com.evil.test/item/x?folder=bad'),null);
  assert.equal(env.context.visualLectureFolderFromUrl('http://app.speechify.com/item/x?folder=bad'),null);
});

test('connecting a manually recovered reader persists its real destination and keeps the approved map',async()=>{
  const {lesson}=fixture(),env=worker(lesson);
  env.context.querySpeechifyTabs=async()=>[{id:81}];
  env.context.sendSpeechifyMessageWithInjection=async()=>({ok:true,result:{available:true,title:lesson.speechifyTitle,url:'https://app.speechify.com/item/recovered?folder=gi-basic'}});
  await env.context.visualLecturePlayer(lesson.id,'state');
  const saved=env.records.get(lesson.id);
  assert.equal(saved.audioDestination.id,'gi-basic');assert.equal(saved.settings.speechifyFolderId,'gi-basic');
  assert.deepEqual(saved.plan,lesson.plan);
});

test('audio retry reuses its saved work tab and returns to the organizer on success or failure',async()=>{
  const {lesson}=fixture(),env=worker(lesson),opened=[];
  env.context.openVisualLecture=async id=>opened.push(id);
  env.context.createSpeechifyLectureFromChatGPT=async args=>{
    await args.onTabReady({id:88});throw new Error('Temporary Speechify issue');
  };
  await env.context.prepareVisualLectureAudio(lesson.id);
  assert.equal(env.records.get(lesson.id).speechifyWorkTabId,88);assert.equal(env.records.get(lesson.id).status,'audio-error');
  let retry;
  env.context.createSpeechifyLectureFromChatGPT=async args=>{retry=args;return {readerReady:true,readerUrl:'https://app.speechify.com/item/done?folder=folder'};};
  await env.context.prepareVisualLectureAudio(lesson.id);
  assert.equal(retry.reuseTabId,88);assert.equal(env.records.get(lesson.id).status,'ready');
  assert.deepEqual(opened,[lesson.id,lesson.id]);
});

test('Speechify creation reuses only the known work tab and never a repurposed document',async()=>{
  const source=fs.readFileSync(require.resolve('../service_worker.js'),'utf8');
  const code=source.slice(source.indexOf('async function createSpeechifyLectureFromChatGPT('),source.indexOf('function getArticleSourceFromUrl('));
  const updates=[],creates=[];let url='https://app.speechify.com/library?folder=wrong';
  const context=vm.createContext({URL,crypto:require('node:crypto').webcrypto,
    chrome:{tabs:{get:async()=>({id:8,url}),update:async(id,change)=>{updates.push({id,change});return {id};},create:async change=>{creates.push(change);return {id:9};}}},
    buildSpeechifyFolderUrl:id=>'https://app.speechify.com/library?folder='+id,isSpeechifyHost:host=>host==='app.speechify.com',
    waitForTabComplete:async()=>{},sendSpeechifyMessageWithInjection:async()=>({ok:true,result:{readerReady:true}})});
  vm.runInContext(code,context);
  const args={title:'Saved lecture',text:'Saved text',folder:{id:'gi'},autoSave:true,openReader:true,reuseTabId:8,expectedReaderUrl:'https://app.speechify.com/item/old'};
  await context.createSpeechifyLectureFromChatGPT(args);
  assert.equal(updates[0].id,8);assert.equal(updates[0].change.url,'https://app.speechify.com/library?folder=gi');assert.equal(creates.length,0);
  url=args.expectedReaderUrl;await context.createSpeechifyLectureFromChatGPT(args);assert.equal(updates.length,2);
  url='https://app.speechify.com/item/unrelated';await context.createSpeechifyLectureFromChatGPT(args);
  assert.equal(updates.length,2);assert.equal(creates.length,1);
});
