// Isolated responsive/gesture tests. No live credentials, uploads or production writes.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),{spawn}=require('node:child_process');
const {chromium,webkit}=require('playwright'),http=require('node:http');
const safari=process.env.TEST_BROWSER==='webkit';
const layoutOnly=process.env.TEST_LAYOUT_ONLY==='1';
(async()=>{
  const root=path.resolve(__dirname,'..'),base='http://127.0.0.1:4177',results=path.join(root,'test-results');
  const server=spawn(process.execPath,[path.join(root,'node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','4177','--strictPort'],{cwd:root,stdio:'pipe',windowsHide:true,env:{...process.env,VITE_SUPABASE_URL:'',VITE_SUPABASE_PUBLISHABLE_KEY:''}});
  let browser,audioServer,audioData;
  try{
    for(let i=0;i<60;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,150));}
    browser=await (safari?webkit.launch({headless:true}):chromium.launch({headless:true,channel:'msedge'}));
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];
    async function webkitHTTPMedia(bytes,mime){
      if(!safari)return;
      // Windows Playwright WebKit rejects even valid blob: MP3s. Production uses
      // signed HTTPS media. Exercise that transport with the same bytes on localhost;
      // this deliberately makes no claim about WebKit local-file preview support.
      await page.waitForFunction(()=>document.querySelector('audio').getAttribute('src')?.startsWith('blob:'));
      audioData={bytes,mime};
      if(!audioServer){audioServer=http.createServer((request,response)=>{
        const {bytes,mime}=audioData,range=/bytes=(\d+)-(\d*)/.exec(request.headers.range||''),start=range?Number(range[1]):0,end=range&&range[2]?Math.min(Number(range[2]),bytes.length-1):bytes.length-1;
        response.writeHead(range?206:200,{'Content-Type':mime,'Accept-Ranges':'bytes','Content-Length':String(end-start+1),...(range?{'Content-Range':`bytes ${start}-${end}/${bytes.length}`}:{})});response.end(bytes.subarray(start,end+1));
      });await new Promise(r=>audioServer.listen(0,'127.0.0.1',r));}
      await page.locator('audio').evaluate((a,src)=>{a.src=src;a.load();},`http://127.0.0.1:${audioServer.address().port}/recording`);
    }
    page.on('pageerror',e=>errors.push(e.message));await page.goto(base);
    const data=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=900;c.height=700;const x=c.getContext('2d');x.fillStyle='#203e47';x.fillRect(0,0,900,700);x.strokeStyle='#aac6bf';for(let i=0;i<900;i+=100){x.strokeRect(i,0,100,700);}x.fillStyle='#fff';x.font='40px sans-serif';x.fillText('Software test image',100,350);return c.toDataURL('image/png').split(',')[1];});
    const {fixture}=await import('./fixture.mjs'),f=await fixture(Buffer.from(data,'base64'));
    await page.getByLabel('Open local lecture').setInputFiles({name:'viewer.nalecture',mimeType:'application/zip',buffer:Buffer.from(f.encode())});await page.waitForSelector('#study-image:not([hidden])');
    assert.equal(await page.locator('#follow').isEnabled(),false);
    await page.locator('#caption-toggle').click();assert.equal(await page.locator('.caption').evaluate(e=>e.open),true);
    await page.locator('#focus-view').scrollIntoViewIfNeeded();const originalScroll=await page.evaluate(()=>({x:scrollX,y:scrollY}));
    await page.locator('#focus-view').click();await page.waitForSelector('#viewer-image:not([hidden])');
    assert.equal(await page.locator('#zoom').evaluate(e=>e.open),true);assert.equal(await page.locator('#viewer-caption-body').innerText(),'Synthetic software fixture 1.');
    async function tool(id){await page.locator('#viewer-tools-toggle').click();await page.locator('#'+id).click();await page.locator('#viewer-tools-close').click();}
    const camera=()=>page.locator('#viewer-image').evaluate(e=>{const m=new DOMMatrix(getComputedStyle(e).transform);return {scale:m.a,x:m.e,y:m.f};});
    // A tap on the controls cancels a pending image tap; it must not close a
    // sheet or hide navigation just after the user has deliberately opened it.
    await page.locator('.viewer-stage').tap();await page.locator('#viewer-tools-toggle').tap();await page.waitForTimeout(380);
    assert.equal(await page.locator('#viewer-options').isVisible(),true,'control touch cancels the deferred image tap');
    await page.locator('#viewer-tools-close').tap();
    const beforeControlTaps=await camera();
    for(let i=0;i<4;i++)await page.locator('#viewer-variant').tap();
    await page.waitForSelector('#viewer-image:not([hidden])');assert.deepEqual(await camera(),beforeControlTaps,'repeated control taps cannot zoom the image');
    const lockedPage=await page.evaluate(()=>{const body=document.body.getBoundingClientRect();window.scrollTo(0,300);return {bodyTop:body.top};});
    await page.waitForTimeout(50);
    assert.deepEqual(await page.evaluate(()=>({y:scrollY,bodyTop:document.body.getBoundingClientRect().top,dialogTop:document.querySelector('#zoom').getBoundingClientRect().top,scale:visualViewport.scale})),{y:0,bodyTop:lockedPage.bodyTop,dialogTop:0,scale:1},'background cannot scroll the fullscreen viewer out of place');
    await tool('viewer-original');let before=await camera();assert.equal(before.scale,1);
    const stage=await page.locator('.viewer-stage').boundingBox();await page.mouse.move(stage.x+stage.width/2,stage.y+stage.height/2);await page.mouse.down();await page.mouse.move(stage.x+stage.width/2-40,stage.y+stage.height/2-30,{steps:4});await page.mouse.up();
    assert.ok((await camera()).x<before.x);
    assert.equal(await page.locator('#zoom').evaluate(e=>e.classList.contains('controls-hidden')),false,'dragging does not hide controls');
    before=await camera();await tool('viewer-annotated');await page.waitForSelector('#viewer-image:not([hidden])');assert.deepEqual(await camera(),before);
    // Real touch events exercise the same pinch/drag handlers used on mobile.
    if(!safari){await tool('viewer-fit');const initial=await camera(),r=await page.locator('.viewer-stage').boundingBox(),cdp=await context.newCDPSession(page),cx=r.x+r.width/2,cy=r.y+r.height/2;
      const touch=(type,d)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x:cx-d,y:cy,id:1},{x:cx+d,y:cy,id:2}]});
      await touch('touchStart',25);await touch('touchMove',65);await touch('touchEnd',0);assert.ok((await camera()).scale>initial.scale*1.8);
    }
    const beforeHide=await camera();await page.locator('.viewer-stage').tap();await page.waitForFunction(()=>document.querySelector('#zoom').classList.contains('controls-hidden'));assert.equal((await camera()).scale,beforeHide.scale);
    const rTap=await page.locator('.viewer-stage').boundingBox();await page.touchscreen.tap(rTap.x+rTap.width/2,rTap.y+rTap.height/2);await page.touchscreen.tap(rTap.x+rTap.width/2,rTap.y+rTap.height/2);await page.waitForTimeout(380);
    assert.equal(await page.locator('#zoom').evaluate(e=>e.classList.contains('controls-hidden')),true,'double-tap zoom does not show controls');
    assert.ok((await camera()).scale<beforeHide.scale,'double-tap returns magnified image to fit');
    await page.locator('.viewer-stage').tap();await page.waitForFunction(()=>!document.querySelector('#zoom').classList.contains('controls-hidden'));
    await page.locator('#viewer-next').click();await page.waitForFunction(()=>document.querySelector('#viewer-title').textContent==='Test case 2');await page.waitForSelector('#viewer-image:not([hidden])');
    assert.equal(await page.locator('#viewer-caption-body').innerText(),'Synthetic software fixture 2.');assert.equal(await page.locator('#viewer-annotated').getAttribute('aria-pressed'),'true');
    await tool('viewer-captions');assert.equal(await page.locator('.viewer-caption').isVisible(),false);assert.equal(await page.locator('#caption-toggle').getAttribute('aria-pressed'),'false');
    await page.getByRole('button',{name:'Close image ×'}).click();await page.waitForFunction(()=>document.querySelector('.player').parentElement.tagName==='MAIN');
    assert.deepEqual(await page.evaluate(()=>({x:scrollX,y:scrollY})),originalScroll,'closing restores the original page position');
    if(!layoutOnly){await page.locator('#audio-tools summary').click();
    const wav=Buffer.alloc(44+16000*2*20);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(16000,24);wav.writeUInt32LE(32000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
    // Optional private MP3 covers platforms whose WebKit build cannot decode PCM WAV.
    // Its test cues belong only to this synthetic package and are never uploaded.
    const audioFile=process.env.TEST_AUDIO_FILE,audioBytes=audioFile?await fs.readFile(audioFile):wav;
    await page.locator('#audio-confirm').check();await page.getByLabel('Attach Speechify audio').setInputFiles({name:audioFile?'test.mp3':'synthetic.wav',mimeType:audioFile?'audio/mpeg':'audio/wav',buffer:audioBytes});
    await webkitHTTPMedia(audioBytes,audioFile?'audio/mpeg':'audio/wav');
    await page.waitForFunction(()=>document.querySelector('audio').duration>15).catch(async error=>{console.error(await page.locator('audio').evaluate(a=>({readyState:a.readyState,error:a.error&&{code:a.error.code,message:a.error.message},notice:document.querySelector('#notice').textContent})));throw error;});
    const duration=await page.locator('audio').evaluate(a=>a.duration);
    const timing={version:1,fingerprint:f.manifest.fingerprint,audioSha256:require('node:crypto').createHash('sha256').update(audioBytes).digest('hex'),duration,verified:true,verifiedAt:new Date().toISOString(),cues:[{caseId:'case-1',imageId:'TEST-1',time:0},{caseId:'case-2',imageId:'TEST-2',time:10}]};
    await page.getByLabel('Import matching timing').setInputFiles({name:'wrong-duration.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...timing,duration:duration+10}))});
    await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('duration does not match'));assert.equal(await page.locator('#follow').isEnabled(),false);
    await page.getByLabel('Import matching timing').setInputFiles({name:'timing.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(timing))});await page.waitForFunction(()=>document.querySelector('#follow').getAttribute('aria-pressed')==='true');
    await page.evaluate(async()=>{const a=document.querySelector('audio');a.currentTime=0.1;await a.play();});await page.waitForFunction(()=>document.querySelector('audio').currentTime>0.3);
    await page.locator('#focus-view').click();await page.waitForFunction(()=>!document.querySelector('audio').paused);assert.equal(await page.locator('audio').count(),1);
    await tool('viewer-captions');await page.evaluate(()=>{const a=document.querySelector('audio');a.currentTime=10.2;a.dispatchEvent(new Event('timeupdate'));});await page.waitForFunction(()=>document.querySelector('#viewer-title').textContent==='Test case 2');
    assert.equal(await page.locator('#viewer-caption-body').innerText(),'Synthetic software fixture 2.');
    await page.getByRole('button',{name:'Close image ×'}).click();await page.waitForFunction(()=>!document.querySelector('audio').paused);await page.evaluate(()=>document.querySelector('audio').pause());
    await page.locator('#focus-view').click();await page.locator('#viewer-previous').click();assert.equal(await page.locator('#follow').getAttribute('aria-pressed'),'false');
    }else{console.log('LAYOUT ONLY: audio/timing checks explicitly omitted; they are not reported as passing.');await page.locator('#focus-view').click();await tool('viewer-captions');}
    await fs.mkdir(results,{recursive:true});
    for(const [name,width,height] of [['phone',390,844],['small-phone',320,568],['ipad-portrait',820,1180],['ipad-landscape',1180,820],['phone-landscape',844,390]]){
      await page.setViewportSize({width,height});await tool('viewer-fit');
      const layout=await page.evaluate(()=>{const stage=document.querySelector('.viewer-stage').getBoundingClientRect(),audio=document.querySelector('#viewer-player').getBoundingClientRect(),dialog=document.querySelector('#zoom');return {overflow:dialog.scrollWidth>innerWidth||dialog.scrollHeight>innerHeight+1,stageHeight:stage.height,stageBottom:stage.bottom,audioTop:audio.top};});
      assert.equal(layout.overflow,false,name+' overflow');assert.ok(layout.stageHeight>90,name+' image area');assert.ok(layout.stageBottom<=layout.audioTop+1,name+' player overlap');
      await page.screenshot({path:path.join(results,`viewer-${safari?'webkit-':''}${name}.png`)});
    }
    await page.getByRole('button',{name:'Close image ×'}).click();
    const real=path.join(root,'private','spinal-cord.nalecture');
    try{await fs.access(real);await page.goto(base);await page.getByLabel('Open local lecture').setInputFiles(real);await page.waitForSelector('#study-image:not([hidden])');
      if(!layoutOnly){try{let report=JSON.parse(await fs.readFile(path.join(root,'private','spinal-cord-audio-check.json'),'utf8'));
        const autoJob=process.env.TEST_AUTOMATIC_JOB?JSON.parse(await fs.readFile(process.env.TEST_AUTOMATIC_JOB,'utf8')):null;
        if(autoJob){assert.equal(autoJob.status,'ready');report={file:path.join(path.dirname(process.env.TEST_AUTOMATIC_JOB),'playback.audio'),sha256:autoJob.result.audio.sha256};}
        assert.equal(require('node:crypto').createHash('sha256').update(await fs.readFile(report.file)).digest('hex'),report.sha256);
        await page.locator('#audio-tools summary').click();await page.locator('#audio-confirm').check();await page.getByLabel('Attach Speechify audio').setInputFiles({name:'source.mp3',mimeType:'audio/mpeg',buffer:await fs.readFile(report.file)});await webkitHTTPMedia(await fs.readFile(report.file),'audio/mpeg');await page.waitForFunction(()=>document.querySelector('audio').duration>3000);
        if(autoJob){
          const {readPackage,sequence}=await import('../src/contract.js'),pkg=await readPackage(await fs.readFile(real)),steps=sequence(pkg.manifest.lesson),timing=autoJob.result.timing;
          assert.ok(Math.abs((await page.locator('audio').evaluate(a=>a.duration))-timing.duration)<0.25);
          await page.getByLabel('Import matching timing').setInputFiles({name:'automatic-test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(timing))});await page.waitForFunction(()=>document.querySelector('#follow').getAttribute('aria-pressed')==='true');
          await page.locator('#focus-view').click();
          for(const cue of timing.cues){const step=steps.find(s=>s.caseId===cue.caseId&&s.imageId===cue.imageId);await page.locator('audio').evaluate((a,t)=>{a.currentTime=t;a.dispatchEvent(new Event('timeupdate'));},cue.time+0.1);
            await page.waitForFunction(({id,index})=>document.querySelector('#case-select').value===id&&document.querySelector('#image-count').textContent.startsWith(`${index+1} /`),{id:cue.caseId,index:step.index});await page.waitForSelector('#viewer-image:not([hidden])');
          }
          await page.getByRole('button',{name:'Close image ×'}).click();console.log(`PASS ${timing.cues.length} actual automatically aligned image transitions against original case/image identities, with the prepared recording clock.`);
        }
        await page.locator('audio').evaluate(a=>a.play());await page.waitForFunction(()=>document.querySelector('audio').currentTime>0.3);
        await page.locator('#focus-view').click();await page.waitForFunction(()=>!document.querySelector('audio').paused);await page.getByRole('button',{name:'Close image ×'}).click();await page.waitForFunction(()=>!document.querySelector('audio').paused);await page.locator('audio').evaluate(a=>a.pause());
      }catch(e){if(e.code!=='ENOENT')throw e;}}
      for(const [name,width,height] of [['iphone',390,844],['ipad',820,1180]]){
        await page.setViewportSize({width,height});await page.locator('#focus-view').click();await page.waitForSelector('#viewer-image:not([hidden])');await tool('viewer-annotated');await page.waitForSelector('#viewer-image:not([hidden])');
        await page.screenshot({path:path.join(results,`study-${safari?'webkit-':''}${name}.png`)});await page.getByRole('button',{name:'Close image ×'}).click();
      }
    }catch(e){if(e.code!=='ENOENT')throw e;}
    assert.deepEqual(errors,[]);console.log(`PASS ${safari?'WebKit HTTP media (local blob playback and pinch injection excluded)':'Edge including pinch'}: full-screen variants, original-resolution zoom, pan, captions, ${layoutOnly?'layout checks only':'exact-timing follow in open viewer and uninterrupted audio'}, and five phone/tablet orientations.`);
  }finally{await browser?.close();if(audioServer)await new Promise(r=>audioServer.close(r));server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
