// Isolated end-to-end desktop publication -> phone playback. Synthetic accounts
// and HTTP services only; no real login, Speechify export or cloud writes.
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs/promises'),http=require('node:http'),{spawn}=require('node:child_process'),{chromium,webkit}=require('playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),base='http://127.0.0.1:4178',supabase='http://127.0.0.1:4181',safari=process.env.TEST_BROWSER==='webkit';
 const server=spawn(process.execPath,[path.join(root,'node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','4178','--strictPort'],{cwd:root,stdio:'pipe',windowsHide:true,env:{...process.env,VITE_SUPABASE_URL:supabase,VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test'}});
 let desktopBrowser,phoneBrowser,mediaServer,savedProgress=null,progressWrites=0;
 try{
  for(let i=0;i<60;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,150));}
  const {fixture}=await import('./fixture.mjs'),{sha256}=await import('../src/contract.js'),{transcriptAnchors}=await import('../src/timing-anchors.js'),{combineAlignments}=await import('../src/automatic-timing.js'),f=await fixture();
  const wav=Buffer.alloc(44+16000*2*20);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(16000,24);wav.writeUInt32LE(32000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
  const hash=await sha256(wav),audio={sha256:hash,path:`audio/${hash}`,bytes:wav.length,mime:'audio/wav',verifiedExport:true};
  // WebKit's native media loader bypasses Playwright route fulfillment. Serve
  // actual network bytes/ranges, just as the production signed-media URL does.
  mediaServer=http.createServer(async(req,res)=>{
    res.setHeader('Access-Control-Allow-Origin',base);res.setHeader('Access-Control-Allow-Headers','apikey,authorization,content-type,x-client-info,x-supabase-api-version');res.setHeader('Access-Control-Allow-Methods','GET,POST,PATCH,PUT,OPTIONS');res.setHeader('Access-Control-Allow-Credentials','true');
    if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Headers',req.headers['access-control-request-headers']||'content-type');res.writeHead(204);res.end();return;}
    try{
      const url=new URL(req.url,supabase);let data;
      if(url.pathname==='/auth/v1/token')data={access_token:token,refresh_token:'fixture',expires_in:3600,token_type:'bearer',user};
      else if(url.pathname==='/auth/v1/user')data=user;
      else if(url.pathname==='/rest/v1/mobile_members')data=[{email:user.email}];
      else if(url.pathname==='/rest/v1/mobile_progress'){
        if(req.method==='GET')data=savedProgress;
        else{const chunks=[];for await(const chunk of req)chunks.push(chunk);const change=JSON.parse(Buffer.concat(chunks));
          if(req.method==='POST'&&savedProgress){res.writeHead(409,{'Content-Type':'application/json'});res.end(JSON.stringify({code:'23505',message:'Progress already exists'}));return;}
          if(req.method==='POST'||url.searchParams.get('updated_at')==='eq.'+savedProgress?.updated_at){savedProgress={...savedProgress,...change};progressWrites++;data=savedProgress;}else data=null;
        }
      }
      else if(url.pathname==='/rest/v1/mobile_lectures'){
        if(req.method==='PATCH'){assert.equal(/iPhone/.test(req.headers['user-agent']),false);const chunks=[];for await(const chunk of req)chunks.push(chunk);const update=JSON.parse(Buffer.concat(chunks));
          if(update.timing){assert.equal(url.searchParams.get('audio->>sha256'),'eq.'+hash);assert.equal(url.searchParams.get('timing'),'is.null');assert.equal(update.timing.humanVerified,false);row.audio=update.audio;row.timing=update.timing;publishes++;}
          else{assert.equal(url.searchParams.get('audio'),'eq.'+JSON.stringify(row.audio));assert.deepEqual(Object.keys(update),['audio']);assert.ok(update.audio.subtitles);row.audio=update.audio;subtitlePublishes++;}
          data=[{fingerprint:row.fingerprint}];}
        else data=url.searchParams.has('fingerprint')?row:[row];
      }else if(url.pathname.startsWith('/storage/v1/object/sign/')){
        if(req.method==='POST')data={signedURL:url.pathname.replace('/storage/v1','')+'?token=fixture'};
        else{const isAudio=req.url.includes('/audio/'),bytes=isAudio?wav:Buffer.from(Object.values(f.files)[0]),range=/bytes=(\d+)-(\d*)/.exec(req.headers.range||''),start=range?Number(range[1]):0,end=range&&range[2]?Math.min(Number(range[2]),bytes.length-1):bytes.length-1;
          res.writeHead(range?206:200,{'Content-Type':isAudio?'audio/wav':'image/png','Accept-Ranges':'bytes','Content-Length':end-start+1,...(range?{'Content-Range':`bytes ${start}-${end}/${bytes.length}`}:{})});res.end(bytes.subarray(start,end+1));return;}
      }else throw new Error('Unexpected fixture route: '+url.pathname);
      res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(data));
    }catch(error){errors.push(error.message);res.writeHead(500);res.end('{}');}
  });await new Promise(r=>mediaServer.listen(4181,'127.0.0.1',r));
  const evidence={fingerprint:f.manifest.fingerprint,audioSha256:hash,transcriptSha256:await sha256(new TextEncoder().encode(f.manifest.lesson.narration.text)),duration:20,engine:'echogarden-dtw',engineVersion:'3.4.0',cues:transcriptAnchors(f.manifest.lesson).map((a,i)=>({...a,time:1+i*10,referenceEndTime:3+i*10,wordCount:3}))};
  const timing=combineAlignments({...evidence,profile:'baseline'},{...evidence,profile:'check'},f.manifest,audio),row={fingerprint:f.manifest.fingerprint,title:'Synthetic automatic lecture',case_count:2,manifest:f.manifest,audio,timing:null};
  const {buildSubtitles,subtitleAt,subtitleText}=await import('../src/subtitles.js'),text=f.manifest.lesson.narration.text,matches=[...text.matchAll(/[\p{L}\p{N}]+/gu)];
  const words=matches.map((m,i)=>({text:m[0],startOffsetUtf16:m.index,endOffsetUtf16:m.index+m[0].length,startTime:.2+i*18/matches.length,endTime:.2+(i+.8)*18/matches.length}));
  const subtitles=buildSubtitles({...evidence,profile:'baseline',words},{...evidence,profile:'check',words},f.manifest,audio);
  const user={id:'11111111-1111-4111-8111-111111111111',email:'fixture@example.test',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}},token=['eyJhbGciOiJIUzI1NiJ9',Buffer.from(JSON.stringify({sub:user.id,email:user.email,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'fixture'].join('.');
  let publishes=0,subtitlePublishes=0,phoneLoopback=0,desktopJobs=0,phase='setup';const errors=[];
  async function setup(page,isPhone){
   page.on('pageerror',e=>errors.push({message:e.message,stack:e.stack,phase,isPhone}));
   await page.route('http://127.0.0.1:8774/**',async route=>{
    if(isPhone){phoneLoopback++;throw new Error('Phone must not contact the computer.');}
    assert.equal(route.request().headers().authorization,undefined);
    const pathname=new URL(route.request().url()).pathname;
    if(pathname==='/jobs'){desktopJobs++;assert.equal(route.request().postDataJSON().manifest.fingerprint,row.fingerprint);}
    await route.fulfill({contentType:'application/json',body:JSON.stringify(pathname==='/health'?{service:'normalanatomy-timing',version:1,subtitlesVersion:1}:{id:'b'.repeat(64),status:'ready',result:{sourceAudioSha256:hash,audio,timing,subtitles,prepared:false}})});
   });
   await page.goto(base);await page.getByLabel('Email address',{exact:true}).fill(user.email);await page.getByLabel('Password',{exact:true}).fill('fixture-only-password');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByText('Make a little progress.').waitFor();
  }
  desktopBrowser=await chromium.launch({channel:'msedge',headless:true});const desktop=await desktopBrowser.newPage();await setup(desktop,false);
  await desktop.waitForFunction(()=>document.querySelector('#automatic-library-status')?.textContent.includes('synced'));assert.equal(publishes,1);assert.equal(subtitlePublishes,1);assert.equal(desktopJobs,1);
  phoneBrowser=await(safari?webkit.launch({headless:true}):chromium.launch({channel:'msedge',headless:true}));const phone=await phoneBrowser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'});
  async function tool(id){await phone.locator('#viewer-tools-toggle').click();await phone.locator('#'+id).click();await phone.locator('#viewer-tools-close').click();}
  await setup(phone,true);await phone.locator('.lecture-card').click().catch(async error=>{console.error({errors,body:await phone.locator('body').innerText()});throw error;});await phone.waitForFunction(()=>document.querySelector('audio')?.duration===20).catch(async error=>{console.error(await phone.locator('audio').evaluate(a=>({duration:a.duration,ready:a.readyState,error:a.error?.message,src:a.currentSrc,notice:document.querySelector('#notice').textContent})));throw error;});await phone.waitForFunction(()=>document.querySelector('#follow')?.getAttribute('aria-pressed')==='true');
  await phone.waitForFunction(()=>!document.querySelector('#subtitle-toggle').disabled);assert.equal(await phone.locator('#narration-subtitle').isVisible(),false);await phone.locator('#subtitle-toggle').click();
  await phone.locator('#focus-view').click();await phone.locator('#viewer-captions').click();await phone.locator('audio').evaluate(async a=>{a.currentTime=11.2;await a.play();});
  await phone.waitForFunction(()=>document.querySelector('#viewer-title').textContent==='Test case 2');assert.equal(await phone.locator('#viewer-caption-body').innerText(),'Synthetic software fixture 2.');
  await phone.waitForFunction(({track,text})=>{const t=document.querySelector('audio').currentTime,cue=track.cues.find(c=>c[0]<=t&&t<c[1]),expected=cue?text.slice(cue[2],cue[3]).replace(/\s+/g,' ').trim():'';return document.querySelector('#subtitle-text').textContent===expected;},{track:subtitles,text});
  await tool('viewer-annotated');assert.equal(await phone.locator('#follow').getAttribute('aria-pressed'),'true');
  await phone.locator('audio').evaluate(a=>{a.playbackRate=1.5;a.currentTime=1.2;});await phone.waitForFunction(()=>document.querySelector('#viewer-title').textContent==='Test case 1');
  await phone.locator('audio').evaluate(a=>a.pause());await phone.locator('#viewer-next').click();assert.equal(await phone.locator('#follow').getAttribute('aria-pressed'),'false');assert.equal(await phone.locator('#subtitle-toggle').getAttribute('aria-pressed'),'true');
  await phone.locator('audio').evaluate(a=>{a.currentTime=19;});await phone.waitForFunction(()=>document.querySelector('#subtitle-text').textContent==='');
  await phone.locator('audio').evaluate(a=>{a.currentTime=1;});await phone.waitForFunction(()=>document.querySelector('#subtitle-text').textContent.length>0);
  await phone.locator('#subtitle-toggle').click();assert.equal(await phone.locator('#narration-subtitle').isVisible(),false);await phone.locator('#subtitle-toggle').click();
  // Phrase changes, pauses and toggles cannot resize the image or reset its zoom.
  await tool('viewer-in');
  const geometry=()=>phone.evaluate(()=>{const stage=document.querySelector('.viewer-stage'),image=document.querySelector('#viewer-image');return {height:stage.clientHeight,width:stage.clientWidth,transform:image.style.transform,src:image.getAttribute('src')};});
  const beforeSubtitles=await geometry();
  for(const t of [5,8,19,1]){await phone.locator('audio').evaluate((a,t)=>{a.currentTime=t;a.dispatchEvent(new Event('timeupdate'));},t);assert.deepEqual(await geometry(),beforeSubtitles);}
  await phone.locator('#subtitle-toggle').click();assert.deepEqual(await geometry(),beforeSubtitles);await phone.locator('#subtitle-toggle').click();
  assert.equal(await phone.locator('#narration-subtitle').evaluate(e=>getComputedStyle(e).pointerEvents),'none');
  assert.equal(await phone.locator('#subtitle-toggle').evaluate(e=>{const r=e.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===e;}),true,'subtitle toggle stays clickable');
  const shownHeight=await phone.locator('.viewer-stage').evaluate(e=>e.clientHeight);
  await phone.locator('.viewer-stage').tap();await phone.waitForFunction(()=>document.querySelector('#zoom').classList.contains('controls-hidden'));
  assert.equal(await phone.locator('#narration-subtitle').isVisible(),true,'CC stays visible with controls hidden');
  assert.ok((await phone.locator('#subtitle-text').textContent()).length>0);
  const hiddenGeometry=await geometry();await phone.locator('audio').evaluate(a=>{a.currentTime=5;a.dispatchEvent(new Event('timeupdate'));});
  await phone.waitForFunction(({track,text})=>{const t=document.querySelector('audio').currentTime,cue=track.cues.find(c=>c[0]<=t&&t<c[1]);return cue&&document.querySelector('#subtitle-text').textContent===text.slice(cue[2],cue[3]).replace(/\s+/g,' ').trim();},{track:subtitles,text});
  assert.equal(await phone.locator('#narration-subtitle').isVisible(),true,'hidden controls keep updating spoken captions');assert.deepEqual(await geometry(),hiddenGeometry);
  assert.ok(await phone.locator('.viewer-stage').evaluate(e=>e.clientHeight)>shownHeight+100,'hidden controls return space to the image');
  for(const id of ['viewer-play','viewer-card-toggle','viewer-card-link','viewer-controls'])assert.equal(await phone.locator('#'+id).evaluate(e=>{const r=e.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===e;}),true,id+' stays reachable');
  await phone.locator('#viewer-play').click();await phone.waitForFunction(()=>!document.querySelector('audio').paused);await phone.locator('#viewer-play').click();assert.equal(await phone.locator('audio').evaluate(a=>a.paused),true);
  await phone.locator('#viewer-controls').click();await phone.waitForFunction(()=>!document.querySelector('#zoom').classList.contains('controls-hidden'));
  await phone.locator('#viewer-seek').fill('6');await phone.waitForFunction(()=>Math.abs(document.querySelector('audio').currentTime-6)<0.2);assert.equal(await phone.locator('#viewer-seek').getAttribute('aria-valuetext'),'0:06 of 0:20');
  const followBeforeSkips=await phone.locator('#follow').getAttribute('aria-pressed');
  await phone.locator('#viewer-rewind').click();await phone.waitForFunction(()=>Math.abs(document.querySelector('audio').currentTime-1)<0.1);
  await phone.locator('#viewer-forward').click();await phone.waitForFunction(()=>Math.abs(document.querySelector('audio').currentTime-6)<0.1);
  assert.equal(await phone.locator('audio').evaluate(a=>a.paused),true,'skipping does not start paused audio');assert.equal(await phone.locator('#follow').getAttribute('aria-pressed'),followBeforeSkips);
  const beforeRapidSkips=await geometry(),viewportBefore=await phone.evaluate(()=>({scale:visualViewport.scale,top:document.querySelector('#zoom').getBoundingClientRect().top,y:scrollY}));
  await phone.locator('#viewer-forward').tap();await phone.locator('#viewer-forward').tap();await phone.waitForFunction(()=>Math.abs(document.querySelector('audio').currentTime-16)<0.1);
  await phone.locator('#viewer-rewind').tap();await phone.locator('#viewer-rewind').tap();await phone.waitForFunction(()=>Math.abs(document.querySelector('audio').currentTime-6)<0.1);
  await phone.waitForTimeout(380);assert.deepEqual(await geometry(),beforeRapidSkips,'rapid skip taps preserve image zoom and position');
  assert.deepEqual(await phone.evaluate(()=>({scale:visualViewport.scale,top:document.querySelector('#zoom').getBoundingClientRect().top,y:scrollY})),viewportBefore,'rapid skip taps preserve the viewport');
  assert.equal(await phone.locator('#zoom').evaluate(e=>e.classList.contains('controls-hidden')),false);
  // Desktop WebKit does not emulate iOS's native double-tap/focus magnification.
  // Guard the gesture policy and focus-safe type size as well as browser behavior.
  assert.equal(await phone.locator('.viewer-dock').evaluate(e=>getComputedStyle(e).touchAction),'none');
  for(const id of ['viewer-speed','speed','viewer-seek'])assert.ok(await phone.locator('#'+id).evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=16),id+' native focus does not request small-text zoom');
  await phone.locator('#viewer-seek').fill('18');await phone.locator('#viewer-forward').click();await phone.waitForFunction(()=>document.querySelector('audio').currentTime===20);
  await phone.locator('#viewer-seek').fill('2');await phone.locator('#viewer-rewind').click();await phone.waitForFunction(()=>document.querySelector('audio').currentTime===0);
  await phone.locator('#viewer-speed').selectOption('1.75');assert.equal(await phone.locator('audio').evaluate(a=>a.playbackRate),1.75);assert.equal(await phone.locator('#speed').inputValue(),'1.75');
  await phone.locator('#viewer-tools-toggle').click();await phone.locator('#speed').selectOption('0.75');await phone.locator('#viewer-tools-close').click();await phone.waitForFunction(()=>document.querySelector('#viewer-speed').value==='0.75');
  await phone.locator('#viewer-speed').selectOption('1.25');await phone.locator('#viewer-play').click();await phone.waitForFunction(()=>document.querySelector('audio').currentTime>0.1);await phone.locator('#viewer-forward').click();assert.equal(await phone.locator('audio').evaluate(a=>a.paused),false,'skip preserves playing state');assert.equal(await phone.locator('audio').evaluate(a=>a.playbackRate),1.25);await phone.locator('#viewer-play').click();
  await fs.mkdir(path.join(root,'test-results'),{recursive:true});
  await phone.locator('audio').evaluate(a=>{a.currentTime=1;a.dispatchEvent(new Event('timeupdate'));});
  for(const [name,width,height] of [['iphone',390,844],['narrow-iphone',375,667],['small-phone',320,568],['ipad',820,1180],['landscape',844,390]]){
    await phone.setViewportSize({width,height});const layout=await phone.evaluate(()=>({overflow:document.querySelector('#zoom').scrollHeight>innerHeight+1,horizontal:document.querySelector('#zoom').scrollWidth>innerWidth+1,stage:document.querySelector('.viewer-stage').getBoundingClientRect().height,captionOverflow:document.querySelector('#narration-subtitle').scrollWidth>document.querySelector('#narration-subtitle').clientWidth}));assert.equal(layout.overflow,false,name);assert.equal(layout.horizontal,false,name+' horizontal');assert.equal(layout.captionOverflow,false,name);assert.ok(layout.stage>50,name+' visible image area');await phone.screenshot({path:path.join(root,'test-results',`subtitles-${safari?'webkit-':''}${name}.png`)});
    await phone.locator('#viewer-controls').click();assert.ok(await phone.locator('.viewer-stage').evaluate(e=>e.clientHeight)>height*.8,name+' immersive image area');
    assert.equal(await phone.locator('#narration-subtitle').isVisible(),true,name+' subtitles stay on');
    for(const id of ['viewer-rewind','viewer-play','viewer-forward','viewer-speed','viewer-card-toggle','viewer-card-link','viewer-controls'])assert.equal(await phone.locator('#'+id).evaluate(e=>{const r=e.getBoundingClientRect();return r.width>=44&&r.height>=44&&document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===e;}),true,name+' '+id+' reachable with a full touch target');
    assert.equal(await phone.locator('#viewer-speed').evaluate(e=>{const style=getComputedStyle(e),context=document.createElement('canvas').getContext('2d');context.font=style.font;return context.measureText('1.75×').width<=e.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);}),true,name+' playback rate fits without clipping');
    await phone.screenshot({path:path.join(root,'test-results',`immersive-${safari?'webkit-':''}${name}.png`)});await phone.locator('#viewer-controls').click();
  }
  await phone.getByRole('button',{name:'Close image ×'}).click();assert.equal(await phone.locator('#speed').inputValue(),'1.25');
  // Let the current render/save finish before this deliberate reload. WebKit
  // otherwise reports cancelled mock CORS requests as page errors on teardown.
  await phone.waitForLoadState('networkidle');phase='saved-speed-reload';await phone.reload();await phone.waitForFunction(()=>document.querySelector('#follow')?.getAttribute('aria-pressed')==='true');await phone.waitForFunction(()=>document.querySelector('#subtitle-toggle')?.getAttribute('aria-pressed')==='true');await phone.waitForSelector('#study-image:not([hidden])');assert.equal(await phone.locator('audio').evaluate(a=>a.playbackRate),1.25,'speed survives reopening');
  // Separate browser/device storage: the only shared state is the HTTP service.
  phase='cross-device-handoff';
  async function savedAt(position,rate,caseId){for(let i=0;i<100;i++){if(Math.abs(savedProgress?.position-position)<.1&&savedProgress?.rate===rate&&savedProgress?.case_id===caseId)return;await new Promise(r=>setTimeout(r,50));}assert.fail('Expected cloud bookmark '+position+' at '+rate+' in '+caseId+'; got '+JSON.stringify(savedProgress));}
  await desktop.goto(base+'/#'+row.fingerprint);await desktop.waitForFunction(()=>document.querySelector('audio')?.duration===20);await desktop.waitForSelector('#study-image:not([hidden])');
  assert.ok(Math.abs(await desktop.locator('audio').evaluate(a=>a.currentTime)-savedProgress.position)<.1,'fresh computer resumes phone cloud bookmark');
  await desktop.locator('#focus-view').click();await desktop.locator('#viewer-seek').fill('13');await desktop.locator('#viewer-speed').selectOption('1.5');await savedAt(13,1.5,'case-2');
  const writesBeforeResume=progressWrites;await phone.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await phone.waitForFunction(()=>Math.abs(document.querySelector('audio').currentTime-13)<.1&&document.querySelector('audio').playbackRate===1.5);await phone.waitForLoadState('networkidle');
  assert.equal(progressWrites,writesBeforeResume,'foregrounding an idle phone never overwrites the computer');assert.equal(await phone.locator('#case-select').inputValue(),savedProgress.case_id);
  await phone.locator('#focus-view').click();await phone.locator('#viewer-seek').fill('8');await phone.locator('#viewer-speed').selectOption('0.75');await savedAt(8,.75,'case-1');
  await desktop.evaluate(()=>window.dispatchEvent(new Event('focus')));await desktop.waitForFunction(()=>Math.abs(document.querySelector('audio').currentTime-8)<.1&&document.querySelector('audio').playbackRate===.75&&document.querySelector('#case-select').value==='case-1');
  assert.equal(await desktop.locator('#case-select').inputValue(),savedProgress.case_id);
  await desktop.goto(base);await desktop.locator('.lecture-card').waitFor();
  // Exercise an already-open phone receiving only newly available subtitles.
  // This changes synthetic server data, not a real account or recording.
  await phone.waitForLoadState('networkidle');row.audio={...row.audio};delete row.audio.subtitles;phase='subtitle-backfill-reload';await phone.reload();await phone.waitForFunction(()=>document.querySelector('audio')?.duration===20&&document.querySelector('#subtitle-toggle').disabled);
  const sourceBefore=await phone.locator('audio').getAttribute('src');await phone.locator('audio').evaluate(async a=>{a.currentTime=0;await a.play();});
  await desktop.reload();await desktop.waitForFunction(()=>document.querySelector('#automatic-library-status')?.textContent.includes('subtitles synced'));
  await phone.waitForFunction(()=>!document.querySelector('#subtitle-toggle').disabled,{timeout:25000});assert.equal(await phone.locator('audio').getAttribute('src'),sourceBefore);assert.ok(await phone.locator('audio').evaluate(a=>a.currentTime>0));assert.equal(subtitlePublishes,2);assert.equal(publishes,1);
  assert.equal(phoneLoopback,0);assert.equal(publishes,1);assert.deepEqual(errors,[]);
  console.log(`PASS automatic desktop publication -> ${safari?'WebKit':'Edge'} phone cloud playback, two-way device resume without idle writes, rapid skip taps, stable zoom, spoken subtitles on/off, pauses, seeking, independent image captions, five layouts and saved preference after reload; zero phone loopback calls or manual cue imports.`);
 }finally{await desktopBrowser?.close();await phoneBrowser?.close();if(mediaServer)await new Promise(r=>mediaServer.close(r));server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
