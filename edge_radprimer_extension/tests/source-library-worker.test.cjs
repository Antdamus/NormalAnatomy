const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'service_worker.js'),'utf8');
function declaration(name){const match=source.match(new RegExp('(?:async )?function '+name+'\\([^\\n]*\\) \\{[\\s\\S]*?^\\}', 'm'));assert.ok(match,name);return match[0];}
function worker({ignoreSuggestedName=false}={}){
 let listener,id=0;const downloads=[],context={TextEncoder,URL,Date,Error,Promise,
  pendingTextDownloadFilenames:[],pendingImageDownloadFilenames:new Map(),activeCardAuditDownload:null,
  normalizeDownloadUrl:url=>url,textToDataUrl:(text,mime)=>'data:'+mime+';base64,'+Buffer.from(text).toString('base64'),
  waitForDownloadComplete:async id=>downloads.find(d=>d.id===id),
  RadPrimerImageCache:require('../image-download-cache.js'),SourceLibraryCore:require('../source-library-core.js'),
  chrome:{runtime:{id:'fixture',getURL:name=>'chrome-extension://fixture/'+name,onMessage:{addListener:fn=>listener=fn}},downloads:{
   download:async options=>{const item={id:++id,url:options.url,byExtensionId:'fixture',filename:'C:/Downloads/temporary-name.json',state:'complete',exists:true,fileSize:Buffer.from(options.url.split(',')[1],'base64').length};
    context.handleCardAuditDownloadFilename(item,suggestion=>{if(!ignoreSuggestedName)item.filename='C:/Downloads/'+suggestion.filename;});downloads.push(item);return item.id;},
   search:async({id})=>downloads.filter(d=>d.id===id)
  }}
 };
 vm.createContext(context);
 vm.runInContext(declaration('handleCardAuditDownloadFilename')+'\n'+declaration('downloadTextFileToPath'),context);
 vm.runInContext(fs.readFileSync(path.join(root,'source-library-worker.js'),'utf8'),context);
 return {downloads,context,send:(message,sender={url:'chrome-extension://fixture/source-library.html?source=fixture'})=>new Promise(resolve=>listener(message,sender,resolve))};
}
const request={type:'SOURCE_LIBRARY_SAVE',filename:'RadPrimerLibrary/Gastrointestinal/Pancreas/collection.json',content:'{"caption":"Arrow → • café"}',mime:'application/json'};
test('source document uses the existing download filename router and validates UTF-8 size',async()=>{
 const w=worker(),response=await w.send(request);assert.equal(response.ok,true);assert.equal(response.result.filename,'C:/Downloads/'+request.filename);assert.equal(response.result.bytes,Buffer.byteLength(request.content));assert.equal(w.context.pendingTextDownloadFilenames.length,0);
});
test('a completed download under a wrong name is rejected',async()=>{
 const w=worker({ignoreSuggestedName:true}),response=await w.send(request);assert.equal(response.ok,false);assert.match(response.error,/required filename/);
});
test('source document exports enforce caller and library destination',async()=>{
 const w=worker();assert.equal((await w.send(request,{url:'https://app.radprimer.com/document/a'})).ok,false);
 assert.equal((await w.send({...request,filename:'outside/file.json'})).ok,false);assert.equal(w.downloads.length,0);
});
test('STATdx library images use the shared cache and reject other resources',async()=>{
 const w=worker(),calls=[];
 w.context.RadPrimerImageCache={...w.context.RadPrimerImageCache,stage:async(url,filename)=>{calls.push({url,filename});return {item:{id:8},method:'cached-image'};},describe:async()=>({sha256:'hash',bytes:10})};
 const m={type:'SOURCE_LIBRARY_IMAGE',url:'https://app.statdx.com/image/thumbnail/123?annotated=true&size=1000&quality=90',filename:'RadPrimerLibrary/GI/Pancreas/STATdx/example.jpg'};
 const response=await w.send(m);assert.equal(response.ok,true);assert.equal(response.result.method,'cached-image');assert.equal(calls[0].url,m.url);
 for(const url of ['https://app.statdx.com/account','https://app.statdx.com/document/v2/123','https://evil.example/image/thumbnail/123'])assert.equal((await w.send({...m,url})).ok,false);
 assert.equal(calls.length,1);assert.equal((await w.send({type:'SOURCE_LIBRARY_PING'})).result.version,4);
});
