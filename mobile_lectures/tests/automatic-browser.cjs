// Isolated end-to-end desktop publication -> phone playback. Synthetic accounts
// and HTTP services only; no real login, Speechify export or cloud writes.
const assert=require('node:assert/strict'),path=require('node:path'),http=require('node:http'),{spawn}=require('node:child_process'),{chromium,webkit}=require('playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),base='http://127.0.0.1:4178',supabase='http://127.0.0.1:4181',safari=process.env.TEST_BROWSER==='webkit';
 const server=spawn(process.execPath,[path.join(root,'node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','4178','--strictPort'],{cwd:root,stdio:'pipe',windowsHide:true,env:{...process.env,VITE_SUPABASE_URL:supabase,VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test'}});
 let desktopBrowser,phoneBrowser,mediaServer;
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
      else if(url.pathname==='/rest/v1/mobile_progress')data=req.method==='GET'?null:[];
      else if(url.pathname==='/rest/v1/mobile_lectures'){
        if(req.method==='PATCH'){assert.equal(/iPhone/.test(req.headers['user-agent']),false);assert.equal(url.searchParams.get('audio->>sha256'),'eq.'+hash);assert.equal(url.searchParams.get('timing'),'is.null');const chunks=[];for await(const chunk of req)chunks.push(chunk);const update=JSON.parse(Buffer.concat(chunks));assert.equal(update.timing.humanVerified,false);row.audio=update.audio;row.timing=update.timing;publishes++;data=[{fingerprint:row.fingerprint}];}
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
  const user={id:'11111111-1111-4111-8111-111111111111',email:'fixture@example.test',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}},token=['eyJhbGciOiJIUzI1NiJ9',Buffer.from(JSON.stringify({sub:user.id,email:user.email,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'fixture'].join('.');
  let publishes=0,phoneLoopback=0,desktopJobs=0,phase='setup';const errors=[];
  async function setup(page,isPhone){
   page.on('pageerror',e=>errors.push({message:e.message,stack:e.stack,phase,isPhone}));
   await page.route('http://127.0.0.1:8774/**',async route=>{
    if(isPhone){phoneLoopback++;throw new Error('Phone must not contact the computer.');}
    assert.equal(route.request().headers().authorization,undefined);
    const pathname=new URL(route.request().url()).pathname;
    if(pathname==='/jobs'){desktopJobs++;assert.equal(route.request().postDataJSON().manifest.fingerprint,row.fingerprint);}
    await route.fulfill({contentType:'application/json',body:JSON.stringify(pathname==='/health'?{service:'normalanatomy-timing',version:1}:{id:'b'.repeat(64),status:'ready',result:{sourceAudioSha256:hash,audio,timing,prepared:false}})});
   });
   await page.goto(base);await page.getByLabel('Email address',{exact:true}).fill(user.email);await page.getByLabel('Password',{exact:true}).fill('fixture-only-password');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByText('Make a little progress.').waitFor();
  }
  desktopBrowser=await chromium.launch({channel:'msedge',headless:true});const desktop=await desktopBrowser.newPage();await setup(desktop,false);
  await desktop.waitForFunction(()=>document.querySelector('#automatic-library-status')?.textContent.includes('synced'));assert.equal(publishes,1);assert.equal(desktopJobs,1);
  phoneBrowser=await(safari?webkit.launch({headless:true}):chromium.launch({channel:'msedge',headless:true}));const phone=await phoneBrowser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'});
  await setup(phone,true);await phone.locator('.lecture-card').click().catch(async error=>{console.error({errors,body:await phone.locator('body').innerText()});throw error;});await phone.waitForFunction(()=>document.querySelector('audio')?.duration===20).catch(async error=>{console.error(await phone.locator('audio').evaluate(a=>({duration:a.duration,ready:a.readyState,error:a.error?.message,src:a.currentSrc,notice:document.querySelector('#notice').textContent})));throw error;});await phone.waitForFunction(()=>document.querySelector('#follow')?.getAttribute('aria-pressed')==='true');
  await phone.locator('#focus-view').click();await phone.locator('#viewer-captions').click();await phone.locator('audio').evaluate(async a=>{a.currentTime=11.2;await a.play();});
  await phone.waitForFunction(()=>document.querySelector('#viewer-title').textContent==='Test case 2');assert.equal(await phone.locator('#viewer-caption-body').innerText(),'Synthetic software fixture 2.');
  await phone.locator('#viewer-annotated').click();assert.equal(await phone.locator('#follow').getAttribute('aria-pressed'),'true');
  await phone.locator('audio').evaluate(a=>{a.playbackRate=1.5;a.currentTime=1.2;});await phone.waitForFunction(()=>document.querySelector('#viewer-title').textContent==='Test case 1');
  await phone.locator('audio').evaluate(a=>a.pause());await phone.getByRole('button',{name:'Close image ×'}).click();phase='reload';await phone.reload();await phone.waitForFunction(()=>document.querySelector('#follow')?.getAttribute('aria-pressed')==='true');
  assert.equal(phoneLoopback,0);assert.equal(publishes,1);assert.deepEqual(errors,[]);
  console.log(`PASS automatic desktop publication -> ${safari?'WebKit':'Edge'} phone cloud playback, seek both directions, speed, captions, annotation switch and reload; zero phone loopback calls or manual cue imports.`);
 }finally{await desktopBrowser?.close();await phoneBrowser?.close();if(mediaServer)await new Promise(r=>mediaServer.close(r));server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
