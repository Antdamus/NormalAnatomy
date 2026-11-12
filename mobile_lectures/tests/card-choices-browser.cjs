// Isolated synthetic accounts and media; no production account or card creation.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),{spawn}=require('node:child_process'),{chromium,webkit}=require('playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),base='http://127.0.0.1:4183',api='https://choices-fixture.test',safari=process.env.TEST_BROWSER==='webkit';
 const server=spawn(process.execPath,[path.join(root,'node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','4183','--strictPort'],{cwd:root,stdio:'pipe',windowsHide:true,env:{...process.env,VITE_SUPABASE_URL:api,VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture'}});
 let browser;
 try{
  for(let i=0;i<60;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,150));}
  const {fixture}=await import('./fixture.mjs'),{Review:R,Transfer:T}=await import('../src/card-choices.js'),f=await fixture();
  const user={id:'11111111-1111-4111-8111-111111111111',email:'fixture@example.test',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}},token=['eyJhbGciOiJIUzI1NiJ9',Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'fixture'].join('.');
  const row={fingerprint:f.manifest.fingerprint,manifest:f.manifest,title:'Synthetic choices',case_count:2,audio:null,timing:null,card_choices:null,card_revision:0};let failNext=false,patches=0;const errors=[];
  browser=await(safari?webkit.launch({headless:true}):chromium.launch({channel:'msedge',headless:true}));
  async function page(){const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'}),p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
    await p.route(api+'/**',async route=>{const req=route.request(),url=new URL(req.url());let data;
      if(url.pathname==='/auth/v1/token')data={access_token:token,refresh_token:'fixture',expires_in:3600,token_type:'bearer',user};
      else if(url.pathname==='/auth/v1/user')data=user;
      else if(url.pathname==='/rest/v1/mobile_members')data=[{email:user.email}];
      else if(url.pathname==='/rest/v1/mobile_progress')data=req.method()==='GET'?null:[];
      else if(url.pathname==='/rest/v1/mobile_lectures'){
        if(req.method()==='PATCH'){
          if(failNext){failNext=false;await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Temporary fixture failure'})});return;}
          const change=req.postDataJSON();assert.deepEqual(Object.keys(change).sort(),['card_choices','card_revision']);
          if(url.searchParams.get('card_revision')==='eq.'+row.card_revision){Object.assign(row,change);patches++;data=[{card_revision:row.card_revision}];}else data=[];
        }else data=url.searchParams.has('fingerprint')?row:[row];
      }else if(url.pathname.startsWith('/storage/v1/object/sign/')){
        if(req.method()==='POST')data={signedURL:url.pathname.replace('/storage/v1','')+'?token=fixture'};
        else{await route.fulfill({contentType:'image/png',body:Buffer.from(Object.values(f.files)[0])});return;}
      }else throw new Error('Unexpected test request '+url.pathname);
      await route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
    });
    await p.goto(base);await p.getByLabel('Email address',{exact:true}).fill(user.email);await p.getByLabel('Password',{exact:true}).fill('fixture-only-password');await p.getByRole('button',{name:'Sign in',exact:true}).click();await p.locator('.lecture-card').click();await p.locator('#card-toggle').waitFor();return p;
  }
  const phone=await page(),tablet=await page();
  // Import existing desktop selection/objective, then add a cross-case link.
  let desktop=R.update(R.empty(f.manifest.lesson.id),f.manifest.lesson,'TEST-1',{decision:'cards',role:'normal',objective:'Existing desktop objective'});
  await phone.locator('#card-choices summary').first().click();await phone.getByLabel('Import desktop choices').setInputFiles({name:'choices.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(T.create(f.manifest.lesson,row.fingerprint,desktop,desktop)))});
  await phone.waitForFunction(()=>document.querySelector('#card-toggle').getAttribute('aria-pressed')==='true');
  await phone.locator('#focus-view').click();await phone.locator('#viewer-card-link').click();await phone.locator('input[data-image="TEST-2"]').check();
  for(const [name,width,height] of [['iphone',390,844],['small-phone',320,568],['ipad',820,1180],['landscape',844,390]]){
    await phone.setViewportSize({width,height});assert.equal(await phone.locator('#card-link-dialog').evaluate(d=>d.scrollWidth>d.clientWidth+1),false,name);
    await fs.mkdir(path.join(root,'test-results'),{recursive:true});await phone.screenshot({path:path.join(root,'test-results',`card-links-${safari?'webkit-':''}${name}.png`)});
  }
  await phone.locator('#card-link-save').click();await phone.locator('#card-link-dialog').waitFor({state:'hidden'});assert.equal(row.card_choices.review.manualGroups.length,1);assert.equal(R.summary(row.card_choices.review,f.manifest.lesson).cards,2);
  await phone.getByRole('button',{name:'Close image ×'}).click();
  // A stale device gets an explicit conflict, preserving every saved choice.
  await tablet.locator('#card-toggle').click();await tablet.waitForFunction(()=>document.querySelector('#notice').textContent.includes('another device'));
  assert.equal(row.card_revision,2);await tablet.locator('#card-choices summary').first().click();await tablet.locator('#card-refresh').click();await tablet.waitForFunction(()=>document.querySelector('#card-choice-count').textContent.startsWith('2 images'));
  const download=phone.waitForEvent('download');await phone.locator('#card-export').click();const file=await download,value=JSON.parse(await fs.readFile(await file.path(),'utf8'));
  desktop=T.importDesktop(value,f.manifest.lesson,row.fingerprint,desktop);assert.equal(desktop.images['TEST-1'].objective,'Existing desktop objective');assert.equal(desktop.manualGroups.length,1);assert.deepEqual(value.selection.linkedImageGroups[0].imageIds,['TEST-1','TEST-2']);
  // Removing an explicit link leaves selections intact, then a failed save leaves state intact.
  await phone.locator('#card-link').click();await phone.locator('#card-unlink').click();await phone.locator('#card-link-dialog').waitFor({state:'hidden'});assert.equal(row.card_choices.review.manualGroups.length,0);assert.equal(R.summary(row.card_choices.review,f.manifest.lesson).cards,2);
  failNext=true;await phone.locator('#card-toggle').click();await phone.waitForFunction(()=>document.querySelector('#card-choice-status').textContent.includes('Not saved'));assert.equal(await phone.locator('#card-toggle').getAttribute('aria-pressed'),'true');assert.equal(patches,3);
  await phone.reload();await phone.waitForFunction(()=>document.querySelector('#card-choice-count')?.textContent.startsWith('2 images'));assert.deepEqual(errors,[]);
  console.log(`PASS ${safari?'WebKit':'Edge'} phone/tablet selections, grouping, paired identity, desktop round trip, stale-device conflicts, failed-save preservation, four picker layouts and reload.`);
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
