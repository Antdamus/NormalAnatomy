import '../vendor/visual-lecture-core.js';

// Reuse the desktop's source-qualified matching; never infer identity from a
// bare number, a nearby caption, or the order of files on disk.
export function transcriptAnchors(lesson) {
  const text=lesson.narration.text,anchors=[];let from=0;
  for(const caseId of lesson.plan.lectureOrder){
    const item=lesson.plan.cases.find(c=>c.id===caseId),segment=lesson.narration.segments.find(s=>s.caseId===caseId);
    const start=text.indexOf(segment.text,from);
    if(start<0)throw new Error(`Approved narration segment is absent from the full transcript: ${caseId}`);
    const refs=globalThis.VisualLecture.imageReferences(segment.text,lesson.registry,item.imageIds);
    const spans=new Set();
    for(const ref of refs){
      const span=`${ref.index}:${ref.end}`;
      if(spans.has(span)||!item.imageIds.includes(ref.imageId))throw new Error(`Ambiguous or wrong-case image reference: ${caseId}`);
      spans.add(span);anchors.push({caseId,imageId:ref.imageId,startOffset:start+ref.index,endOffset:start+ref.end,reference:segment.text.slice(ref.index,ref.end)});
    }
    if(item.imageIds.some(id=>!refs.some(r=>r.imageId===id)))throw new Error(`Missing spoken image reference: ${caseId}`);
    from=start+segment.text.length;
  }
  return anchors;
}

export function mapAlignedWords(anchors,words,duration) {
  let previous=-1;
  return anchors.map(anchor=>{
    const matches=words.filter(w=>w.endOffsetUtf16>anchor.startOffset&&w.startOffsetUtf16<anchor.endOffset);
    if(!matches.length||matches[0].startOffsetUtf16>anchor.startOffset||matches.at(-1).endOffsetUtf16<anchor.endOffset)
      throw new Error(`Incomplete word alignment for ${anchor.reference}`);
    const start=matches[0].startTime,end=matches.at(-1).endTime;
    if(!Number.isFinite(start)||!Number.isFinite(end)||start<=previous||start<0||end<=start||end>duration)
      throw new Error(`Invalid aligned boundary for ${anchor.reference}`);
    previous=start;
    return {...anchor,time:start,referenceEndTime:end,wordCount:matches.length};
  });
}
