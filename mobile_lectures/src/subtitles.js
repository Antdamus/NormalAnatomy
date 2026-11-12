const hashPattern=/^[a-f0-9]{64}$/;
const hasWord=text=>/[\p{L}\p{N}]/u.test(text);
const fail=message=>{throw new Error(message);};
export function validateSubtitles(track,manifest,audio){
  const text=manifest.lesson.narration.text;
  if(track?.version!==1||track.method!=='aligned-transcript-phrases-v1'||track.fingerprint!==manifest.fingerprint||
    track.audioSha256!==audio?.sha256||!hashPattern.test(track.transcriptSha256)||track.humanVerified!==false||
    !Number.isFinite(track.duration)||track.duration<=0||!Array.isArray(track.cues)||!track.cues.length||
    track.cues.length>20000||!Number.isFinite(track.maxBoundaryDifference)||track.maxBoundaryDifference>0.75||track.maxBoundaryDifference<0)
    fail('Subtitles do not match this exact lecture and recording.');
  let offset=0,previousEnd=0;
  for(const cue of track.cues){
    if(!Array.isArray(cue)||cue.length!==4)fail('Invalid subtitle cue.');
    const [start,end,from,to]=cue;
    if(!Number.isFinite(start)||!Number.isFinite(end)||start<previousEnd||end<=start||end>track.duration||
      !Number.isSafeInteger(from)||!Number.isSafeInteger(to)||from!==offset||to<=from||to>text.length||!hasWord(text.slice(from,to)))
      fail('Subtitles must cover the exact transcript in playback order.');
    previousEnd=end;offset=to;
  }
  if(offset!==text.length)fail('Subtitles are missing part of the approved narration.');
  return track;
}
export function buildSubtitles(a,b,manifest,audio){
  if(a.profile!=='baseline'||b.profile!=='check'||a.engine!=='echogarden-dtw'||a.engine!==b.engine||a.engineVersion!==b.engineVersion||
    a.fingerprint!==manifest.fingerprint||b.fingerprint!==a.fingerprint||a.audioSha256!==audio.sha256||b.audioSha256!==a.audioSha256||
    a.transcriptSha256!==b.transcriptSha256||Math.abs(a.duration-b.duration)>0.05||!a.words?.length||a.words.length!==b.words?.length)
    fail('Complete matching word-alignment evidence is required for subtitles.');
  const text=manifest.lesson.narration.text,words=a.words,cues=[];let offset=0,previousEnd=0,maxBoundaryDifference=0;
  for(let i=0;i<words.length;i++){
    const w=words[i],v=b.words[i];
    if(w.startOffsetUtf16!==v.startOffsetUtf16||w.endOffsetUtf16!==v.endOffsetUtf16||w.text!==v.text||
      !Number.isSafeInteger(w.startOffsetUtf16)||!Number.isSafeInteger(w.endOffsetUtf16)||w.startOffsetUtf16<offset||w.endOffsetUtf16<=w.startOffsetUtf16||
      w.endOffsetUtf16>text.length||hasWord(text.slice(offset,w.startOffsetUtf16)))fail('Word alignment skips or changes approved transcript text.');
    for(const word of [w,v])if(!Number.isFinite(word.startTime)||!Number.isFinite(word.endTime)||word.startTime<0||word.endTime<word.startTime||word.endTime>a.duration)fail('Invalid subtitle word time.');
    if(w.startTime<previousEnd)fail('Subtitle words overlap in time.');offset=w.endOffsetUtf16;previousEnd=w.endTime;
  }
  if(hasWord(text.slice(offset)))fail('Word alignment is missing the end of the narration.');
  let first=0,from=0;
  for(let i=0;i<words.length;i++){
    const w=words[i],next=words[i+1],to=next?.startOffsetUtf16??text.length;
    const punctuation=text.slice(w.endOffsetUtf16,to),phrase=text.slice(from,to);
    const endSentence=/[.!?][\s"'”’\])]*$/.test(punctuation)||/\n\s*\n/.test(punctuation);
    const nextTooLong=next&&(text.slice(from,next.endOffsetUtf16).replace(/\s+/g,' ').trim().length>84||next.endTime-words[first].startTime>6);
    if(!next||endSentence||nextTooLong||i-first>=11){
      const start=words[first].startTime,end=w.endTime;
      const delta=Math.max(Math.abs(start-b.words[first].startTime),Math.abs(end-b.words[i].endTime));
      if(delta>0.75)fail('A subtitle phrase boundary is unstable across alignment passes.');
      maxBoundaryDifference=Math.max(maxBoundaryDifference,delta);cues.push([start,end,from,to]);first=i+1;from=to;
    }
  }
  return validateSubtitles({version:1,method:'aligned-transcript-phrases-v1',fingerprint:a.fingerprint,audioSha256:a.audioSha256,
    transcriptSha256:a.transcriptSha256,duration:a.duration,humanVerified:false,maxBoundaryDifference,cues},manifest,audio);
}
export function subtitleAt(track,seconds){
  if(!track?.cues||!Number.isFinite(seconds))return null;
  let low=0,high=track.cues.length-1,best=-1;
  while(low<=high){const middle=(low+high)>>1;if(track.cues[middle][0]<=seconds){best=middle;low=middle+1;}else high=middle-1;}
  const cue=track.cues[best];return cue&&seconds<cue[1]?cue:null;
}
export const subtitleText=(text,cue)=>cue?text.slice(cue[2],cue[3]).replace(/\s+/g,' ').trim():'';
