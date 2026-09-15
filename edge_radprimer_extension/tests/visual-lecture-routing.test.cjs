const assert = require('node:assert/strict');
const nodeTest = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const fixture = require('./visual-lecture-fixture.cjs');
const test = (name, run) => nodeTest(name, {skip: fixture.available() ? false : 'Private study fixtures are local only; see README.md.'}, run);

// Run the real worker and message handlers with browser APIs simulated at their boundary.
function setup() {
  const {lesson} = fixture();
  const root = path.resolve(__dirname, '..'), listeners = [], effects = [], commands = [];
  const extension = 'chrome-extension://test/';
  const radprimer = {id:1, windowId:1, url:'https://app.radprimer.com/document/one', active:false};
  const statdx = {id:2, windowId:1, url:'https://app.statdx.com/document/one', active:false};
  const reader = {id:3, windowId:2, url:'https://app.speechify.com/item/clean', active:true};
  const organizer = {id:4, windowId:1, url:extension+'visual-lecture.html?lesson='+lesson.id, active:true};
  const tabs = [radprimer, statdx, reader, organizer];
  const section = {imageNumber:2, sourceKind:'statdx', label:'STATdx image 2', highlightAvailable:true, source:'explicit-live-image'};
  const state = {available:true, isPlaying:true, title:lesson.speechifyTitle, url:reader.url,
    readerTextSample:lesson.narration.text.slice(0,1800), lectureSection:section,
    liveContext:{live:true,text:lesson.narration.segments[0].text.slice(0,350)}};
  const states = new Map([[reader.id, state]]), lessons = new Map([[lesson.id,lesson]]);
  const settings = {radprimerRunnerSettings:{speechifyKeepAwake:true}};
  const event = () => ({addListener:()=>{}});
  const context = vm.createContext({console, URL, AbortController, setTimeout, clearTimeout,
    crypto:require('node:crypto').webcrypto,
    chrome:{runtime:{getURL:name=>extension+name,onMessage:{addListener:fn=>listeners.push(fn)}},
      storage:{local:{get:async()=>settings}},
      tabs:{onRemoved:event(),query:async filter=>{
        const patterns = Array.isArray(filter.url) ? filter.url : [filter.url];
        return tabs.filter(tab=>patterns.some(pattern=>new RegExp('^'+pattern.replace(/[.+?^${}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*')+'$').test(tab.url)));
      },get:async id=>tabs.find(tab=>tab.id===id),update:async(id,change)=>{
        effects.push({kind:'tab',id,change});return {...tabs.find(tab=>tab.id===id),...change};
      },sendMessage:async(id,message)=>{effects.push({kind:'message',id,message});return {ok:true};}},
      windows:{get:async id=>({id,type:'normal',state:'normal'}),update:async(id,change)=>effects.push({kind:'window',id,change}),
        create:async change=>{effects.push({kind:'window-create',change});return {id:8,tabs:[reader]};}},
      scripting:{executeScript:async change=>effects.push({kind:'script',change})},
      downloads:{onDeterminingFilename:event(),onCreated:event()}}
  });
  context.importScripts=(...names)=>names.forEach(name=>vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),context));
  vm.runInContext(fs.readFileSync(path.join(root,'service_worker.js'),'utf8'),context);
  context.VisualLectureStore={get:async id=>lessons.get(id),put:async value=>lessons.set(value.id,value)};
  context.sendSpeechifyMessageWithInjection=async(id,message)=>{
    commands.push({id,...message});
    const value=states.get(id);
    if (!value) return {ok:false,error:'No reader'};
    if (message.action==='playPause') value.isPlaying=!value.isPlaying;
    if (message.action==='play' || message.action==='pause') value.isPlaying=message.action==='play';
    return {ok:true,result:{...value}};
  };
  context.rememberArticleSourceTab(radprimer);
  const dispatch=(message,tab)=>new Promise(resolve=>{
    assert.ok(listeners.some(fn=>fn(message,{tab,url:tab.url},resolve)===true),'Message must be handled');
  });
  return {context,lesson,reader,organizer,radprimer,statdx,tabs,state,section,states,lessons,settings,effects,commands,dispatch};
}

test('source polling and playback never move tabs or publish image cues for an open visual lecture',async()=>{
  const env=setup();
  for (const source of [env.radprimer,env.statdx]) {
    // Both cold-worker and preferred-reader paths, including explicit playback controls.
    for (const action of ['state','state','pause','play','back10','forward10']) {
      const response=await env.dispatch({type:'SPEECHIFY_PLAYER_REMOTE',payload:{action}},source);
      assert.equal(response.ok,true,response.error);
      assert.equal(response.result.sourceFollowSuppressed,true);
      assert.equal(response.result.lectureSection,null);
    }
  }
  assert.deepEqual(env.effects,[],'No focus changes, source scripts, or keep-awake windows');
  const visual=await env.dispatch({type:'VISUAL_LECTURE_PLAYER',id:env.lesson.id,action:'state'},env.organizer);
  assert.equal(visual.ok,true,visual.error);
  assert.equal(visual.result.lectureSection.imageNumber,2,'Organizer keeps the live image cue');
  assert.equal(visual.result.liveContext.text,env.state.liveContext.text);
});

test('first playback command after a worker restart does not run source keep-awake/refocus',async()=>{
  const env=setup();
  const result=await env.dispatch({type:'SPEECHIFY_PLAYER_REMOTE',payload:{action:'playPause'}},env.statdx);
  assert.equal(result.ok,true,result.error);
  assert.equal(result.result.sourceFollowSuppressed,true);
  assert.deepEqual(env.effects,[]);
});

test('Speechify button refocus stays suppressed while paused or the organizer is in the background',async()=>{
  const env=setup();env.organizer.active=false;env.state.isPlaying=false;
  const result=await env.dispatch({type:'RADPRIMER_REFOCUS_SOURCE_TAB',reason:'speechify-player-click'},env.reader);
  assert.equal(result.result.organizerTabId,env.organizer.id);
  assert.equal(result.result.sourceFollowSuppressed,true);
  assert.deepEqual(env.effects,[]);
});

test('Speechify shortcuts control the matched reader without replaying keys on source pages',async()=>{
  const env=setup();
  for (const [key,action] of [['P','playPause'],['ArrowLeft','back10'],['ArrowRight','forward10'],['MediaPlayPause','playPause'],['x',null],['s',null]]) {
    const result=await env.dispatch({type:'RADPRIMER_RELAY_SOURCE_HOTKEY',event:{key}},env.reader);
    assert.equal(result.ok,true,result.error);
    assert.equal(result.result.action,action);
    if (action) assert.equal(env.commands.at(-1).action,action);
  }
  env.settings.statdxZoomShortcutSettings={playerBack10:'b'};
  env.context.rememberArticleSourceTab(env.statdx);
  const customized=await env.dispatch({type:'RADPRIMER_RELAY_SOURCE_HOTKEY',event:{key:'B'}},env.reader);
  assert.equal(customized.result.action,'back10');
  assert.ok(env.commands.every(command=>command.id===env.reader.id));
  assert.deepEqual(env.effects,[]);
});

for (const change of ['close organizer','leave organizer','different reader','same topic different content']) {
  test(`${change} restores ordinary source controls without a global setting`,async()=>{
    const env=setup();env.settings.radprimerRunnerSettings.speechifyKeepAwake=false;
    assert.equal((await env.context.sendSpeechifyPlayerRemote({action:'state'},env.radprimer)).sourceFollowSuppressed,true);
    if(change==='close organizer') env.tabs.splice(env.tabs.indexOf(env.organizer),1);
    if(change==='leave organizer') env.organizer.url='chrome-extension://test/visual-lecture.html';
    if(change==='different reader') {env.reader.url=env.state.url='https://app.speechify.com/item/ordinary';env.state.title='Other topic';}
    if(change==='same topic different content') {
      env.reader.url=env.state.url='https://app.speechify.com/item/unrelated';env.state.title=env.lesson.title;
      env.state.readerTextSample='Another lecture about this topic';env.state.liveContext=null;
    }
    const result=await env.context.sendSpeechifyPlayerRemote({action:'state'},env.radprimer);
    assert.notEqual(result.sourceFollowSuppressed,true);
    assert.equal(result.lectureSection.imageNumber,2);
    await env.dispatch({type:'RADPRIMER_REFOCUS_SOURCE_TAB'},env.reader);
    assert.ok(env.effects.some(e=>e.kind==='tab' && e.id===env.radprimer.id));
    env.effects.length=0;
    await env.dispatch({type:'RADPRIMER_RELAY_SOURCE_HOTKEY',event:{key:'x'}},env.reader);
    assert.ok(env.effects.some(e=>e.kind==='message' && e.message.type==='RADPRIMER_REPLAY_SOURCE_HOTKEY'));
  });
}

test('an ordinary reader in a second tab retains source controls while a visual reader is open',async()=>{
  const env=setup();env.settings.radprimerRunnerSettings.speechifyKeepAwake=false;
  const ordinary={id:9,windowId:2,url:'https://app.speechify.com/item/ordinary',active:true};
  env.tabs.push(ordinary);env.state.isPlaying=false;
  env.states.set(ordinary.id,{...env.state,title:'Ordinary lecture',url:ordinary.url,isPlaying:true,readerTextSample:'Different',liveContext:null});
  const result=await env.context.sendSpeechifyPlayerRemote({action:'state'},env.radprimer);
  assert.equal(result.title,'Ordinary lecture');assert.notEqual(result.sourceFollowSuppressed,true);
  await env.dispatch({type:'RADPRIMER_REFOCUS_SOURCE_TAB'},ordinary);
  assert.ok(env.effects.some(e=>e.kind==='tab' && e.id===env.radprimer.id));
  env.effects.length=0;
  await env.dispatch({type:'RADPRIMER_REFOCUS_SOURCE_TAB'},env.reader);
  assert.deepEqual(env.effects,[],'Refocus checks its own reader, not the global preferred player');
});

test('intentional source-image navigation is still available during a visual lecture',async()=>{
  const env=setup();
  const result=await env.dispatch({type:'RADPRIMER_NAVIGATE_SOURCE_IMAGE',sourceKind:'statdx',imageNumber:2},env.radprimer);
  assert.equal(result.ok,true,result.error);assert.equal(result.result.tabId,env.statdx.id);
  assert.ok(env.effects.some(e=>e.kind==='tab' && e.id===env.statdx.id));
});


test('an archived audio version stays isolated from source pages but cannot play as the current version',async()=>{
  const env=setup(),old=structuredClone(env.lesson);
  env.lesson.lectureHistory=[{narrationRevision:1,narration:old.narration,speechifyTitle:old.speechifyTitle,speechify:{readerUrl:env.reader.url,boundTitle:old.speechifyTitle}}];
  env.lesson.narrationRevision=2;env.lesson.speechifyTitle+=' · lecture 2';env.lesson.speechify={};
  const result=await env.dispatch({type:'RADPRIMER_REFOCUS_SOURCE_TAB'},env.reader);
  assert.equal(result.result.sourceFollowSuppressed,true);assert.deepEqual(env.effects,[]);
  const play=await env.dispatch({type:'VISUAL_LECTURE_PLAYER',id:env.lesson.id,action:'play'},env.organizer);
  assert.equal(play.ok,false);assert.ok(!env.commands.some(c=>c.action==='play'));
});
