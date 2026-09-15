const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),output=path.join(os.tmpdir(),'radprimer-source-library-qa');fs.mkdirSync(output,{recursive:true});
const origin='https://app.radprimer.com';
function curriculum(level,ids){return {kind:'lesson',url:origin+'/lesson/'+level.toLowerCase(),title:'Pancreas',breadcrumbs:[{title:'All Categories'},{title:level},{title:'Gastrointestinal'},{title:'Pancreas'}],links:[],objectives:['Compare imaging findings.'],articles:ids.map(id=>({id,title:({a:'Acute Pancreatitis',shared:'Pancreatic Collections',b:'Cystic Neoplasms'})[id],url:origin+'/document/'+id+'/lesson/'+level.toLowerCase(),category:'Diagnosis'}))};}
const fixtures={};
const sdxId='d4803366-5eea-49c8-9c7e-dd24dd20c98c',sdxUrl='https://app.statdx.com/document/v2/'+sdxId;
fixtures[sdxUrl]={kind:'article',sourceKind:'statdx',id:sdxId,title:'STATdx supplement',url:sdxUrl,section:'article',collectedAt:'2026-09-14',authors:['STATdx author'],headings:[],articleHtml:'<p>Supplemental detail</p>',articleText:'Supplemental detail',sourceHtml:'<p>Supplemental detail</p>',resources:[],errors:[],expectedImages:1,sectionLinks:[{section:'references',url:sdxUrl+'/references',count:1}],images:[{number:1,id:'sdx-image',group:'Mimic',rawCaption:'Supplemental caption',captionHtml:'Supplemental caption',captionText:'Supplemental caption',plainUrl:'https://app.statdx.com/image/thumbnail/sdx-image?size=1000&quality=90',annotatedUrl:'https://app.statdx.com/image/thumbnail/sdx-image?annotated=true&size=1000&quality=90'}]};
fixtures[sdxUrl+'/references']={...fixtures[sdxUrl],section:'references',url:sdxUrl+'/references',images:[],expectedImages:0,articleText:'STATdx reference',articleHtml:'<ol><li>STATdx reference</li></ol>'};
fixtures[origin+'/lesson/basic']=curriculum('Basic',['a','shared']);fixtures[origin+'/lesson/intermediate']=curriculum('Intermediate',['shared','b']);
fixtures[origin+'/curriculum']={title:'All Lessons',kind:'curriculum',url:origin+'/curriculum',links:['Basic','Intermediate'].map(l=>({title:l,url:origin+'/curriculum/'+l.toLowerCase()}))};
fixtures[origin+'/curriculum/intermediate']={title:'Intermediate',kind:'curriculum',url:origin+'/curriculum/intermediate',links:[{title:'Gastrointestinal',url:origin+'/curriculum/gi'}]};
fixtures[origin+'/curriculum/gi']={title:'Gastrointestinal',kind:'curriculum',url:origin+'/curriculum/gi',links:[{title:'Pancreas',url:origin+'/lesson/intermediate'}]};
for(const level of ['Basic','Intermediate'])for(const a of fixtures[origin+'/lesson/'+level.toLowerCase()].articles){fixtures[a.url]={kind:'article',id:a.id,url:a.url,title:a.title,collectedAt:'2026-09-14T00:00:00Z',authors:['Fixture author'],headings:[{text:'IMAGING'}],articleHtml:'<h2>IMAGING</h2><p>Full source information.</p><h2>SELECTED REFERENCES</h2><p>Retained source reference.</p>',articleText:'Full source information.\nSELECTED REFERENCES\nRetained source reference.',sourceHtml:'<p>Original source</p>',resources:[],errors:[],expectedImages:1,images:[{number:1,id:a.id==='b'?'unique-image':'shared-image',group:'Example',captionHtml:'<b>Original caption</b>',captionText:'Original caption',plainUrl:origin+'/images/'+(a.id==='b'?'unique-image':'shared-image')+'?style=xlarge&annotated=false',annotatedUrl:origin+'/images/'+(a.id==='b'?'unique-image':'shared-image')+'?style=xlarge&annotated=true'}]};}
const server=http.createServer((req,res)=>{const name=new URL(req.url,'http://local').pathname.slice(1);if(!/^source-library\.(html|js|css)$|^source-library-core\.js$/.test(name)){res.writeHead(404).end();return;}res.setHeader('Content-Type',name.endsWith('html')?'text/html':name.endsWith('css')?'text/css':'text/javascript');res.end(fs.readFileSync(path.join(root,name)));});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(fixtures=>{
   const state=JSON.parse(localStorage.getItem('fixtureState') || '{"downloads":[],"imageFetches":0,"imageWrites":0,"imageSources":[],"failedOnce":false,"reads":[]}');let tabUrl='';let nextTab=1;
   const persist=()=>localStorage.setItem('fixtureState',JSON.stringify(state));window.fixtureState=state;
   chrome={runtime:{sendMessage:async m=>{
    if(m.type==='SOURCE_LIBRARY_PING')return {ok:true,result:{version:4}};
    if(m.type==='SOURCE_LIBRARY_SAVE'){
     const bytes=new TextEncoder().encode(m.content).length;
     const file={id:state.downloads.length+1,filename:'C:/Downloads/'+m.filename,fileSize:bytes,state:'complete',exists:true,content:m.content};state.downloads.push(file);persist();
     return {ok:true,result:{downloadId:file.id,filename:file.filename,bytes}};
    }
    if(m.type==='SOURCE_LIBRARY_IMAGE'){
     if(m.url.includes('unique-image') && m.url.includes('annotated=true') && !state.failedOnce){state.failedOnce=true;persist();return {ok:false,error:'Fixture interrupted image'};}
     let file=state.downloads.findLast(d=>d.filename==='C:/Downloads/'+m.filename && d.exists);
     if(!file){if(!state.imageSources.includes(m.url)){state.imageFetches++;state.imageSources.push(m.url);}state.imageWrites++;file={id:state.downloads.length+1,filename:'C:/Downloads/'+m.filename,fileSize:10,state:'complete',exists:true,content:'fixture-image'};state.downloads.push(file);}
     persist();return {ok:true,result:{status:'complete',filename:m.filename,downloadId:file.id,bytes:10,sha256:m.url.includes('unique-image')?'different':'same',pixelHash:m.url.includes('unique-image')?'pixels-two':'pixels-one'}};
    }
   }},tabs:{create:async({url})=>{tabUrl=url;return {id:nextTab++};},update:async(id,{url})=>{tabUrl=url;},get:async()=>({url:tabUrl,status:'complete'}),remove:async()=>{}},scripting:{executeScript:async()=>{state.reads.push(tabUrl);persist();if(!fixtures[tabUrl])throw Error('Unexpected fixture navigation '+tabUrl);return [{result:fixtures[tabUrl]}];}},downloads:{download:async({url,filename})=>{const blob=await(await fetch(url)).blob();const file={id:state.downloads.length+1,filename:'C:/Downloads/'+filename,fileSize:blob.size,state:'complete',exists:true,content:await blob.text()};state.downloads.push(file);persist();return file.id;},search:async({id})=>state.downloads.filter(d=>d.id===id),show:async()=>{}}};
   chrome.tabs.sendMessage=async()=>({ok:true,result:fixtures[tabUrl]});
  },fixtures);
  const url='http://127.0.0.1:'+server.address().port+'/source-library.html?source='+encodeURIComponent(origin+'/lesson/basic');
  await page.goto(url);
  await page.waitForFunction(()=>document.querySelectorAll('#levels input').length===2);
  await page.locator('#levels input[value="Intermediate"]').check();await page.locator('#start').click();
  await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Saved with missing content'));
  assert.equal(await page.locator('.article').count(),3);assert.match(await page.locator('#stats').textContent(),/2 \/ 3 articles complete/);
  const first=await page.evaluate(()=>JSON.parse(localStorage.fixtureState));assert.equal(first.imageFetches,3,'Shared image renditions should be downloaded only once');
  const manifest1=JSON.parse(first.downloads.findLast(d=>d.filename.endsWith('/collection.json')).content);assert.equal(manifest1.status,'needs attention');assert.equal(Object.keys(manifest1.articles).length,3);
  await page.screenshot({path:path.join(output,'partial-collection.png'),fullPage:true});
  await page.reload();await page.waitForFunction(()=>document.querySelectorAll('#levels input').length===2);await page.locator('#levels input[value="Intermediate"]').check();
  await page.locator('#start').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Collection complete'));
  const final=await page.evaluate(()=>JSON.parse(localStorage.fixtureState));assert.equal(final.imageFetches,4,'Retry downloads only the failed rendition');
  const manifest=JSON.parse(final.downloads.findLast(d=>d.filename.endsWith('/collection.json')).content);assert.equal(manifest.status,'complete');assert.equal(manifest.articles.shared.memberships.length,2);
  const overlap=JSON.parse(final.downloads.findLast(d=>d.filename.endsWith('/image-overlap.json')).content);assert.ok(overlap.groups.some(g=>g.occurrences.length===2));
  assert.equal(final.imageWrites,6,'Each article has separately named files while source requests are cached');
  for(const article of Object.values(manifest.articles))for(const image of article.images)for(const variant of ['plain','annotated'])assert.equal(image.files[variant].relativePath,article.folder+'/images/'+article.title+' - 001 - '+(variant==='plain'?'unannotated':'annotated')+'.jpg');
  const articleHtml=final.downloads.findLast(d=>d.filename.includes('Acute Pancreatitis') && d.filename.endsWith('article.html')).content;assert.match(articleHtml,/SELECTED REFERENCES/);assert.match(articleHtml,/Acute%20Pancreatitis%20-%20001%20-%20unannotated.jpg/);assert.match(articleHtml,/Acute%20Pancreatitis%20-%20001%20-%20annotated.jpg/);
  await page.screenshot({path:path.join(output,'complete-desktop.png'),fullPage:true});
  await page.setViewportSize({width:390,height:850});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:path.join(output,'complete-mobile.png'),fullPage:true});
  // A deleted file is repaired without recapturing other complete articles.
  await page.evaluate(()=>{const file=fixtureState.downloads.find(d=>d.filename.endsWith('/Cystic Neoplasms - 001 - unannotated.jpg'));file.exists=false;localStorage.fixtureState=JSON.stringify(fixtureState);});
  await page.locator('#start').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Collection complete'));
  assert.equal(await page.evaluate(()=>fixtureState.imageFetches),4);assert.equal(await page.evaluate(()=>fixtureState.imageWrites),7);
  // Migrate old checkpoints whose text files saved under a temporary blob name.
  await page.evaluate(()=>{const file=fixtureState.downloads.findLast(d=>d.filename.endsWith('/article.html'));file.filename='C:/Downloads/temporary-blob-name.htm';localStorage.fixtureState=JSON.stringify(fixtureState);});
  await page.locator('#start').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Collection complete'));
  const repaired=await page.evaluate(()=>JSON.parse(localStorage.fixtureState));
  const repairedManifest=JSON.parse(repaired.downloads.findLast(d=>d.filename.endsWith('/collection.json')).content);
  for(const article of Object.values(repairedManifest.articles))for(const artifact of article.artifacts)assert.ok(artifact.filename.startsWith('C:/Downloads/RadPrimerLibrary/'));
  assert.equal(repaired.imageFetches,4,'Misnamed text repair preserves downloaded images');
  // Upgrade a v2 browser checkpoint to article-named images, without new source requests.
  await page.evaluate(async()=>{
   const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('radprimer-curriculum-library',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
   await new Promise((resolve,reject)=>{const tx=db.transaction('collections','readwrite'),store=tx.objectStore('collections'),r=store.get('gastrointestinal / pancreas');r.onsuccess=()=>{const library=r.result,a=library.articles.a;for(const variant of ['plain','annotated']){const file=a.images[0].files[variant],old='_images/shared-image/'+variant+'.jpg';file.relativePath=old;fixtureState.downloads.find(d=>d.id===file.downloadId).filename='C:/Downloads/'+library.folder+'/'+old;}store.put(library);};tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();localStorage.fixtureState=JSON.stringify(fixtureState);
  });
  await page.locator('#start').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Collection complete'));
  const migrated=await page.evaluate(()=>JSON.parse(localStorage.fixtureState));assert.equal(migrated.imageFetches,4);assert.equal(migrated.imageWrites,9);
  const migratedManifest=JSON.parse(migrated.downloads.findLast(d=>d.filename.endsWith('/collection.json')).content);
  assert.ok(migratedManifest.articles.a.images[0].files.plain.relativePath.endsWith('/Acute Pancreatitis - 001 - unannotated.jpg'));
  // Pause during a fresh read, then resume from the saved source checkpoint.
  await page.evaluate(()=>{const original=chrome.scripting.executeScript;chrome.scripting.executeScript=async(...args)=>{await new Promise(r=>setTimeout(r,350));return original(...args);};});
  await page.locator('#refresh').evaluate(el=>el.closest('details').open=true);await page.locator('#refresh').check();await page.locator('#start').click();
  await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Reading '));
  await page.getByRole('button',{name:'Pause after current file'}).click();await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Paused.'));
  assert.equal(await page.locator('#badge').textContent(),'paused');
  await page.locator('#refresh').uncheck();await page.locator('#start').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Collection complete'));
  assert.equal(await page.evaluate(()=>fixtureState.imageFetches),4,'Pause and resume preserve existing media');
  // Open from a selected STATdx article, restore Pancreas and attach it to a gap.
  const beforeStatdx=await page.evaluate(()=>({fetches:fixtureState.imageFetches,reads:fixtureState.reads.length}));
  await page.setViewportSize({width:1200,height:1000});
  await page.goto('http://127.0.0.1:'+server.address().port+'/source-library.html?statdx='+encodeURIComponent(sdxUrl));
  await page.waitForFunction(()=>!document.querySelector('#start').disabled);
  assert.equal(await page.locator('#collections').inputValue(),'gastrointestinal / pancreas');assert.equal(await page.locator('#levels input:checked').count(),0);
  assert.equal(await page.locator('#review-options').evaluate(el=>el.open),false);assert.equal(await page.locator('#curriculum-options').evaluate(el=>el.open),false);assert.equal(await page.locator('#start').textContent(),'Download to Pancreas');
  assert.equal(await page.locator('#purpose').inputValue(),'');assert.equal(await page.locator('#related-articles input:checked').count(),0);
  await page.screenshot({path:path.join(output,'simple-statdx-ready.png'),fullPage:true});
  // Invalid input stays visible and does not write or download anything.
  const beforeInvalid=await page.evaluate(()=>fixtureState.downloads.length);await page.locator('#statdx-urls').fill('https://example.com/not-an-article');await page.locator('#start').click();await page.waitForFunction(()=>document.querySelector('#action-status').textContent.includes('Choose a RadPrimer'));
  assert.equal(await page.evaluate(()=>fixtureState.downloads.length),beforeInvalid);await page.locator('#statdx-urls').fill(sdxUrl);
  await page.locator('#review-tracking > summary').click();
  await page.locator('#import-needs').setInputFiles({name:'review-needs.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({version:1,collectionKey:'gastrointestinal / pancreas',needs:[{id:'missing-mimic',kind:'missing-differential',title:'Compare a mimic',reason:'Needs comparison images',pack:'Pancreas pack',searchTerms:'pancreatic mimic',relatedArticleIds:['a']}]}))});
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('review requests imported'));
  await page.getByRole('button',{name:'Add a source',exact:true}).click();
  assert.equal(await page.locator('#related-articles input[value="a"]').isChecked(),true);await page.locator('#related-search').fill('Cystic');assert.equal(await page.locator('#related-articles label:visible').count(),1);await page.locator('#related-search').fill('');assert.equal(await page.locator('#related-articles input[value="a"]').isChecked(),true);
  await page.evaluate(()=>{const original=chrome.tabs.sendMessage;chrome.tabs.sendMessage=async(...args)=>{const r=await original(...args);if(r.result?.section==='references'&&!fixtureState.refFailed){fixtureState.refFailed=true;throw Error('Fixture reference page interrupted');}return r;};});
  await page.locator('#start').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Saved with missing content'));
  assert.match(await page.locator('#articles').textContent(),/reference page interrupted/);assert.match(await page.locator('#needs').textContent(),/Sources queued/);
  await page.locator('#start').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Collection complete'));
  let supplemental=await page.evaluate(()=>JSON.parse(localStorage.fixtureState));
  const mixed=JSON.parse(supplemental.downloads.findLast(d=>d.filename.endsWith('/collection.json')).content),sdx=mixed.articles['statdx:'+sdxId];
  assert.equal(Object.keys(mixed.articles).length,4);assert.equal(sdx.sourceId,sdxId);assert.equal(sdx.addedFor[0].needId,'missing-mimic');assert.equal(sdx.addedFor[0].pack,'Pancreas pack');assert.deepEqual(sdx.addedFor[0].relatedArticleIds,['a']);assert.equal(mixed.reviewNeeds[0].status,'sources-added');
  assert.match(await page.locator('#needs').textContent(),/Ready for review/);assert.equal(supplemental.imageFetches,beforeStatdx.fetches+2);assert.ok(supplemental.reads.slice(beforeStatdx.reads).every(url=>url.startsWith('https://app.statdx.com')),'Adding only STATdx does not reopen saved RadPrimer sources');
  const archived=JSON.parse(supplemental.downloads.findLast(d=>d.filename.includes('/STATdx/')&&d.filename.endsWith('/source.json')).content);assert.equal(archived.sections.length,2);assert.match(archived.articleText,/STATdx reference/);
  assert.match(sdx.images[0].files.plain.relativePath,/STATdx - STATdx supplement - 001 - unannotated.jpg/);
  await page.getByRole('button',{name:'Mark reviewed',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#status').textContent==='Review request updated.');assert.match(await page.locator('#needs').textContent(),/Reviewed/);
  await page.reload();await page.waitForFunction(()=>!document.querySelector('#start').disabled);await page.locator('#start').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Collection complete'));
  const simple=await page.evaluate(()=>JSON.parse(fixtureState.downloads.findLast(d=>d.filename.endsWith('/collection.json')).content));assert.ok(simple.articles['statdx:'+sdxId].addedFor.some(d=>!d.purpose&&!d.pack&&!d.needId&&!d.relatedArticleIds.length),'A link downloads with every optional field empty');
  assert.equal(await page.evaluate(()=>fixtureState.imageFetches),supplemental.imageFetches,'Reload verifies completed supplemental media without another fetch');
  await page.locator('#collections').selectOption('');assert.equal(await page.locator('#start').isDisabled(),true);assert.equal(await page.locator('#destination').textContent(),'');
  await page.locator('#collections').selectOption('gastrointestinal / pancreas');await page.waitForFunction(()=>document.querySelector('#start').textContent==='Download to Pancreas');
  await page.setViewportSize({width:1200,height:1100});await page.screenshot({path:path.join(output,'statdx-supplement-desktop.png'),fullPage:true});
  await page.setViewportSize({width:390,height:850});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:path.join(output,'statdx-supplement-mobile.png'),fullPage:true});
  assert.deepEqual(errors,[]);console.log('PASS: curriculum discovery, archives, retry/pause/resume, migration, selected STATdx integration, saved-source reuse, review imports/statuses, desktop/mobile layout');console.log(output);
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
