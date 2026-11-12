import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {buildPackage} from '../pack.mjs';
import {readPackage,sha256} from '../../src/contract.js';
import {speechifyDocument,validateExport} from '../../src/handoff-contract.js';

const hash=/^[a-f0-9]{64}$/,uuid=/^[a-f0-9-]{36}$/;
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
async function atomic(file,value){await fs.writeFile(file+'.tmp',JSON.stringify(value));await fs.rename(file+'.tmp',file);}
// This spool contains no login tokens. Only the signed-in production library
// publishes, and every job is permanently bound to its configured account.
export class HandoffQueue{
  constructor(directory,{ownerId,downloadsDirectory=path.join(os.homedir(),'Downloads')}={}){this.directory=path.resolve(directory);this.ownerId=ownerId;this.downloadsDirectory=path.resolve(downloadsDirectory);this.jobs=new Map();this.locks=new Map();}
  location(id,name){if(!hash.test(id))throw new Error('Invalid handoff identity.');return path.join(this.directory,id,name);}
  async locked(id,fn){const next=(this.locks.get(id)||Promise.resolve()).catch(()=>{}).then(fn);this.locks.set(id,next);try{return await next;}finally{if(this.locks.get(id)===next)this.locks.delete(id);}}
  async init(){await fs.mkdir(this.directory,{recursive:true});for(const id of await fs.readdir(this.directory)){if(!hash.test(id))continue;try{const job=await read(this.location(id,'job.json'));if(job.id===id&&job.ownerId===this.ownerId)this.jobs.set(id,job);}catch{}}return this;}
  public(job){const {id,ownerId,title,status,error,packageSha256,packageBytes,audio,readerUrl,speechifyTitle,transcriptSha256,createdAt}=job;return {id,ownerId,title,status,error,packageSha256,packageBytes,audio,readerUrl,speechifyTitle,transcriptSha256,createdAt};}
  async save(job){await atomic(this.location(job.id,'job.json'),job);this.jobs.set(job.id,job);return this.public(job);}
  async submit(input){
    if(!uuid.test(this.ownerId||''))throw new Error('Set up the phone-library destination account on this computer first.');
    const lesson=input.lesson;
    if(lesson?.status!=='ready'||lesson.pendingNarrationRevision||!lesson.speechifyTitle||lesson.speechify?.readerFormat==='structured')throw new Error('Wait for the reviewed narration to finish saving in Speechify.');
    const readerUrl=speechifyDocument(lesson.speechify?.readerUrl);
    const {bytes,manifest}=await buildPackage(input);if(bytes.length>256*1024*1024)throw new Error('This lecture exceeds the mobile package limit.');
    const id=manifest.fingerprint;
    return this.locked(id,async()=>{
      if(this.jobs.has(id))return this.public(this.jobs.get(id));
      await fs.mkdir(this.location(id,''),{recursive:true});
      await fs.writeFile(this.location(id,'lecture.nalecture'),bytes);
      return this.save({id,ownerId:this.ownerId,title:lesson.title,status:'awaiting-library',readerUrl,speechifyTitle:lesson.speechifyTitle,
        transcriptSha256:await sha256(new TextEncoder().encode(manifest.lesson.narration.text)),packageSha256:await sha256(bytes),packageBytes:bytes.length,createdAt:new Date().toISOString()});
    });
  }
  async acknowledge(id,{ownerId,stage,audioSha256}){return this.locked(id,async()=>{
    const saved=this.jobs.get(id);if(!saved||saved.ownerId!==ownerId)throw new Error('The handoff belongs to a different account.');const job=structuredClone(saved);
    if(stage==='package'&&job.status==='awaiting-library')job.status='awaiting-export';
    else if(stage==='existing-audio'&&job.status==='awaiting-library'&&hash.test(audioSha256||'')){job.status='complete';job.preservedAudioSha256=audioSha256;}
    else if(stage==='audio'&&job.audio?.sha256===audioSha256&&job.status==='audio-ready')job.status='complete';
    else if(job.status!=='complete')throw new Error('The handoff acknowledgement does not match its current stage.');
    return this.save(job);
  });}
  async attachDownload(id,{filename,receipt}){return this.locked(id,async()=>{
    const saved=this.jobs.get(id);if(!saved)throw new Error('Unknown handoff.');if(saved.audio)return this.public(saved);
    if(saved.status!=='awaiting-export')throw new Error('The library must accept the exact reviewed package before audio export.');
    const {manifest}=await readPackage(await fs.readFile(this.location(id,'lecture.nalecture')));await validateExport(receipt,manifest);
    if(speechifyDocument(receipt.readerUrl)!==saved.readerUrl||receipt.title!==saved.speechifyTitle)throw new Error('The export belongs to another Speechify document.');
    const base=await fs.realpath(this.downloadsDirectory),file=await fs.realpath(filename);
    if(!file.toLowerCase().startsWith((base+path.sep).toLowerCase())||path.extname(file).toLowerCase()!=='.mp3')throw new Error('Only the completed MP3 download inside Downloads can be attached automatically.');
    const stat=await fs.stat(file);if(!stat.isFile()||stat.size<=0||stat.size>50*1024*1024||stat.size!==receipt.bytes)throw new Error('The complete recording exceeds the limit or changed after download.');
    const bytes=await fs.readFile(file),digest=await sha256(bytes);
    await fs.writeFile(this.location(id,'source.mp3'),bytes);
    const job={...saved,status:'audio-ready',audio:{sha256:digest,path:`audio/${digest}`,mime:'audio/mpeg',bytes:bytes.length,verifiedExport:true,exportEvidence:{...receipt,audioSha256:digest}}};
    return this.save(job);
  });}
}
