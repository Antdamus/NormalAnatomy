import {transcriptAnchors} from './timing-anchors.js';

export const AUTOMATIC_METHOD='local-dtw-crosscheck-v1';
const hashPattern=/^[a-f0-9]{64}$/;
const fail=message=>{throw new Error(message);};
export function validateAutomaticTiming(timing,manifest,audio){
  if(timing?.version!==2||timing.method!==AUTOMATIC_METHOD||timing.status!=='ready'||timing.humanVerified!==false||timing.verified!==false||
    timing.fingerprint!==manifest.fingerprint||timing.audioSha256!==audio?.sha256||!hashPattern.test(timing.audioSha256)||
    !hashPattern.test(timing.transcriptSha256)||!Number.isFinite(timing.duration)||timing.duration<=0||!timing.createdAt||
    timing.evidence?.engine!=='echogarden-dtw'||timing.evidence?.engineVersion!=='3.4.0'||
    JSON.stringify(timing.evidence?.profiles)!=='["baseline","check"]'||!Array.isArray(timing.cues))fail('Automatic timing has missing or mismatched evidence.');
  if((manifest.lesson.plan.cineWatchPoints||[]).length)fail('Cine passages need separate timing support.');
  const anchors=transcriptAnchors(manifest.lesson);
  if(timing.cues.length!==anchors.length)fail('Automatic timing must cover every spoken image reference.');
  let previous=-1;
  for(let i=0;i<anchors.length;i++){
    const a=anchors[i],c=timing.cues[i];
    if(['caseId','imageId','startOffset','endOffset','reference'].some(k=>c[k]!==a[k]))fail('Automatic timing does not match the exact spoken references.');
    if(!Number.isFinite(c.time)||c.time<=previous||c.time<0||!Number.isFinite(c.referenceEndTime)||c.referenceEndTime>timing.duration||
      c.referenceEndTime-c.time<0.15||c.referenceEndTime-c.time>20||!Number.isFinite(c.checkTime)||!Number.isFinite(c.checkEndTime)||
      Math.abs(c.time-c.checkTime)>0.5||Math.abs(c.referenceEndTime-c.checkEndTime)>0.75)fail('An automatic image boundary is unstable or outside the recording.');
    previous=c.time;
  }
  return timing;
}
// Numerical agreement is an automatic consistency check, not human listening.
export function combineAlignments(a,b,manifest,audio){
  if(a.profile!=='baseline'||b.profile!=='check'||a.engine!==b.engine||a.engineVersion!==b.engineVersion||
    a.fingerprint!==b.fingerprint||a.audioSha256!==b.audioSha256||a.transcriptSha256!==b.transcriptSha256||
    Math.abs(a.duration-b.duration)>0.05||a.cues.length!==b.cues.length)fail('Alignment evidence does not describe one exact recording.');
  const timing={version:2,method:AUTOMATIC_METHOD,status:'ready',createdAt:new Date().toISOString(),
    fingerprint:a.fingerprint,audioSha256:a.audioSha256,transcriptSha256:a.transcriptSha256,duration:a.duration,
    verified:false,humanVerified:false,evidence:{engine:a.engine,engineVersion:a.engineVersion,profiles:[a.profile,b.profile]},
    cues:a.cues.map((c,i)=>{
      const check=b.cues[i];if(['caseId','imageId','startOffset','endOffset','reference'].some(k=>c[k]!==check[k]))fail('Alignment references disagree.');
      return {...c,checkTime:check.time,checkEndTime:check.referenceEndTime};
    })};
  return validateAutomaticTiming(timing,manifest,audio);
}
export const timingReady=timing=>timing?.version===1?timing.verified===true:timing?.version===2&&timing.method===AUTOMATIC_METHOD&&timing.status==='ready';
