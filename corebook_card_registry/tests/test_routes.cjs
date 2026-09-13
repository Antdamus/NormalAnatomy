const fs=require('node:fs'), vm=require('node:vm'), path=require('node:path'), assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'), ext=path.join(root,'edge_radprimer_extension');
const listeners=[];
const event=()=>({addListener:()=>{}});
const context={console,URL,AbortController,crypto:require('node:crypto').webcrypto,setTimeout,clearTimeout,
  chrome:{tabs:{onRemoved:event()},downloads:{onDeterminingFilename:event(),onCreated:event()},
    runtime:{onMessage:{addListener:fn=>listeners.push(fn)}}}};
vm.createContext(context);
context.importScripts=(...names)=>names.forEach(n=>vm.runInContext(fs.readFileSync(path.join(ext,n),'utf8'),context));
vm.runInContext(fs.readFileSync(path.join(ext,'service_worker.js'),'utf8'),context);
const bank={schemaVersion:1,complete:true,scopeRoot:'Corebook',collectionIdentity:'test-profile',snapshotId:'test-id',
  capturedAt:new Date().toISOString(),cardCount:1,removedEntries:[],entries:[{entryId:'1',noteId:'11',cardId:'1',
  deck:'Corebook::GI::Liver::Older topic',question:'Retained question alpha?',answer:'Existing answer alpha.',cardType:'highYield'}]};
let bankCalls=0;const sent=[],saved=[],downloads=[];
context.readCurrentCorebook=async()=>{bankCalls++;return bank};
context.openChatGptAndStart=async(...args)=>sent.push(args);
context.savePendingCardAuditRun=async(...args)=>saved.push(args);
context.downloadAuditTextFile=async(...args)=>downloads.push(args);
const settings={engine:'pathology',mode:'chatgpt_cards',ankiDeckMode:'auto',ankiPathologyRoot:'Corebook',captureCardAuditBundle:false};
const extraction={output:'Original source <img src="arrow_WS.png">',downloadFiles:[],
  meta:{title:'New topic',breadcrumbTrail:['All Categories','Basic','Gastrointestinal','Liver','New topic']}};
(async()=>{
  await context.openFinalCardPrompt(settings,extraction,{id:1,url:'https://app.radprimer.com'});
  assert.equal(bankCalls,1);assert(sent[0][1].includes('Retained question alpha?'));
  await context.openFinalCardPrompt({...settings,captureCardAuditBundle:true},extraction,{id:1,url:'https://app.radprimer.com'});
  assert.equal(saved.length,1);assert.equal(saved[0][1].extractionMeta.corebookGuard.generationSnapshotId,'test-id');
  const pending=saved[0][1];
  let meta=context.createCardAuditMetadata(pending,new Date().toISOString());
  assert.equal(meta.corebookGuard.generationSnapshotId,'test-id');
  await context.stageCorebookAuditContext(pending,meta,'test-folder');
  assert(context.buildAuditInstructions(meta).includes('card_overlap_review.json'));
  assert(context.buildAuditInstructions(meta).includes('prepare --bundle'));
  assert(downloads.some(x=>x[1]==='corebook_snapshot.json'));
  const response=await new Promise(resolve=>{
    assert.equal(listeners[0]({type:'PREPARE_COREBOOK_CARD_CONTEXT',settings,extraction},{},resolve),true);
  });
  assert(response.ok);assert(response.output.includes('COREBOOK RETAINED CARD CHECK'));
  assert(response.output.endsWith(extraction.output));
  assert(context.buildAuditWakeMessage({downloadFolder:'Downloads\\test'}).includes('card_overlap_review.json'));
  // Exercise both legacy inline and file-download staging paths without network.
  const originalStage=context.stageCorebookAuditContext;let stages=0;
  context.stageCorebookAuditContext=async(...args)=>{stages++;return originalStage(...args)};
  context.validateGeneratedCardsMatchPending=()=>{};
  await context.stageCardAuditBundle({pending,assistantText:'test TSV'});
  assert.equal(stages,1);
  context.takePendingCardAuditRun=async()=>pending;
  context.sendPageStatus=async()=>{};
  await context.prepareCardAuditDownloadBundle({pendingId:'test',sentinelText:''});
  assert.equal(stages,2);
  await context.stageCardAuditSourceOnlyBundle({pending});
  assert.equal(stages,3);
  console.log('Service-worker integration: captured/noncaptured prompts, popup messages, metadata, wake-up instructions and all three audit staging paths passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
