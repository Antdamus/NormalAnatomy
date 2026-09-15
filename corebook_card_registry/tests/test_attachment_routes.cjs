const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const transport=require('../../edge_radprimer_extension/corebook-chatgpt-attachment.js');
const src=fs.readFileSync(path.resolve(__dirname,'../../edge_radprimer_extension/chatgpt-paster.js'),'utf8');
// Execute the real prompt and multipart orchestration, mocking only the UI/network boundaries.
const code=src.slice(src.indexOf('  const shouldUseMultipartPrompt ='),src.indexOf('  chrome.runtime.onMessage.addListener('));
const data={format:'entries-file-v1',snapshotId:'live',collectionIdentity:'profile',selectedCount:1,
  scope:'Corebook::GI::Liver',entries:[{entryId:'owned',question:'Question',answer:'a'.repeat(400000)}]};
const block='Policy\nBEGIN_COREBOOK_CARD_DATA\n'+JSON.stringify(data)+'\nEND_COREBOOK_CARD_DATA\n';
function setup({failUpload=false,removed=false,failPrompt=false,promptChanged=false}={}) {
  const events=[];let text='',attached=false;
  const ctx=vm.createContext({crypto:require('node:crypto').webcrypto,
    MULTIPART_PROMPT_THRESHOLD_CHARS:100000,MULTIPART_PROMPT_PART_CHARS:90000,
    CorebookChatGptAttachment:{...transport,attach:async file=>{
      events.push({kind:'attach',file});if(failUpload) throw Error('upload failed');attached=true;
    },attachmentState:()=>({ready:attached&&!removed})},
    sendProgress:()=>{},ensureChatGptProjectTarget:async()=>{},ensureNormalChatSurface:async()=>{},
    waitForComposerEditor:async()=>({}),getComposerEditor:()=>({}),getComposerForm:()=>({}),getSendButton:()=>({}),waitFor:()=>{},
    localStorage:{removeItem:()=>{}},fillVerifiedComposer:async(editor,value)=>{
      text=value;events.push({kind:'fill',text});if(failPrompt)throw Error('prompt did not settle');return editor;
    },
    composerLooksFilled:()=>!promptChanged,createOrUpdateOverlay:()=>{},createOrUpdateCompactStatus:()=>{},
    submitPrompt:async(_,__,check)=>{check();events.push({kind:'submit',text,attached});},
    activateCurrentTab:async()=>{},waitForFinalAssistantResponse:async()=>({text:'Acknowledgement or result'}),
    copyToClipboard:async()=>true,captureCardTsvDownload:async()=>({captured:true})});
  vm.runInContext(code+'\nglobalThis.testRun = runPrompt;',ctx);
  return {ctx,events};
}
(async()=>{
  let {ctx,events}=setup();
  const manual=await ctx.testRun({promptText:block+'Source',autoSubmit:false,waitForResult:false});
  assert.equal(manual.submitted,false);assert.equal(events.filter(e=>e.kind==='attach').length,1);
  assert.equal(events.filter(e=>e.kind==='submit').length,0);
  ({ctx,events}=setup());
  await ctx.testRun({promptText:block+'Source',autoSubmit:true,waitForResult:false});
  assert.deepEqual(events.map(e=>e.kind),['fill','attach','submit']);
  assert(events[2].attached);assert(events[0].text.length<10000);
  assert.deepEqual(JSON.parse(events[1].file.text),data);
  ({ctx,events}=setup());
  const source='Exact source <img src="arrow_WS.png">\n'.repeat(8000);
  const result=await ctx.testRun({promptText:block+source,autoSubmit:true,waitForResult:true,expectedOutputKind:'card_tsv_download'});
  assert(result.multipart.partCount>1);assert(result.auditDownload.captured);
  const uploads=events.filter(e=>e.kind==='attach'),sends=events.filter(e=>e.kind==='submit');
  assert.equal(uploads.length,1);assert.deepEqual(JSON.parse(uploads[0].file.text),data);
  assert(sends.slice(0,-1).every(e=>!e.attached));
  assert(sends.at(-1).attached);assert(sends.at(-1).text.includes('RADPRIMER_MULTIPART_PROMPT_FINALIZE'));
  const pieces=events.filter(e=>e.kind==='fill'&&e.text.startsWith('RADPRIMER_MULTIPART_PROMPT_PART'))
    .map(e=>e.text.slice(e.text.indexOf('\nBEGIN_')+1).split('\n').slice(1,-3).join('\n'));
  assert(pieces.join('').endsWith(source));
  for (const options of [{failUpload:true},{removed:true},{failPrompt:true},{promptChanged:true}]) {
    ({ctx,events}=setup(options));
    await assert.rejects(ctx.testRun({promptText:block+'Source',autoSubmit:true,waitForResult:false}),/upload failed|missing or not ready|prompt did not settle|prompt changed/);
    assert.equal(events.filter(e=>e.kind==='submit').length,0);
    if(options.failPrompt)assert.equal(events.filter(e=>e.kind==='attach').length,0);
  }
  ({ctx,events}=setup());ctx.CorebookChatGptAttachment=undefined;
  await assert.rejects(ctx.testRun({promptText:block+'Source',autoSubmit:true,waitForResult:false}),/Reload/);
  assert.equal(events.length,0);

  // A lost file must stop every retry path, including form/Enter fallbacks.
  let checks=0,clicks=0,forms=0,keys=0;
  const submitCtx=vm.createContext({getRunSnapshot:()=>({}),waitForSendButtonAfterTextInsertion:async()=>({click:()=>clicks++}),
    sendProgress:()=>{},waitForGenerationStart:async()=>false,clickLikeUser:()=>clicks++,
    submitComposerForm:()=>{forms++;return true;},pressEnterInComposer:()=>keys++});
  const submitCode=src.slice(src.indexOf('  const submitPrompt ='),src.indexOf('  const getVisibleStopButton ='));
  vm.runInContext(submitCode+'\nglobalThis.submitForTest=submitPrompt;',submitCtx);
  await assert.rejects(submitCtx.submitForTest({},false,()=>{if(++checks>1)throw Error('file removed');}),/file removed/);
  assert.equal(clicks,1);assert.equal(forms,0);assert.equal(keys,0);
  console.log('ChatGPT attachment routes: manual, send-only, multipart FINALIZE, exact source/file preservation, upload failure, missing helper and file-removal retry blocking passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
