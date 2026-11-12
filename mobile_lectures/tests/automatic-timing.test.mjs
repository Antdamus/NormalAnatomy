import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {fixture} from './fixture.mjs';
import {sha256,validateTiming,cueAt} from '../src/contract.js';
import {combineAlignments} from '../src/automatic-timing.js';
import {transcriptAnchors,mapAlignedWords} from '../src/timing-anchors.js';
import {cleanChunkedMp3} from '../tools/alignment/mp3.js';
import {AlignmentQueue,createServer,ORIGIN} from '../tools/alignment/service.mjs';
import {createAutomaticSync,desktopProcessorSupported,PROCESSOR_URL} from '../src/automatic-sync.js';

async function evidence(manifest,audio,profile){
  return {profile,fingerprint:manifest.fingerprint,audioSha256:audio.sha256,transcriptSha256:await sha256(new TextEncoder().encode(manifest.lesson.narration.text)),engine:'echogarden-dtw',engineVersion:'3.4.0',duration:30,
    cues:transcriptAnchors(manifest.lesson).map((a,i)=>({...a,time:2+i*10,referenceEndTime:5+i*10,wordCount:3}))};
}
test('automatic cues bind exact spoken references, cross-checks, audio, and approval without human signoff',async()=>{
  const {manifest}=await fixture(),audio={sha256:'a'.repeat(64)},a=await evidence(manifest,audio,'baseline'),b=await evidence(manifest,audio,'check');
  const t=combineAlignments(a,b,manifest,audio);validateTiming(t,manifest,audio);assert.equal(t.verified,false);assert.equal(t.humanVerified,false);assert.equal(cueAt(t,12).imageId,'TEST-2');assert.equal(cueAt(t,0).imageId,'TEST-1');
  for(const edit of [x=>x.audioSha256='b'.repeat(64),x=>x.fingerprint='b'.repeat(64),x=>x.cues.pop(),x=>x.cues[0].startOffset++,x=>x.cues[1].time=1,x=>x.cues[0].checkTime+=1,x=>x.cues[0].checkEndTime+=1,x=>x.cues[0].reference='Image 9',x=>x.verified=true,x=>x.humanVerified=true,x=>x.evidence.profiles=['baseline','baseline']]){
    const bad=structuredClone(t);edit(bad);assert.throws(()=>validateTiming(bad,manifest,audio));
  }
  const changed=structuredClone(b);changed.transcriptSha256='b'.repeat(64);assert.throws(()=>combineAlignments(a,changed,manifest,audio));
});
test('reference mapping preserves repeated references and rejects missing/partial word spans',async()=>{
  const {manifest}=await fixture(),lesson=structuredClone(manifest.lesson);
  const first=lesson.narration.segments[0];first.text+=' Synthetic image 1.';lesson.narration.text=lesson.narration.segments.map(s=>s.text).join('\n\n');
  const anchors=transcriptAnchors(lesson);assert.equal(anchors.length,3);assert.equal(anchors[0].imageId,anchors[1].imageId);
  const words=anchors.map((a,i)=>({startOffsetUtf16:a.startOffset,endOffsetUtf16:a.endOffset,startTime:i*5,endTime:i*5+2}));
  assert.equal(mapAlignedWords(anchors,words,30).length,3);words[0].startOffsetUtf16++;assert.throws(()=>mapAlignedWords(anchors,words,30),/Incomplete/);
  first.text='No reference.';lesson.narration.text=lesson.narration.segments.map(s=>s.text).join('\n\n');assert.throws(()=>transcriptAnchors(lesson),/Missing/);
});
function mp3Frame(){const frame=Buffer.alloc(192);Buffer.from([255,243,132,192]).copy(frame);return frame;}
test('Speechify cleanup preserves every audio frame and rejects unknown or truncated bytes',()=>{
  const frame=mp3Frame(),tag=Buffer.from([73,68,51,4,0,0,0,0,0,0]),original=Buffer.concat([frame,tag,frame]);
  const result=cleanChunkedMp3(original);assert.equal(result.changed,true);assert.deepEqual(result.bytes,Buffer.concat([frame,frame]));assert.equal(result.report.audioFramesPreserved,2);assert.equal(result.report.internalMetadataBlocks,1);
  assert.deepEqual(cleanChunkedMp3(Buffer.concat([tag,frame])).bytes,Buffer.concat([tag,frame]));
  for(const bad of [Buffer.concat([frame,Buffer.from('unknown'),frame]),frame.subarray(0,190),Buffer.concat([frame,tag.subarray(0,8)])])assert.throws(()=>cleanChunkedMp3(bad));
});
test('durable queue deduplicates, checks audio bytes and retains completed results on restart',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'na-timing-test-')),{manifest}=await fixture(),bytes=mp3Frame(),audio={sha256:await sha256(bytes),bytes:bytes.length,mime:'audio/mpeg',verifiedExport:true};audio.path=`audio/${audio.sha256}`;
  let calls=0;const queue=await new AlignmentQueue(dir,{runner:async({manifest,audio,profile})=>{calls++;return evidence(manifest,audio,profile);}}).init();
  const [a,b]=await Promise.all([queue.submit(manifest,audio),queue.submit(manifest,audio)]);assert.equal(a.id,b.id);assert.equal(queue.jobs.size,1);
  await assert.rejects(queue.attach(a.id,Buffer.from('wrong')),/hash/);assert.equal(queue.jobs.get(a.id).status,'needs-audio');
  await queue.attach(a.id,bytes);while(queue.busy)await new Promise(r=>setTimeout(r,5));assert.equal(calls,2);assert.equal(queue.jobs.get(a.id).status,'ready');queue.close();
  const restarted=await new AlignmentQueue(dir,{runner:()=>{throw new Error('must not rerun');}}).init();assert.equal((await restarted.submit(manifest,audio)).status,'ready');restarted.close();
});
test('queue holds failed alignment and never publishes a partial result',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'na-timing-held-')),{manifest}=await fixture(),bytes=mp3Frame(),audio={sha256:await sha256(bytes),bytes:bytes.length,mime:'audio/mpeg',verifiedExport:true};audio.path=`audio/${audio.sha256}`;
  const queue=await new AlignmentQueue(dir,{runner:()=>{throw new Error('unstable boundary');}}).init(),job=await queue.submit(manifest,audio);await queue.attach(job.id,bytes);
  while(queue.busy)await new Promise(r=>setTimeout(r,5));assert.equal(queue.jobs.get(job.id).status,'held');assert.equal(queue.jobs.get(job.id).result,undefined);queue.close();
});
test('loopback bridge rejects foreign origin, absent origin and rebinding Host',async t=>{
  const port=18774,queue={jobs:new Map()},server=createServer(queue,{port});await new Promise(r=>server.listen(port,'127.0.0.1',r));t.after(()=>server.close());
  for(const headers of [{},{Origin:'https://attacker.invalid'}])assert.equal((await fetch(`http://127.0.0.1:${port}/health`,{headers})).status,403);
  const rebound=await new Promise((resolve,reject)=>http.get({hostname:'127.0.0.1',port,path:'/health',headers:{Origin:ORIGIN,Host:'attacker.invalid'}},res=>{res.resume();resolve(res.statusCode);}).on('error',reject));assert.equal(rebound,403);
  const response=await fetch(`http://127.0.0.1:${port}/health`,{headers:{Origin:ORIGIN}});assert.equal(response.status,200);assert.equal(response.headers.get('access-control-allow-origin'),ORIGIN);
  assert.equal((await fetch(`http://127.0.0.1:${port}/jobs`,{method:'POST',headers:{Origin:ORIGIN,'Content-Type':'text/plain'},body:'{}'})).status,400);
});
test('desktop sync publishes completed timing automatically, without sending credentials to loopback',async()=>{
  const {manifest}=await fixture(),audio={sha256:'a'.repeat(64),path:`audio/${'a'.repeat(64)}`,verifiedExport:true},row={fingerprint:manifest.fingerprint,manifest,audio,timing:null};
  const timing=combineAlignments(await evidence(manifest,audio,'baseline'),await evidence(manifest,audio,'check'),manifest,audio),result={sourceAudioSha256:audio.sha256,audio,timing,prepared:false};let saves=0;
  const cloud={listLectures:async()=>[row],getLecture:async()=>row,publishAutomaticTiming:async(r,v)=>{assert.deepEqual(v,result);saves++;return true;}};
  const fetcher=async(url,options={})=>{assert.ok(url.startsWith(PROCESSOR_URL));assert.equal(options.credentials,'omit');assert.equal(options.headers?.Authorization,undefined);return {ok:true,json:async()=>url.endsWith('/health')?{service:'normalanatomy-timing',version:1}:{id:'b'.repeat(64),status:'ready',result}};};
  const sync=createAutomaticSync({cloud,fetcher});await sync.tick();await sync.tick();assert.equal(saves,1);
});
test('desktop sync preserves a manual draft or replaced audio and detects forged transcript evidence',async()=>{
  for(const variant of ['manual','replaced','transcript']){
    const {manifest}=await fixture(),audio={sha256:'a'.repeat(64),verifiedExport:true},row={fingerprint:manifest.fingerprint,manifest,audio,timing:null};
    const timing=combineAlignments(await evidence(manifest,audio,'baseline'),await evidence(manifest,audio,'check'),manifest,audio),result={sourceAudioSha256:audio.sha256,audio,timing,prepared:false};let reads=0,saves=0;
    if(variant==='transcript')timing.transcriptSha256='b'.repeat(64);
    const cloud={listLectures:async()=>[row],getLecture:async()=>{reads++;return reads===1?row:{...row,timing:variant==='manual'?{version:1}:null,audio:variant==='replaced'?{sha256:'c'.repeat(64)}:audio};},publishAutomaticTiming:async()=>{saves++;}};
    const fetcher=async url=>({ok:true,json:async()=>url.endsWith('/health')?{service:'normalanatomy-timing',version:1}:{id:'b'.repeat(64),status:reads===1?'queued':'ready',result}});
    const sync=createAutomaticSync({cloud,fetcher});await sync.tick();await sync.tick();assert.equal(saves,0);
  }
});
test('iPhone and iPad use cloud playback without contacting the desktop processor',()=>{
  for(const nav of [{platform:'iPhone',userAgent:'iPhone'},{platform:'MacIntel',maxTouchPoints:5,userAgent:'Safari'},{platform:'Linux arm',userAgent:'Android'}])assert.equal(desktopProcessorSupported(nav),false);
  assert.equal(desktopProcessorSupported({platform:'Win32',userAgent:'Edge'}),true);
});

test('shared lectures never enqueue a second recording job or publish over the owner content',async()=>{
  const sync=createAutomaticSync({cloud:{listLectures:async()=>[{fingerprint:'a'.repeat(64),shared_from_owner_id:'owner',audio:{verifiedExport:true},timing:null}],getLecture:async()=>{throw new Error('Shared lecture must not be processed');}},fetcher:async url=>{
    assert.equal(url,PROCESSOR_URL+'/health');return {ok:true,json:async()=>({service:'normalanatomy-timing',version:1})};
  },onStatus:(_,message)=>assert.ok(!message.includes('Shared lecture must not'))});
  await sync.tick();
});
