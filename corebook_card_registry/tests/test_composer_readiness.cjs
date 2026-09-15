const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.resolve(__dirname,'../../edge_radprimer_extension/chatgpt-paster.js'),'utf8');
const code=source.slice(source.indexOf('  const getComposerText ='),source.indexOf('  const parseChatGptProjectRoute ='));
function setup() {
  let clock=0,current={innerText:'',isConnected:true},tick=()=>{};
  const fills=[];
  const context=vm.createContext({Date:{now:()=>clock},getComposerEditor:()=>current,
    waitForComposerEditor:async()=>current,
    waitFor:async(fn,timeout,interval)=>{const end=clock+timeout;while(clock<end){tick(clock);const value=fn();if(value)return value;clock+=interval;}return null;},
    clearAndFillComposer:async(editor,text,fast)=>{fills.push(fast);editor.innerText=text;}
  });
  vm.runInContext(code+'\nglobalThis.api={composerLooksFilled,waitForCompleteComposer,fillVerifiedComposer};',context);
  return {context,fills,get current(){return current},set current(value){current=value},get clock(){return clock},set tick(fn){tick=fn}};
}
(async()=>{
  const env=setup(), check=env.context.api.composerLooksFilled;
  const short='RADPRIMER_MULTIPART_PROMPT_FINALIZE\n\nSession: run\nParts sent: 6/6\n\nReturn the final output.';
  assert(check({innerText:short.replaceAll('\n','\n\n')},short));
  assert(check({tagName:'TEXTAREA',value:short.replaceAll('\n','\r\n')},short));
  assert(check({innerText:'a\u00a0 b\n\nμ <img src="arrow_WS.png">'},'a b\tμ <img src="arrow_WS.png">'));
  assert(!check({innerText:short.replace('6/6','5/6')},short));
  const long='Start\n'+('Complete source with unique objective. '.repeat(3000))+'\nEnd';
  assert(!check({innerText:long.slice(0,Math.floor(long.length*0.9))},long),'Truncated large prompts must not pass');
  assert(!check({innerText:long.replace('unique objective','wrong objective')},long),'Same start/end does not prove the middle survived');
  assert(!check({innerText:'unrelated '.repeat(1000)},long),'Substantial unrelated text must not pass');

  const original=env.current;
  env.tick=time=>{
    if(time===300) { original.isConnected=false;env.current={innerText:'still loading',isConnected:true}; }
    if(time===900) env.current.innerText=short.replaceAll('\n','\n\n');
  };
  const ready=await env.context.api.fillVerifiedComposer(original,short,true);
  assert.equal(ready,env.current);assert.notEqual(ready,original);
  assert(env.clock>=1500,'Wait for a stable complete replacement, not the detached original');
  assert.deepEqual(env.fills,[true]);

  const retry=setup();let retries=0;
  retry.context.clearAndFillComposer=async(editor,text,fast)=>{
    retry.fills.push(fast);editor.innerText=fast?text.slice(0,20):text;
  };
  assert.equal(await retry.context.api.fillVerifiedComposer(retry.current,short,true,()=>retries++),retry.current);
  assert.deepEqual(retry.fills,[true,false]);assert.equal(retries,1);
  const stuck=setup();
  stuck.context.clearAndFillComposer=async(editor,_,fast)=>{stuck.fills.push(fast);editor.innerText='partial';};
  await assert.rejects(stuck.context.api.fillVerifiedComposer(stuck.current,short,true),/complete prompt after retrying/);
  assert.deepEqual(stuck.fills,[true,false],'Bounded recovery must not keep submitting retries');
  console.log('Composer readiness: paragraph/CRLF/NBSP normalization, full-text integrity, delayed replacement, native-input retry and persistent truncation blocking passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
