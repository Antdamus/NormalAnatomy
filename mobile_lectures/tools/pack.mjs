import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { zipSync, strToU8 } from 'fflate';
import { FORMAT, portableLesson, verifyLesson, verifyManifest, sha256, mediaType } from '../src/contract.js';

export async function pack({snapshot,portable,mediaDirectory,out}) {
  if (Boolean(snapshot) === Boolean(portable)) throw new Error('Supply exactly one --snapshot or --portable file.');
  const input = JSON.parse(await fs.readFile(snapshot || portable, 'utf8'));
  const result=await buildPackage(portable?input:{lesson:input},mediaDirectory);
  await fs.mkdir(path.dirname(out),{recursive:true});
  await fs.writeFile(out,result.bytes,{flag:'wx'});
  return {file:path.resolve(out),...result.summary};
}
export async function buildPackage(input,mediaDirectory) {
  const lesson = portableLesson(input.lesson);
  const fingerprint = await verifyLesson(lesson);
  let reviewedMedia = [];
  if (mediaDirectory) reviewedMedia = JSON.parse(await fs.readFile(path.join(mediaDirectory,'media-manifest.json'),'utf8'));
  const files = {}, media = [];
  for (const image of lesson.registry) for (const variant of ['plain','annotated']) {
    const hash = image[`${variant}File`]?.sha256;
    const ref = reviewedMedia.find(m => m.imageId === image.masterImageId && m.variant === variant) ||
      (hash && reviewedMedia.find(m => m.sha256 === hash));
    const encoded = input.assets?.[`${lesson.id}/${image.masterImageId}/${variant}`];
    let bytes;
    if (encoded) {
      if (!/^data:image\/(jpeg|png|webp|gif);base64,/.test(encoded)) throw new Error('Unsupported portable image data.');
      bytes = new Uint8Array(Buffer.from(encoded.split(',')[1],'base64'));
    } else if (ref) {
      const base = path.resolve(mediaDirectory), filename = path.resolve(base,ref.file);
      if (!filename.startsWith(base+path.sep)) throw new Error('Media path escapes its reviewed bundle.');
      bytes = new Uint8Array(await fs.readFile(filename));
      if (await sha256(bytes) !== ref.sha256) throw new Error('Reviewed image bytes changed.');
    } else if (hash) throw new Error(`Missing ${image.masterImageId} ${variant}; export the complete cached lecture or supply --media-directory.`);
    else continue;
    const digest = await sha256(bytes), name = `media/${digest}`;
    if (hash && hash !== digest) throw new Error('Source image hash mismatch.');
    files[name] = bytes;
    media.push({imageId:image.masterImageId,variant,path:name,sha256:digest,mime:mediaType(bytes),bytes:bytes.length});
  }
  const manifest = {format:FORMAT,version:1,fingerprint,lesson,media};
  if(input.cardReview)manifest.cardReview=globalThis.LectureCardTransfer.clean(input.cardReview,lesson);
  await verifyManifest(manifest);
  files['manifest.json'] = strToU8(JSON.stringify(manifest));
  return {bytes:zipSync(files,{level:0}),manifest,summary:{fingerprint,cases:lesson.plan.cases.length,variants:media.length,uniqueFiles:Object.keys(files).length-1}};
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = Object.fromEntries(process.argv.slice(2).reduce((all,key,i,a)=> i%2 ? all : [...all,[key.replace(/^--/,''),a[i+1]]],[]));
  try {
    if (!args.out) throw new Error('Use --portable <export.json> or --snapshot <snapshot.json>, --media-directory <review bundle>, --out <private/file.nalecture>.');
    console.log(JSON.stringify(await pack({...args,mediaDirectory:args['media-directory']})));
  } catch(error) { console.error(error.message); process.exitCode=1; }
}
