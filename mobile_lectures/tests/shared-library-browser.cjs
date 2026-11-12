// Synthetic accounts, images and audio on localhost. No production credentials.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),{spawn}=require('node:child_process'),{chromium,webkit}=require('playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),base='http://127.0.0.1:4188',api='http://127.0.0.1:4189',safari=process.env.TEST_BROWSER==='webkit';
 const server=spawn(process.execPath,[path.join(root,'node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','4188','--strictPort'],{cwd:root,stdio:'pipe',windowsHide:true,env:{...process.env,VITE_SUPABASE_URL:api,VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture'}});
 let browser,backend;const errors=[],mediaRequests=[];
 try{
  for(let i=0;i<60;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,150));}
  const {fixture}=await import('./fixture.mjs'),{sha256}=await import('../src/contract.js'),{initialChoices,Review:R}=await import('../src/card-choices.js');
  const f=await fixture(undefined,{inheritedGroup:true}),a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
  const users=Object.fromEntries([[a,'owner@example.test'],[b,'reader@example.test']].map(([id,email])=>[id,{id,email,aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}}]));
  const token=id=>['eyJhbGciOiJIUzI1NiJ9',Buffer.from(JSON.stringify({sub:id,email:users[id].email,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'fixture'].join('.');
  const rate=8000,duration=20,wav=Buffer.alloc(44+rate*duration*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVE',8);wav.write('fmt ',12);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
  const hash=await sha256(wav),audio={sha256:hash,path:`audio/${hash}`,bytes:wav.length,mime:'audio/wav',verifiedExport:true};
  const {combineAlignments}=await import('../src/automatic-timing.js'),{transcriptAnchors}=await import('../src/timing-anchors.js');
  const evidence={fingerprint:f.manifest.fingerprint,audioSha256:hash,transcriptSha256:await sha256(new TextEncoder().encode(f.manifest.lesson.narration.text)),duration,engine:'echogarden-dtw',engineVersion:'3.4.0',cues:transcriptAnchors(f.manifest.lesson).map((x,i)=>({...x,time:1+i*10,referenceEndTime:3+i*10,wordCount:3}))};
  const timing=combineAlignments({...evidence,profile:'baseline'},{...evidence,profile:'check'},f.manifest,audio);
  const {buildSubtitles}=await import('../src/subtitles.js'),text=f.manifest.lesson.narration.text,matches=[...text.matchAll(/[\p{L}\p{N}]+/gu)],words=matches.map((m,i)=>({text:m[0],startOffsetUtf16:m.index,endOffsetUtf16:m.index+m[0].length,startTime:.2+i*18/matches.length,endTime:.2+(i+.8)*18/matches.length}));
  audio.subtitles=buildSubtitles({...evidence,profile:'baseline',words},{...evidence,profile:'check',words},f.manifest,audio);
  const ownerChoices=initialChoices(f.manifest);ownerChoices.review=R.update(ownerChoices.review,f.manifest.lesson,'TEST-1',{decision:'cards',role:'normal',objective:'Owner objective'});
  const original={owner_id:a,fingerprint:f.manifest.fingerprint,manifest:f.manifest,title:'Shared software fixture',case_count:2,audio,timing,card_choices:ownerChoices,card_revision:1,shared_from_owner_id:null};
  const rows={[a]:structuredClone(original),[b]:{...structuredClone(original),owner_id:b,card_choices:null,card_revision:0,shared_from_owner_id:a}};
  const progress={[a]:{owner_id:a,fingerprint:original.fingerprint,audio_sha256:hash,position:5,case_id:'case-1',image_id:'TEST-1',rate:1,updated_at:'2026-11-12T00:00:00Z'},[b]:null};
  backend=http.createServer(async(req,res)=>{
   res.setHeader('Access-Control-Allow-Origin',base);res.setHeader('Access-Control-Allow-Headers',req.headers['access-control-request-headers']||'apikey,authorization,content-type,x-client-info,x-supabase-api-version');res.setHeader('Access-Control-Allow-Methods','GET,POST,PATCH,OPTIONS');
   if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
   try{
    const url=new URL(req.url,api),parts=[];for await(const part of req)parts.push(part);const body=parts.length?JSON.parse(Buffer.concat(parts)):null;
    const auth=req.headers.authorization?.replace(/^Bearer /,''),uid=auth&&auth.includes('.')?JSON.parse(Buffer.from(auth.split('.')[1],'base64url')).sub:null;let data;
    if(url.pathname==='/auth/v1/token'){const user=Object.values(users).find(u=>u.email===body.email);assert.ok(user);data={access_token:token(user.id),refresh_token:'fixture',expires_in:3600,token_type:'bearer',user};}
    else if(url.pathname==='/auth/v1/user')data=users[uid];
    else if(url.pathname==='/rest/v1/mobile_members')data=[{email:users[uid].email}];
    else if(url.pathname==='/rest/v1/mobile_lectures'){
      assert.equal(url.searchParams.get('owner_id'),'eq.'+uid,'every account reads/writes its own learner row');
      if(req.method==='PATCH'){assert.deepEqual(Object.keys(body).sort(),['card_choices','card_revision']);if(url.searchParams.get('card_revision')==='eq.'+rows[uid].card_revision){Object.assign(rows[uid],body);data=[{card_revision:rows[uid].card_revision}];}else data=[];}
      else data=url.searchParams.has('fingerprint')?rows[uid]:[rows[uid]];
    }else if(url.pathname==='/rest/v1/mobile_progress'){
      if(req.method==='GET'){assert.equal(url.searchParams.get('owner_id'),'eq.'+uid);data=progress[uid];}
      else if(req.method==='POST'){assert.equal(body.owner_id,uid);assert.equal(progress[uid],null);progress[uid]=body;data=body;}
      else{assert.equal(url.searchParams.get('owner_id'),'eq.'+uid);if(url.searchParams.get('updated_at')==='eq.'+progress[uid]?.updated_at){progress[uid]={...progress[uid],...body};data=progress[uid];}else data=null;}
    }else if(url.pathname.startsWith('/storage/v1/object/sign/lecture-media/')){
      const object=url.pathname.split('/lecture-media/')[1];assert.ok(object.startsWith(a+'/'+original.fingerprint+'/'),'both learners use the granted source media');
      if(req.method==='POST'){mediaRequests.push({uid,object});data={signedURL:url.pathname.replace('/storage/v1','')+'?token=fixture'};}
      else{const isAudio=object.includes('/audio/'),bytes=isAudio?wav:Buffer.from(Object.values(f.files)[0]),range=/bytes=(\d+)-(\d*)/.exec(req.headers.range||''),start=range?Number(range[1]):0,end=range&&range[2]?Math.min(Number(range[2]),bytes.length-1):bytes.length-1;res.writeHead(range?206:200,{'Content-Type':isAudio?'audio/wav':'image/png','Accept-Ranges':'bytes','Content-Length':end-start+1,...(range?{'Content-Range':`bytes ${start}-${end}/${bytes.length}`}:{})});res.end(bytes.subarray(start,end+1));return;}
    }else throw new Error('Unexpected fixture request '+url.pathname);
    res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(data));
   }catch(error){errors.push(error.message);res.writeHead(500);res.end('{}');}
  });await new Promise(r=>backend.listen(4189,'127.0.0.1',r));
  browser=await(safari?webkit.launch({headless:true}):chromium.launch({channel:'msedge',headless:true}));
  async function open(uid,width=390){const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'});page.on('pageerror',e=>errors.push(e.message));await page.goto(base);await page.getByLabel('Email address',{exact:true}).fill(users[uid].email);await page.getByLabel('Password',{exact:true}).fill('fixture-only-password');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.locator('.lecture-card').click();await page.waitForFunction(()=>document.querySelector('audio')?.duration===20);return page;}
  const owner=await open(a),phone=await open(b);
  await owner.waitForFunction(()=>Math.abs(document.querySelector('audio').currentTime-5)<.1);
  assert.equal(await phone.locator('audio').evaluate(a=>a.currentTime),0,'reader does not inherit owner position');
  assert.equal(await phone.locator('#card-toggle').getAttribute('aria-pressed'),'false','reader does not inherit owner selections');
  await phone.locator('#audio-tools summary').click();assert.equal(await phone.getByLabel('Attach Speechify audio').count(),0);assert.equal(await phone.locator('#mark-time').count(),0);
  await owner.locator('#audio-tools summary').click();assert.equal(await owner.getByLabel('Attach Speechify audio').count(),1);
  await phone.locator('#subtitle-toggle').click();await phone.locator('audio').evaluate(async a=>{a.currentTime=11.2;await a.play();});
  await phone.waitForFunction(()=>document.querySelector('#case-select').value==='case-2'&&document.querySelector('#subtitle-text').textContent.length>0);await phone.locator('audio').evaluate(a=>a.pause());
  await phone.locator('#speed').selectOption('1.5');await phone.waitForFunction(()=>document.querySelector('#progress-state').textContent.includes('saved'));
  await phone.locator('#card-link').click();await phone.locator('#card-unlink').click();await phone.locator('#card-link-dialog').waitFor({state:'hidden'});await phone.locator('#card-toggle').click();await phone.waitForFunction(()=>document.querySelector('#card-toggle').getAttribute('aria-pressed')==='true');
  assert.equal(R.summary(rows[b].card_choices.review,f.manifest.lesson).cards,1);assert.deepEqual(rows[a],original,'reader changes never alter owner content or choices');assert.equal(progress[a].position,5);
  const tablet=await open(b,820);await tablet.waitForFunction(()=>document.querySelector('audio').currentTime>11&&document.querySelector('audio').playbackRate===1.5);
  assert.equal(await tablet.locator('#card-toggle').getAttribute('aria-pressed'),'true');assert.equal(await tablet.locator('#card-link').innerText(),'Link images');
  await tablet.locator('#card-link').click();await tablet.locator('input[data-image="TEST-1"]').check();await tablet.locator('#card-link-save').click();await tablet.locator('#card-link-dialog').waitFor({state:'hidden'});
  await phone.locator('#card-choices summary').first().click();await phone.locator('#card-refresh').click();await phone.waitForFunction(()=>document.querySelector('#card-link').textContent==='2 images linked');
  assert.deepEqual(rows[a],original);assert.ok(mediaRequests.some(r=>r.uid===b&&r.object.includes('/audio/')));assert.ok(mediaRequests.some(r=>r.uid===b&&r.object.includes('/media/')));assert.deepEqual(errors,[]);
  await fs.mkdir(path.join(root,'test-results'),{recursive:true});await phone.screenshot({path:path.join(root,'test-results',`shared-library-${safari?'webkit':'edge'}.png`)});
  console.log(`PASS ${safari?'WebKit':'Edge'} shared source images/audio/CC, owner-only content tools, private playback/choices/link overrides, and reader phone/tablet resume without owner changes.`);
 }finally{await browser?.close();if(backend)await new Promise(r=>backend.close(r));server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
