// Read-only verification of an exported collection, independent of browser history.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const C=require('../source-library-core.js');
const folder=process.argv[2];
if(!folder){console.error('Usage: node verify-source-library.cjs <topic folder>');process.exit(2);}
const root=path.resolve(folder),problems=[],checked=new Map();
const issue=(label,message)=>problems.push(label+': '+message);
function file(relative){
 const target=path.resolve(root,relative);
 if(!target.startsWith(root+path.sep))throw Error('File path escapes the topic folder: '+relative);
 return target;
}
function read(relative){return fs.readFileSync(file(relative));}
function json(relative){return JSON.parse(read(relative));}
function checkMedia(label,record){
 if(record?.status!=='complete'){issue(label,'media is not marked complete');return;}
 try{
  if(!checked.has(record.relativePath)){const data=read(record.relativePath);checked.set(record.relativePath,{bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex')});}
  const actual=checked.get(record.relativePath);
  if(actual.bytes!==record.bytes || actual.sha256!==record.sha256)issue(label,'saved bytes do not match the manifest');
 }catch(error){issue(label,error.message);}
}
function checkLinks(relative){
 const html=read(relative).toString('utf8');
 for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)){
  const link=match[1];if(/^(?:https?:|data:|#)/.test(link))continue;
  try{const target=path.join(path.dirname(relative),decodeURIComponent(link.split('#')[0]));if(!fs.existsSync(file(target)))issue(relative,'missing link '+link);}catch(error){issue(relative,error.message);}
 }
}
try{
 const library=json('collection.json'),articles=Object.values(library.articles);
 if(library.status!=='complete')issue('collection','status is '+library.status);
 for(const article of articles){
  const label=article.title;
  try{
   if(article.status!=='complete' || article.errors?.length)issue(label,'article incomplete: '+(article.errors || []).join('; '));
   const source=json(article.folder+'/source.json'),images=json(article.folder+'/images.json');
   if(source.id!==(article.sourceId || article.id) || images.articleId!==article.id)issue(label,'article identifier mismatch');
   if(!source.articleText || !source.sourceHtml || source.errors.length)issue(label,'source content is missing or flagged');
   if(source.expectedImages!==source.images.length || images.images.length!==source.images.length || article.images.length!==source.images.length)issue(label,'gallery count mismatch');
   const text=read(article.folder+'/article.txt').toString('utf8');
   if(!text.includes(source.articleText))issue(label,'article text differs from captured source');
   for(let i=0;i<source.images.length;i++){
    const original=source.images[i],image=images.images[i];
    if(image.id!==original.id || image.rawCaption!==original.rawCaption || !image.captionText)issue(label,'image order or caption mismatch at '+(i+1));
    for(const variant of ['plain','annotated']){
     const file=image.files?.[variant];
     if(library.imageLayout==='article-numbered-v1' && file?.status==='complete' && file.relativePath!==C.imagePath(article,image,variant))issue(label,'image filename does not identify the article, number and version');
     checkMedia(label+' image '+(i+1)+' '+variant,file);
    }
   }
   for(const resource of images.resources)checkMedia(label+' inline resource',resource.file);
   checkLinks(article.folder+'/article.html');
  }catch(error){issue(label,error.message);}
 }
 checkLinks('index.html');checkLinks('image-overlap.html');
 const overlapReport=json('image-overlap.json'),actualOverlap=overlapReport.groups;
 const expectedOverlap=C.overlap(library).map(g=>overlapReport.version===1?{...g,key:g.key.replace(/^source:radprimer:/,'source:'),occurrences:g.occurrences.map(({source,...o})=>o)}:g);
 if(JSON.stringify(actualOverlap)!==JSON.stringify(expectedOverlap))issue('overlap','report does not match captured article images');
 const report={folder:root,status:problems.length?'needs attention':'verified',curricula:Object.fromEntries(Object.entries(library.curricula).map(([level,value])=>[level,value.articleIds.length])),articles:articles.length,imageOccurrences:articles.reduce((sum,a)=>sum+a.images.length,0),verifiedMediaFiles:checked.size,verifiedMediaBytes:[...checked.values()].reduce((sum,f)=>sum+f.bytes,0),exactOverlapGroups:actualOverlap.length,problems};
 console.log(JSON.stringify(report,null,2));process.exitCode=problems.length?1:0;
}catch(error){console.error(error.message);process.exitCode=1;}
