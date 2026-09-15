// Offline naming repair. No browser access, source requests, or collection resumption.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const C=require('../source-library-core.js');
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function organize(folder,{apply=false}={}){
  const root=fs.realpathSync(path.resolve(folder));
  function inside(relative){
    const target=path.resolve(root,relative);
    if(!target.startsWith(root+path.sep))throw Error('Path escapes the collection: '+relative);
    let ancestor=target;while(!fs.existsSync(ancestor))ancestor=path.dirname(ancestor);
    const real=fs.realpathSync(ancestor);
    if(real!==root && !real.startsWith(root+path.sep))throw Error('Path resolves outside the collection: '+relative);
    return target;
  }
  const original=fs.readFileSync(inside('collection.json')),library=JSON.parse(original);
  if(library.kind!=='radprimer-curriculum-library')throw Error('This is not a source library.');
  if(library.status==='collecting')throw Error('Pause the collection before organizing its saved files.');
  const copies=new Map(),writes=new Map(),checked=new Map();let articlesChanged=0;
  function verified(relative,record){
    if(!checked.has(relative)){const bytes=fs.readFileSync(inside(relative));checked.set(relative,{sha256:digest(bytes),bytes:bytes.length});}
    const actual=checked.get(relative);
    if(actual.sha256!==record.sha256 || actual.bytes!==record.bytes)throw Error('Source file checksum mismatch: '+relative);
  }
  for(const article of Object.values(library.articles)){
    if(!article.images.some(image=>Object.entries(image.files || {}).some(([variant,file])=>file.status==='complete' && file.relativePath!==C.imagePath(article,image,variant))))continue;
    const inventoryPath=article.folder+'/images.json',htmlPath=article.folder+'/article.html';
    const inventory=JSON.parse(fs.readFileSync(inside(inventoryPath)));let html=fs.readFileSync(inside(htmlPath),'utf8');
    if(inventory.articleId!==article.id || inventory.images.length!==article.images.length)throw Error('Article inventory mismatch: '+article.title);
    for(let i=0;i<article.images.length;i++){
      const image=article.images[i],entry=inventory.images[i];
      if(entry.id!==image.id || entry.number!==image.number)throw Error('Image order mismatch: '+article.title);
      for(const variant of ['plain','annotated']){
        const file=image.files?.[variant];if(file?.status!=='complete')continue;
        const target=C.imagePath(article,image,variant);if(file.relativePath===target)continue;
        if(![file.relativePath,target].includes(entry.files?.[variant]?.relativePath) || entry.files[variant].sha256!==file.sha256)throw Error('File inventory mismatch: '+article.title);
        verified(file.relativePath,file);
        const existing=copies.get(target);if(existing && existing.sha256!==file.sha256)throw Error('Image filename collision: '+target);
        if(fs.existsSync(inside(target)))verified(target,file);
        copies.set(target,{source:file.relativePath,target,sha256:file.sha256,bytes:file.bytes});
        const from='../../'+C.pathUrl(file.relativePath),to='../../'+C.pathUrl(target);
        const figure=new RegExp('(<figure id="image-'+image.number+'">)([\\s\\S]*?)(</figure>)');let replaced=false;
        html=html.replace(figure,(match,open,body,close)=>{if(!body.includes(from) && !body.includes(to))throw Error('Image link missing in '+article.title+' image '+image.number);replaced=true;return open+body.split(from).join(to)+close;});
        if(!replaced)throw Error('Image figure missing in '+article.title+' image '+image.number);
        const updated={...file,relativePath:target,filename:library.folder+'/'+target,previousRelativePath:file.relativePath,previousDownloadId:file.downloadId,method:'organized-existing-file'};delete updated.downloadId;
        image.files[variant]=updated;entry.files[variant]={...updated};
      }
    }
    writes.set(htmlPath,html);writes.set(inventoryPath,JSON.stringify(inventory,null,2));
    for(const artifact of article.artifacts || [])if(writes.has(artifact.relativePath)){
      artifact.bytes=Buffer.byteLength(writes.get(artifact.relativePath));artifact.previousDownloadId=artifact.downloadId;delete artifact.downloadId;
    }
    articlesChanged++;
  }
  const report={folder:root,mode:apply?'applied':'preview',collectionStatus:library.status,articlesChanged,imageFiles:copies.size,examples:[...copies.keys()].slice(0,4)};
  if(!copies.size)return report;
  const stamp=new Date().toISOString().replace(/[:.]/g,'-');
  const backup=fs.existsSync(inside('_backup_before_image_rename'))?'_backup_before_image_rename-'+stamp:'_backup_before_image_rename';
  report.backup=backup;
  library.imageLayout='article-numbered-v1';library.updatedAt=new Date().toISOString();
  writes.set('collection.json',JSON.stringify(library,null,2));writes.set('index.html',C.overview(library));
  // All inputs, destinations and figure replacements have been checked before writes.
  for(const relative of writes.keys())inside(relative);
  if(!apply)return report;
  for(const item of copies.values()){
    if(!fs.existsSync(inside(item.target))){fs.mkdirSync(path.dirname(inside(item.target)),{recursive:true});fs.copyFileSync(inside(item.source),inside(item.target),fs.constants.COPYFILE_EXCL);}
    const actual=fs.readFileSync(inside(item.target));if(actual.length!==item.bytes || digest(actual)!==item.sha256)throw Error('Copied file verification failed: '+item.target);
  }
  if(!fs.readFileSync(inside('collection.json')).equals(original))throw Error('The collection changed during preparation. Pause it and retry.');
  for(const [relative,content] of writes){
    const before=inside(backup+'/'+relative);fs.mkdirSync(path.dirname(before),{recursive:true});
    if(fs.existsSync(inside(relative)))fs.copyFileSync(inside(relative),before,fs.constants.COPYFILE_EXCL);
    const temporary=inside(relative+'.image-naming.tmp');fs.writeFileSync(temporary,content,{flag:'wx'});fs.renameSync(temporary,inside(relative));
  }
  // Preserve the old source files as a backup only after every gallery links to its named files.
  const legacy=inside('_images'),archived=inside(backup+'/_images');
  if(fs.existsSync(legacy)){fs.mkdirSync(path.dirname(archived),{recursive:true});fs.renameSync(legacy,archived);}
  fs.writeFileSync(inside(backup+'/README.txt'),'Original image layout and metadata, preserved before article-based naming. The active article folders contain the verified, named images. Collection status was preserved; no source requests were made.\n');
  return report;
}
module.exports={organize};
if(require.main===module){
  try{if(!process.argv[2])throw Error('Usage: node organize-source-library.cjs <topic folder> [--apply]');console.log(JSON.stringify(organize(process.argv[2],{apply:process.argv.includes('--apply')}),null,2));}
  catch(error){console.error(error.message);process.exitCode=1;}
}
