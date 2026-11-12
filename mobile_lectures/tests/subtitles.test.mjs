import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fixture} from './fixture.mjs';
import {sha256} from '../src/contract.js';
import {buildSubtitles,validateSubtitles,subtitleAt,subtitleText} from '../src/subtitles.js';
import {createAutomaticSync} from '../src/automatic-sync.js';
import {AlignmentQueue,jobIdentity} from '../tools/alignment/service.mjs';
async function inputs(){
  const {manifest}=await fixture(),audio={sha256:'a'.repeat(64),path:`audio/${'a'.repeat(64)}`,verifiedExport:true},text=manifest.lesson.narration.text;
  const words=[...text.matchAll(/[\p{L}\p{N}]+/gu)].map((m,i)=>({text:m[0],startOffsetUtf16:m.index,endOffsetUtf16:m.index+m[0].length,startTime:i*.4+.2,endTime:i*.4+.5}));
  const common={fingerprint:manifest.fingerprint,audioSha256:audio.sha256,transcriptSha256:await sha256(new TextEncoder().encode(text)),duration:30,engine:'echogarden-dtw',engineVersion:'3.4.0',words};
  return {manifest,audio,a:{...structuredClone(common),profile:'baseline'},b:{...structuredClone(common),profile:'check'}};
}
test('subtitle phrases preserve the complete exact transcript and clear in pauses',async()=>{
  const {a,b,manifest,audio}=await inputs(),t=buildSubtitles(a,b,manifest,audio),text=manifest.lesson.narration.text;
  assert.equal(t.cues.map(c=>text.slice(c[2],c[3])).join(''),text);assert.equal(t.humanVerified,false);
  assert.equal(subtitleAt(t,0),null);assert.equal(subtitleAt(t,t.cues[0][0]),t.cues[0]);assert.equal(subtitleAt(t,t.cues[0][1]),null);
  assert.equal(subtitleAt(t,NaN),null);assert.equal(subtitleAt(t,31),null);assert.equal(subtitleAt(t,t.cues.at(-1)[0]),t.cues.at(-1));
  assert.equal(subtitleText('Alpha.\n\nBeta',[0,1,0,8]),'Alpha.');assert.equal(subtitleText(text,null),'');
});
test('subtitle evidence rejects skipped words, unstable clocks, overlaps and stale identities',async()=>{
  for(const change of [x=>x.words.splice(2,1),x=>x.words[0].startTime+=2,x=>x.audioSha256='b'.repeat(64),x=>x.transcriptSha256='c'.repeat(64),x=>x.words[0].startOffsetUtf16++]){
    const {a,b,manifest,audio}=await inputs();change(b);assert.throws(()=>buildSubtitles(a,b,manifest,audio));
  }
  const {a,b,manifest,audio}=await inputs(),t=buildSubtitles(a,b,manifest,audio);
  for(const change of [x=>x.cues.pop(),x=>x.cues[0][2]++,x=>x.cues[1][0]=0,x=>x.cues[0][1]=31,x=>x.audioSha256='b'.repeat(64),x=>x.fingerprint='b'.repeat(64),x=>x.humanVerified=true,x=>x.maxBoundaryDifference=1]){const bad=structuredClone(t);change(bad);assert.throws(()=>validateSubtitles(bad,manifest,audio));}
});
test('subtitle backfill preserves existing image timing and recording bytes',async()=>{
  const {a,b,manifest,audio}=await inputs(),subtitles=buildSubtitles(a,b,manifest,audio),manual={version:1,verified:false,cues:[]},row={fingerprint:manifest.fingerprint,manifest,audio,timing:manual};let captions=0,images=0;
  const cloud={listLectures:async()=>[row],getLecture:async()=>row,publishAutomaticTiming:async()=>{images++;},publishSubtitles:async(r,t)=>{assert.equal(r.timing,manual);assert.equal(t,subtitles);captions++;row.audio={...row.audio,subtitles};return true;}};
  const fetcher=async url=>({ok:true,json:async()=>url.endsWith('/health')?{service:'normalanatomy-timing',version:1}:{id:'b'.repeat(64),status:'ready',result:{audio,subtitles,sourceAudioSha256:audio.sha256}}});
  const sync=createAutomaticSync({cloud,fetcher});await sync.tick();await sync.tick();assert.equal(captions,1);assert.equal(images,0);assert.equal(row.audio.sha256,audio.sha256);assert.equal(row.timing,manual);
});
test('saved word evidence upgrades a completed job without repeating alignment',async()=>{
  const {a,b,manifest,audio}=await inputs(),dir=await fs.mkdtemp(path.join(os.tmpdir(),'na-subtitle-upgrade-')),id=await jobIdentity(manifest,audio),folder=path.join(dir,id);await fs.mkdir(folder);
  const job={id,fingerprint:manifest.fingerprint,audio,status:'ready',attempt:1,result:{audio,timing:{preserved:true}}};
  for(const [name,value] of [['manifest.json',manifest],['job.json',job],['1-baseline.json',a],['1-check.json',b]])await fs.writeFile(path.join(folder,name),JSON.stringify(value));
  const queue=await new AlignmentQueue(dir,{runner:()=>{throw new Error('Must reuse word evidence');}}).init(),saved=queue.jobs.get(id);
  assert.equal(saved.status,'ready');assert.ok(saved.result.subtitles.cues.length);assert.deepEqual(saved.result.timing,job.result.timing);
  assert.equal(await fs.readFile(path.join(folder,'1-baseline.json'),'utf8'),JSON.stringify(a));queue.close();
});
