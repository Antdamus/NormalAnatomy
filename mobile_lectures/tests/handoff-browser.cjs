// Synthetic complete handoff through the real cloud client and two isolated
// browsers. No user account, source documents or Speechify quota is involved.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),http=require('node:http'),{spawn,spawnSync}=require('node:child_process'),{chromium,webkit}=require('playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),base='http://127.0.0.1:4186',api='http://127.0.0.1:4187',safari=process.env.TEST_BROWSER==='webkit',errors=[];
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'na-handoff-browser-')),audioFile=path.join(directory,'fixture.mp3');
 const generated=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-f','lavfi','-i','anullsrc=r=16000:cl=mono','-t','20','-c:a','libmp3lame',audioFile],{windowsHide:true});if(generated.status!==0)throw new Error('Could not create isolated MP3 fixture.');
 const mp3=await fs.readFile(audioFile),{fixture}=await import('./fixture.mjs'),{sha256}=await import('../src/contract.js'),{HandoffQueue}=await import('../tools/alignment/handoff.mjs'),f=await fixture();
 const user={id:'11111111-1111-4111-8111-111111111111',email:'fixture@example.test',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}},token=['eyJhbGciOiJIUzI1NiJ9',Buffer.from(JSON.stringify({sub:user.id,email:user.email,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'fixture'].join('.');
 const input={lesson:{...f.manifest.lesson,status:'ready',speechifyTitle:'Fixture · 1234',speechify:{readerUrl:'https://app.speechify.com/item/1234'}},assets:Object.fromEntries(f.manifest.media.map(m=>[`${f.manifest.lesson.id}/${m.imageId}/${m.variant}`,`data:${m.mime};base64,${Buffer.from(f.files[m.path]).toString('base64')}`]))};
 const queue=await new HandoffQueue(path.join(directory,'queue'),{ownerId:user.id,downloadsDirectory:directory}).init(),job=await queue.submit(input),objects=new Map();let row=null,inserts=0,audioWrites=0,phoneLoopback=0;
 const receipt={version:1,fingerprint:job.id,method:'speechify-full-document-export',readerUrl:job.readerUrl,title:job.speechifyTitle,voice:'Synthetic fixture voice',fullTextMatched:true,transcriptSha256:job.transcriptSha256,downloadId:1,startedAt:new Date().toISOString(),completedAt:new Date().toISOString(),bytes:mp3.length};
 let server,browser,phoneBrowser,vite;
 try{
  server=http.createServer(async(req,res)=>{
   res.setHeader('Access-Control-Allow-Origin',base);res.setHeader('Access-Control-Allow-Headers',req.headers['access-control-request-headers']||'apikey,authorization,content-type,x-client-info,x-supabase-api-version');res.setHeader('Access-Control-Allow-Methods','GET,POST,PATCH,PUT,OPTIONS');
   if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
   const send=data=>{res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
   try{
    const url=new URL(req.url,api),chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks);
    if(url.pathname==='/auth/v1/token')return send({access_token:token,refresh_token:'fixture',expires_in:3600,token_type:'bearer',user});
    if(url.pathname==='/auth/v1/user')return send(user);
    if(url.pathname==='/rest/v1/mobile_members')return send([{email:user.email}]);
    if(url.pathname==='/rest/v1/mobile_progress')return send(null);
    if(url.pathname==='/rest/v1/mobile_lectures'){
      if(req.method==='POST'){assert.equal(row,null);inserts++;row={...JSON.parse(body),audio:null,timing:null,card_choices:null,card_revision:0};return send(null);}
      if(req.method==='PATCH'){const value=JSON.parse(body);assert.deepEqual(Object.keys(value),['audio']);assert.equal(url.searchParams.get('audio'),'is.null');assert.equal(url.searchParams.get('timing'),'is.null');assert.equal(row.audio,null);row.audio=value.audio;audioWrites++;return send([{fingerprint:job.id}]);}
      return send(req.headers.accept?.includes('vnd.pgrst.object')?row:row?[row]:[]);
    }
    const sign='/storage/v1/object/sign/lecture-media/',upload='/storage/v1/object/lecture-media/';
    if(url.pathname.startsWith(sign)){
      if(req.method==='POST')return send({signedURL:url.pathname.replace('/storage/v1','')+'?token=fixture'});
      const object=objects.get(url.pathname.slice(sign.length));assert.ok(object);res.writeHead(200,{'Content-Type':object.type,'Content-Length':object.bytes.length,'Accept-Ranges':'bytes'});res.end(object.bytes);return;
    }
    if(url.pathname.startsWith(upload)){objects.set(url.pathname.slice(upload.length),{bytes:body,type:req.headers['content-type']});return send({Key:url.pathname.slice(upload.length)});}
    throw new Error('Unexpected route '+url.pathname);
   }catch(error){errors.push(error.message);res.writeHead(500);res.end('{}');}
  });await new Promise(r=>server.listen(4187,'127.0.0.1',r));
  vite=spawn(process.execPath,[path.join(root,'node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','4186','--strictPort'],{cwd:root,stdio:'pipe',windowsHide:true,env:{...process.env,VITE_SUPABASE_URL:api,VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test'}});
  for(let i=0;i<60;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,150));}
  async function setup(page,phone){
   page.on('pageerror',error=>errors.push(error.message));
   await page.route('http://127.0.0.1:8774/**',async route=>{
    if(phone){phoneLoopback++;throw new Error('Phone contacted the desktop');}
    assert.equal(route.request().headers().authorization,undefined);const url=new URL(route.request().url());let data;
    if(url.pathname==='/health')data={service:'normalanatomy-timing',version:1,handoffVersion:1,handoffOwner:user.id};
    else if(url.pathname==='/handoffs')data=[...queue.jobs.values()].map(j=>queue.public(j));
    else if(url.pathname.endsWith('/package'))return route.fulfill({contentType:'application/octet-stream',body:await fs.readFile(queue.location(job.id,'lecture.nalecture'))});
    else if(url.pathname.endsWith('/audio'))return route.fulfill({contentType:'audio/mpeg',body:await fs.readFile(queue.location(job.id,'source.mp3'))});
    else if(url.pathname.endsWith('/ack')){const ack=route.request().postDataJSON();data=await queue.acknowledge(job.id,ack);if(ack.stage==='package')await queue.attachDownload(job.id,{filename:audioFile,receipt});}
    else if(url.pathname==='/jobs')data={id:'b'.repeat(64),status:'processing',stage:'Synthetic timing fixture pending'};
    else data={id:'b'.repeat(64),status:'processing',stage:'Synthetic timing fixture pending'};
    await route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
   });
   await page.goto(base);await page.getByLabel('Email address',{exact:true}).fill(user.email);await page.getByLabel('Password',{exact:true}).fill('fixture-only-password');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByText('Make a little progress.').waitFor();
  }
  browser=await chromium.launch({channel:'msedge',headless:true});const desktop=await browser.newPage();await setup(desktop,false);
  await desktop.locator('.lecture-card').waitFor();await desktop.getByRole('button',{name:'Sync desktop lectures'}).click();await desktop.waitForFunction(()=>document.querySelector('#handoff-status')?.textContent.includes('audio uploaded'));
  assert.equal(inserts,1);assert.equal(audioWrites,1);assert.equal(queue.jobs.get(job.id).status,'complete');assert.equal(row.audio.sha256,await sha256(mp3));assert.equal(objects.size,2,'one unique paired image plus one recording');
  await desktop.getByRole('button',{name:'Sync desktop lectures'}).click();assert.equal(inserts,1);assert.equal(audioWrites,1);
  phoneBrowser=await(safari?webkit.launch({headless:true}):chromium.launch({channel:'msedge',headless:true}));const phone=await phoneBrowser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'});await setup(phone,true);
  await phone.locator('.lecture-card').click();await phone.waitForFunction(()=>document.querySelector('audio')?.duration>19);await phone.waitForSelector('#study-image:not([hidden])');await phone.locator('#focus-view').click();await phone.locator('#viewer-play').click();await phone.waitForFunction(()=>document.querySelector('audio')?.currentTime>.1);
  assert.equal(phoneLoopback,0);assert.deepEqual(errors,[]);await fs.mkdir(path.join(root,'test-results'),{recursive:true});await phone.screenshot({path:path.join(root,'test-results',`handoff-${safari?'webkit':'edge'}-phone.png`)});
  console.log(`PASS full reviewed package + MP3 handoff -> ${safari?'WebKit':'Edge'} phone playback; one upload, no duplicate, exact source/media/owner checks, zero phone loopback requests.`);
 }finally{await browser?.close();await phoneBrowser?.close();vite?.kill();if(server)await new Promise(r=>server.close(r));await fs.rm(directory,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
