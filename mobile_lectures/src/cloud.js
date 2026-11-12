import { createClient } from '@supabase/supabase-js';
import { BUCKET, verifyManifest } from './contract.js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const client = url && key ? createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}) : null;
const checked = result => { if (result.error) throw result.error; return result.data; };
export async function owner() {
  if (!client) throw new Error('Cloud setup is not connected yet. You can preview a local lecture below.');
  const user = checked(await client.auth.getUser()).user;
  if (!user) throw new Error('Sign in to your private library first.');
  const member = checked(await client.from('mobile_members').select('email').eq('email',user.email.toLowerCase()).maybeSingle());
  if (!member) throw new Error('This account has not been added to this private lecture library.');
  return user.id;
}
export async function listLectures() {
  const uid = await owner();
  return checked(await client.from('mobile_lectures').select('fingerprint,title,case_count,audio,created_at').eq('owner_id',uid).order('created_at',{ascending:false}));
}
export async function getLecture(fingerprint) {
  const uid = await owner();
  const row = checked(await client.from('mobile_lectures').select('*').eq('owner_id',uid).eq('fingerprint',fingerprint).single());
  await verifyManifest(row.manifest);
  return row;
}
export async function uploadPackage({manifest,files},status) {
  const uid = await owner();
  await verifyManifest(manifest);
  const exists = checked(await client.from('mobile_lectures').select('fingerprint').eq('owner_id',uid).eq('fingerprint',manifest.fingerprint).maybeSingle());
  if (exists) throw new Error('This reviewed version is already in your library. Open it there; your audio and progress were kept.');
  const unique = [...new Map(manifest.media.map(m=>[m.path,m])).values()];
  for (let i=0;i<unique.length;i++) {
    const m = unique[i]; status(`Uploading image ${i+1} of ${unique.length}…`);
    const result = await client.storage.from(BUCKET).upload(`${uid}/${manifest.fingerprint}/${m.path}`,files[m.path],{contentType:m.mime,upsert:false});
    // A retry can reuse immutable hash-named objects; all input bytes were verified.
    if (result.error && !['409','Duplicate'].includes(String(result.error.statusCode || result.error.code))) throw result.error;
  }
  checked(await client.from('mobile_lectures').insert({owner_id:uid,fingerprint:manifest.fingerprint,lesson_id:manifest.lesson.id,title:manifest.lesson.title,case_count:manifest.lesson.plan.cases.length,manifest}));
}
export async function signedMedia(fingerprint,relativePath) {
  const uid = await owner();
  if (!/^(media|audio)\/[a-f0-9]{64}$/.test(relativePath)) throw new Error('Invalid media identity.');
  return checked(await client.storage.from(BUCKET).createSignedUrl(`${uid}/${fingerprint}/${relativePath}`,7200)).signedUrl;
}
export async function saveAudio(fingerprint,blob,meta) {
  const uid = await owner();
  const result = await client.storage.from(BUCKET).upload(`${uid}/${fingerprint}/${meta.path}`,blob,{contentType:meta.mime,upsert:false});
  if (result.error && String(result.error.statusCode) !== '409') throw result.error;
  checked(await client.from('mobile_lectures').update({audio:meta,timing:null}).eq('owner_id',uid).eq('fingerprint',fingerprint));
}
export async function saveTiming(fingerprint,timing) {
  const uid = await owner();
  checked(await client.from('mobile_lectures').update({timing}).eq('owner_id',uid).eq('fingerprint',fingerprint));
}
export async function getProgress(fingerprint) {
  const uid = await owner();
  return checked(await client.from('mobile_progress').select('*').eq('owner_id',uid).eq('fingerprint',fingerprint).maybeSingle());
}
export async function saveProgress(fingerprint,progress) {
  const uid = await owner();
  checked(await client.from('mobile_progress').upsert({owner_id:uid,fingerprint,...progress,updated_at:new Date().toISOString()}));
}
