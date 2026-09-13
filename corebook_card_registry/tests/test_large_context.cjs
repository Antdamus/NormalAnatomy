const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const guard = require(path.join(root, 'edge_radprimer_extension/corebook-card-guard.js'));
const target = {deckName:'Corebook::GI::Liver::Target', title:'Target'};
function entry(id, overrides = {}) {
  return {entryId:String(id), noteId:`note-${id}`, cardId:String(id), stableId:`stable-${id}`,
    deck:'Corebook::Physics::Other::Topic', cardType:'highYield', suspended:false,
    imageRecognition:false, question:'Common patient shows finding with contrast.',
    answer:'Common patient contrast finding.', ...overrides};
}
function bank(entries, removedEntries = []) {
  return {schemaVersion:1, complete:true, scopeRoot:'Corebook', collectionIdentity:'test',
    snapshotId:'test-snapshot', capturedAt:new Date().toISOString(),
    cardCount:entries.length, entries, removedEntries};
}
function unpack(context) {
  const data = JSON.parse(context.text.split('BEGIN_COREBOOK_CARD_DATA\n')[1].split('\nEND_COREBOOK_CARD_DATA')[0]);
  return data.entries || data.deckGroups.flatMap(group => group.rows.map(row =>
    ({deck:group.deck, ...Object.fromEntries(data.columns.map((key, i) => [key, row[i]]))})));
}
(async () => {
  const entries = Array.from({length:2000}, (_, i) => entry(i));
  entries.push(entry('organ', {deck:'Corebook::GI::Liver::Unrelated title', suspended:true}),
    entry('same-organ', {deck:'Corebook::US::Liver::Another title', cardType:'boardsTrap'}),
    entry('rare-pair', {question:'Orchard lagoon?', answer:'A cross-category candidate.', cardType:'mechanism'}),
    entry('rare-title', {question:'Fluorite?', answer:'A specific topic candidate.'}));
  const removed = [entry('removed', {historyId:'history-removed', reason:'noteDeleted',
    deck:'Corebook::GI::Liver::Old topic'})];
  const b = bank(entries, removed);
  const splitCaptions = ['Common patient contrast finding orchard', 'Common patient contrast finding lagoon'];
  let c = guard.context(b, {...target, captions:splitCaptions});
  assert.deepEqual(c.data.entries.map(e => e.entryId), ['organ','same-organ','history-removed']);
  assert.equal(c.data.relatedScopeCount, 3);
  c = guard.context(b, {...target, captions:['Common patient orchard lagoon contrast']});
  assert(c.data.entries.some(e => e.entryId === 'rare-pair'));
  assert(!c.data.entries.some(e => e.entryId === '0'));
  c = guard.context(b, {...target, title:'Fluorite'});
  assert(c.data.entries.some(e => e.entryId === 'rare-title'));
  assert.equal(guard.context(b, {...target, captions:splitCaptions.join('\n')}).data.selectedCount, 3);

  const large = bank(Array.from({length:700}, (_, i) => entry(`long-${i}`, {
    deck:`Corebook::GI::Liver::Topic ${i % 3}`, question:'Question '.repeat(16) + i,
    answer:'Answer '.repeat(20) + i, suspended:i % 2 === 0, imageRecognition:i % 3 === 0,
  })), [entry('old-large', {historyId:'old-history', reason:'questionRevised',
    deck:'Corebook::GI::Liver::Old topic', question:'Exact <img src="arrow_WS.png"> caption', answer:'Unchanged answer'})]);
  const before = JSON.stringify(large);
  c = guard.context(large, target);
  assert(JSON.stringify(c.data).length > 350000);
  assert.equal(c.format, 'deck-grouped-rows-v1');
  assert(c.serializedChars <= 350000);
  const sort = entries => entries.toSorted((a, b) => a.entryId.localeCompare(b.entryId));
  assert.deepEqual(sort(unpack(c)), sort(c.data.entries));
  assert.equal(JSON.stringify(large), before);
  assert.equal(c.data.selectedCount, 701);
  assert(c.text.includes('arrow_WS.png'));

  const oversized = bank([entry('too-big', {deck:target.deckName, answer:'x'.repeat(350001)})]);
  assert.throws(() => guard.context(oversized, target), /after lossless packing.*local review/);
  assert.throws(() => guard.context({...large, capturedAt:'2000-01-01T00:00:00Z'}, target), /stale/);

  const downloads = [];
  const runtime = {CorebookCardGuard:guard, buildAnkiDeckTarget:() => ({deckName:target.deckName}),
    requestAnkiLiveDrillBridge:async () => ({bank:b}), downloadAuditTextFile:async (...args) => downloads.push(args)};
  vm.createContext(runtime);
  vm.runInContext(fs.readFileSync(path.join(root, 'edge_radprimer_extension/corebook-card-guard-runtime.js'), 'utf8'), runtime);
  const source = {output:'Original source <img src="arrow_WS.png">', meta:{title:target.title,
    sourceQualifiedImages:splitCaptions.map(caption => ({caption}))}};
  const result = await runtime.attachCorebookCardContext({mode:'chatgpt_cards'}, source);
  assert.equal(result.meta.corebookGuard.promptCandidateCount, 3);
  assert(result.output.endsWith(source.output));
  runtime.requestAnkiLiveDrillBridge = async () => ({bank:oversized});
  await assert.rejects(runtime.attachCorebookCardContext({mode:'chatgpt_cards'}, source), /local review/);
  const metadata = {};
  await runtime.stageCorebookAuditContext({settings:{mode:'chatgpt_cards'}, extractionMeta:source.meta}, metadata, 'bundle');
  assert.equal(metadata.corebookGuard.status, 'refreshRequired');
  assert.deepEqual(JSON.parse(downloads.find(d => d[1] === 'corebook_snapshot.json')[2]), oversized);
  assert(downloads.find(d => d[1] === 'corebook_context.txt')[2].includes('CHECK INCOMPLETE'));
  console.log('Large contexts: caption noise/boundaries, full organ/history coverage, global candidates, lossless packing, size/freshness gates and full audit snapshot preservation passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
