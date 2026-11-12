import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './fixture.mjs';
import {Review as R,Transfer as T,initialChoices,validateChoices,exportChoices} from '../src/card-choices.js';

test('saved collections arrive automatically, remain optional and do not select cards or change evidence',async()=>{
  const {manifest:m}=await fixture(undefined,{inheritedGroup:true}),l=m.lesson,before=JSON.stringify(l);
  let s=initialChoices(m);assert.deepEqual(R.groupFor(l,'TEST-1',s.review),['TEST-1','TEST-2']);
  assert.equal(R.summary(s.review,l).cards,0);
  assert.equal(R.linkInfo(l,'TEST-1',s.review).inherited[0].kind,'source collection');
  s.review=R.update(s.review,l,'TEST-1',{decision:'cards',role:'normal'});
  assert.equal(R.summary(s.review,l).cards,2);
  s.review=R.separate(s.review,l,'TEST-1',s.review.revision);
  assert.deepEqual(R.groupFor(l,'TEST-1',s.review),['TEST-1']);assert.equal(R.summary(s.review,l).cards,2);
  s.review=R.update(s.review,l,'TEST-2',{decision:'lecture'});
  assert.equal(R.summary(s.review,l).cards,1);
  s.review=R.restoreLinks(s.review,l,'TEST-1',{'TEST-2':'normal'},s.review.revision);
  assert.equal(R.summary(s.review,l).cards,2);assert.equal(s.review.inheritedLinks.disabledGroupIds.length,0);
  assert.equal(JSON.stringify(l),before,'immutable captions, IDs, pairs, organizer and approvals');
  assert.throws(()=>R.separate(s.review,l,'TEST-1',0),/changed/);
});

test('legacy individual selections survive migration and source links can be restored explicitly',async()=>{
  const {manifest:m}=await fixture(undefined,{inheritedGroup:true}),l=m.lesson;
  const old=R.update(R.empty(l.id),l,'TEST-1',{decision:'cards',role:'normal',objective:'Keep this objective'});
  const before=JSON.stringify(old),s=validateChoices({...initialChoices(m),review:old,desktopBase:old},m);
  assert.deepEqual(s.review.images,old.images);assert.equal(s.review.revision,old.revision);
  assert.deepEqual(s.review.inheritedLinks.disabledGroupIds,['collection:test-collection']);
  assert.deepEqual(R.groupFor(l,'TEST-1',s.review),['TEST-1']);assert.equal(JSON.stringify(old),before);
  assert.deepEqual(validateChoices(s,m),s,'migration is idempotent');
  const restored=R.restoreLinks(s.review,l,'TEST-1',{},s.review.revision);
  assert.equal(restored.images['TEST-1'].objective,'Keep this objective');assert.equal(R.summary(restored,l).cards,2);
});

test('only explicit complete memberships link; shared gallery labels and comparison cases do not',async()=>{
  const {manifest:m}=await fixture(),l=m.lesson;
  l.registry.forEach(i=>{i.atomicGroupId='broad-gallery';i.displayGroupId='gallery';i.group='Same label';});
  l.plan.cases[0].relationship='comparison';l.plan.cases[0].imageIds=['TEST-1','TEST-2'];
  let r=R.inherit(R.empty(l.id),l);assert.deepEqual(R.groupFor(l,'TEST-1',r),['TEST-1']);
  l.registry[0].companionImageIds=['missing'];assert.deepEqual(R.sourceGroups(l),[]);
  l.registry[0].companionImageIds=['TEST-2'];l.registry[1].companionImageIds=['TEST-1'];
  assert.equal(R.sourceGroups(l).length,1);assert.deepEqual(R.groupFor(l,'TEST-1',r),['TEST-1','TEST-2']);
  l.sourceMetadata={masterSource:{manifest:{caseAndComparisonSequences:[{id:'incomplete',preserveOrderAndPairs:true,imageIds:['TEST-1','missing']}]}}};
  assert.equal(R.sourceGroups(l).length,1,'never create a partial source collection');
  assert.throws(()=>R.validate({...r,inheritedLinks:{version:1,disabledGroupIds:['unknown']}},l),/inherited/);
});

test('named atomic groups remain required after unlink and partial selections still fail',async()=>{
  const {manifest:m}=await fixture(undefined,{inheritedGroup:true}),l=m.lesson;
  l.registry.forEach(i=>i.atomicGroupIds=['required-series']);
  let r=R.update(R.inherit(R.empty(l.id),l),l,'TEST-1',{decision:'cards'});
  r=R.separate(r,l,'TEST-1',r.revision);
  assert.deepEqual(R.groupFor(l,'TEST-1',r),['TEST-1','TEST-2']);
  assert.equal(R.linkInfo(l,'TEST-1',r).required.length,1);
  r.images['TEST-2'].decision='later';assert.throws(()=>T.validate(r,l),/partly selected/);
});

test('inherited unlink and restoration survive versioned desktop round trips, merges and replay checks',async()=>{
  const {manifest:m}=await fixture(undefined,{inheritedGroup:true}),l=m.lesson;
  let s=initialChoices(m),desktop=R.empty(l.id);
  s.review=R.separate(s.review,l,'TEST-1',s.review.revision);
  s.review=R.update(s.review,l,'TEST-1',{decision:'cards',objective:'Preserve me'});
  const file=exportChoices(s,m);assert.equal(file.version,2);
  assert.throws(()=>T.read({...file,version:1},l,m.fingerprint),/updated choices format/);
  desktop=T.importDesktop(file,l,m.fingerprint,desktop);assert.deepEqual(R.groupFor(l,'TEST-1',desktop),['TEST-1']);
  assert.deepEqual(T.importDesktop(file,l,m.fingerprint,desktop),desktop);
  assert.deepEqual(T.clean(desktop,l).inheritedLinks,s.review.inheritedLinks);
  s.review=R.restoreLinks(s.review,l,'TEST-1',{},s.review.revision);
  desktop=T.importDesktop(exportChoices(s,m),l,m.fingerprint,desktop);
  assert.equal(R.summary(desktop,l).cards,2);assert.equal(desktop.images['TEST-1'].objective,'Preserve me');
  assert.deepEqual(R.groupFor(l,'TEST-1',desktop),['TEST-1','TEST-2']);
  assert.throws(()=>T.importDesktop(file,l,m.fingerprint,desktop),/older/);
});

test('overlapping saved groups expand transitively; separating leaves unrelated groups alone',async()=>{
  const {manifest:m}=await fixture(),l=m.lesson;
  l.registry.push(...[3,4].map(n=>({...l.registry[0],masterImageId:`TEST-${n}`})));
  l.registry[0].companionImageIds=['TEST-2'];l.registry[1].companionImageIds=['TEST-3'];
  let r=R.inherit(R.empty(l.id),l);assert.deepEqual(R.groupFor(l,'TEST-3',r),['TEST-1','TEST-2','TEST-3']);
  r=R.separate(r,l,'TEST-2',r.revision);assert.deepEqual(R.groupFor(l,'TEST-3',r),['TEST-3']);
  assert.deepEqual(R.groupFor(l,'TEST-4',r),['TEST-4']);
  r=R.restoreLinks(r,l,'TEST-3',{},r.revision);assert.deepEqual(R.groupFor(l,'TEST-3',r),['TEST-1','TEST-2','TEST-3']);
});
