import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fixture} from './fixture.mjs';
import {Review as R,Transfer as T,initialChoices,validateChoices,importChoices,exportChoices} from '../src/card-choices.js';

test('phone keeps source groups, pairs and explicit links; unlink preserves source groups',async()=>{
  const {manifest}=await fixture(),lesson=manifest.lesson,before=JSON.stringify(lesson);
  let state=initialChoices(manifest);state.review=R.link(state.review,lesson,['TEST-1','TEST-2'],{},0);
  assert.equal(R.summary(state.review,lesson).cards,2);assert.deepEqual(R.selectedPlan(state.review,lesson).linkedImageGroups[0].imageIds,['TEST-1','TEST-2']);
  state.review=R.update(state.review,lesson,'TEST-2',{decision:'lecture'});assert.equal(R.summary(state.review,lesson).cards,0);
  state.review=R.unlink(state.review,lesson,'TEST-1',state.review.revision);assert.equal(state.review.manualGroups.length,0);
  assert.equal(JSON.stringify(lesson),before,'choice changes never mutate source/approved content');
  lesson.registry[0].atomicCluster=true;lesson.registry[0].clusterImageIds=['TEST-1','TEST-2'];
  state.review=R.update(state.review,lesson,'TEST-1',{decision:'cards'});assert.equal(R.summary(state.review,lesson).cards,2);
  state.review=R.unlink(state.review,lesson,'TEST-1',state.review.revision);assert.equal(R.groupFor(lesson,'TEST-1',state.review).length,2);
  state.review.images['TEST-2'].decision='later';assert.throws(()=>validateChoices(state,manifest),/partly selected/);
});
test('desktop round trip preserves existing objectives; subsequent unlink works; stale replay is rejected',async()=>{
  const {manifest}=await fixture(),l=manifest.lesson,f=manifest.fingerprint;
  let desktop=R.update(R.empty(l.id),l,'TEST-1',{decision:'cards',role:'normal',objective:'Keep my objective'});
  let state=importChoices(initialChoices(manifest),T.create(l,f,desktop,desktop),manifest);
  state.review=R.link(state.review,l,['TEST-1','TEST-2'],{},state.review.revision);
  const first=exportChoices(state,manifest);desktop=T.importDesktop(first,l,f,desktop);
  assert.equal(desktop.images['TEST-1'].objective,'Keep my objective');assert.equal(desktop.manualGroups.length,1);
  assert.deepEqual(T.importDesktop(first,l,f,desktop),desktop,'same transfer is idempotent');
  state.review=R.unlink(state.review,l,'TEST-1',state.review.revision);
  desktop=T.importDesktop(exportChoices(state,manifest),l,f,desktop);assert.equal(desktop.manualGroups.length,0);
  assert.throws(()=>T.importDesktop(first,l,f,desktop),/older/);
  assert.throws(()=>T.read({...first,fingerprint:'f'.repeat(64)},l,f),/exact reviewed/);
});
test('transfer merges unrelated edits and rejects overlapping conflicts without mutating originals',async()=>{
  const {manifest}=await fixture(),l=manifest.lesson,b=R.empty(l.id);
  const incoming=R.update(b,l,'TEST-1',{decision:'cards',objective:'Phone'}),current=R.update(b,l,'TEST-2',{decision:'cards',objective:'Desktop'});
  const merged=T.merge(b,incoming,current,l);assert.equal(R.summary(merged,l).cards,2);assert.equal(merged.images['TEST-2'].objective,'Desktop');
  const conflict=R.update(current,l,'TEST-1',{objective:'Different'}),before=JSON.stringify(conflict);
  assert.throws(()=>T.merge(b,incoming,conflict,l),/Conflicting objective/);assert.equal(JSON.stringify(conflict),before);
});
test('vendored card semantics match the recorded desktop source hashes',async()=>{
  const {createHash}=await import('node:crypto'),provenance=JSON.parse(await fs.readFile(new URL('../vendor/provenance.json',import.meta.url),'utf8'));
  for(const file of ['lecture-card-review.js','lecture-card-transfer.js'])assert.equal(createHash('sha256').update(await fs.readFile(new URL(`../vendor/${file}`,import.meta.url))).digest('hex'),provenance.sha256[file]);
});
