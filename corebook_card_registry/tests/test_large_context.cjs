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
  if (data.format === 'deck-grouped-defaults-v2') return data.deckGroups.flatMap(group => group.rows.map(values => {
    const row = {...group.defaults};
    group.columns.forEach((key, i) => { row[key] = values[i]; });
    for (const [key, field] of Object.entries(group.aliases || {})) row[key] = row[field];
    for (const field of ['question','answer']) if (data.textTable.length && Number.isInteger(row[field])) {
      assert(row[field] >= 0 && row[field] < data.textTable.length);
      row[field] = data.textTable[row[field]];
    }
    return row;
  }));
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

  // All retained questions/answers/IDs must survive further packing even when
  // ordinary deck rows are too large. Repeated question text is stored once,
  // while same-question/different-answer records remain distinct.
  const repeated = bank(Array.from({length:600}, (_, i) => {
    const id = String(1780000000000 + i);
    return entry(id, {entryId:id,cardId:id,noteId:id,stableId:'',
      deck:`Corebook::GI::Liver::Same diagnosis ${i % 4}`,
      question:'Which of these source-supported findings distinguishes this image from its alternatives? <img src="arrow_WS.png">',
      answer:'Unique complete answer '.repeat(17) + i, cardType:'unknown',
      suspended:i % 2 === 0, imageRecognition:true});
  }), [entry('removed-identity', {historyId:'history-distinct-from-card', reason:'questionRevised',
    deck:'Corebook::GI::Liver::Same diagnosis 0', question:'Prior exact question', answer:'Prior full answer'})]);
  const repeatedBefore = JSON.stringify(repeated);
  const shared = guard.context(repeated, target);
  assert.equal(shared.format, 'deck-grouped-defaults-v2');
  assert(shared.serializedChars <= 350000);
  assert.deepEqual(sort(unpack(shared)), sort(shared.data.entries));
  assert.equal(JSON.stringify(repeated), repeatedBefore);
  assert.equal(shared.data.selectedCount, 601);
  assert.equal(unpack(shared).find(e => e.entryId === 'history-distinct-from-card').cardId, 'removed-identity');
  const encoded = JSON.parse(shared.text.split('BEGIN_COREBOOK_CARD_DATA\n')[1].split('\nEND_COREBOOK_CARD_DATA')[0]);
  assert(encoded.textTable.includes(repeated.entries[0].question));
  assert(encoded.deckGroups.some(g => g.aliases?.entryId === 'cardId' && g.aliases?.noteId === 'cardId'));
  assert(encoded.deckGroups.some(g => g.defaults.state === 'questionRevised'));
  assert.equal(new Set(unpack(shared).map(e => e.entryId)).size, 601);

  const sameAnswer = structuredClone(repeated);
  sameAnswer.entries[0].question = sameAnswer.entries[1].question;
  sameAnswer.entries[0].answer = sameAnswer.entries[1].answer;
  const sameAnswerContext = guard.context(sameAnswer, target);
  assert.deepEqual(sort(unpack(sameAnswerContext)), sort(sameAnswerContext.data.entries));
  assert.equal(sameAnswerContext.data.selectedCount, 601);

  const oversized = bank([entry('too-big', {deck:target.deckName, answer:'x'.repeat(350001)})]);
  const overflow = guard.context(oversized, target);
  assert.equal(overflow.format, 'entries-file-v1');
  assert.equal(overflow.attachmentRequired, true);
  assert(overflow.packedChars > 350000);
  assert.deepEqual(unpack(overflow), overflow.data.entries);
  const growing = bank(Array.from({length:4000}, (_, i) => entry(`growth-${i}`, {
    deck:target.deckName, answer:'Full distinct answer '.repeat(40) + i
  })));
  const growthContext = guard.context(growing, target);
  assert.equal(growthContext.data.selectedCount, 4000);
  assert.equal(growthContext.attachmentRequired, true);
  assert.deepEqual(unpack(growthContext), growthContext.data.entries);
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
  runtime.requestAnkiLiveDrillBridge = async () => ({bank:repeated});
  const compactResult = await runtime.attachCorebookCardContext({mode:'chatgpt_cards'}, source);
  assert.equal(compactResult.meta.corebookGuard.contextFormat, 'deck-grouped-defaults-v2');
  assert.equal(compactResult.meta.corebookGuard.promptCandidateCount, 601);
  assert(compactResult.meta.corebookGuard.contextChars <= 350000);
  assert(compactResult.output.endsWith(source.output));
  runtime.requestAnkiLiveDrillBridge = async () => ({bank:oversized});
  const attachedResult = await runtime.attachCorebookCardContext({mode:'chatgpt_cards'}, source);
  assert.equal(attachedResult.meta.corebookGuard.contextTransport, 'attachment');
  assert(attachedResult.output.endsWith(source.output));
  const metadata = {};
  await runtime.stageCorebookAuditContext({settings:{mode:'chatgpt_cards'}, extractionMeta:source.meta}, metadata, 'bundle');
  assert.equal(metadata.corebookGuard.status, 'ready');
  assert.deepEqual(JSON.parse(downloads.find(d => d[1] === 'corebook_snapshot.json')[2]), oversized);
  assert.deepEqual(unpack({text:downloads.find(d => d[1] === 'corebook_context.txt')[2]}), overflow.data.entries);
  console.log('Large contexts: full organ/history coverage, exact packing, file overflow/growth, freshness and complete audit snapshots passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
