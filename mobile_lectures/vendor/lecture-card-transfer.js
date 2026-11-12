/* Choices are mutable study intent, separate from approved lecture content. */
(function(root){
  'use strict';
  const R=root.LectureCardReview, FORMAT='normalanatomy-card-choices';
  const fail=message=>{throw new Error(message);};
  function clean(review,lesson){
    R.validate(review,lesson);
    return structuredClone({version:1,lessonId:lesson.id,revision:review.revision,images:review.images||{},manualGroups:review.manualGroups||[],...(review.inheritedLinks?{inheritedLinks:review.inheritedLinks}:{})});
  }
  function validate(review,lesson){
    review=R.validate(review,lesson);
    if(!review.images||typeof review.images!=='object'||Array.isArray(review.images))fail('Invalid image choices.');
    for(const item of Object.values(review.images))if(typeof item.objective!=='string'||item.objective.length>1000)fail('Invalid image objective.');
    // Every source/learner group travels together, even when imported from a file.
    if(R.summary(review,lesson).cards)R.selectedPlan(review,lesson);
    return review;
  }
  function merge(base,incoming,current,lesson){
    if([base,incoming,current].some(r=>r.inheritedLinks))[base,incoming,current]=[base,incoming,current].map(r=>R.inherit(r,lesson));
    [base,incoming,current].forEach(r=>validate(r,lesson));
    const images=structuredClone(current.images||{}),eq=R.sameSavedData;
    const defaults=id=>({decision:'later',role:lesson.registry.find(i=>i.masterImageId===id)?.teachingRole||root.TeachingFramework?.recommend(lesson).engine||'pathology',objective:''});
    for(const image of lesson.registry){
      const id=image.masterImageId,b={...defaults(id),...base.images[id]},n={...defaults(id),...incoming.images[id]},c={...defaults(id),...current.images[id]};
      // Legacy unselected states have the same visible meaning.
      for(const item of [b,n,c])if(item.decision==='lecture')item.decision='later';
      const out={...c};let changed=false;
      for(const field of ['decision','role','objective']){
        if(eq(n[field],b[field]))continue;
        if(!eq(c[field],b[field])&&!eq(c[field],n[field]))fail(`Conflicting ${field} for ${id}. Nothing was imported. Review the choices on both devices first.`);
        out[field]=n[field];changed=true;
      }
      if(changed)images[id]=out;
    }
    const b=base.manualGroups||[],n=incoming.manualGroups||[],c=current.manualGroups||[];
    if(!eq(n,b)&&!eq(c,b)&&!eq(c,n))fail('Image links changed on both sides. Nothing was imported. Review the groups on both devices first.');
    let inherited={};
    if(current.inheritedLinks){
      const disabledGroupIds=R.sourceGroups(lesson).map(g=>g.id).filter(id=>{
        const [b,n,c]=[base,incoming,current].map(r=>r.inheritedLinks.disabledGroupIds.includes(id));
        return n===b?c:n;
      });
      inherited={inheritedLinks:{version:1,disabledGroupIds}};
    }
    return validate({...current,...inherited,images,manualGroups:structuredClone(eq(n,b)?c:n),revision:current.revision+1,updatedAt:Date.now()},lesson);
  }
  function create(lesson,fingerprint,review,baseReview,{channel='desktop',generation=review.revision}={}){
    validate(review,lesson);validate(baseReview,lesson);
    if(!/^[a-f0-9]{64}$/.test(fingerprint))fail('An exact reviewed lecture is required.');
    // Old extensions must reject this format instead of silently discarding
    // source-link overrides. Reloading the updated extension enables v2 imports.
    return {format:FORMAT,version:review.inheritedLinks||baseReview.inheritedLinks?2:1,fingerprint,lessonId:lesson.id,title:lesson.title,channel,generation,
      baseReview:clean(baseReview,lesson),review:clean(review,lesson),
      selection:R.summary(review,lesson).cards?R.selectedPlan(review,lesson):null};
  }
  function read(value,lesson,fingerprint){
    if(value?.format!==FORMAT||![1,2].includes(value.version)||value.fingerprint!==fingerprint||value.lessonId!==lesson.id||
      typeof value.channel!=='string'||! /^(desktop|mobile-[a-f0-9-]{36})$/.test(value.channel)||!Number.isSafeInteger(value.generation)||value.generation<0)fail('These choices do not match this exact reviewed lecture.');
    validate(value.review,lesson);validate(value.baseReview,lesson);
    if(value.version===1&&(value.review.inheritedLinks||value.baseReview.inheritedLinks))fail('Inherited image links require the updated choices format.');
    return value;
  }
  function importDesktop(value,lesson,fingerprint,current){
    read(value,lesson,fingerprint);current=R.validate(current,lesson);
    if(!value.channel.startsWith('mobile-'))fail('Choose an export from the phone library.');
    const receipt=current.transferReceipts?.[value.channel];
    if(receipt&&value.generation<receipt.generation)fail('This export is older than the last imported choices. Export the latest phone choices.');
    if(receipt&&value.generation===receipt.generation){
      if(!R.sameSavedData(clean(value.review,lesson),receipt.review))fail('The same export version contains different choices.');
      return current;
    }
    const merged=merge(receipt?.review||value.baseReview,value.review,current,lesson);
    merged.transferReceipts={...current.transferReceipts,[value.channel]:{generation:value.generation,review:clean(value.review,lesson)}};
    return merged;
  }
  const api={FORMAT,clean,validate,merge,create,read,importDesktop};root.LectureCardTransfer=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
