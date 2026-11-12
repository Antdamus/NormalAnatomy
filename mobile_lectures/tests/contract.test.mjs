import test from 'node:test';
import assert from 'node:assert/strict';
import {zipSync,strToU8} from 'fflate';
import {readPackage,validateTiming,cueAt,portableLesson,verifyManifest} from '../src/contract.js';
import {fixture} from './fixture.mjs';
test('complete package preserves exact source, paired variants and approvals',async()=>{
  const f=await fixture(),decoded=await readPackage(f.encode());assert.deepEqual(decoded.manifest,f.manifest);assert.equal(decoded.manifest.media.length,4);
});
test('changed text or source captions cannot reuse saved approvals',async()=>{
  for(const edit of [m=>m.lesson.registry[0].caption+=' changed',m=>m.lesson.narration.segments[0].text+=' changed']){
    const f=await fixture();edit(f.manifest);await assert.rejects(readPackage(f.encode()),/approval/);
  }
});
test('missing paired variant and corrupt bytes fail before upload',async()=>{
  const f=await fixture();f.manifest.media.pop();await assert.rejects(readPackage(f.encode()),/Missing original/);
  const g=await fixture();Object.values(g.files)[0][20]^=1;await assert.rejects(readPackage(g.encode()),/verification failed/);
});
test('package rejects traversal and unregistered media',async()=>{
  await assert.rejects(readPackage(zipSync({'../private.txt':strToU8('bad')})),/Unexpected/);
  const f=await fixture();f.manifest.media[0].path='https://example.com/tracker';await assert.rejects(verifyManifest(f.manifest),/description/);
});
test('portable data excludes credentials and generation runtime',async()=>{
  const f=await fixture(),l=portableLesson({...f.manifest.lesson,token:'private',settings:{secret:'private'},generationTabId:123});assert.equal(l.token,undefined);assert.equal(l.settings,undefined);assert.equal(l.generationTabId,undefined);
});
test('verified cues bind every image to exact audio and reviewed version',async()=>{
  const {manifest}=await fixture(),audio={sha256:'a'.repeat(64)};
  const timing={version:1,fingerprint:manifest.fingerprint,audioSha256:audio.sha256,duration:30,verified:true,verifiedAt:'2026-11-11',cues:[{caseId:'case-1',imageId:'TEST-1',time:0},{caseId:'case-2',imageId:'TEST-2',time:10}]};
  validateTiming(timing,manifest,audio);assert.equal(cueAt(timing,9).imageId,'TEST-1');assert.equal(cueAt(timing,10).imageId,'TEST-2');assert.equal(cueAt({...timing,verified:false},15),null);
  for(const edit of [t=>t.audioSha256='b'.repeat(64),t=>t.cues.pop(),t=>t.cues[1].time=0,t=>t.cues[1].time=40,t=>t.cues.reverse()]){const changed=structuredClone(timing);edit(changed);assert.throws(()=>validateTiming(changed,manifest,audio));}
});
