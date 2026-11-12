import {readPackage,sha256} from './contract.js';
import {validateExport} from './handoff-contract.js';
import {PROCESSOR_URL} from './automatic-sync.js';

export function createHandoffSync({cloud,ownerId,fetcher=fetch,isActive=()=>true,onStatus=()=>{},onSaved=()=>{}}){
  let running=false;
  async function local(url,options={}){const response=await fetcher(PROCESSOR_URL+url,{...options,credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(120000)});if(!response.ok){let error;try{error=(await response.json()).error;}catch{}throw new Error(error||'The desktop handoff is unavailable.');}return response;}
  const ack=(id,stage,audioSha256)=>local(`/handoffs/${id}/ack`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ownerId,stage,audioSha256})});
  async function tick(){
    if(running||!isActive())return;running=true;
    try{
      const health=await(await local('/health')).json();
      if(health.handoffVersion!==1){onStatus('Reload the updated desktop processor to enable automatic lecture handoff.');return;}
      if(health.handoffOwner!==ownerId){onStatus('The desktop handoff is configured for a different account.');return;}
      const jobs=await(await local('/handoffs')).json();let count=0;
      for(const job of jobs){
        if(!isActive())return;if(job.ownerId!==ownerId||job.status==='complete')continue;count++;
        try{
          if(job.status==='awaiting-library'){
            onStatus(`Adding ${job.title}…`);
            const bytes=await(await local(`/handoffs/${job.id}/package`)).arrayBuffer();
            if(bytes.byteLength!==job.packageBytes||await sha256(bytes)!==job.packageSha256)throw new Error('Lecture package hash mismatch.');
            const pkg=await readPackage(bytes);if(pkg.manifest.fingerprint!==job.id)throw new Error('Wrong reviewed lecture.');
            if(!isActive())return;
            const row=await cloud.acceptHandoffPackage(pkg,ownerId,onStatus);
            if(!isActive())return;
            await ack(job.id,row.audio?'existing-audio':'package',row.audio?.sha256);onSaved(job.id);
            onStatus(row.audio?'Existing lecture and recording kept.':`${job.title}: waiting for the automatic Speechify export…`);
          }else if(job.status==='audio-ready'){
            const row=await cloud.getLecture(job.id);await validateExport(job.audio?.exportEvidence,row.manifest);
            const bytes=await(await local(`/handoffs/${job.id}/audio`)).arrayBuffer();
            if(bytes.byteLength!==job.audio.bytes||await sha256(bytes)!==job.audio.sha256)throw new Error('Audio download hash mismatch.');
            if(!isActive())return;
            await cloud.acceptHandoffAudio(row,bytes,job.audio,ownerId);
            if(!isActive())return;
            await ack(job.id,'audio',job.audio.sha256);onSaved(job.id);onStatus(`${job.title}: audio uploaded; image timing and subtitles will follow automatically.`);
          }else onStatus(`${job.title}: waiting for the automatic Speechify export. Keep the desktop browser open.`);
        }catch(error){onStatus(`${job.title}: handoff held — ${error.message}`);}
      }
      if(!count)onStatus('Automatic handoff connected. New opted-in lectures arrive after review and Speechify export.');
    }catch(error){onStatus(`Automatic handoff: ${error.message}`);}finally{running=false;}
  }
  return {tick};
}
