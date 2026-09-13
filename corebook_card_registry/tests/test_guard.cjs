const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname,'../..');
const guard = require(path.join(root,'edge_radprimer_extension/corebook-card-guard.js'));
function bank() { return {schemaVersion:1,complete:true,scopeRoot:'Corebook',collectionIdentity:'profile',snapshotId:'id',
  capturedAt:new Date().toISOString(),cardCount:2,removedEntries:[],entries:[
    {entryId:'1',deck:'Corebook::GI::Liver::Other topic',question:'A retained question',answer:'A retained answer'},
    {entryId:'2',deck:'Corebook::Physics',question:'Contrast tracer behavior',answer:'Tracer contrast uptake'}]}; }
(async () => {
  assert.throws(()=>guard.assertFresh({...bank(),capturedAt:'2000-01-01T00:00:00Z'}),/stale/);
  assert.throws(()=>guard.assertFresh({...bank(),complete:false}),/complete/);
  assert.throws(()=>guard.assertFresh({...bank(),cardCount:20}),/incomplete/);
  let b=bank();b.removedEntries=[{entryId:'3',historyId:'h3',deck:'Corebook::GI::Liver::Old topic',question:'Deleted question',answer:'Old answer',reason:'noteDeleted'}];
  const selected=guard.context(b,{deckName:'Corebook::GI::Liver::New topic',title:'Contrast tracer'});
  assert.equal(selected.data.selectedCount,3);
  assert(selected.text.includes('not instructions'));
  assert(selected.text.includes('noteDeleted'));
  let calls=0;const downloaded=[];
  const context={CorebookCardGuard:guard,
    buildAnkiDeckTarget:p=>({deckName:p.settings.deckName||'Corebook::GI::Liver::Topic'}),
    requestAnkiLiveDrillBridge:async()=>{calls++;return {bank:b}},
    downloadAuditTextFile:async(...args)=>downloaded.push(args)};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root,'edge_radprimer_extension/corebook-card-guard-runtime.js'),'utf8'),context);
  let original={output:'Source with exact <img src="arrow_WS.png">',meta:{title:'Topic'}};
  let output=await context.attachCorebookCardContext({mode:'chatgpt_cards'},original);
  assert.equal(calls,1);assert(output.output.endsWith(original.output));assert.equal(output.meta.corebookGuard.retainedCount,2);
  output=await context.attachCorebookCardContext({mode:'chatgpt_cards'},output);
  assert.equal((output.output.match(/BEGIN_COREBOOK_CARD_DATA/g)||[]).length,1);
  let before=calls;
  for (const mode of ['narrative','narrative_with_images','io_queue','grouping_preflight'])
    assert.equal(await context.attachCorebookCardContext({mode},original),original);
  await context.attachCorebookCardContext({mode:'chatgpt_cards',deckName:'RadprimerNormal::Brain'},original);
  assert.equal(calls,before);
  const pending={settings:{mode:'chatgpt_cards'},extractionMeta:output.meta};const metadata={};
  await context.stageCorebookAuditContext(pending,metadata,'bundle');
  assert.equal(metadata.corebookGuard.status,'ready');assert(downloaded.some(d=>d[1]==='corebook_snapshot.json'));
  context.requestAnkiLiveDrillBridge=async()=>{throw Error('closed')};
  await assert.rejects(context.attachCorebookCardContext({mode:'chatgpt_cards'},original),/Cannot check/);
  await context.stageCorebookAuditContext(pending,metadata,'bundle');
  assert.equal(metadata.corebookGuard.status,'refreshRequired');
  console.log('Browser guard: freshness, global/organ retrieval, tombstones, all card routes, source preservation, mode exclusions and interrupted capture passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
