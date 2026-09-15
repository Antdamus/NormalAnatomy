/* Run with Playwright installed (NODE_PATH may point to the bundled runtime). */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {chromium} = require('playwright');
const fixture = require('./visual-lecture-fixture.cjs');
if (!fixture.available()) {
  console.log('SKIP: Illustrated-lecture browser checks require private local study images and bundles; see README.md.');
  process.exit(0);
}
const {lesson,mediaDir,rawNarration} = fixture();
const core = require('../visual-lecture-core.js');
const root = path.resolve(__dirname,'..');
const output = process.env.VISUAL_LECTURE_QA_DIR || path.join(require('node:os').tmpdir(),'visual-lecture-qa');
fs.mkdirSync(output,{recursive:true});
const assets = lesson.registry.flatMap(image => ['plain','annotated'].map(variant => {
  const filename = image[variant+'Filename'];
  return {key:`${lesson.id}/${image.masterImageId}/${variant}`, data:fs.readFileSync(path.join(mediaDir,filename)).toString('base64')};
}));
const server = http.createServer((req,res)=>{
  const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/,''), file=path.resolve(root,name || 'visual-lecture.html');
  if (!file.startsWith(root+path.sep) || !fs.existsSync(file)) {res.writeHead(404).end();return;}
  const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'}[path.extname(file)] || 'application/octet-stream';
  res.writeHead(200,{'Content-Type':mime});fs.createReadStream(file).pipe(res);
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  try {
    const context=await browser.newContext({viewport:{width:1280,height:1000},acceptDownloads:true});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>{
      window.testRequests=[];
      window.chrome={runtime:{sendMessage:async message=>{
        window.testRequests.push(message);
        if(message.type==='VISUAL_LECTURE_IMPORT_PLAN_RESPONSE') {
          try {
            const saved=await VisualLectureStore.get(message.id);
            const plan=VisualLecture.validatePlan(VisualLecture.parseJSON(message.text),saved.registry,saved.sourceText);
            await VisualLectureStore.put({...saved,plan,status:'map-ready',error:'',token:''});
            return {ok:true,result:{saved:true,cases:plan.cases.length,images:new Set(plan.cases.flatMap(c=>c.imageIds)).size}};
          } catch(error) {return {ok:false,error:error.message};}
        }
        if(message.type==='VISUAL_LECTURE_PREPARE_CARDS') {
          const saved=await VisualLectureStore.get(message.id), review=await VisualLectureStore.getReview(message.id);
          const plan=LectureCardReview.selectedPlan(review,saved);
          return {ok:true,result:{selectedCount:plan.selectedImageIds.length,teachingFramework:{engine:'mixed',label:'Mixed anatomy and pathology'}}};
        }
        if(message.type==='VISUAL_LECTURE_REGENERATE_NARRATION') {
          const saved=await VisualLectureStore.get(message.id);
          await VisualLectureStore.put({...saved,status:'narrating',pendingNarrationRevision:2,stageStartedAt:Date.now()});
          return {ok:true,result:{started:true}};
        }
        if(message.type==='VISUAL_LECTURE_PLAYER') {
          if(message.action==='play') window.testPlayer.isPlaying=true;
          if(message.action==='pause') window.testPlayer.isPlaying=false;
          return {ok:true,result:window.testPlayer};
        }
        return {ok:true,result:{}};
      }},storage:{local:{get:async()=>({radprimerRunnerSettings:{}})}}};
      window.testPlayer={available:true,isPlaying:false,title:'Periportal lesion · 9abcdef0',liveContext:null};
    });
    await page.goto(base+'/visual-lecture.html');
    await page.evaluate(async({lesson,assets})=>{
      await VisualLectureStore.put({...lesson,plan:null,narration:null,status:'error',error:'The organizer response needs attention.'});
      for(const asset of assets) await VisualLectureStore.putAsset(asset.key,await(await fetch('data:image/jpeg;base64,'+asset.data)).blob());
    },{lesson,assets});
    await page.goto(base+'/visual-lecture.html?lesson='+lesson.id);
    await page.locator('#recover-map summary').click();
    await page.locator('#plan-response').fill('{');
    await page.locator('#recover-plan-response').click();
    await page.waitForFunction(()=>document.querySelector('#plan-response-status').textContent.includes('complete JSON'));
    assert.equal(await page.evaluate(async()=>!!(await VisualLectureStore.get(new URL(location.href).searchParams.get('lesson'))).plan),false);
    await page.locator('#plan-response-file').setInputFiles({name:'organizer-response.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(lesson.plan))});
    await page.waitForFunction(()=>document.querySelector('#plan-response').value.includes('schemaVersion'));
    await page.locator('#recover-plan-response').click();
    await page.waitForFunction(()=>document.querySelector('#phase').textContent==='Map ready');
    assert.equal(await page.locator('#recover-map').isVisible(),false);
    assert.match(await page.locator('#card-review-counts').textContent(),/^0 selected for cards/);
    await page.screenshot({path:path.join(output,'recovered-map-desktop.png'),fullPage:true});
    await page.evaluate(async lesson=>VisualLectureStore.put(lesson),lesson);
    await page.reload();
    await page.waitForFunction(()=>document.querySelectorAll('.preview img').length===3);
    await page.getByRole('button',{name:'Peribiliary cysts',exact:true}).click();
    await page.waitForFunction(()=>[...document.querySelectorAll('.image-button img')].length===2 && [...document.querySelectorAll('.image-button img')].every(i=>i.complete&&i.naturalWidth>0));
    assert.equal(await page.locator('#relationship').textContent(),'SAME PATIENT · LINKED VIEWS');
    assert.equal(await page.locator('#follow').getAttribute('aria-pressed'),'false');
    assert.match(await page.locator('#card-review-counts').textContent(),/^0 selected for cards/);
    assert.equal(await page.locator('#prepare-cards').isDisabled(),true);
    await page.locator('figure[data-image="SDX-26"] select[aria-label^="Card framework"]').selectOption('mixed');
    await page.waitForFunction(async()=> (await VisualLectureStore.getReview(new URL(location.href).searchParams.get('lesson')))?.images['SDX-26']?.role==='mixed');
    await page.locator('figure[data-image="SDX-26"] input').fill('Trace the relationship to the ducts.');
    await page.locator('figure[data-image="SDX-26"] input').press('Tab');
    await page.waitForFunction(async()=> (await VisualLectureStore.getReview(new URL(location.href).searchParams.get('lesson')))?.images['SDX-26']?.objective==='Trace the relationship to the ducts.');
    await page.locator('figure[data-image="SDX-26"] select[aria-label^="Card use"]').selectOption('cards');
    await page.waitForFunction(()=>document.querySelector('#card-review-counts').textContent.startsWith('2 selected for cards'));
    assert.equal(await page.locator('figure[data-image="SDX-27"] select[aria-label^="Card use"]').inputValue(),'cards');
    await page.locator('#prepare-cards').click();
    await page.waitForFunction(()=>document.querySelector('#card-review-status').textContent.startsWith('Prepared 2 images'));
    assert.ok(await page.locator('.image-button img').first().evaluate(img=>img.getBoundingClientRect().height<=img.parentElement.getBoundingClientRect().height+1),'The complete image must fit its frame without cropping.');
    await page.locator('#images figure').first().getByText('Original caption',{exact:true}).click();
    assert.equal(await page.locator('#images figcaption img').count(),1);
    await page.screenshot({path:path.join(output,'periportal-desktop.png'),fullPage:true});
    await page.locator('#annotated').uncheck();
    assert.ok((await page.locator('.image-button img').first().getAttribute('src')).startsWith('blob:'));
    await page.locator('.image-button').first().click();
    assert.equal(await page.locator('#viewer').evaluate(d=>d.open),true);
    await page.waitForFunction(()=>document.querySelector('#viewer-image').complete && document.querySelector('#viewer-image').naturalWidth>0);
    assert.equal(await page.locator('#viewer-card-choice select[aria-label^="Card use"]').inputValue(),'cards');
    await page.locator('#viewer-card-choice select[aria-label^="Card use"]').selectOption('lecture');
    await page.waitForFunction(total=>document.querySelector('#card-review-counts').textContent.startsWith(`0 selected for cards · ${total} not selected for cards`),lesson.registry.length);
    await page.locator('#viewer-card-choice select[aria-label^="Card use"]').selectOption('cards');
    await page.waitForFunction(()=>document.querySelector('#card-review-counts').textContent.startsWith('2 selected for cards'));
    const plainSrc=await page.locator('#viewer-image').getAttribute('src');
    assert.equal(await page.locator('#viewer-arrows').getAttribute('aria-pressed'),'false');
    await page.locator('#viewer-arrows').click();
    assert.notEqual(await page.locator('#viewer-image').getAttribute('src'),plainSrc,'Arrows switch the actual cached image variant');
    assert.equal(await page.locator('#annotated').isChecked(),true);
    await page.keyboard.press('r');
    assert.equal(await page.locator('#viewer-image').getAttribute('src'),plainSrc);
    await page.keyboard.press('r');
    assert.ok(await page.locator('#viewer-caption img').count()>0);
    assert.match(await page.locator('#viewer-caption img').first().getAttribute('alt'),/arrow/);
    await page.keyboard.press('a');
    assert.equal(await page.locator('#viewer-large').getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('#viewer-zoom').textContent(),'250%');
    assert.ok(await page.locator('#viewer').evaluate(d=>d.getBoundingClientRect().width>=innerWidth-1));
    await page.keyboard.press('a');
    assert.equal(await page.locator('#viewer-zoom').textContent(),'100%');
    const stage=await page.locator('#viewer-stage').boundingBox();
    assert.ok(stage.height>200,'The fitted image has a useful viewing area');
    await page.mouse.move(stage.x+stage.width/2,stage.y+stage.height/2);
    await page.mouse.wheel(0,-200);
    await page.waitForFunction(()=>document.querySelector('#viewer-zoom').textContent!=='100%');
    await page.mouse.down();await page.mouse.move(stage.x+stage.width/2+70,stage.y+stage.height/2+35);await page.mouse.up();
    assert.match(await page.locator('#viewer-image').getAttribute('style'),/translate\(70px, 35px\)/);
    await page.keyboard.press('0');
    assert.match(await page.locator('#viewer-image').getAttribute('style'),/translate\(0px, 0px\) scale\(1\)/);
    await page.keyboard.down('Shift');await page.mouse.down();await page.mouse.move(stage.x+stage.width/2+110,stage.y+stage.height/2-20);await page.mouse.up();await page.keyboard.up('Shift');
    assert.notEqual(await page.locator('#viewer-contrast').inputValue(),'1');
    assert.notEqual(await page.locator('#viewer-brightness').inputValue(),'1');
    await page.keyboard.press('w');
    assert.equal(await page.locator('#viewer-contrast').inputValue(),'1');
    await page.locator('#viewer-contrast').evaluate(input=>{input.value='1.5';input.dispatchEvent(new Event('input',{bubbles:true}));});
    assert.match(await page.locator('#viewer-image').getAttribute('style'),/contrast\(1.5\)/);
    await page.locator('#viewer-stage').focus();await page.keyboard.press('i');
    assert.match(await page.locator('#viewer-image').getAttribute('style'),/invert\(1\)/);
    await page.keyboard.press('w');
    assert.ok(!(await page.locator('#viewer-image').getAttribute('style')).includes('invert(1)'));
    await page.keyboard.press('l');
    assert.match(await page.locator('#viewer-label').textContent(),/image 27/);
    await page.keyboard.press('k');
    assert.match(await page.locator('#viewer-label').textContent(),/image 26/);
    await page.keyboard.press('p');await page.waitForFunction(()=>document.querySelector('#viewer-play').textContent==='Pause (P)');
    await page.keyboard.press('ArrowLeft');
    await page.waitForFunction(()=>testRequests.some(r=>r.type==='VISUAL_LECTURE_PLAYER' && r.action==='back10'));
    await page.keyboard.press('p');await page.waitForFunction(()=>document.querySelector('#viewer-play').textContent==='Play (P)');
    await page.keyboard.press('t');assert.equal(await page.locator('#viewer-caption').isVisible(),false);
    await page.keyboard.press('t');assert.equal(await page.locator('#viewer-caption').isVisible(),true);
    // Card decisions remain visible and operable with the display controls hidden.
    await page.locator('#viewer-hide-controls').click();
    await page.keyboard.press('+');await page.keyboard.press('i');
    const beforeCardToggle=await page.locator('#viewer-image').getAttribute('style');
    const cardVariant=await page.locator('#viewer-image').getAttribute('src');
    const cardCaption=await page.locator('#viewer-caption').innerHTML();
    assert.equal(await page.locator('#viewer-card-toggle').getAttribute('aria-pressed'),'true');
    assert.match(await page.locator('#viewer-card-toggle').textContent(),/✓ For cards \(C\)/);
    await page.keyboard.press('c');
    await page.waitForFunction(()=>document.querySelector('#viewer-card-toggle').dataset.decision==='lecture');
    assert.match(await page.locator('#viewer-card-status').textContent(),/Not selected for cards · 2 linked images/);
    assert.equal(await page.locator('#viewer-header').isVisible(),false);
    assert.equal(await page.locator('#viewer-card-toggle').isVisible(),true);
    assert.equal(await page.locator('#viewer-image').getAttribute('style'),beforeCardToggle);
    assert.equal(await page.locator('#viewer-image').getAttribute('src'),cardVariant);
    assert.equal(await page.locator('#viewer-caption').innerHTML(),cardCaption);
    assert.equal(await page.locator('#viewer-follow').getAttribute('aria-pressed'),'false');
    const toggledReview=await page.evaluate(async()=>VisualLectureStore.getReview(new URL(location.href).searchParams.get('lesson')));
    for(const id of ['SDX-26','SDX-27']) assert.deepEqual(toggledReview.images[id],{decision:'lecture',role:'mixed',objective:'Trace the relationship to the ducts.'});
    await page.locator('#viewer-card-toggle').click();
    await page.waitForFunction(()=>document.querySelector('#viewer-card-toggle').dataset.decision==='cards');
    assert.equal(await page.locator('#viewer-card-toggle').evaluate(b=>b===document.activeElement),true);
    await page.keyboard.press('r');
    assert.equal(await page.locator('#viewer-card-toggle').getAttribute('aria-pressed'),'true','Variants share one decision');
    await page.keyboard.press('r');
    await page.screenshot({path:path.join(output,'card-selection-hidden-controls-desktop.png')});
    await page.setViewportSize({width:352,height:850});
    assert.equal(await page.locator('#viewer').evaluate(d=>d.scrollWidth<=d.clientWidth),true);
    assert.equal(await page.locator('#viewer-card-toggle').isVisible(),true);
    assert.equal(await page.locator('#viewer-show-controls').isVisible(),true);
    assert.ok((await page.locator('#viewer-stage').boundingBox()).height>300);
    await page.screenshot({path:path.join(output,'card-selection-hidden-controls-mobile.png')});
    await page.setViewportSize({width:1280,height:1000});
    // A failed save retains the prior decision and reports the error in this view.
    await page.evaluate(()=>{window.originalUpdateReview=VisualLectureStore.updateReview;VisualLectureStore.updateReview=async()=>{throw new Error('Storage unavailable for test');};});
    await page.keyboard.press('c');
    await page.waitForFunction(()=>document.querySelector('#viewer-card-status').textContent.includes('Not saved: Storage unavailable'));
    assert.equal(await page.locator('#viewer-card-toggle').getAttribute('aria-pressed'),'true');
    // Navigating or holding the key during a save cannot toggle the group again.
    await page.evaluate(()=>{
      window.cardSaveCalls=0;
      VisualLectureStore.updateReview=async(...args)=>{cardSaveCalls++;await new Promise(resolve=>window.releaseCardSave=resolve);return originalUpdateReview(...args);};
    });
    await page.keyboard.down('c');
    await page.waitForFunction(()=>document.querySelector('#viewer-card-toggle').getAttribute('aria-busy')==='true');
    await page.keyboard.down('c');await page.keyboard.up('c');
    await page.keyboard.press('l');
    assert.match(await page.locator('#viewer-label').textContent(),/image 27/);
    await page.keyboard.press('c');
    assert.equal(await page.evaluate(()=>cardSaveCalls),1);
    await page.evaluate(()=>{VisualLectureStore.updateReview=originalUpdateReview;releaseCardSave();});
    await page.waitForFunction(()=>document.querySelector('#viewer-card-toggle').dataset.decision==='lecture');
    assert.equal(await page.locator('#viewer-card-status').getAttribute('data-error'),'false');
    await page.keyboard.press('c');
    await page.waitForFunction(()=>document.querySelector('#viewer-card-toggle').dataset.decision==='cards');
    await page.keyboard.press('k');
    await page.locator('#viewer-show-controls').click();
    await page.locator('#viewer-card-choice select[aria-label^="Card use"]').selectOption('lecture');
    await page.waitForFunction(()=>document.querySelector('#viewer-card-toggle').dataset.decision==='lecture');
    assert.match(await page.locator('#viewer-card-status').textContent(),/Not selected for cards/);
    await page.locator('#viewer-card-choice select[aria-label^="Card use"]').focus();
    const beforeTyping=await page.evaluate(async()=> (await VisualLectureStore.getReview(new URL(location.href).searchParams.get('lesson'))).revision);
    await page.keyboard.press('c');
    assert.equal(await page.evaluate(async()=> (await VisualLectureStore.getReview(new URL(location.href).searchParams.get('lesson'))).revision),beforeTyping,'Selection shortcuts do not fire inside form controls');
    await page.locator('#viewer-stage').focus();await page.keyboard.press('c');
    await page.waitForFunction(()=>document.querySelector('#viewer-card-toggle').dataset.decision==='cards');
    await page.keyboard.press('0');await page.keyboard.press('w');
    await page.evaluate(()=>document.querySelector('#error').hidden=true);
    await page.screenshot({path:path.join(output,'image-viewer-desktop.png')});
    await page.setViewportSize({width:392,height:950});
    assert.ok(await page.locator('#viewer').evaluate(d=>d.scrollWidth<=d.clientWidth));
    assert.ok((await page.locator('#viewer-stage').boundingBox()).height>180);
    await page.screenshot({path:path.join(output,'image-viewer-mobile.png')});
    await page.setViewportSize({width:1280,height:1000});
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#viewer').evaluate(d=>d.open),false);
    await page.getByRole('button',{name:'Play lecture',exact:true}).click();
    assert.equal(await page.locator('#play').textContent(),'Pause lecture');
    await page.evaluate(text=>{window.testPlayer.liveContext={live:true,text};},lesson.narration.segments[2].text.slice(0,180));
    await page.locator('#follow').click();
    await page.waitForFunction(()=>document.querySelector('#case-title').textContent==='Portal vein thrombosis');
    await page.getByRole('button',{name:'Dilated bile ducts',exact:true}).click();
    await page.waitForTimeout(1750);
    assert.equal(await page.locator('#case-title').textContent(),'Dilated bile ducts');
    for(const width of [768,392,352]) {
      await page.setViewportSize({width,height:950});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`overflow at ${width}`);
    }
    await page.screenshot({path:path.join(output,'periportal-mobile.png'),fullPage:true});
    const downloadPromise=page.waitForEvent('download');await page.locator('#export').click();const download=await downloadPromise;
    const filename=path.join(output,'portable-lecture.json');await download.saveAs(filename);
    const portable=JSON.parse(fs.readFileSync(filename,'utf8'));
    assert.equal(Object.keys(portable.assets).length,12);
    assert.equal(portable.lesson.registry[0].caption,lesson.registry[0].caption);
    assert.equal(portable.cardReview.images['SDX-26'].decision,'cards');
    assert.equal(portable.cardReview.images['SDX-27'].role,'mixed');
    await page.goto(base+'/visual-lecture.html');
    await page.locator('#import').setInputFiles(filename);
    await page.waitForURL('**?lesson='+lesson.id);
    await page.waitForFunction(()=>document.querySelectorAll('.preview img').length===3);
    assert.equal(await page.locator('#error').isVisible(),false);
    // Reload with network unavailable: IDB assets must still render.
    await page.route('https://**/*',route=>route.abort());
    await page.reload();await page.waitForFunction(()=>document.querySelectorAll('.preview img').length===3);
    await page.getByRole('button',{name:'Peribiliary cysts',exact:true}).click();
    assert.equal(await page.locator('.image-button img').count(),2);
    assert.match(await page.locator('#card-review-counts').textContent(),/^2 selected for cards/);
    assert.deepEqual(errors,[]);
    // Cold cache: actually exercise the new page -> worker -> IndexedDB path,
    // including an unavailable archived duplicate that must not hide ready cases.
    const fresh=await context.newPage();
    await fresh.addInitScript(({assets,originalId})=>{
      window.chrome={runtime:{sendMessage:async()=>({ok:false,error:'Player fixture is not connected.'})},storage:{local:{get:async()=>({})}}};
      window.cacheCalls=[];
      const original=chrome.runtime.sendMessage;
      chrome.runtime.sendMessage=async message=>{
        if(message.type!=='VISUAL_LECTURE_CACHE_IMAGE') return original(message);
        cacheCalls.push(message.imageId);
        if(message.imageId==='RP-999') {
          await new Promise(resolve=>window.finishArchive=resolve);
          return {ok:false,error:'RadPrimer: Open a signed-in article tab and retry.'};
        }
        const asset=assets.find(a=>a.key===`${originalId}/${message.imageId}/${message.variant}`);
        await VisualLectureStore.putAsset(`${message.id}/${message.imageId}/${message.variant}`,await(await fetch('data:image/jpeg;base64,'+asset.data)).blob());
        return {ok:true,result:{cached:true}};
      };
    },{assets,originalId:lesson.id});
    await fresh.goto(base+'/visual-lecture.html');
    const freshLesson={...lesson,id:'vl-c01dcafe',registry:[{...lesson.registry[0],masterImageId:'RP-999',sourceLabel:'RadPrimer',required:false,plainUrl:'',annotatedUrl:'https://app.radprimer.com/images/archive'},...lesson.registry]};
    await fresh.evaluate(l=>VisualLectureStore.put(l),freshLesson);
    await fresh.goto(base+'/visual-lecture.html?lesson='+freshLesson.id);
    await fresh.waitForFunction(()=>document.querySelectorAll('.preview img').length===3 && Boolean(window.finishArchive));
    assert.notEqual(await fresh.evaluate(()=>cacheCalls[0]),'RP-999');
    assert.match(await fresh.locator('#media-progress').textContent(),/6 \/ 6 teaching images/);
    await fresh.evaluate(()=>finishArchive());
    await fresh.waitForFunction(()=>document.querySelector('#asset-status').textContent.includes('signed-in article'));
    assert.equal(await fresh.locator('.preview img').count(),3);
    // Exercise real Speechify content script's new idempotent controls on a DOM fixture.
    const audio=await context.newPage();
    await audio.goto(base+'/visual-lecture.html');
    await audio.evaluate(()=>{
      document.body.innerHTML='<button data-testid="player-play-button" aria-label="Play">Play</button><button data-testid="nav-file-action-button">Fixture lecture</button>';
      const button=document.querySelector('[data-testid="player-play-button"]');
      button.onclick=()=>{button.textContent=button.textContent==='Play'?'Pause':'Play';button.setAttribute('aria-label',button.textContent);};
      window.handlers=[];
      window.chrome={runtime:{onMessage:{addListener:fn=>handlers.push(fn)},sendMessage:async()=>({ok:true})},storage:{local:{get:async()=>({})},onChanged:{addListener:()=>{}}}};
    });
    await audio.addScriptTag({url:base+'/speechify-paster.js'});
    const command=action=>audio.evaluate(action=>new Promise(resolve=>handlers[0]({type:'SPEECHIFY_PLAYER_REMOTE',action},{},resolve)),action);
    assert.equal((await command('play')).result.isPlaying,true);
    assert.equal((await command('play')).result.isPlaying,true);
    assert.equal((await command('pause')).result.isPlaying,false);
    assert.equal((await command('state')).result.liveContext,null);
    // Reproduce an old note: ordinary topic title, raw JSON, actual reader DOM.
    await audio.evaluate(({title,raw,cue})=>{
      document.querySelector('[data-testid="nav-file-action-button"]').textContent=title;
      const reader=document.createElement('div');reader.dataset.readerScrollContainer='true';
      const block=document.createElement('div');block.className='reader-api-block';block.textContent=raw;reader.append(block);document.body.append(reader);
      const autoscroll=document.createElement('button');autoscroll.dataset.testid='autoscroll-button';
      const highlight=document.createElement('span');highlight.className='bg-hglt-prim';highlight.textContent=cue;autoscroll.append(highlight);document.body.append(autoscroll);
    },{title:lesson.title,raw:JSON.stringify(rawNarration),cue:rawNarration.segments[0].text.split(/\s+/).slice(32,40).join(' ')});
    const legacyState=(await command('state')).result;
    assert.ok(legacyState.readerTextSample.includes('"schemaVersion"'));
    assert.equal(core.matchesLectureReader(lesson,legacyState),true);
    assert.equal(core.locateLiveCase(lesson.narration.segments,legacyState.liveContext)?.caseId,'ducts');
    // Drive the organizer with the real content-script cursor, not fabricated timing.
    await page.evaluate(state=>{window.testPlayer={...state,readerFormat:'structured'};},legacyState);
    if(await page.locator('#follow').getAttribute('aria-pressed')==='false') await page.locator('#follow').click();
    await page.waitForFunction(()=>document.querySelector('#case-title').textContent==='Dilated bile ducts' && document.querySelector('#phase').textContent==='Speechify connected');
    await page.waitForFunction(()=>document.querySelector('#case-panel').getBoundingClientRect().top>=0 && document.querySelector('#case-panel').getBoundingClientRect().top<innerHeight/2);
    assert.match(await page.locator('#progress').textContent(),/spoken JSON/);
    assert.equal(await page.locator('.toolbar').evaluate(el=>getComputedStyle(el).position),'sticky');
    await page.screenshot({path:path.join(output,'connected-reader.png'),fullPage:false});
    // A rendered library without Next.js's old root must support the entire save/open path.
    await audio.evaluate(()=>{
      document.body.innerHTML='<div id="root"><div id="sidebar"><button id="import-menu" data-slot="dropdown-trigger" aria-haspopup="menu">+</button><a href="/library">Library</a><button data-testid="sidebar-profile-trigger" data-slot="dropdown-trigger" aria-haspopup="menu">Profile</button></div><div data-testid="content-header-breadcrumb-item-folder-basic">Basic</div><div data-testid="library-v2"></div></div>';
      document.querySelector('#import-menu').onclick=()=>{
        const menu=document.createElement('div');menu.setAttribute('role','menu');
        const option=document.createElement('div');option.setAttribute('role','menuitem');option.textContent='Type or Paste Text';
        menu.append(option);document.body.append(menu);option.onclick=()=>{menu.remove();openImportForm();};
      };
      const openImportForm=()=>{
        const form=document.createElement('div');
        form.innerHTML='<input id="textImportTitle"><div data-testid="library-text-import-editor" contenteditable="true" role="textbox" style="white-space:pre-wrap"></div><button data-testid="add-text-save-button">Save File</button>';
        document.body.append(form);
        form.querySelector('button').onclick=()=>{
          window.createdNote={title:form.querySelector('input').value,text:form.querySelector('[contenteditable]').innerText};
          window.notesSaved=(window.notesSaved||0)+1;
          form.remove();
          const card=document.createElement('div');card.setAttribute('role','button');const titleNode=document.createElement('span');titleNode.dataset.testid='library-item-title';titleNode.textContent=createdNote.title;card.append(titleNode);
          card.onclick=()=>{
            document.body.innerHTML='<button data-testid="compact-player-listen-button">Listen</button>'+(window.mobileImportFixture?'<header data-testid="mobile-top-nav"><h1></h1></header>':'<button data-testid="nav-file-action-button"></button>')+'<div data-reader-scroll-container="true"><div class="reader-api-block"></div></div>';
            const listen=document.querySelector('[data-testid="compact-player-listen-button"]');
            listen.onclick=()=>{const playing=listen.getAttribute('aria-label')==='Pause';listen.dataset.testid='player-play-button';listen.setAttribute('aria-label',playing?'Play':'Pause');listen.textContent=playing?'Play':'Pause';};
            document.title=createdNote.title+' | Speechify';
            document.querySelector(window.mobileImportFixture?'h1':'[data-testid="nav-file-action-button"]').textContent=createdNote.title;
            document.querySelector('.reader-api-block').textContent=createdNote.text;
          };
          document.querySelector('[data-testid="library-v2"]').append(card);
          if(window.mobileImportFixture) card.click();
        };
      };
      window.buildTestImportForm=openImportForm;
    });
    const note=await audio.evaluate(payload=>new Promise(resolve=>handlers[0]({type:'SPEECHIFY_CREATE_TEXT_NOTE',requestId:'clean-note',...payload},{},resolve)),{title:lesson.speechifyTitle,text:lesson.narration.text,folder:{id:'folder-basic',name:'Basic'},autoSave:true,openReader:true});
    assert.equal(note.ok,true,note.error);assert.equal(note.result.readerReady,true);
    assert.equal(await audio.evaluate(()=>createdNote.text),lesson.narration.text);
    assert.equal(await audio.locator('#__next').count(),0);
    assert.equal(await audio.getByTestId('compact-player-listen-button').count(),1,'Saving must leave the compact reader idle.');
    assert.equal((await command('state')).result.isPlaying,false);
    assert.equal((await command('play')).result.isPlaying,true);
    assert.equal((await command('pause')).result.isPlaying,false);
    // Current narrow Speechify: no sidebar or breadcrumb; bottom Add opens a sheet,
    // and Save opens the reader automatically with only a mobile heading/title.
    await audio.setViewportSize({width:759,height:950});
    await audio.evaluate(()=>{
      window.mobileImportFixture=true;history.replaceState({},'', '/library?folder=folder-basic');
      document.title='Library | Speechify';
      document.body.innerHTML='<header data-testid="mobile-top-nav"><button data-testid="mobile-top-nav-folder-back">Back</button><h1>Basic</h1></header><div data-testid="library-v2"></div><nav data-testid="mobile-bottom-tab-bar"><button data-testid="mobile-tab-add">Add</button></nav>';
      document.querySelector('[data-testid="mobile-tab-add"]').onclick=()=>{
        const sheet=document.createElement('div');sheet.setAttribute('role','dialog');
        const option=document.createElement('button');option.textContent='Type or Paste Text';sheet.append(option);document.body.append(sheet);
        option.onclick=()=>{sheet.remove();buildTestImportForm();};
      };
    });
    const mobilePayload={title:lesson.speechifyTitle+' · lecture 2',text:lesson.narration.text,folder:{id:'folder-basic',name:'Basic'},autoSave:true,openReader:true};
    const mobileNote=await audio.evaluate(payload=>new Promise(resolve=>handlers[0]({type:'SPEECHIFY_CREATE_TEXT_NOTE',...payload},{},resolve)),mobilePayload);
    assert.equal(mobileNote.ok,true,mobileNote.error);assert.equal(mobileNote.result.readerReady,true);
    assert.equal(await audio.evaluate(()=>createdNote.text),lesson.narration.text);
    assert.equal(await audio.locator('h1').textContent(),mobilePayload.title);
    assert.equal((await command('state')).result.title,mobilePayload.title);
    assert.equal((await command('state')).result.isPlaying,false);
    const savesBeforeRetry=await audio.evaluate(()=>notesSaved);
    const mobileRetry=await audio.evaluate(payload=>new Promise(resolve=>handlers[0]({type:'SPEECHIFY_CREATE_TEXT_NOTE',...payload},{},resolve)),mobilePayload);
    assert.equal(mobileRetry.result.reused,true);assert.equal(await audio.evaluate(()=>notesSaved),savesBeforeRetry);
    // Regeneration UI launches only the saved lecture and keeps its map and old narration visible.
    const beforeRegeneration=await page.evaluate(async id=>VisualLectureStore.get(id),lesson.id);
    await page.locator('#regenerate').click();
    await page.waitForFunction(()=>document.querySelector('#regenerate').disabled && /new lecture is being prepared/i.test(document.querySelector('#progress').textContent));
    const afterRegeneration=await page.evaluate(async id=>VisualLectureStore.get(id),lesson.id);
    assert.deepEqual(afterRegeneration.plan,beforeRegeneration.plan);
    assert.deepEqual(afterRegeneration.narration,beforeRegeneration.narration);
    assert.equal(afterRegeneration.pendingNarrationRevision,2);
    assert.match(await page.locator('#progress').textContent(),/new lecture is being prepared/i);
    assert.equal(await page.locator('#play').isEnabled(),true);
    assert.equal(await page.evaluate(()=>testRequests.filter(r=>r.type==='VISUAL_LECTURE_REGENERATE_NARRATION').length),1);
    // A source with only its annotated variant must never claim that arrows are off.
    const missing=await context.newPage();
    await missing.addInitScript(()=>{window.chrome={runtime:{sendMessage:async()=>({ok:false,error:'Variant unavailable'})},storage:{local:{get:async()=>({})}}};});
    await missing.goto(base+'/visual-lecture.html');
    const missingLesson={...lesson,id:'vl-abcdface'};
    await missing.evaluate(async({lesson,assets,oldId})=>{
      await VisualLectureStore.put(lesson);
      for(const asset of assets.filter(a=>a.key.endsWith('/annotated'))) await VisualLectureStore.putAsset(asset.key.replace(oldId,lesson.id),await(await fetch('data:image/jpeg;base64,'+asset.data)).blob());
    },{lesson:missingLesson,assets,oldId:lesson.id});
    await missing.goto(base+'/visual-lecture.html?lesson='+missingLesson.id);
    await missing.getByRole('button',{name:'Peribiliary cysts',exact:true}).click();
    await missing.waitForFunction(()=>document.querySelector('.image-button img')?.complete);
    await missing.locator('#annotated').uncheck();
    await missing.locator('.image-button').first().click();
    assert.equal(await missing.locator('#viewer-arrows').isDisabled(),true);
    assert.equal(await missing.locator('#viewer-arrows').getAttribute('aria-pressed'),'true');
    assert.match(await missing.locator('#viewer-variant-note').textContent(),/Only the annotated image/);
    // Enlargement keeps following live image cues, with no resets on repeated polls.
    const following=await context.newPage();
    await following.addInitScript(()=>{
      window.followPlayer={available:true,isPlaying:true,title:'Periportal lesion · 9abcdef0'};
      window.followPolls=0;
      window.chrome={runtime:{sendMessage:async()=>{followPolls++;return {ok:true,result:followPlayer};}}};
    });
    const cueImage=async(segmentIndex,imageNumber,options={})=>following.evaluate(({text,imageNumber,options})=>{
      followPlayer.liveContext={live:options.live!==false,text};
      followPlayer.lectureSection={source:options.source||'explicit-live-image-mention',sourceKind:'statdx',imageNumber,highlightAvailable:options.live!==false};
    },{text:lesson.narration.segments[segmentIndex].text,imageNumber,options});
    await following.goto(base+'/visual-lecture.html?lesson='+lesson.id);
    await cueImage(1,26);
    await following.waitForFunction(()=>document.querySelector('figure[data-image="SDX-26"]')?.classList.contains('current'));
    await following.locator('figure[data-image="SDX-26"] .image-button').click();
    assert.equal(await following.locator('#follow').getAttribute('aria-pressed'),'true');
    assert.equal(await following.locator('#viewer-follow').getAttribute('aria-pressed'),'true');
    await following.keyboard.press('a');await following.keyboard.press('r');await following.keyboard.press('t');
    await following.locator('#viewer-contrast').evaluate(input=>{input.value='1.5';input.dispatchEvent(new Event('input',{bubbles:true}));});
    await following.locator('#viewer-stage').focus();await following.keyboard.press('+');
    await following.locator('#viewer-hide-controls').click();
    await following.keyboard.press('c');
    await following.waitForFunction(()=>document.querySelector('#viewer-card-toggle').dataset.decision==='lecture');
    assert.equal(await following.locator('#viewer-follow').getAttribute('aria-pressed'),'true','Marking cards does not stop live following');
    assert.equal(await following.evaluate(()=>followPlayer.isPlaying),true);
    await following.keyboard.press('c');
    await following.waitForFunction(()=>document.querySelector('#viewer-card-toggle').dataset.decision==='cards');
    const zoomBeforeCue=await following.locator('#viewer-zoom').textContent();
    const pollBeforeCue=await following.evaluate(()=>followPolls);
    await following.waitForFunction(count=>followPolls>count,pollBeforeCue);
    assert.equal(await following.locator('#viewer-zoom').textContent(),zoomBeforeCue);
    assert.equal(await following.locator('#viewer-contrast').inputValue(),'1.5');
    await cueImage(1,27);
    await following.waitForFunction(()=>document.querySelector('#viewer-label').textContent==='STATdx image 27');
    assert.equal(await following.locator('#viewer').evaluate(d=>d.open&&d.classList.contains('extra-large')),true);
    assert.equal(await following.locator('#viewer-zoom').textContent(),'250%');
    assert.equal(await following.locator('#viewer-contrast').inputValue(),'1');
    assert.equal(await following.locator('#viewer-arrows').getAttribute('aria-pressed'),'false');
    assert.equal(await following.locator('#viewer-caption').isVisible(),false);
    assert.equal(await following.locator('#viewer-caption').textContent(),lesson.registry.find(i=>i.masterImageId==='SDX-27').caption.replace(/<[^>]*>/g,''));
    await cueImage(2,28);
    await following.waitForFunction(()=>document.querySelector('#viewer-label').textContent==='STATdx image 28');
    assert.equal(await following.locator('#viewer-card-toggle').getAttribute('data-decision'),'later','The badge follows the visible image');
    await following.evaluate(()=>{
      window.originalCardSave=VisualLectureStore.updateReview;
      VisualLectureStore.updateReview=async(...args)=>{await new Promise(resolve=>window.finishCardSave=resolve);return originalCardSave(...args);};
    });
    await following.keyboard.press('c');
    await following.waitForFunction(()=>document.querySelector('#viewer-card-toggle').getAttribute('aria-busy')==='true');
    await cueImage(1,26);
    await following.waitForFunction(()=>document.querySelector('#viewer-label').textContent==='STATdx image 26');
    await following.evaluate(()=>{VisualLectureStore.updateReview=originalCardSave;finishCardSave();});
    await following.waitForFunction(async()=> (await VisualLectureStore.getReview(new URL(location.href).searchParams.get('lesson')))?.images['SDX-28']?.decision==='cards');
    assert.match(await following.locator('#viewer-label').textContent(),/image 26/,'A completed save must not jump back to its image');
    assert.equal(await following.locator('#viewer-card-toggle').getAttribute('aria-pressed'),'true');
    await cueImage(2,28);
    await following.waitForFunction(()=>document.querySelector('#viewer-label').textContent==='STATdx image 28');
    assert.equal(await following.locator('#case-title').textContent(),'Portal vein thrombosis');
    assert.equal(await following.locator('#viewer-position').textContent(),'1 / 2');
    // A seek backwards must follow too; time estimates and unrelated image IDs must not.
    await cueImage(1,26);
    await following.waitForFunction(()=>document.querySelector('#viewer-label').textContent==='STATdx image 26');
    await cueImage(1,29);
    let polls=await following.evaluate(()=>followPolls);await following.waitForFunction(count=>followPolls>count,polls);
    assert.equal(await following.locator('#viewer-label').textContent(),'STATdx image 26');
    await cueImage(1,27,{source:'estimated-time'});
    polls=await following.evaluate(()=>followPolls);await following.waitForFunction(count=>followPolls>count,polls);
    assert.equal(await following.locator('#viewer-label').textContent(),'STATdx image 26');
    await following.locator('#viewer-stage').focus();await following.keyboard.press('f');
    assert.equal(await following.locator('#follow').getAttribute('aria-pressed'),'false');
    await cueImage(1,27);
    polls=await following.evaluate(()=>followPolls);await following.waitForFunction(count=>followPolls>count,polls);
    assert.equal(await following.locator('#viewer-label').textContent(),'STATdx image 26');
    await following.locator('#viewer-show-controls').click();
    await following.locator('#viewer-follow').click();
    await following.waitForFunction(()=>document.querySelector('#viewer-label').textContent==='STATdx image 27');
    // Clicking a different image keeps it visible until the next distinct cue.
    await following.keyboard.press('Escape');await following.locator('figure[data-image="SDX-26"] .image-button').click();
    polls=await following.evaluate(()=>followPolls);await following.waitForFunction(count=>followPolls>count,polls);
    assert.equal(await following.locator('#viewer-label').textContent(),'STATdx image 26');
    assert.equal(await following.locator('#follow').getAttribute('aria-pressed'),'true');
    await cueImage(2,28);await following.waitForFunction(()=>document.querySelector('#viewer-label').textContent==='STATdx image 28');
    await following.keyboard.press('Escape');await following.locator('#play').focus();await following.keyboard.press('e');
    assert.equal(await following.locator('#viewer').evaluate(d=>d.open),true);
    assert.equal(await following.locator('#follow').getAttribute('aria-pressed'),'true');
    await cueImage(2,29);await following.waitForFunction(()=>document.querySelector('#viewer-label').textContent==='STATdx image 29');
    await following.close();
    // User-assigned keys persist, replace defaults, and cannot conflict or fire while editing.
    const keys=await context.newPage();
    await keys.addInitScript(()=>{
      window.keyAudio=[];
      window.chrome={runtime:{sendMessage:async message=>{
        if(message.type==='VISUAL_LECTURE_PLAYER') {
          keyAudio.push(message.action);
          return {ok:true,result:{available:true,isPlaying:message.action==='play',title:'Periportal lesion · 9abcdef0'}};
        }
        return {ok:true,result:{}};
      }}};
    });
    await keys.goto(base+'/visual-lecture.html?lesson='+lesson.id);
    await keys.getByRole('button',{name:'Peribiliary cysts',exact:true}).click();
    await keys.locator('.image-button').first().click();
    await keys.locator('#viewer-shortcuts').click();
    await keys.locator('[data-shortcut="extraLarge"]').click();await keys.keyboard.press('r');
    assert.match(await keys.locator('#shortcut-status').textContent(),/already assigned to annotations/);
    await keys.keyboard.press('b');
    await keys.locator('[data-shortcut="brighter"]').click();await keys.keyboard.press('=');
    assert.match(await keys.locator('#shortcut-status').textContent(),/already assigned to zoom in/);
    await keys.keyboard.press('u');
    await keys.locator('[data-shortcut="playPause"]').click();await keys.keyboard.press('Alt+p');
    await keys.locator('[data-shortcut="toggleCard"]').click();await keys.keyboard.press('v');
    await keys.getByRole('button',{name:'Clear invert image shortcut',exact:true}).click();
    await keys.keyboard.press('b');
    assert.equal(await keys.locator('#viewer-large').getAttribute('aria-pressed'),'false','Editing settings must not operate the image');
    await keys.screenshot({path:path.join(output,'keyboard-shortcuts-desktop.png')});
    await keys.setViewportSize({width:352,height:850});
    assert.equal(await keys.locator('#shortcuts-dialog').evaluate(d=>d.scrollWidth<=d.clientWidth),true);
    await keys.screenshot({path:path.join(output,'keyboard-shortcuts-mobile.png')});
    await keys.setViewportSize({width:1280,height:1000});
    await keys.locator('#shortcut-save').click();
    assert.equal(await keys.locator('#viewer-large').textContent(),'Extra large (B)');
    assert.match(await keys.locator('#viewer-card-toggle').textContent(),/\(V\)$/);
    const decisionBeforeKey=await keys.locator('#viewer-card-toggle').getAttribute('data-decision');
    await keys.locator('#viewer-stage').focus();await keys.keyboard.press('c');
    assert.equal(await keys.locator('#viewer-card-toggle').getAttribute('data-decision'),decisionBeforeKey);
    await keys.keyboard.press('v');
    await keys.waitForFunction(before=>document.querySelector('#viewer-card-toggle').dataset.decision!==before,decisionBeforeKey);
    await page.waitForFunction(()=>document.querySelector('#viewer-large').textContent==='Extra large (B)');
    await keys.locator('#viewer-stage').focus();await keys.keyboard.press('a');
    assert.equal(await keys.locator('#viewer-large').getAttribute('aria-pressed'),'false','The old default no longer fires');
    await keys.keyboard.press('b');assert.equal(await keys.locator('#viewer-large').getAttribute('aria-pressed'),'true');
    await keys.keyboard.press('u');assert.equal(await keys.locator('#viewer-brightness').inputValue(),'1.1');
    await keys.locator('#viewer-brightness').focus();await keys.keyboard.press('u');
    assert.equal(await keys.locator('#viewer-brightness').inputValue(),'1.1','Input controls retain normal keyboard behavior');
    await keys.locator('#viewer-stage').focus();await keys.keyboard.press('i');
    assert.ok(!(await keys.locator('#viewer-image').getAttribute('style')).includes('invert(1)'));
    assert.equal(await keys.locator('#viewer-invert').textContent(),'Invert');
    await keys.keyboard.press('Alt+p');await keys.waitForFunction(()=>keyAudio.includes('play'));
    await keys.locator('#viewer-shortcuts').click();await keys.locator('[data-shortcut="extraLarge"]').click();
    await keys.keyboard.press('Escape');assert.equal(await keys.locator('#shortcuts-dialog').evaluate(d=>d.open),true);
    await keys.keyboard.press('Escape');assert.equal(await keys.locator('#shortcuts-dialog').evaluate(d=>d.open),false);
    assert.equal(await keys.locator('#viewer').evaluate(d=>d.open),true,'Esc closes only the top dialog');
    await keys.keyboard.press('Escape');
    await keys.locator('#audio-destination summary').click();await keys.locator('#audio-folder').focus();
    const audioBeforeTyping=await keys.evaluate(()=>keyAudio.filter(a=>a!=='state').length);
    await keys.keyboard.press('Alt+p');
    assert.equal(await keys.evaluate(()=>keyAudio.filter(a=>a!=='state').length),audioBeforeTyping,'Typing cannot control audio');
    await keys.reload();await keys.getByRole('button',{name:'Peribiliary cysts',exact:true}).click();
    await keys.locator('.image-button').first().click();
    assert.match(await keys.locator('#viewer-card-toggle').textContent(),/\(V\)$/);
    assert.equal(await keys.locator('#viewer-large').textContent(),'Extra large (B)');
    await keys.keyboard.press('b');assert.equal(await keys.locator('#viewer-large').getAttribute('aria-pressed'),'true');
    await keys.locator('#viewer-shortcuts').click();await keys.locator('#shortcut-reset').click();await keys.locator('#shortcut-cancel').click();
    assert.equal(await keys.locator('#viewer-large').textContent(),'Extra large (B)','Cancel leaves saved choices intact');
    await keys.locator('#viewer-shortcuts').click();await keys.locator('#shortcut-reset').click();await keys.locator('#shortcut-save').click();
    assert.equal(await keys.locator('#viewer-large').textContent(),'Extra large (A)');
    // An older saved C assignment wins over the newly added default.
    await keys.evaluate(()=>{const old=JSON.parse(localStorage.getItem('visualLectureShortcuts.v1'));delete old.toggleCard;old.invert={key:'c'};localStorage.setItem('visualLectureShortcuts.v1',JSON.stringify(old));});
    await keys.reload();await keys.getByRole('button',{name:'Peribiliary cysts',exact:true}).click();await keys.locator('.image-button').first().click();
    assert.equal(await keys.locator('#viewer-invert').textContent(),'Invert (C)');
    assert.ok(!(await keys.locator('#viewer-card-toggle').textContent()).includes('(C)'));
    assert.deepEqual(errors,[]);
    console.log('PASS: card-selection hotkeys/badges with persistence, linked groups, save failures and live navigation; original media, image controls, saved/reassigned shortcuts, regeneration, live following, offline library, and desktop/mobile Speechify save/open.');
    console.log('Screenshots: '+output);
  } finally {await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
