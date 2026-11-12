// Isolated browser tests. Synthetic package/audio; no live accounts or uploads.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),{spawn}=require('node:child_process');
const {chromium}=require('playwright');
(async()=>{
  const root=path.resolve(__dirname,'..'),base='http://127.0.0.1:4176';
  const child=spawn(process.execPath,[path.join(root,'node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','4176','--strictPort'],{cwd:root,stdio:'pipe',windowsHide:true,env:{...process.env,VITE_SUPABASE_URL:'https://mobile-auth-test.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test_fixture'}});
  let browser;
  try{
    for(let i=0;i<60;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,150));}
    browser=await chromium.launch({headless:true,channel:'msedge'});
    const {fixture}=await import('./fixture.mjs'),f=await fixture(),bytes=Buffer.from(f.encode());
    const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base);await page.getByLabel('Open local lecture').setInputFiles({name:'test.nalecture',mimeType:'application/zip',buffer:bytes});
    await page.waitForSelector('#study-image:not([hidden])');
    assert.equal(await page.locator('#case-title').innerText(),'Test case 1');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.locator('#annotated').click();assert.equal(await page.locator('#annotated').getAttribute('aria-pressed'),'true');
    await page.locator('#next-image').click();await page.waitForFunction(()=>document.querySelector('#case-title').textContent==='Test case 2');
    await page.locator('#image-stage').click();assert.equal(await page.locator('#zoom').evaluate(n=>n.open),true);await page.getByRole('button',{name:'Close image ×'}).click();
    await page.locator('#audio-tools summary').click();
    const wav=Buffer.alloc(44+16000*2*3);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(16000,24);wav.writeUInt32LE(32000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
    await page.getByLabel('Attach Speechify audio').setInputFiles({name:'synthetic.wav',mimeType:'audio/wav',buffer:wav});await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('Check the recording'));
    await page.locator('#audio-confirm').check();await page.getByLabel('Attach Speechify audio').setInputFiles({name:'synthetic.wav',mimeType:'audio/wav',buffer:wav});
    await page.waitForFunction(()=>document.querySelector('audio').duration===3);
    const hash=require('node:crypto').createHash('sha256').update(wav).digest('hex');
    const timing={version:1,fingerprint:f.manifest.fingerprint,audioSha256:hash,duration:3,verified:true,verifiedAt:new Date().toISOString(),cues:[{caseId:'case-1',imageId:'TEST-1',time:0},{caseId:'case-2',imageId:'TEST-2',time:1}]};
    await page.getByLabel('Import matching timing').setInputFiles({name:'timing.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(timing))});
    await page.waitForFunction(()=>document.querySelector('#follow').getAttribute('aria-pressed')==='true');
    await page.evaluate(()=>{const a=document.querySelector('audio');a.currentTime=0.1;a.dispatchEvent(new Event('timeupdate'));});
    await page.waitForFunction(()=>document.querySelector('#case-title').textContent==='Test case 1');
    await page.evaluate(()=>{const a=document.querySelector('audio');a.currentTime=1.2;a.dispatchEvent(new Event('timeupdate'));});
    await page.waitForFunction(()=>document.querySelector('#case-title').textContent==='Test case 2');
    await page.locator('#previous-image').click();assert.equal(await page.locator('#follow').getAttribute('aria-pressed'),'false');
    await page.evaluate(()=>{const n=VisualLectureCaptions.render('<script>window.injected=1</script><img src="https://evil.example/track" onerror="window.injected=1"><a href="javascript:alert(1)">unsafe</a>');document.body.append(n);});
    assert.equal(await page.evaluate(()=>window.injected),undefined);assert.equal(await page.locator('img[src*="evil.example"]').count(),0);
    await fs.mkdir(path.join(root,'test-results'),{recursive:true});
    await page.screenshot({path:path.join(root,'test-results','synthetic-iphone.png'),fullPage:true});
    const real=path.join(root,'private','spinal-vascular.nalecture');
    try{
      await fs.access(real);await page.goto(base);await page.getByLabel('Open local lecture').setInputFiles(real);await page.waitForSelector('#study-image:not([hidden])');
      await page.screenshot({path:path.join(root,'test-results','spinal-iphone.png'),fullPage:true});
      await page.setViewportSize({width:1280,height:950});await page.screenshot({path:path.join(root,'test-results','spinal-desktop.png'),fullPage:true});
    }catch(e){if(e.code!=='ENOENT')throw e;}
    // Exercise sign-in and password setup against a synthetic auth server only.
    const user={id:'11111111-1111-4111-8111-111111111111',email:'fixture@example.com',aud:'authenticated',role:'authenticated',email_confirmed_at:new Date().toISOString(),app_metadata:{},user_metadata:{},created_at:new Date().toISOString()},authRequests=[];
    const token=['eyJhbGciOiJIUzI1NiJ9',Buffer.from(JSON.stringify({sub:user.id,email:user.email,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'test-signature'].join('.');
    await page.route('https://mobile-auth-test.supabase.co/**',async route=>{
      const request=route.request(),url=new URL(request.url()),method=request.method();authRequests.push({path:url.pathname,method,body:request.postDataJSON()});
      let data={},status=200;
      if(url.pathname==='/auth/v1/otp'){status=429;data={msg:'email rate limit exceeded',code:'over_email_send_rate_limit'};}
      else if(url.pathname==='/auth/v1/token')data={access_token:token,refresh_token:'test-only-refresh',expires_in:3600,token_type:'bearer',user};
      else if(url.pathname==='/auth/v1/user')data=user;
      else if(url.pathname==='/rest/v1/mobile_members')data=[{email:user.email}];
      else if(url.pathname==='/rest/v1/mobile_lectures')data=[];
      else throw new Error('Unexpected test request: '+url.pathname);
      await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
    });
    await page.goto(base);await page.getByLabel('Email address',{exact:true}).fill(user.email);await page.getByRole('button',{name:'Email me a sign-in link'}).click();
    await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('sending limit'));
    await page.getByRole('button',{name:'Use a password instead'}).click();await page.getByLabel('Password',{exact:true}).fill('fixture-login-only');await page.getByRole('button',{name:'Sign in',exact:true}).click();
    await page.getByText('Account access',{exact:true}).waitFor();await page.getByText('Account access',{exact:true}).click();
    await page.getByLabel('New password',{exact:true}).fill('fixture-new-password');await page.getByLabel('Confirm new password',{exact:true}).fill('fixture-wrong-password');await page.getByRole('button',{name:'Save password'}).click();
    assert.equal(authRequests.some(r=>r.path==='/auth/v1/user'&&r.method==='PUT'),false);
    await page.getByLabel('Confirm new password',{exact:true}).fill('fixture-new-password');await page.getByRole('button',{name:'Save password'}).click();
    await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('Password saved'));
    assert.equal(authRequests.find(r=>r.path==='/auth/v1/user'&&r.method==='PUT').body.password,'fixture-new-password');
    assert.equal(await page.getByLabel('New password',{exact:true}).inputValue(),'');
    assert.equal(authRequests.filter(r=>r.path==='/rest/v1/mobile_members').length>=2,true);
    await page.reload();await page.getByText('Account access',{exact:true}).waitFor();
    assert.equal(await page.getByRole('button',{name:'Sign out',exact:true}).isVisible(),true);
    assert.deepEqual(errors,[]);
    console.log('PASS mobile images, audio, timing, caption safety, real package rendering, email-limit feedback, password sign-in, member-only password setup and session persistence after reload.');
  }finally{await browser?.close();child.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
