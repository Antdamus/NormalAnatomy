import http from 'node:http';
import fs from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {parseArgs} from 'node:util';
import {verifyManifest,sha256} from '../../src/contract.js';
import {combineAlignments} from '../../src/automatic-timing.js';
import {transcriptAnchors} from '../../src/timing-anchors.js';
import {cleanChunkedMp3} from './mp3.js';
import {buildSubtitles,validateSubtitles} from '../../src/subtitles.js';
import {HandoffQueue} from './handoff.mjs';

export const ORIGIN='https://normalanatomy-lectures.vercel.app';
export const EXTENSION_ORIGIN='chrome-extension://fmdoafmodgecbcabgonodllkoolbafgp';
const MAX_AUDIO=50*1024*1024,MAX_JSON=8*1024*1024,hashPattern=/^[a-f0-9]{64}$/;
const readJSON=async p=>JSON.parse(await fs.readFile(p,'utf8'));
async function atomicJSON(p,value){const tmp=p+'.tmp';await fs.writeFile(tmp,JSON.stringify(value));await fs.rename(tmp,p);}
export async function jobIdentity(manifest,audio){return sha256(new TextEncoder().encode(`${manifest.fingerprint}/${audio.sha256}`));}
function checkAudio(audio){if(!audio||!hashPattern.test(audio.sha256)||audio.path!==`audio/${audio.sha256}`||audio.verifiedExport!==true||!['audio/mpeg','audio/mp4','audio/wav'].includes(audio.mime)||!Number.isSafeInteger(audio.bytes)||audio.bytes<=0||audio.bytes>MAX_AUDIO)throw new Error('A complete, confirmed export with an exact hash is required.');}
export class AlignmentQueue {
  constructor(directory,{ffmpeg,runner}={}){this.directory=path.resolve(directory);this.ffmpeg=ffmpeg;this.runner=runner||this.runProfile.bind(this);this.jobs=new Map();this.busy=false;this.closed=false;this.locks=new Map();}
  location(id,name){if(!hashPattern.test(id))throw new Error('Invalid job identity.');return path.join(this.directory,id,name);}
  async init(){
    await fs.mkdir(this.directory,{recursive:true});
    for(const id of await fs.readdir(this.directory)){
      if(!hashPattern.test(id))continue;
      try{const job=await readJSON(this.location(id,'job.json'));if(job.id!==id)continue;
        if(job.status==='processing')job.status='queued';this.jobs.set(id,job);
        if(job.status==='ready'&&!job.result.subtitles&&!job.result.subtitlesError){
          await this.addSubtitles(job);await this.save(job);
        }
      }catch{/* An interrupted staging directory has no committed job. */}
    }
    this.pump();return this;
  }
  public(job){const {id,status,error,stage,result,createdAt}=job;return {id,status,error,stage,result,createdAt};}
  async locked(id,work){const previous=this.locks.get(id)||Promise.resolve(),next=previous.catch(()=>{}).then(work);this.locks.set(id,next);try{return await next;}finally{if(this.locks.get(id)===next)this.locks.delete(id);}}
  async submit(manifest,audio){
    checkAudio(audio);await verifyManifest(manifest);transcriptAnchors(manifest.lesson);
    if(manifest.lesson.narration.text.length>150000)throw new Error('This transcript exceeds the local alignment limit.');
    if((manifest.lesson.plan.cineWatchPoints||[]).length)throw new Error('Automatic cine timing is not supported.');
    const id=await jobIdentity(manifest,audio);
    // A metadata-only preparation has a different audio hash. Reuse its retained
    // word alignment when the library already plays that exact prepared file.
    const prepared=[...this.jobs.values()].find(j=>j.status==='ready'&&j.fingerprint===manifest.fingerprint&&j.result.audio.sha256===audio.sha256);
    if(prepared)return this.public(prepared);
    return this.locked(id,async()=>{
      if(this.jobs.has(id))return this.public(this.jobs.get(id));
      if([...this.jobs.values()].filter(j=>!['ready','held'].includes(j.status)).length>=8)throw new Error('The local processing queue is full.');
      await fs.mkdir(this.location(id,''),{recursive:true});
      await atomicJSON(this.location(id,'manifest.json'),manifest);
      const job={id,fingerprint:manifest.fingerprint,audio,status:'needs-audio',createdAt:new Date().toISOString(),attempt:0};
      await this.save(job);return this.public(job);
    });
  }
  async save(job){await atomicJSON(this.location(job.id,'job.json'),job);this.jobs.set(job.id,job);}
  async attach(id,bytes){return this.locked(id,async()=>{
    const job=this.jobs.get(id);if(!job)throw new Error('Unknown alignment job.');
    if(job.status!=='needs-audio')return this.public(job);
    if(bytes.length!==job.audio.bytes||await sha256(bytes)!==job.audio.sha256)throw new Error('Recording bytes do not match the saved audio hash.');
    await fs.writeFile(this.location(id,'source.audio'),bytes);
    job.status='queued';await this.save(job);this.pump();return this.public(job);
  });}
  async pump(){
    if(this.busy||this.closed)return;this.busy=true;
    try{for(const job of this.jobs.values()){
      if(this.closed)break;if(job.status!=='queued')continue;
      job.status='processing';job.stage='Checking recording';job.attempt++;await this.save(job);
      try{
        const manifest=await verifyManifest(await readJSON(this.location(job.id,'manifest.json')));
        const original=await fs.readFile(this.location(job.id,'source.audio'));
        if(await sha256(original)!==job.audio.sha256)throw new Error('Saved audio changed.');
        const prepared=job.audio.mime==='audio/mpeg'?cleanChunkedMp3(original):{bytes:original,changed:false};
        const hash=await sha256(prepared.bytes),audio={...job.audio,sha256:hash,path:`audio/${hash}`,bytes:prepared.bytes.length};
        if(prepared.changed){audio.originalExport={sha256:job.audio.sha256,path:job.audio.path,bytes:job.audio.bytes,mime:job.audio.mime};audio.preparation=prepared.report;}
        const audioFile=this.location(job.id,'playback.audio');await fs.writeFile(audioFile,prepared.bytes);
        const results=[];
        for(const profile of ['baseline','check']){
          job.stage=profile==='baseline'?'Matching spoken image references':'Checking transition stability';await this.save(job);
          results.push(await this.runner({job,manifest,audio,audioFile,profile}));
        }
        const timing=combineAlignments(results[0],results[1],manifest,audio);
        if(timing.transcriptSha256!==await sha256(new TextEncoder().encode(manifest.lesson.narration.text)))throw new Error('Alignment transcript hash mismatch.');
        job.result={audio,timing,prepared:prepared.changed,sourceAudioSha256:job.audio.sha256};job.status='ready';job.stage='Ready to sync';
        await this.addSubtitles(job,{manifest,results});
      }catch(error){job.status='held';job.error=String(error.message||error).slice(0,1200);job.stage='Needs attention';}
      await this.save(job);
    }}finally{this.busy=false;}
  }
  async addSubtitles(job,retained={}){
    try{
      const manifest=retained.manifest||await verifyManifest(await readJSON(this.location(job.id,'manifest.json')));
      const file=this.location(job.id,'subtitles-v1.json');let subtitles;
      try{subtitles=validateSubtitles(await readJSON(file),manifest,job.result.audio);}
      catch(error){if(error.code!=='ENOENT')throw error;
        const results=retained.results||await Promise.all(['baseline','check'].map(p=>readJSON(this.location(job.id,`${job.attempt}-${p}.json`))));
        subtitles=buildSubtitles(results[0],results[1],manifest,job.result.audio);
        if(subtitles.transcriptSha256!==await sha256(new TextEncoder().encode(manifest.lesson.narration.text)))throw new Error('Subtitle transcript hash mismatch.');
        await fs.writeFile(file,JSON.stringify(subtitles),{flag:'wx'});
      }
      job.result.subtitles=subtitles;
    }catch(error){job.result.subtitlesError=String(error.message||error).slice(0,1200);}
  }
  async runProfile({job,audioFile,profile}){
    const output=this.location(job.id,`${job.attempt}-${profile}.json`),log=createWriteStream(this.location(job.id,`${job.attempt}-${profile}.log`),{flags:'wx'});
    const args=['--max-old-space-size=6144',fileURLToPath(new URL('./runner.mjs',import.meta.url)),'--manifest',this.location(job.id,'manifest.json'),'--audio',audioFile,'--out',output,'--profile',profile];
    if(this.ffmpeg)args.push('--ffmpeg',this.ffmpeg);
    try{await new Promise((resolve,reject)=>{
      const child=spawn(process.execPath,args,{windowsHide:true,stdio:['ignore','pipe','pipe']});this.child=child;
      child.stdout.pipe(log,{end:false});child.stderr.pipe(log,{end:false});
      const timer=setTimeout(()=>{child.kill();reject(new Error('Local alignment exceeded its 20-minute limit.'));},20*60*1000);
      child.on('error',e=>{clearTimeout(timer);reject(e);});
      child.on('exit',code=>{clearTimeout(timer);this.child=null;code===0?resolve():reject(new Error(`Alignment stopped (${code}). See the local ${profile} log.`));});
    });}finally{log.end();}
    return readJSON(output);
  }
  close(){this.closed=true;this.child?.kill();}
}
async function body(req,max){
  if(Number(req.headers['content-length'])>max)throw new Error('Request is too large.');
  const chunks=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>max)throw new Error('Request is too large.');chunks.push(chunk);}return Buffer.concat(chunks);
}
export function createServer(queue,{origins=[ORIGIN,EXTENSION_ORIGIN],extensionOrigin=EXTENSION_ORIGIN,port=8774,handoffs}={}){
  return http.createServer(async(req,res)=>{
    const send=(code,value)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
    // Chromium extension workers omit Origin on some fetches. A web origin can
    // never substitute this header for its own Origin or use the extension API.
    const origin=req.headers.origin||((req.headers['x-normalanatomy-extension']===extensionOrigin)?extensionOrigin:'');
    if(!origins.includes(origin)||req.headers.host!==`127.0.0.1:${port}`){send(403,{error:'Origin or host is not allowed.'});return;}
    res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');
    if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Methods','GET, POST, PUT, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type, X-NormalAnatomy-Extension');res.setHeader('Access-Control-Allow-Private-Network','true');res.writeHead(204);res.end();return;}
    try{
      if(req.method==='GET'&&req.url==='/health'){send(200,{service:'normalanatomy-timing',version:1,subtitlesVersion:1,...(handoffs?{handoffVersion:1,handoffOwner:handoffs.ownerId}: {})});return;}
      if(handoffs&&req.url.startsWith('/handoffs')){
        const extension=origin===extensionOrigin;
        const json=async()=>{if(req.headers['content-type']!=='application/json')throw new Error('JSON content type required.');return JSON.parse((await body(req,req.url==='/handoffs'?360*1024*1024:MAX_JSON)).toString('utf8'));};
        if(req.url==='/handoffs'&&req.method==='POST'&&extension){send(200,await handoffs.submit(await json()));return;}
        if(req.url==='/handoffs'&&req.method==='GET'){send(200,[...handoffs.jobs.values()].map(j=>handoffs.public(j)));return;}
        const route=/^\/handoffs\/([a-f0-9]{64})(?:\/(package|audio|ack|download))?$/.exec(req.url),job=route&&handoffs.jobs.get(route[1]);
        if(!job){send(404,{error:'Unknown handoff.'});return;}
        if(req.method==='GET'&&!route[2]){send(200,handoffs.public(job));return;}
        if(req.method==='POST'&&route[2]==='download'&&extension){send(200,await handoffs.attachDownload(job.id,await json()));return;}
        if(req.method==='POST'&&route[2]==='ack'&&!extension){send(200,await handoffs.acknowledge(job.id,await json()));return;}
        if(req.method==='GET'&&['package','audio'].includes(route[2])&&!extension){
          if(route[2]==='audio'&&!job.audio)throw new Error('Audio is not ready.');
          const bytes=await fs.readFile(handoffs.location(job.id,route[2]==='package'?'lecture.nalecture':'source.mp3'));
          res.writeHead(200,{'Content-Type':route[2]==='package'?'application/octet-stream':'audio/mpeg','Content-Length':bytes.length,'Cache-Control':'no-store'});res.end(bytes);return;
        }
        send(403,{error:'This handoff operation is not allowed from this origin.'});return;
      }
      if(origin===extensionOrigin){send(403,{error:'Only handoff endpoints are available to the extension.'});return;}
      if(req.method==='POST'&&req.url==='/jobs'){
        if(req.headers['content-type']!=='application/json')throw new Error('JSON content type required.');
        const value=JSON.parse((await body(req,MAX_JSON)).toString('utf8'));send(200,await queue.submit(value.manifest,value.audio));return;
      }
      const match=/^\/jobs\/([a-f0-9]{64})(\/audio)?$/.exec(req.url);
      if(!match){send(404,{error:'Unknown endpoint.'});return;}
      const job=queue.jobs.get(match[1]);if(!job){send(404,{error:'Unknown job.'});return;}
      if(req.method==='PUT'&&match[2]){
        if(req.headers['content-type']!=='application/octet-stream')throw new Error('Binary audio content type required.');
        send(200,await queue.attach(job.id,await body(req,MAX_AUDIO)));return;
      }
      if(req.method==='GET'&&match[2]&&job.status==='ready'){
        const bytes=await fs.readFile(queue.location(job.id,'playback.audio'));
        res.writeHead(200,{'Content-Type':job.result.audio.mime,'Content-Length':bytes.length,'Cache-Control':'no-store'});res.end(bytes);return;
      }
      if(req.method==='GET'&&!match[2]){send(200,queue.public(job));return;}
      send(405,{error:'Unsupported operation.'});
    }catch(error){send(400,{error:String(error.message||error).slice(0,1200)});}
  });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const {values}=parseArgs({options:{directory:{type:'string',default:fileURLToPath(new URL('../../private/timing-jobs',import.meta.url))},ffmpeg:{type:'string'}}});
  let config={};try{config=await readJSON(fileURLToPath(new URL('../../private/handoff-config.json',import.meta.url)));}catch(error){if(error.code!=='ENOENT')throw error;}
  const handoffs=await new HandoffQueue(fileURLToPath(new URL('../../private/handoff-jobs',import.meta.url)),config).init();
  const queue=new AlignmentQueue(values.directory,{ffmpeg:values.ffmpeg}),server=createServer(queue,{handoffs});
  // Bind first: a second service cannot start or resume any work.
  server.listen(8774,'127.0.0.1',async()=>{await queue.init();console.log('NormalAnatomy automatic timing ready at 127.0.0.1:8774');});
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{queue.close();server.close(()=>process.exit());});
}
