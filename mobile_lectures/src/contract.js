import '../vendor/teaching-framework.js';
import '../vendor/visual-lecture-cine.js';
import '../vendor/visual-lecture-core.js';
import '../vendor/visual-lecture-quality.js';
import { unzipSync, strFromU8 } from 'fflate';
import {validateAutomaticTiming,timingReady} from './automatic-timing.js';
export {timingReady};

export const FORMAT = 'normalanatomy-mobile-lecture';
export const BUCKET = 'lecture-media';
export const sha256 = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), n => n.toString(16).padStart(2, '0')).join('');
export const canonicalJSON = value => JSON.stringify(globalThis.VisualLectureQuality.canonical(value));
export const safeLink = value => { try { const u = new URL(value); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; } };
const fail = message => { throw new Error(message); };
export function mediaType(bytes) {
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if (bytes[0] === 137 && strFromU8(bytes.slice(1,4)) === 'PNG') return 'image/png';
  if (strFromU8(bytes.slice(0,4)) === 'RIFF' && strFromU8(bytes.slice(8,12)) === 'WEBP') return 'image/webp';
  if (strFromU8(bytes.slice(0,3)) === 'GIF') return 'image/gif';
  fail('An image file is not a supported original image.');
}
export async function verifyLesson(lesson) {
  if (!lesson?.id || !lesson.plan || !lesson.narration || !lesson.registry?.length) fail('The complete reviewed lecture is required.');
  const Q = globalThis.VisualLectureQuality, C = globalThis.VisualLecture;
  C.validatePlan(structuredClone(lesson.plan), lesson.registry, lesson.sourceText);
  C.validateNarration(Q.rawNarration(lesson), lesson.plan, lesson.registry, globalThis.VisualLectureCine.options(lesson));
  for (const stage of ['organizer','lecture']) {
    if (!await Q.approved(lesson, stage)) fail(`The ${stage} approval does not match this lecture. Finish its existing review before importing.`);
    const request = await Q.bundle(lesson, stage);
    Q.validateResult(lesson, request, lesson.quality.approvals[stage].result);
  }
  return lesson.quality.approvals.lecture.fingerprint;
}
export function portableLesson(original) {
  const lesson = {};
  for (const key of ['id','title','sourceText','registry','sourceMetadata','teachingFramework','plan','narration','narrationContractVersion','cinePlaybackVersion','qualityPolicyVersion','qualityReviewMode']) {
    if (original[key] !== undefined) lesson[key] = structuredClone(original[key]);
  }
  lesson.quality = { approvals: structuredClone(original.quality?.approvals || {}) };
  return lesson;
}
export async function verifyManifest(manifest) {
  if (manifest?.format !== FORMAT || manifest.version !== 1) fail('Choose a NormalAnatomy mobile lecture package.');
  const fingerprint = await verifyLesson(manifest.lesson);
  if (manifest.fingerprint !== fingerprint || !Array.isArray(manifest.media)) fail('The package identity does not match its approved content.');
  const registry = new Map(manifest.lesson.registry.map(i => [i.masterImageId, i])), seen = new Set();
  for (const asset of manifest.media) {
    const key = `${asset.imageId}/${asset.variant}`;
    if (!registry.has(asset.imageId) || !['plain','annotated'].includes(asset.variant) || seen.has(key)) fail('Invalid or repeated image identity.');
    seen.add(key);
    if (!/^[a-f0-9]{64}$/.test(asset.sha256) || asset.path !== `media/${asset.sha256}` ||
      !['image/jpeg','image/png','image/webp','image/gif'].includes(asset.mime) || !Number.isSafeInteger(asset.bytes) || asset.bytes <= 0) fail('Invalid image file description.');
    const expected = registry.get(asset.imageId)[`${asset.variant}File`]?.sha256;
    if (expected && expected !== asset.sha256) fail('An image does not match its saved source hash.');
  }
  const required = new Set(manifest.lesson.plan.cases.flatMap(c => c.imageIds));
  for (const image of registry.values()) {
    for (const variant of ['plain','annotated']) {
      if (image[`${variant}File`]?.sha256 && !seen.has(`${image.masterImageId}/${variant}`)) fail(`Missing original ${variant} image: ${image.masterImageId}`);
    }
    if (required.has(image.masterImageId) && !['plain','annotated'].some(v => seen.has(`${image.masterImageId}/${v}`))) fail(`Missing teaching image: ${image.masterImageId}`);
  }
  return manifest;
}
export async function readPackage(buffer) {
  if (buffer.byteLength > 256 * 1024 * 1024) fail('This package exceeds the 256 MB import limit.');
  let total = 0;
  const files = unzipSync(new Uint8Array(buffer), { filter: entry => {
    if (!/^(manifest\.json|media\/[a-f0-9]{64})$/.test(entry.name)) fail('Unexpected file in the lecture package.');
    total += entry.originalSize;
    if (entry.originalSize > 32 * 1024 * 1024 || total > 256 * 1024 * 1024) fail('The expanded package is too large.');
    return true;
  }});
  if (!files['manifest.json']) fail('The lecture package has no manifest.');
  const manifest = await verifyManifest(JSON.parse(strFromU8(files['manifest.json'])));
  const allowed = new Set(['manifest.json', ...manifest.media.map(m => m.path)]);
  for (const name of Object.keys(files)) if (!allowed.has(name)) fail('The package contains an unregistered file.');
  for (const m of manifest.media) {
    const bytes = files[m.path];
    if (!bytes || bytes.length !== m.bytes || await sha256(bytes) !== m.sha256 || mediaType(bytes) !== m.mime) fail(`Image verification failed: ${m.imageId} (${m.variant}).`);
  }
  return { manifest, files };
}
export function sequence(lesson) {
  return lesson.plan.lectureOrder.flatMap(id => {
    const item = lesson.plan.cases.find(c => c.id === id);
    return item.imageIds.map((imageId, index) => ({caseId:id,imageId,index,label:item.label}));
  });
}
export function validateTiming(timing, manifest, audio) {
  if(timing?.version===2)return validateAutomaticTiming(timing,manifest,audio);
  if (!timing || timing.version !== 1 || timing.fingerprint !== manifest.fingerprint || timing.audioSha256 !== audio?.sha256 ||
      !Number.isFinite(timing.duration) || timing.duration <= 0 || !Array.isArray(timing.cues)) fail('Timing must match this exact lecture and audio file.');
  const steps = sequence(manifest.lesson);
  let previous = -1;
  const seen = new Set();
  for (const cue of timing.cues) {
    const key = `${cue.caseId}/${cue.imageId}`;
    if (!steps.some(s => s.caseId === cue.caseId && s.imageId === cue.imageId) || seen.has(key) ||
        !Number.isFinite(cue.time) || cue.time < 0 || cue.time <= previous || cue.time >= timing.duration) fail('Image cues must be unique, ordered, and within the recording.');
    seen.add(key); previous = cue.time;
  }
  if (timing.verified === true && (timing.cues.length !== steps.length || !timing.verifiedAt ||
      steps.some((s,i) => timing.cues[i]?.imageId !== s.imageId || timing.cues[i]?.caseId !== s.caseId))) fail('Verify a cue for every image in the approved order before enabling Follow.');
  if (timing.verified === true && (manifest.lesson.plan.cineWatchPoints || []).length) fail('This version cannot verify cine timing. Use manual image browsing for this lecture.');
  return timing;
}
export function cueAt(timing, seconds) {
  if (!timingReady(timing) || !Number.isFinite(seconds)) return null;
  return timing.cues.findLast(c => c.time <= seconds) || (timing.version===2&&seconds>=0?timing.cues[0]:null) || null;
}
