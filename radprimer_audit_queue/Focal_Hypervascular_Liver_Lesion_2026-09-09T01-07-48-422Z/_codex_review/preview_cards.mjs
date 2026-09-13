import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const review=path.dirname(fileURLToPath(import.meta.url));
const data=JSON.parse(await fs.readFile(path.join(review,'correction_data.json'),'utf8'));
const mediaBase=pathToFileURL(path.join(path.dirname(review),'media')+'/').href;
const body=data.rows.map((r,i)=>`<article id="note-${i+1}"><h2>Note ${i+1}</h2><p>${r.Clinical_Context}</p><h3>${r.Question||r.Mechanism_Q||r.Boards_Trap_Q||r.High_Yield_Q}</h3><section class="front">${r.Image}</section><div class="answer">${r.Most_Likely_Diagnosis||r.Mechanism||r.Boards_Trap||r.High_Yield_A}</div><section>${r.Imaging_Differentiation}</section><section class="annotated">${r.Image_Annotated}</section></article>`).join('\n');
const html=`<!doctype html><meta charset="utf-8"><base href="${mediaBase}"><title>Audit card previews</title><style>body{font:18px/1.5 Arial;background:#edf0f4;color:#202733;margin:25px}article{max-width:1200px;background:white;padding:24px;margin:0 auto 30px;border-radius:10px}h2{font-size:16px;color:#667284}h3{font-size:23px}.answer{font-weight:600;margin:18px 0}.front{display:flex;flex-wrap:wrap;align-items:center;gap:8px}.front img{max-width:30%;height:auto}.front br{display:none}.annotated{display:flex;gap:12px;margin-top:20px}.stackItem{flex:1;min-width:0}.stackItem>img{width:100%;height:auto}.stackCap img{width:16px;height:16px;vertical-align:middle}.stackCap{font-size:16px;margin-top:12px}section{margin-top:18px}</style>${body}`;
const filename=path.join(review,'card_previews.html'); await fs.writeFile(filename,html,'utf8');
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--allow-file-access-from-files']});
try {
 const page=await browser.newPage({viewport:{width:1320,height:1000}});
 await page.goto(pathToFileURL(filename).href,{waitUntil:'load'});
 const images=await page.locator('img').evaluateAll(imgs=>imgs.map(im=>({src:im.getAttribute('src'),loaded:im.complete&&im.naturalWidth>0})));
 assert.equal(images.length,141); assert(images.every(im=>im.loaded));
 const icons=await page.locator('.stackCap img').evaluateAll(imgs=>imgs.map(im=>({width:im.getBoundingClientRect().width,height:im.getBoundingClientRect().height,naturalWidth:im.naturalWidth})));
 assert.equal(icons.length,61); assert(icons.every(im=>im.width===16&&im.height===16&&im.naturalWidth===16));
 for(const originalRow of [1,2,16,20]) {
   const index=data.originalRowByOutput.indexOf(originalRow)+1;
   await page.locator(`#note-${index}`).screenshot({path:path.join(review,`preview_original_${originalRow}.png`)});
 }
 const hiddenFrontDiagnosis=await page.locator('.front').evaluateAll(nodes=>nodes.every(n=>!n.textContent.includes('Hemangioma')&&!n.textContent.includes('HCC')&&!n.textContent.includes('STATdx')));
 assert(hiddenFrontDiagnosis);
 await fs.writeFile(path.join(review,'preview_validation.json'),JSON.stringify({status:'passed',loadedImages:images.length,diagnosticImageReferences:80,captionIconReferences:61,renderedNotes:64,screenshotsOriginalRows:[1,2,16,20],method:'Representative audit HTML preview, not the installed Anki template.'},null,2)+'\n');
 console.log('64 note previews loaded; all 80 diagnostic images and 61 inline caption icons rendered.');
} finally {await browser.close();}
