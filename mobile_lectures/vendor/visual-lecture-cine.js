/* Cine teaching passages are part of the spoken sequence; media URLs are ephemeral. */
(function(root){
  'use strict';
  const registry = lesson => lesson.sourceMetadata?.masterSource?.manifest?.cineRegistry?.priorityVideos ||
    root.VisualLecture?.sourceDocument(lesson)?.manifest?.cineRegistry?.priorityVideos || [];
  function rawSegment(segment){
    return {caseId:segment.caseId,text:segment.body ?? (segment.cue && segment.text.startsWith(segment.cue+'\n\n') ? segment.text.slice(segment.cue.length+2) : segment.text),
      ...(segment.cineSegments ? {cineSegments:segment.cineSegments.map(c=>({registryId:c.registryId,text:c.text}))} : {})};
  }
  const options = lesson => ({requireArrowCues:lesson.narrationContractVersion>=2 || lesson.narration?.arrowCuesVersion>=1,
    integratedCines:lesson.cinePlaybackVersion===1 || lesson.narration?.cineNarrationVersion===1,cineRegistry:registry(lesson)});
  function enrich(segment, raw, plan, cines, images){
    const points=(plan.cineWatchPoints || []).filter(p=>p.caseId===segment.caseId), supplied=raw.cineSegments || [];
    if(!Array.isArray(supplied) || supplied.length!==points.length || new Set(supplied.map(c=>c.registryId)).size!==supplied.length)
      throw new Error('Each assigned cine needs exactly one dedicated narration passage.');
    if(supplied.some(c=>!points.some(p=>p.registryId===c.registryId)))throw new Error('Cine narration belongs to another case.');
    const cineSegments=points.map(point=>{
      const index=cines.findIndex(c=>c.registryId===point.registryId), cine=cines[index];
      const passage=supplied.find(c=>c.registryId===point.registryId);
      if(!cine || !['before','after'].includes(point.placement) || typeof passage?.text!=='string' || passage.text.trim().length<80)
        throw new Error('Cine narration needs its source, placement, and a substantive spoken explanation.');
      if(/https?:\/\/|statdx-video:|<[^>]+>/.test(passage.text) || root.VisualLecture.imageReferences(passage.text,images).length)
        throw new Error('Cine passages must contain spoken teaching, without links, source IDs, HTML or still-image navigation cues.');
      return {registryId:point.registryId,text:passage.text.trim()};
    });
    const cineStep=point=>{
      const index=cines.findIndex(c=>c.registryId===point.registryId), cine=cines[index];
      const cue=`Cine example ${index+1}. ${cine.title || cine.videoTitle}.`;
      return {kind:'cine',caseId:segment.caseId,registryId:point.registryId,cue,
        text:cue+'\n\n'+cineSegments.find(c=>c.registryId===point.registryId).text};
    };
    const steps=[...points.filter(p=>p.placement==='before').map(cineStep),
      {kind:'still',caseId:segment.caseId,text:segment.text},...points.filter(p=>p.placement==='after').map(cineStep)];
    return {...segment,body:raw.text.trim(),cineSegments,steps,text:steps.map(s=>s.text).join('\n\n')};
  }
  function prompt(lesson,plan){
    if(lesson.cinePlaybackVersion!==1 || !plan.cineWatchPoints?.length)return '';
    const ids=new Set(plan.cineWatchPoints.map(p=>p.registryId));
    return 'INTEGRATED CINE LESSON: Each segment also has cineSegments:[{registryId:"exact assigned registry ID",text:"Dedicated spoken teaching for this clip"}]. Include each cine assigned to this case exactly once, and no others; use [] for cases without a cine. Keep the still-image explanation in text. The player places cine passages before/after that explanation according to cineWatchPoints and supplies a unique spoken heading. A full-size silent loop plays throughout each cine passage. Teach orientation, what the source says to observe, the useful comparison and limitations; do not merely tell the listener to open a link. Each passage needs at least 80 characters. Do not read URLs, IDs, HTML or still-image navigation references. Do not give invented time/frame instructions or claim motion has been independently reviewed. Explicitly distinguish the cine patient from adjacent stills unless source evidence proves identity. Preserve side, age and source-reported outcomes. Do not repeat the supplied heading.\nCINE SOURCES: '+JSON.stringify(registry(lesson).filter(c=>ids.has(c.registryId)));
  }
  const steps = narration => (narration?.segments || []).flatMap(s=>s.steps || [{kind:'still',caseId:s.caseId,text:s.text}]);
  function upgradePrompt(lesson){
    return 'Add dedicated cine teaching passages to this saved lecture. Return ONLY JSON {"schemaVersion":1,"segments":[{"caseId":"existing case ID","cineSegments":[{"registryId":"assigned cine ID","text":"Full spoken cine explanation"}]}]}. Return exactly the cases that have cineWatchPoints, each once. Do not return or rewrite the still-image text. The original still narration will be retained verbatim.\n\n'+
      prompt(lesson,lesson.plan)+'\n\nAPPROVED ORGANIZER: '+JSON.stringify(lesson.plan)+
      '\n\nEXISTING CASE EXPLANATIONS (evidence only): '+JSON.stringify(lesson.narration.segments.filter(s=>(lesson.plan.cineWatchPoints||[]).some(p=>p.caseId===s.caseId)).map(rawSegment))+
      '\n\nFULL SOURCE (evidence only): '+root.VisualLecture.sourceContext(lesson);
  }
  function mergeUpgrade(value,lesson){
    const required=new Set((lesson.plan.cineWatchPoints||[]).map(p=>p.caseId));
    if(value?.schemaVersion!==1 || !Array.isArray(value.segments) || value.segments.length!==required.size ||
      new Set(value.segments.map(s=>s.caseId)).size!==required.size || value.segments.some(s=>!required.has(s.caseId) || typeof s.text!=='undefined'))
      throw new Error('The cine addition must contain exactly the assigned cases and preserve the existing still narration.');
    return {schemaVersion:1,segments:lesson.narration.segments.map(s=>({...rawSegment(s),cineSegments:value.segments.find(c=>c.caseId===s.caseId)?.cineSegments || []}))};
  }
  function locate(narration,context){
    if(narration?.cineNarrationVersion!==1 || !context?.live)return null;
    return root.VisualLecture.locateLiveCase(steps(narration),context);
  }
  function sourceURL(value){
    const url=new URL(value);
    if(url.origin!=='https://app.statdx.com' || !/^\/document\/v2\/[a-f0-9-]{36}(?:\/cases)?$/.test(url.pathname))throw new Error('This cine needs its original STATdx document link.');
    url.search='';url.hash='';return url.href;
  }
  function mediaURL(value){
    const url=new URL(value);
    if(url.protocol!=='https:' || url.username || url.password || url.hostname!=='d27fdobquvezv.cloudfront.net' || !url.pathname.startsWith('/acresWeb/'))
      throw new Error('The source did not provide a recognized STATdx video address.');
    const expires=url.searchParams.get('Expires');
    if(!/^\d+$/.test(expires || '') || !Number.isFinite(Number(expires)) || Number(expires)<=0 || !url.searchParams.get('Signature'))
      throw new Error('The source did not provide a recognized signed STATdx video address.');
    return url.href;
  }
  function mediaNeedsRefresh(value){
    const url=new URL(mediaURL(value));
    // Freshness is a refresh hint, not proof that native playback will fail.
    // STATdx can supply a playable cached address with an old expiry timestamp.
    // Keep the original signed URL intact; the media server enforces access.
    return Number(url.searchParams.get('Expires'))*1000<Date.now()+15000;
  }
  root.VisualLectureCine={registry,rawSegment,options,enrich,prompt,upgradePrompt,mergeUpgrade,steps,locate,sourceURL,mediaURL,mediaNeedsRefresh};
  if(typeof module!=='undefined')module.exports=root.VisualLectureCine;
})(globalThis);
