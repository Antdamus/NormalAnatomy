import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fixture} from './fixture.mjs';
import {sha256,readPackage} from '../src/contract.js';
import {HandoffQueue} from '../tools/alignment/handoff.mjs';
import {createServer,ORIGIN,EXTENSION_ORIGIN} from '../tools/alignment/service.mjs';
import {createHandoffSync} from '../src/handoff-sync.js';

const ownerId='11111111-1111-4111-8111-111111111111';
async function portable(){const f=await fixture();return {f,input:{lesson:{...f.manifest.lesson,status:'ready',speechifyTitle:'Exact test · 1234',speechify:{readerUrl:'https://app.speechify.com/item/1234?folder=test'}},assets:Object.fromEntries(f.manifest.media.map(m=>[`${f.manifest.lesson.id}/${m.imageId}/${m.variant}`,`data:${m.mime};base64,${Buffer.from(f.files[m.path]).toString('base64')}`]))}};}
async function environment(t){const directory=await fs.mkdtemp(path.join(os.tmpdir(),'na-handoff-'));t.after(()=>fs.rm(directory,{recursive:true,force:true}));const downloadsDirectory=path.join(directory,'Downloads');await fs.mkdir(downloadsDirectory);return {directory,downloadsDirectory,queue:await new HandoffQueue(path.join(directory,'jobs'),{ownerId,downloadsDirectory}).init()};}
async function receipt(f){return {version:1,fingerprint:f.manifest.fingerprint,method:'speechify-full-document-export',transcriptSha256:await sha256(new TextEncoder().encode(f.manifest.lesson.narration.text)),readerUrl:'https://app.speechify.com/item/1234',title:'Exact test · 1234',voice:'Test voice',fullTextMatched:true,downloadId:17,startedAt:'2026-11-12T10:00:00Z',completedAt:'2026-11-12T10:01:00Z',bytes:4};}
test('handoff preserves exact reviewed package, retries once and survives restart',async t=>{
  const {queue,directory,downloadsDirectory}=await environment(t),{f,input}=await portable(),job=await queue.submit(input);
  assert.equal(job.status,'awaiting-library');const bytes=await fs.readFile(queue.location(job.id,'lecture.nalecture')),pkg=await readPackage(bytes);
  assert.deepEqual(pkg.manifest.lesson.registry,f.manifest.lesson.registry);assert.deepEqual(pkg.manifest.lesson.narration,f.manifest.lesson.narration);assert.equal(pkg.manifest.media.length,4);
  assert.deepEqual(await queue.submit(input),job);
  const reloaded=await new HandoffQueue(path.join(directory,'jobs'),{ownerId,downloadsDirectory}).init();assert.equal(reloaded.jobs.size,1);
  const wrong=structuredClone(input);wrong.lesson.narration.text+=' changed';await assert.rejects(queue.submit(wrong));
  wrong.lesson=structuredClone(input.lesson);delete wrong.lesson.quality.approvals.lecture;await assert.rejects(queue.submit(wrong),/approval/);
  const missing=structuredClone(input);delete missing.assets['vl-1234/TEST-1/annotated'];await assert.rejects(queue.submit(missing),/Missing/);
  await assert.rejects(queue.acknowledge(job.id,{ownerId:'other',stage:'package'}),/account/);
});
test('audio requires package acceptance, complete exact-document evidence and a Downloads-contained path',async t=>{
  const {queue,downloadsDirectory,directory}=await environment(t),{f,input}=await portable(),job=await queue.submit(input),r=await receipt(f),filename=path.join(downloadsDirectory,'Exact test.mp3');await fs.writeFile(filename,'test');
  await assert.rejects(queue.attachDownload(job.id,{filename,receipt:r}),/accept/);await queue.acknowledge(job.id,{ownerId,stage:'package'});
  for(const change of [{fullTextMatched:false},{transcriptSha256:'a'.repeat(64)},{readerUrl:'https://app.speechify.com/item/other'},{title:'Wrong'},{bytes:3}])await assert.rejects(queue.attachDownload(job.id,{filename,receipt:{...r,...change}}));
  const outside=path.join(directory,'outside.mp3');await fs.writeFile(outside,'test');await assert.rejects(queue.attachDownload(job.id,{filename:outside,receipt:r}),/Downloads/);
  const saved=await queue.attachDownload(job.id,{filename,receipt:r});assert.equal(saved.audio.sha256,await sha256(Buffer.from('test')));assert.equal(saved.status,'audio-ready');
  await queue.acknowledge(job.id,{ownerId,stage:'audio',audioSha256:saved.audio.sha256});assert.equal(queue.jobs.get(job.id).status,'complete');
});
test('production browser alone publishes its account jobs; retry keeps existing audio and never sends credentials locally',async t=>{
  const {queue,downloadsDirectory}=await environment(t),{f,input}=await portable(),job=await queue.submit(input);let row=null,uploads=0,audioUploads=0,active=true;const messages=[];
  const fetcher=async(url,options={})=>{
    assert.equal(options.credentials,'omit');assert.equal(options.headers?.authorization,undefined);
    const route=new URL(url).pathname;let value;
    if(route==='/health')value={handoffVersion:1,handoffOwner:ownerId};
    else if(route==='/handoffs')value=[...queue.jobs.values()].map(j=>queue.public(j));
    else if(route.endsWith('/package'))return new Response(await fs.readFile(queue.location(job.id,'lecture.nalecture')));
    else if(route.endsWith('/audio'))return new Response(await fs.readFile(queue.location(job.id,'source.mp3')));
    else if(route.endsWith('/ack'))value=await queue.acknowledge(job.id,JSON.parse(options.body));
    else throw new Error('Unexpected route');return Response.json(value);
  };
  const cloud={acceptHandoffPackage:async pkg=>{uploads++;row||={manifest:pkg.manifest,fingerprint:job.id,audio:null};return row;},getLecture:async()=>row,
    acceptHandoffAudio:async(saved,bytes,meta)=>{audioUploads++;assert.equal(saved,row);assert.equal(await sha256(bytes),meta.sha256);row.audio=meta;}};
  const sync=createHandoffSync({cloud,ownerId,fetcher,isActive:()=>active,onStatus:m=>messages.push(m)});
  await sync.tick();await sync.tick();assert.equal(uploads,1);assert.equal(queue.jobs.get(job.id).status,'awaiting-export');
  const filename=path.join(downloadsDirectory,'test.mp3');await fs.writeFile(filename,'test');await queue.attachDownload(job.id,{filename,receipt:await receipt(f)});
  await sync.tick();await sync.tick();assert.equal(audioUploads,1);assert.equal(queue.jobs.get(job.id).status,'complete');
  active=false;await sync.tick();assert.equal(uploads,1);
  const existing={...queue.jobs.get(job.id),status:'awaiting-library',audio:undefined};await queue.save(existing);await sync.tick();assert.equal(queue.jobs.get(job.id).status,'awaiting-library');active=true;await sync.tick();assert.equal(queue.jobs.get(job.id).status,'complete');assert.equal(audioUploads,1);
});
test('HTTP handoff separates extension staging from account-bound browser publication',async t=>{
  const {queue}=await environment(t),{input}=await portable();let server;
  // Reserve an ephemeral port, then use the real Host/origin checks.
  server=createServer({},{handoffs:queue,port:0});await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;await new Promise(r=>server.close(r));
  server=createServer({},{handoffs:queue,port});await new Promise(r=>server.listen(port,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
  const url=`http://127.0.0.1:${port}`;
  const post=(route,body,origin)=>fetch(url+route,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
  assert.equal((await post('/handoffs',input,ORIGIN)).status,404);
  assert.equal((await post('/handoffs',input,'https://malicious.test')).status,403);
  const response=await post('/handoffs',input,EXTENSION_ORIGIN);assert.equal(response.status,200);const job=await response.json();
  assert.equal((await post(`/handoffs/${job.id}/ack`,{ownerId,stage:'package'},EXTENSION_ORIGIN)).status,403);
  assert.equal((await post(`/handoffs/${job.id}/ack`,{ownerId,stage:'package'},ORIGIN)).status,200);
  const extensionHealth=await fetch(url+'/health',{headers:{'X-NormalAnatomy-Extension':EXTENSION_ORIGIN}});assert.equal(extensionHealth.status,200);
  assert.equal((await fetch(url+'/health',{headers:{Origin:'https://malicious.test','X-NormalAnatomy-Extension':EXTENSION_ORIGIN}})).status,403);
});
