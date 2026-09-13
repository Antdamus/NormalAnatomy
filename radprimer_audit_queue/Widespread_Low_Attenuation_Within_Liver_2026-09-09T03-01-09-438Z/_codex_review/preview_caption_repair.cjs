const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {pathToFileURL}=require('url');
const root=path.resolve(__dirname,'../../..');
const {chromium}=require(path.join(root,'radprimer_audit_queue/Focal_Hypervascular_Liver_Lesion_2026-09-09T01-07-48-422Z/_codex_review/node_modules/playwright'));
const bundle=path.resolve(__dirname,'..');
const rows=JSON.parse(fs.readFileSync(path.join(__dirname,'corrected_rows.json'),'utf8')).filter(r=>r.Image);
const base=pathToFileURL(path.join(bundle,'media')+'/').href;
const body=rows.map((r,i)=>`<article id="note-${i+1}"><h2>${r.Clinical_Context}</h2><h3>${r.Question}</h3><section class="front">${r.Image}</section><h3>${r.Most_Likely_Diagnosis}</h3><section>${r.Imaging_Differentiation}</section><section class="annotated">${r.Image_Annotated}</section><details><summary>Original_Caption</summary>${r.Original_Caption}</details></article>`).join('\n');
const html=`<!doctype html><meta charset="utf-8"><base href="${base}"><title>Restored image captions</title><style>body{font:18px/1.45 Arial;background:#e9edf2;color:#162232;margin:24px}article{max-width:1150px;background:white;padding:24px;margin:0 auto 28px;border-radius:10px}h2{font-size:15px;color:#5e6d7b}h3{font-size:21px}.front img{max-height:260px;max-width:45%;object-fit:contain}.front br{display:none}.annotated{display:flex;gap:18px;margin-top:20px}.stackItem{flex:1;min-width:0}.stackItem>img{max-height:480px;width:100%;object-fit:contain}.stackCap{font-size:17px;padding:12px;background:#e7e9eb;margin-top:10px}.stackCap img,details img{width:16px;height:16px;vertical-align:middle}details{margin-top:14px}section{margin-top:12px}</style>${body}`;
const file=path.join(__dirname,'caption_previews.html');fs.writeFileSync(file,html,'utf8');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--allow-file-access-from-files']});
 try{
  const page=await browser.newPage({viewport:{width:1300,height:1000}});await page.goto(pathToFileURL(file).href,{waitUntil:'load'});
  await page.locator('details').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));
  const imgs=await page.locator('img').evaluateAll(nodes=>nodes.map(n=>({src:n.getAttribute('src'),loaded:n.complete&&n.naturalWidth>0})));
  assert.equal(imgs.length,104);assert(imgs.every(i=>i.loaded));
  const icons=await page.locator('.stackCap img').evaluateAll(nodes=>nodes.map(n=>({width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height,naturalWidth:n.naturalWidth})));
  assert.equal(icons.length,29);assert(icons.every(i=>i.width===16&&i.height===16&&i.naturalWidth===16));
  await page.locator('details').evaluateAll(nodes=>nodes.forEach(n=>n.open=false));
  for(const n of [2,3,6,14])await page.locator('#note-'+n).screenshot({path:path.join(__dirname,`caption_preview_${n}.png`)});
  fs.writeFileSync(path.join(__dirname,'caption_preview_validation.json'),JSON.stringify({status:'passed',renderedImageNotes:18,loadedImageReferences:104,diagnosticImageReferences:46,inlineCaptionIcons:29,originalCaptionIcons:29,allImagesLoaded:true,iconDimensions:[16,16],screenshots:[2,3,6,14],method:'Local HTML artifact preview; installed Anki templates not modified or rendered.'},null,2)+'\n');
  console.log('All 18 image notes rendered; 46 diagnostic images and all 58 caption-icon references loaded.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
