import {sha256,timingReady,validateTiming} from './contract.js';
export const PROCESSOR_URL='http://127.0.0.1:8774';
export const desktopProcessorSupported=nav=>/Win|Linux|Mac/.test(nav.platform||'')&&!(/iPhone|iPad|Android/.test(nav.userAgent||'')||(nav.platform==='MacIntel'&&nav.maxTouchPoints>1));

// Only this signed-in browser uploads results. No account/session credential is
// sent to the local processor. Jobs continue on disk if the browser is closed.
export function createAutomaticSync({cloud,fetcher=fetch,onStatus=()=>{},onSaved=()=>{},isActive=()=>true}){
  const pending=new Map(),finished=new Set();let running=false;
  async function local(url,options={}){
    const response=await fetcher(PROCESSOR_URL+url,{...options,credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(120000)});
    if(!response.ok){let message;try{message=(await response.json()).error;}catch{}throw new Error(message||'The desktop timing processor is unavailable.');}return response;
  }
  async function tick(){
    if(running||!isActive())return;running=true;
    try{
      const health=await(await local('/health')).json();if(health.service!=='normalanatomy-timing'||health.version!==1)throw new Error('Unexpected desktop processor.');
      if(!isActive())return;
      onStatus(null,'Desktop processor connected. New attached recordings process automatically.');
      const rows=await cloud.listLectures();
      for(const summary of rows){
        if(!isActive())return;
        if(!summary.audio?.verifiedExport||summary.timing)continue; // Preserve all existing manual drafts and checked timing.
        const key=`${summary.fingerprint}/${summary.audio.sha256}`;
        if(finished.has(key))continue;
        let job=pending.get(key),row;
        if(!job){
          row=await cloud.getLecture(summary.fingerprint);if(row.timing||row.audio?.sha256!==summary.audio.sha256)continue;
          job=await(await local('/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({manifest:row.manifest,audio:row.audio})})).json();pending.set(key,job);
        }
        if(job.status==='needs-audio'){
          onStatus(summary.fingerprint,'Sending recording to this computer…');
          const source=await fetcher(await cloud.signedMedia(summary.fingerprint,summary.audio.path));
          if(!source.ok)throw new Error('The saved recording could not be downloaded.');
          const bytes=await source.arrayBuffer();if(bytes.byteLength!==summary.audio.bytes||await sha256(bytes)!==summary.audio.sha256)throw new Error('Downloaded recording does not match its hash.');
          if(!isActive())return;
          job=await(await local(`/jobs/${job.id}/audio`,{method:'PUT',headers:{'Content-Type':'application/octet-stream'},body:bytes})).json();pending.set(key,job);
        }else {job=await(await local(`/jobs/${job.id}`)).json();pending.set(key,job);}
        if(job.status==='held'){onStatus(summary.fingerprint,`Automatic timing held: ${job.error}`);finished.add(key);continue;}
        if(job.status!=='ready'){onStatus(summary.fingerprint,(job.stage||'Queued for automatic timing')+'…');continue;}
        const result=job.result;row ||= await cloud.getLecture(summary.fingerprint);
        if(row.timing||row.audio?.sha256!==summary.audio.sha256){pending.delete(key);continue;}
        if(result.sourceAudioSha256!==row.audio.sha256)throw new Error('Automatic result belongs to a different source recording.');
        validateTiming(result.timing,row.manifest,result.audio);
        if(result.timing.transcriptSha256!==await sha256(new TextEncoder().encode(row.manifest.lesson.narration.text)))throw new Error('Automatic result belongs to a different transcript.');
        let prepared=null;
        if(result.prepared){
          prepared=await(await local(`/jobs/${job.id}/audio`)).arrayBuffer();
          if(prepared.byteLength!==result.audio.bytes||await sha256(prepared)!==result.audio.sha256)throw new Error('Prepared recording did not pass its hash check.');
        }else if(result.audio.sha256!==row.audio.sha256)throw new Error('Automatic timing has an unexplained recording change.');
        if(!isActive())return;
        const saved=await cloud.publishAutomaticTiming(row,result,prepared);
        if(saved){finished.add(key);pending.delete(key);onStatus(summary.fingerprint,'Automatic timing synced to your library.');onSaved(summary.fingerprint);}
      }
    }catch(error){onStatus(null,`Automatic timing: ${error.message}. Keep the desktop processor and this library open to sync.`);}
    finally{running=false;}
  }
  return {tick};
}
