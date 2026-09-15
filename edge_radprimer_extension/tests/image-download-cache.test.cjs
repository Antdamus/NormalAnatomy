const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
global.VisualLectureMedia=require('../visual-lecture-media.js');
const cache=require('../image-download-cache.js');
const url='https://app.radprimer.com/images/test-id?style=xlarge&annotated=false';
const annotated=url.replace('false','true');
const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC','base64');
const png=()=>new Blob([bytes],{type:'image/png'});
function setup(seed=null) {
  const records=new Map(),history=[],fetches=[],writes=[];let nextId=1;
  const config={store:{get:async key=>records.get(key),put:async row=>records.set(row.key,row)},
    downloads:{search:async query=>history.filter(row=>new RegExp(query.filenameRegex,'i').test(row.filename))},
    seedImage:async key=>seed&&key===url?seed:null,
    fetchImage:async key=>{fetches.push(key);return png();},
    saveFile:async(blob,filename)=>{
      const item={id:nextId++,state:'complete',exists:true,fileSize:blob.size,mime:blob.type,url:'data:image/png;base64,cached',
        filename:'C:\\Users\\test\\Downloads\\'+filename.replaceAll('/','\\'),startTime:new Date(nextId*1000).toISOString()};
      writes.push({blob,filename});history.push(item);return item;
    }};
  return {config,controller:cache.create(config),records,history,fetches,writes};
}
test('retries reuse a complete file without clearing or downloading; restaging to another bundle uses cached exact bytes',async()=>{
  const env=setup(),target='RadPrimer/Topic_(T2WI)1.jpg';
  assert.equal((await env.controller.stage(url,target)).method,'source');
  assert.equal((await env.controller.stage(url,target)).method,'existing-file');
  assert.equal((await env.controller.stage(url,'RadiologyMasterSource/new/image_evidence/plain.jpg')).method,'cached-image');
  assert.equal(env.fetches.length,1);assert.equal(env.writes.length,2);
  assert.deepEqual(Buffer.from(await env.writes[1].blob.arrayBuffer()),bytes);
});
test('a completed older direct download is adopted only with matching URL, variant and exact filename',async()=>{
  const env=setup(),target='RadPrimer/plain.jpg';
  env.history.push({id:42,state:'complete',exists:true,fileSize:68,mime:'image/png',url,filename:'C:\\Users\\test\\Downloads\\RadPrimer\\plain.jpg'});
  assert.equal((await env.controller.stage(url,target)).method,'existing-file');
  assert.equal(env.fetches.length,0);assert.equal(env.writes.length,0);
  assert.equal((await env.controller.stage(annotated,target)).method,'source');
});
test('missing, interrupted, zero-byte and newer overwritten files never reuse an older matching record',async()=>{
  for(const overrides of [{exists:false},{state:'interrupted'},{fileSize:0},{url:annotated}]) {
    const env=setup(),target='RadPrimer/a.jpg';
    env.history.push({id:1,state:'complete',exists:true,fileSize:68,mime:'image/png',url,filename:'C:\\Downloads\\RadPrimer\\a.jpg',startTime:'2026-01-01'});
    env.history.push({...env.history[0],id:2,startTime:'2026-01-02',...overrides});
    assert.equal((await env.controller.stage(url,target)).method,'source');
    assert.equal(env.fetches.length,1);
  }
});
test('all URL rendition parameters remain distinct, including annotated and size variants',async()=>{
  const env=setup();
  await env.controller.stage(url,'RadPrimer/plain.jpg');
  await env.controller.stage(annotated,'RadPrimer/annotated.jpg');
  await env.controller.stage(url.replace('xlarge','large'),'RadPrimer/large.jpg');
  assert.equal(env.fetches.length,3);
  assert.equal(cache.sourceKey(url+'#view'),url);
  assert.throws(()=>cache.sourceKey('https://example.com/file.jpg'),/Unsupported/);
  await assert.rejects(env.controller.stage(url,'../escape.jpg'),/relative/);
});
test('seeded original files cover source-to-master-to-card copying without a network request',async()=>{
  const validated=await cache.validate(png()),env=setup(validated);
  for(const target of ['RadPrimerSourceComparison/topic/evidence.jpg','RadiologyMasterSource/topic/evidence.jpg','RadPrimer/card.jpg']) {
    assert.equal((await env.controller.stage(url,target)).method,'cached-image');
  }
  assert.equal(env.fetches.length,0);assert.equal(env.writes.length,3);
  const restarted=cache.create(env.config);
  assert.equal((await restarted.stage(url,'RadPrimer/card.jpg')).method,'existing-file');
  assert.equal((await restarted.stage(url,'RadPrimer/renamed.jpg')).method,'cached-image');
  assert.equal(env.fetches.length,0);
});
test('corrupt cached or seeded bytes are replaced; login HTML is never saved as an image',async()=>{
  const env=setup({blob:png(),sha256:'wrong'});
  env.records.set('image:'+url,{url,blob:new Blob(['<html>login</html>']),sha256:'wrong'});
  assert.equal((await env.controller.stage(url,'RadPrimer/a.jpg')).method,'source');
  const bad=setup();bad.config.fetchImage=async()=>new Blob(['<html>login</html>'],{type:'image/jpeg'});
  await assert.rejects(cache.create(bad.config).stage(url,'RadPrimer/bad.jpg'),/non-image/);
  assert.equal(bad.writes.length,0);assert.equal(bad.records.size,0);
});
test('simultaneous retries and a failed local write fetch source bytes only once',async()=>{
  const env=setup();
  const results=await Promise.all([env.controller.stage(url,'RadPrimer/a.jpg'),env.controller.stage(url,'RadPrimer/a.jpg'),env.controller.stage(url,'RadPrimer/b.jpg')]);
  assert.deepEqual(results.map(result=>result.method),['source','existing-file','cached-image']);assert.equal(env.fetches.length,1);
  const retry=setup(),save=retry.config.saveFile;let failed=false;
  retry.config.saveFile=async(...args)=>{if(!failed){failed=true;throw Error('disk interrupted');}return save(...args);};
  const controller=cache.create(retry.config);
  await assert.rejects(controller.stage(url,'RadPrimer/a.jpg'),/disk interrupted/);
  assert.equal((await controller.stage(url,'RadPrimer/a.jpg')).method,'cached-image');assert.equal(retry.fetches.length,1);
});
test('the service worker sends card, IO and master evidence images through the same cache without deletion',async()=>{
  const ext=path.resolve(__dirname,'..'),event=()=>({addListener:()=>{}}),stages=[],listeners=[];
  const context=vm.createContext({URL,console,setTimeout,clearTimeout,crypto:require('node:crypto').webcrypto,
    chrome:{tabs:{onRemoved:event()},runtime:{id:'extension',onMessage:{addListener:fn=>listeners.push(fn)}},
      downloads:{onCreated:event(),onDeterminingFilename:event(),removeFile:()=>{throw Error('must not delete')},erase:()=>{throw Error('must not erase')}}}});
  context.importScripts=(...names)=>names.forEach(name=>vm.runInContext(fs.readFileSync(path.join(ext,name),'utf8'),context));
  vm.runInContext(fs.readFileSync(path.join(ext,'service_worker.js'),'utf8'),context);
  context.RadPrimerImageCache={stage:async(source,filename)=>{
    stages.push({source,filename});return {method:'existing-file',item:{id:stages.length,filename:'C:/Downloads/'+filename,state:'complete'}};
  }};
  const file={url,filename:'a.jpg',imageNumber:1,variant:'plain',caption:'Literal <img src="arrow_WS.png">'};
  const result=await context.downloadSelectedImages([file]);
  assert.equal(result.reusedCount,1);assert.equal(result.count,1);assert.equal(result.clearedCount,0);
  assert.equal(result.downloads[0].caption,file.caption);
  assert.match(context.describeImageDownloadResult(result),/Reused 1/);
  await context.downloadSelectedImages([{...file,variant:'annotated',url:annotated}],{}, {subfolder:'RadPrimerIOQueue/images',clearSubfolder:'RadPrimerIOQueue'});
  const evidence=[{evidenceUrl:url,evidenceFilename:'image_evidence/a.jpg'}];
  await context.downloadImageEvidenceFiles('RadiologyMasterSource','topic',evidence);
  assert.equal(evidence[0].downloaded,true);
  assert.deepEqual(stages.map(row=>row.filename),['RadPrimer/a.jpg','RadPrimerIOQueue/images/a.jpg','RadiologyMasterSource/topic/image_evidence/a.jpg']);
});

test('cached image writes retain exact bytes and image filenames while a text export is pending',async()=>{
  const ext=path.resolve(__dirname,'..'),event=()=>({addListener(){},removeListener(){}});
  let routed,downloaded;
  const context=vm.createContext({URL,console,btoa,setTimeout,clearTimeout,setInterval,clearInterval,
    chrome:{runtime:{id:'extension',onMessage:event()},tabs:{onRemoved:event()},downloads:{
      onCreated:event(),onDeterminingFilename:event(),onChanged:event(),
      download:async request=>{
        downloaded=request;
        context.handleCardAuditDownloadFilename({id:5,url:request.url,byExtensionId:'extension'},value=>{routed=value;});
        return 5;
      },
      search:async()=>[{id:5,state:'complete',filename:'C:/Downloads/'+routed.filename,fileSize:bytes.length}]
    }}});
  context.importScripts=(...names)=>names.forEach(name=>vm.runInContext(fs.readFileSync(path.join(ext,name),'utf8'),context));
  vm.runInContext(fs.readFileSync(path.join(ext,'service_worker.js'),'utf8'),context);
  vm.runInContext('pendingTextDownloadFilenames.push({url:"data:text/plain,export",filename:"bundle/source.txt"})',context);
  await context.saveCachedImageFile(png(),'RadPrimer/source.png',1000);
  assert.equal(routed.filename,'RadPrimer/source.png');
  assert.deepEqual(Buffer.from(downloaded.url.split(',')[1],'base64'),bytes);
  assert.equal(vm.runInContext('pendingImageDownloadFilenames.size',context),0);
  assert.equal(vm.runInContext('pendingTextDownloadFilenames.length',context),1);
});
