import test from 'node:test';
import assert from 'node:assert/strict';
import {createProgressSync, sameProgress} from '../src/progress-sync.js';

const value = (position, version='v1') => ({position,rate:1.25,audio_sha256:'a'.repeat(64),case_id:'case-1',image_id:'image-1',updated_at:version});
function fixture(initial=value(10)) {
  let remote=initial,version=1,writes=0,fail=false;
  function device(cache=null) {
    const state={cache,paused:true,current:true,applied:[],messages:[]};
    const sync=createProgressSync({
      load:async()=>{if(fail)throw Error('Offline');return structuredClone(remote);},
      save:async(next,expected)=>{if(fail)throw Error('Offline');if(expected!==(remote?.updated_at??null))return null;writes++;remote={...next,updated_at:'v'+(++version)};return structuredClone(remote);},
      readCache:()=>state.cache,writeCache:v=>{state.cache=structuredClone(v);},
      canApply:()=>state.paused,isCurrent:()=>state.current,
      apply:async v=>{state.applied.push(v);},status:v=>state.messages.push(v)
    });return {sync,state};
  }
  return {device,get remote(){return remote;},set remote(v){remote=v;},get writes(){return writes;},set offline(v){fail=v;}};
}
test('computer/phone handoff restores current position, image and speed without idle writes',async()=>{
  const f=fixture(),computer=f.device(),phone=f.device();
  await computer.sync.start();await phone.sync.start();
  const next={...value(47),case_id:'case-2',image_id:'image-2',rate:1.75};
  computer.sync.record(next,{intent:true});await computer.sync.flush();
  await phone.sync.refresh();assert.deepEqual(phone.state.applied.at(-1),f.remote);
  phone.sync.record({...f.remote});await phone.sync.flush();assert.equal(f.writes,1,'resuming is not an edit');
  phone.sync.record(value(60),{intent:true});await phone.sync.flush();await computer.sync.refresh();
  assert.equal(computer.state.applied.at(-1).position,60);assert.equal(f.writes,2);
});
test('cloud version beats old local cache regardless of the other device clock',async()=>{
  const f=fixture(value(80,'server-new')),phone=f.device({value:value(5,'2099-01-01'),baseVersion:'server-old',dirty:true});
  assert.equal((await phone.sync.start()).position,80);await phone.sync.flush();assert.equal(f.writes,0);
});
test('stale in-flight save cannot overwrite newer progress or jump playing audio',async()=>{
  const f=fixture(),a=f.device(),b=f.device();await a.sync.start();await b.sync.start();
  a.state.paused=false;a.sync.record(value(12));b.sync.record(value(70),{intent:true});await b.sync.flush();
  await a.sync.flush();assert.equal(f.remote.position,70);assert.equal(a.state.applied.length,0);
  a.sync.record(value(15));await a.sync.flush();assert.equal(f.writes,1,'automatic playback cannot retry over newer progress');
  a.state.paused=true;await a.sync.refresh();assert.equal(a.state.applied.at(-1).position,70);
  a.sync.record(value(72),{intent:true});await a.sync.flush();assert.equal(f.remote.position,72);
});
test('offline draft retries only against its unchanged cloud version',async()=>{
  const f=fixture(),a=f.device();await a.sync.start();f.offline=true;a.sync.record(value(30),{intent:true});await a.sync.flush();
  assert.equal(a.state.cache.dirty,true);const resumed=f.device(a.state.cache);assert.equal((await resumed.sync.start()).position,30);
  f.offline=false;await resumed.sync.refresh();await resumed.sync.flush();assert.equal(f.remote.position,30);
});
test('offline draft cannot overwrite work done elsewhere while disconnected',async()=>{
  const f=fixture(),a=f.device();await a.sync.start();f.offline=true;a.sync.record(value(30));await a.sync.flush();
  f.remote=value(90,'remote-new');f.offline=false;await a.sync.refresh();await a.sync.flush();
  assert.equal(f.remote.position,90);assert.equal(f.writes,0);assert.equal(a.state.applied.at(-1).position,90);
});
test('an old refresh response cannot jump a newly changed local position',async()=>{
  let resolve;const applied=[];let first=true;
  const sync=createProgressSync({load:()=>first?(first=false,Promise.resolve(value(10))):new Promise(r=>resolve=r),save:async()=>null,readCache:()=>null,writeCache:()=>{},apply:v=>applied.push(v),canApply:()=>true});
  await sync.start();const refresh=sync.refresh();sync.record(value(20),{intent:true});resolve(value(30,'v2'));await refresh;assert.deepEqual(applied,[]);
});
test('a seek during an in-flight save keeps the newer bookmark and advances its version',async()=>{
  let release,remote=value(10),calls=0;
  const sync=createProgressSync({load:async()=>remote,save:async(next,version)=>{calls++;assert.equal(version,remote.updated_at);if(calls===1)await new Promise(r=>release=r);remote={...next,updated_at:'v'+(calls+1)};return remote;},readCache:()=>null,writeCache:()=>{},apply:()=>{},canApply:()=>true});
  await sync.start();sync.record(value(20),{intent:true});const saving=sync.flush();sync.record(value(40),{intent:true});release();await saving;
  assert.equal(remote.position,40);assert.equal(calls,2);
});
test('small media clock jitter is not progress and device/account disposal cannot write',async()=>{
  assert.equal(sameProgress(value(10),value(10.02)),true);assert.equal(sameProgress(value(10),{...value(10),audio_sha256:'different'}),false);
  const f=fixture(),a=f.device();await a.sync.start();a.sync.record(value(20));a.state.current=false;await a.sync.flush();assert.equal(f.writes,0);
});
