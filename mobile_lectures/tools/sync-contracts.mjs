// Explicitly refresh the self-contained mobile build from the desktop validators.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),source=path.resolve(root,'../edge_radprimer_extension');
await fs.mkdir(path.join(root,'vendor'),{recursive:true});
const hashes={};
for(const name of ['teaching-framework.js','visual-lecture-cine.js','visual-lecture-core.js','visual-lecture-quality.js','visual-lecture-captions.js','lecture-card-review.js','lecture-card-transfer.js']){
  const bytes=await fs.readFile(path.join(source,name));await fs.writeFile(path.join(root,'vendor',name),bytes);hashes[name]=createHash('sha256').update(bytes).digest('hex');
}
await fs.writeFile(path.join(root,'vendor','provenance.json'),JSON.stringify({source:'../edge_radprimer_extension',sha256:hashes},null,2)+'\n');
const icons=path.join(source,'assets/caption-icons'),dest=path.join(root,'public/assets/caption-icons');
await fs.mkdir(dest,{recursive:true});
for(const name of await fs.readdir(icons))if(/^arrow_[a-z0-9_]+\.png$/i.test(name))await fs.copyFile(path.join(icons,name),path.join(dest,name));
console.log('Copied deterministic validation contracts and original caption icons. No lecture data copied.');
