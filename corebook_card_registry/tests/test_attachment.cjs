const assert = require('node:assert/strict');
const guard = require('../../edge_radprimer_extension/corebook-card-guard.js');
const transport = require('../../edge_radprimer_extension/corebook-chatgpt-attachment.js');
const entry = {entryId:'owned', noteId:'note', cardId:'card', stableId:'stable',
  deck:'Corebook::GI::Liver::Topic', state:'retained', cardType:'mechanism',
  suspended:true, imageRecognition:true, question:'Literal <img src="arrow_WS.png"> \"quote\" and μ',
  answer:'Complete answer. '.repeat(24000)};
const bank = {schemaVersion:1,complete:true,scopeRoot:'Corebook',collectionIdentity:'profile',
  snapshotId:'snapshot',capturedAt:new Date().toISOString(),cardCount:1,entries:[entry],
  removedEntries:[{...entry, entryId:'old', historyId:'history', reason:'questionRevised',
    question:'Old exact question',answer:'Prior answer'}]};
const comparison = guard.context(bank, {deckName:entry.deck});
const source = '\n=== SOURCE ===\nKeep <img src="arrow_WS.png"> and atomic groups.\n';
const prefix = 'Configured user instructions\n';
const full = prefix + comparison.text + source;
const before = JSON.stringify(bank);
const prepared = transport.prepare(full, 'test-run');
assert.equal(prepared.attachment.filename, 'corebook_comparison_test-run.json');
assert.equal(prepared.attachment.selectedCount, 2);
assert.deepEqual(JSON.parse(prepared.attachment.text).entries, comparison.data.entries);
assert.equal(JSON.stringify(bank), before);
assert(prepared.promptText.startsWith(prefix + guard.POLICY));
assert(prepared.promptText.endsWith(source));
assert(prepared.promptText.length < 10000);
assert(prepared.promptText.includes('COREBOOK_CHECK_INCOMPLETE'));
assert(prepared.promptText.includes('read all full question/answer records'));
const manifest = JSON.parse(prepared.promptText.split('BEGIN_COREBOOK_CARD_DATA\n')[1].split('\nEND_COREBOOK_CARD_DATA')[0]);
assert.equal(manifest.format, 'attached-entries-v1');
assert.equal(manifest.snapshotId, bank.snapshotId);
assert.equal(manifest.selectedCount, 2);
assert.equal(manifest.scope, 'Corebook::GI::Liver');
assert.equal(manifest.entries, undefined);
assert.notEqual(transport.prepare(full, 'next-run').attachment.filename, prepared.attachment.filename);
assert.throws(() => transport.prepare(full, ''), /unique/);
assert.throws(() => transport.prepare(full.replace('END_COREBOOK_CARD_DATA', 'missing'), 'run'), /incomplete/);
assert.throws(() => transport.prepare(full.replace('"selectedCount":2', '"selectedCount":3'), 'run'), /incomplete/);
assert.deepEqual(transport.prepare(source, 'run'), {promptText:source,attachment:null});
const small = guard.context({...bank, entries:[{...entry, answer:'Short answer'}], removedEntries:[]}, {deckName:entry.deck});
assert.deepEqual(transport.prepare(small.text + source, 'run'), {promptText:small.text + source,attachment:null});
console.log('Attachment transport: exact complete records, history/IDs/HTML, manifest identity/counts, unique filenames, source/policy preservation and corrupt data rejection passed.');
