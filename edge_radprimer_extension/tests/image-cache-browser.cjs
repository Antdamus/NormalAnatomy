/* Isolated browser test: real image decoding/IndexedDB, simulated download disk. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC','base64');
const sha256=crypto.createHash('sha256').update(bytes).digest('hex');
const source='https://app.radprimer.com/images/browser-fixture?style=xlarge&annotated=false';
let seedRequests=0;
const html=`<!doctype html><meta charset="utf-8"><title>Image cache test</title>
<script>
window.writes=[];window.sourceRequests=0;
window.chrome={runtime:{getURL:name=>'/'+name},downloads:{search:async()=>JSON.parse(localStorage.getItem('history')||'[]')}};
window.fetchImageForDownload=async()=>{sourceRequests++;throw Error('Source network access forbidden in this test');};
window.saveCachedImageFile=async(blob,filename)=>{
 const history=JSON.parse(localStorage.getItem('history')||'[]');
 const item={id:history.length+1,filename:'C:/Downloads/'+filename,state:'complete',exists:true,fileSize:blob.size,url:'data:image/png;base64,cached',startTime:new Date().toISOString()};
 writes.push({filename,sha256:await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()).then(d=>[...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,'0')).join(''))});
 history.push(item);localStorage.setItem('history',JSON.stringify(history));return item;
};
</script><script src="/visual-lecture-media.js"></script><script src="/image-download-cache.js"></script>`;
const server=http.createServer((req,res)=>{
  if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}
  if(req.url==='/local-image-cache/index.json'){
    seedRequests++;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({version:1,entries:[{url:source,filename:sha256+'.png',sha256}]}));return;
  }
  if(req.url==='/local-image-cache/'+sha256+'.png'){seedRequests++;res.setHeader('Content-Type','image/png');res.end(bytes);return;}
  if(['/visual-lecture-media.js','/image-download-cache.js'].includes(req.url)){
    res.setHeader('Content-Type','application/javascript');res.end(fs.readFileSync(path.join(root,req.url.slice(1))));return;
  }
  res.writeHead(404).end();
});
(async()=>{
  let browser;
  try {
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    browser=await chromium.launch({headless:true,channel:'msedge'});
    const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto('http://127.0.0.1:'+server.address().port);
    assert.equal((await page.evaluate(url=>RadPrimerImageCache.stage(url,'RadPrimer/a.png'),source)).method,'cached-image');
    assert.equal((await page.evaluate(url=>RadPrimerImageCache.stage(url,'RadPrimer/a.png'),source)).method,'existing-file');
    assert.equal(seedRequests,2);
    await page.reload();
    assert.equal((await page.evaluate(url=>RadPrimerImageCache.stage(url,'RadPrimer/a.png'),source)).method,'existing-file');
    assert.equal((await page.evaluate(url=>RadPrimerImageCache.stage(url,'RadiologyMasterSource/b/image_evidence/a.png'),source)).method,'cached-image');
    assert.equal(seedRequests,2,'Reloaded controller must use IndexedDB, without reading seed files again');
    assert.deepEqual(await page.evaluate(()=>writes.map(row=>row.sha256)),[sha256]);
    assert.equal(await page.evaluate(()=>sourceRequests),0);assert.deepEqual(errors,[]);
    const description=await page.evaluate(url=>RadPrimerImageCache.describe(url),source);
    assert.equal(description.sha256,sha256);assert.equal(description.width,1);assert.equal(description.height,1);assert.match(description.pixelHash,/^1x1:[a-f0-9]{64}$/);
    console.log('PASS: browser decoding, seed migration, persistent cache after reload, exact-byte copies, retry reuse, zero source requests');
  } finally {if(browser)await browser.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
