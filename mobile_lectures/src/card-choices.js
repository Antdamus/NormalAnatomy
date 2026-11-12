import '../vendor/lecture-card-review.js';
import '../vendor/lecture-card-transfer.js';
export const Review=globalThis.LectureCardReview,Transfer=globalThis.LectureCardTransfer;
export function initialChoices(manifest){
  const review=Review.inherit(Transfer.clean(manifest.cardReview||Review.empty(manifest.lesson.id),manifest.lesson),manifest.lesson);
  Transfer.validate(review,manifest.lesson);
  return {version:1,channel:`mobile-${crypto.randomUUID()}`,review,desktopBase:structuredClone(review)};
}
export function validateChoices(state,manifest){
  if(state?.version!==1||!/^mobile-[a-f0-9-]{36}$/.test(state.channel))throw new Error('Invalid saved card choices.');
  const next={...state,review:Review.inherit(state.review,manifest.lesson),desktopBase:Review.inherit(state.desktopBase,manifest.lesson)};
  Transfer.validate(next.review,manifest.lesson);Transfer.validate(next.desktopBase,manifest.lesson);return next;
}
export function importChoices(state,value,manifest){
  Transfer.read(value,manifest.lesson,manifest.fingerprint);
  if(value.channel!=='desktop')throw new Error('Import a choices file exported by the desktop extension. Your phone and iPad already sync through this library.');
  if(value.review.revision<state.desktopBase.revision)throw new Error('This desktop export is older than the last imported choices.');
  return {...state,review:Transfer.merge(state.desktopBase,value.review,state.review,manifest.lesson),desktopBase:Transfer.clean(value.review,manifest.lesson)};
}
export function exportChoices(state,manifest){
  return Transfer.create(manifest.lesson,manifest.fingerprint,state.review,state.desktopBase,{channel:state.channel});
}
export function imageRole(lesson,id){
  const image=lesson.registry.find(i=>i.masterImageId===id);
  const role=image?.teachingRole||lesson.sourceMetadata?.masterSource?.manifest?.sources?.find(s=>s.id===image?.sourceArticleId)?.teachingRole;
  return ['normal','pathology','mixed'].includes(role)?role:globalThis.TeachingFramework.recommend(lesson).engine;
}
