const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const reviewCore = require('../lecture-card-review.js');
const framework = require('../teaching-framework.js');

function fixture() {
  return { id:'vl-ab1234',title:'Pancreas Foundations: Anatomy, Variants, Atrophy and Fat',sourceText:'Full anatomy and disease source text.',
    sourceMetadata:{masterSource:{manifest:{canonicalHierarchy:['Gastrointestinal','Pancreas'],canonicalDeckPath:'Corebook::GI::Pancreas::Foundations'}}},
    registry:[1,2,3].map(n=>({masterImageId:`RP-A02-00${n}`,sourceKind:'radprimer',sourceLabel:'RadPrimer — Pancreas',sourceImageNumber:n,
      caption:`Structure ${n}`,captionHtml:`<b>Structure ${n}</b>`,plainUrl:`https://app.radprimer.com/images/${n}?annotated=false`,annotatedUrl:`https://app.radprimer.com/images/${n}?annotated=true`,
      plainFilename:`image-${n}-plain.jpg`,annotatedFilename:`image-${n}-annotated.jpg`,
      ...(n<3 ? {atomicCluster:true,clusterImageIds:['RP-A02-001','RP-A02-002']} : {})})) };
}

test('no implicit selections; paired variants and explicit atomic groups remain intact',()=>{
  const lesson=fixture();
  assert.deepEqual(reviewCore.summary(null,lesson),{cards:0,lecture:0,later:3});
  assert.throws(()=>reviewCore.selectedPlan(null,lesson),/Select at least one/);
  const review=reviewCore.update(null,lesson,'RP-A02-001',{decision:'cards',role:'normal',objective:'Locate the duct'});
  assert.equal(reviewCore.summary(review,lesson).cards,2);
  assert.deepEqual(reviewCore.selectedPlan(review,lesson).selectedImageIds,['RP-A02-001','RP-A02-002']);
  assert.equal(lesson.registry[0].plainUrl.includes('false'),true);
  assert.equal(review.images['RP-A02-002'].objective,'Locate the duct');
});
test('comparisons do not imply atomic groups; references and deferred images remain outside card selection',()=>{
  const lesson=fixture(); lesson.registry.forEach(i=>delete i.atomicCluster);
  lesson.plan={cases:[{imageIds:lesson.registry.map(i=>i.masterImageId),relationship:'comparison'}]};
  let review=reviewCore.update(null,lesson,'RP-A02-001',{decision:'cards',role:'mixed'});
  review=reviewCore.update(review,lesson,'RP-A02-002',{decision:'lecture',role:'normal'});
  assert.deepEqual(reviewCore.summary(review,lesson),{cards:1,lecture:1,later:1});
  assert.deepEqual(reviewCore.selectedPlan(review,lesson).selectedImageIds,['RP-A02-001']);
});
test('portable reviews reject foreign identities, unknown images and split approved groups',()=>{
  const lesson=fixture();
  const review=reviewCore.update(null,lesson,'RP-A02-001',{decision:'cards',role:'normal'});
  assert.throws(()=>reviewCore.validate({...review,lessonId:'another'},lesson),/another lesson/);
  assert.throws(()=>reviewCore.update(review,lesson,'not-an-image',{decision:'cards'}),/not in this lesson/);
  review.images['RP-A02-002'].decision='later';
  assert.throws(()=>reviewCore.selectedPlan(review,lesson),/partly selected/);
});
test('framework combines substantive objectives and preserves reviewed choices',()=>{
  assert.equal(framework.recommend({manifest:{sources:[{title:'Pancreas',headings:['GROSS ANATOMY']},{title:'Chronic Pancreatitis'}]}}).engine,'mixed');
  assert.equal(framework.recommend({manifest:{sources:[{title:'Hypervascular Pancreatic Mass'}]}}).engine,'pathology');
  assert.equal(framework.recommend({teachingFramework:{engine:'normal',reason:'Normal map'}}).engine,'normal');
  assert.match(framework.prompt({teachingFramework:{engine:'mixed'}}),/normal map first/);
});

function worker() {
  const root=path.resolve(__dirname,'..'), listeners=[], state={}, lesson=fixture(), reviews=new Map(), lessons=new Map([[lesson.id,lesson]]);
  const event=()=>({addListener(){}});
  const storage={get:async key=> key==null ? state : {[key]:state[key]}, set:async data=>Object.assign(state,structuredClone(data)),remove:async keys=>{for(const key of [].concat(keys))delete state[key];}};
  const ctx=vm.createContext({console,URL,TextEncoder,AbortController,setTimeout,clearTimeout,crypto:require('node:crypto').webcrypto,
    fetch:async url=>({ok:true,text:async()=>fs.readFileSync(path.join(root,url.replace('chrome-extension://test/','')),'utf8')}),
    chrome:{runtime:{getURL:n=>'chrome-extension://test/'+n,onMessage:{addListener:f=>listeners.push(f)}},storage:{local:storage},
      tabs:{onRemoved:event()},downloads:{onDeterminingFilename:event(),onCreated:event()}}});
  ctx.importScripts=(...files)=>files.forEach(f=>vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx));
  vm.runInContext(fs.readFileSync(path.join(root,'service_worker.js'),'utf8'),ctx);
  ctx.VisualLectureStore={get:async id=>lessons.get(id),getReview:async id=>reviews.get(id)};
  ctx.loadImaiosLabelRepository=async()=>null;
  return {ctx,state,lesson,reviews,lessons};
}
test('preparing a mixed source includes only chosen media, both variants and original source; no cards or Anki write',async()=>{
  const {ctx,state,lesson,reviews}=worker();
  const review=reviewCore.update(null,lesson,'RP-A02-001',{decision:'cards',role:'mixed'}); reviews.set(lesson.id,review);
  const result=await ctx.prepareVisualLectureCards(lesson.id);
  assert.equal(result.selectedCount,2);
  const cache=state.radprimerLatestMasterSource;
  assert.equal(cache.imageRegistry.length,2); assert.equal(cache.downloadFiles.length,4);
  assert.equal(cache.packageText,lesson.sourceText);
  assert.equal(cache.imageRegistry[0].captionHtml,lesson.registry[0].captionHtml);
  assert.equal(cache.manifest.cardSelectionPlan.reviewRevision,1);
  assert.equal(state.radprimerRunnerSettings.engine,'mixed');
  const extraction=await ctx.buildMasterSourceExtraction({engine:'mixed',mode:'chatgpt_cards'},'Base card prompt',cache);
  assert.equal(extraction.meta.masterImageIds.length,2);
  assert.match(extraction.output,/Only explicitly selected images/);
  reviews.set(lesson.id,reviewCore.update(review,lesson,'RP-A02-003',{decision:'cards',role:'pathology'}));
  await assert.rejects(ctx.buildMasterSourceExtraction({engine:'mixed',mode:'chatgpt_cards'},'',cache),/changed/);
});
test('curriculum card runs require review while complete lectures still work; auto resolves to mixed',async()=>{
  const {ctx,state}=worker();
  const cache=ctx.normalizeMasterSourceCache({articleTitle:'Pancreas',packageText:'full',libraryTitle:'Curriculum',teachingFramework:{engine:'mixed',reason:'Anatomy and disease'},imageRegistry:[]});
  state.radprimerLatestMasterSource=cache;
  state.radprimerRunnerSettings={engine:'auto',useMasterSource:true,mode:'narrative'};
  assert.equal((await ctx.loadRunnerSettings()).engine,'mixed');
  await assert.rejects(ctx.buildMasterSourceExtraction({engine:'mixed',mode:'chatgpt_cards'},'',cache),/Review the lecture images/);
  assert.ok((await ctx.buildMasterSourceExtraction({engine:'mixed',mode:'narrative'},'',cache)).output.includes('full'));
  const prompt=await ctx.loadPrompt('mixed','chatgpt_cards');
  assert.match(prompt,/MIXED ANATOMY AND PATHOLOGY FRAMEWORK/);
  assert.match(prompt,/22 columns/);
});

test('a prepared source can run from the study tab and reaches the fresh bank gate before generation',async()=>{
  const {ctx,state,lesson,reviews}=worker();
  reviews.set(lesson.id,reviewCore.update(null,lesson,'RP-A02-001',{decision:'cards',role:'mixed'}));
  await ctx.prepareVisualLectureCards(lesson.id);
  state.radprimerRunnerSettings.cardModeDownloadImagesDisabled=true;
  ctx.sendPageStatus=async()=>{};
  let reads=0;
  ctx.readCurrentCorebook=async()=>{reads++;throw new Error('fresh-bank-test-gate');};
  await assert.rejects(ctx.runRadPrimerFromPage({id:4,url:'chrome-extension://test/visual-lecture.html?lesson='+lesson.id}),/fresh-bank-test-gate/);
  assert.equal(reads,1);
});
