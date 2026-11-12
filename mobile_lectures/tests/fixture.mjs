// Synthetic software-test content only. These receipts are never used for real lectures.
import {zipSync,strToU8} from 'fflate';
import {FORMAT,sha256} from '../src/contract.js';
export async function fixture(imageBytes,{inheritedGroup=false}={}){
  const bytes=new Uint8Array(imageBytes||Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=','base64')),hash=await sha256(bytes);
  const registry=[1,2].map(n=>({masterImageId:`TEST-${n}`,sourceLabel:'Synthetic',sourceImageNumber:n,sourceArticleId:'test',sourceKind:'radprimer',caption:`Synthetic software fixture ${n}.`,required:true,plainFile:{sha256:hash},annotatedFile:{sha256:hash}}));
  const plan={schemaVersion:1,title:'Synthetic software test',orientation:'Software fixture only.',patterns:[{id:'p',label:'Test',cue:'Compare',overviewImageIds:['TEST-1']}],cases:registry.map((r,i)=>({id:`case-${i+1}`,patternId:'p',label:`Test case ${i+1}`,relationship:'single image',imageIds:[r.masterImageId],modalityLabels:{[r.masterImageId]:'Test image'},focus:'Software fixture.',discriminator:'Test difference.',sourceBasis:'Test caption.'})),lectureOrder:['case-1','case-2']};
  const C=globalThis.VisualLecture,Q=globalThis.VisualLectureQuality;
  const lesson={id:'vl-1234',title:plan.title,sourceText:'Full synthetic software source.',registry,plan,qualityPolicyVersion:1,qualityReviewMode:'chat',quality:{approvals:{}}};
  if(inheritedGroup)lesson.sourceMetadata={masterSource:{manifest:{caseAndComparisonSequences:[{id:'test-collection',originalGroupLabel:'Synthetic source collection',preserveOrderAndPairs:true,imageIds:registry.map(i=>i.masterImageId)}]}}};
  lesson.narration=C.validateNarration({schemaVersion:1,segments:plan.cases.map((c,i)=>({caseId:c.id,text:`Synthetic image ${i+1}. This is a software testing example with no medical content.`}))},plan,registry);
  for(const stage of ['organizer','lecture']){const request=await Q.bundle(lesson,stage);lesson.quality.approvals[stage]={fingerprint:request.fingerprint,rubric:Q.RUBRIC,result:{version:1,fingerprint:request.fingerprint,stage,rubric:Q.RUBRIC,outcome:'approved',summary:'Synthetic fixture.',sourceAssessment:'Synthetic.',imageAssessment:'Synthetic.',coverageAssessment:'Synthetic.',reviewedCaseIds:plan.lectureOrder,reviewedImageIds:registry.map(i=>i.masterImageId),findings:[],corrections:[],limitations:[]}};}
  const manifest={format:FORMAT,version:1,fingerprint:lesson.quality.approvals.lecture.fingerprint,lesson,media:registry.flatMap(i=>['plain','annotated'].map(variant=>({imageId:i.masterImageId,variant,path:`media/${hash}`,sha256:hash,mime:'image/png',bytes:bytes.length})))};
  const files={[`media/${hash}`]:bytes};
  const encode=()=>zipSync({...files,'manifest.json':strToU8(JSON.stringify(manifest))},{level:0});
  return {manifest,files,encode};
}
