import {fit, constrain, zoomAt, resizeCamera} from './zoom.js';

export function createImageViewer(dialog, actions) {
  dialog.setAttribute('aria-label','Full-screen case viewer');
  dialog.innerHTML=`<header class="viewer-header"><p id="viewer-title"></p><div class="viewer-navigation">
    <button id="viewer-previous" aria-label="Previous image">←</button><span id="viewer-count"></span><button id="viewer-next" aria-label="Next image">→</button>
    <button id="viewer-variant" aria-label="Show annotated image"></button><button id="viewer-tools-toggle" aria-expanded="false" aria-controls="viewer-options">Tools</button><button id="viewer-close" aria-label="Close image ×">×</button></div></header>
    <section id="viewer-options" aria-label="Image and playback tools" hidden><div class="viewer-options-heading"><strong>Image & playback</strong><button id="viewer-tools-close" aria-label="Close tools">Done</button></div>
    <p class="viewer-help">Tap the image to hide or show controls. Pinch or double-tap to zoom; drag to inspect.</p><div class="viewer-tools"><div class="viewer-group"><button id="viewer-plain">Plain</button><button id="viewer-annotated">Annotated</button></div><button id="viewer-captions">Image captions</button><div class="viewer-group"><button id="viewer-out" aria-label="Zoom out">−</button><button id="viewer-fit">Fit</button><button id="viewer-original" title="One source pixel per CSS pixel">100%</button><button id="viewer-in" aria-label="Zoom in">+</button></div></div><p id="viewer-resolution"></p><div id="viewer-audio-tools"></div></section>
    <div class="viewer-body"><div class="viewer-image-column"><div class="viewer-stage" tabindex="0" role="group" aria-label="Image inspection: tap to hide controls, pinch to zoom, drag to pan, double-tap to zoom"><img id="viewer-image" alt="" draggable="false"><span id="viewer-loading" role="status">Loading original image…</span></div></div><aside class="viewer-caption" aria-label="Original image caption" hidden><div id="viewer-caption-body"></div><p id="viewer-relationship"></p><a id="viewer-source" target="_blank" rel="noopener noreferrer">Open original source ↗</a></aside></div>
    <footer id="viewer-player"><div id="viewer-subtitles"></div><div class="viewer-timeline"><span id="viewer-elapsed">0:00</span><input id="viewer-seek" type="range" min="0" max="0" step="0.1" value="0" aria-label="Lecture position"><span id="viewer-duration">0:00</span><span id="viewer-cc"></span></div><div class="viewer-dock"><button id="viewer-rewind" aria-label="Back 5 seconds" disabled>−5s</button><button id="viewer-play" aria-label="Play lecture" disabled>▶</button><button id="viewer-forward" aria-label="Forward 5 seconds" disabled>+5s</button><select id="viewer-speed" aria-label="Playback speed" title="Playback speed" disabled></select><div id="viewer-card-slot"></div><button id="viewer-controls" aria-label="Hide controls" aria-expanded="true">Hide</button></div><p id="viewer-play-error" role="alert" hidden></p></footer>`;
  const $=id=>dialog.querySelector('#'+id),stage=dialog.querySelector('.viewer-stage'),img=$('viewer-image');
  let data={},camera=null,dimensions=null,player=null,placeholder=null,sourceVersion=0,lastTap=null,tapTimer=null,paintedView=null;
  let controlsShown=true,audioEvents=null,media=null,movedControls=[],savedPage=null;
  const pointers=new Map();let gesture=null,dragStart=null,moved=false,pressedAt=0;
  const viewport=()=>({width:stage.clientWidth,height:stage.clientHeight});
  const point=e=>{const r=stage.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};};
  function paint(){if(!camera)return;paintedView=viewport();img.style.width=dimensions.width+'px';img.style.height=dimensions.height+'px';img.style.transform=`translate(${camera.x}px,${camera.y}px) scale(${camera.scale})`;
    $('viewer-resolution').textContent=`${Math.round(camera.scale*100)}% · ${dimensions.width} × ${dimensions.height} original`;
    $('viewer-out').disabled=camera.scale<=fit(viewport(),dimensions)+0.0001;
  }
  function reset(){if(!dimensions||!stage.clientWidth||!stage.clientHeight)return;camera=constrain({scale:fit(viewport(),dimensions),x:0,y:0},viewport(),dimensions);paint();}
  function zoom(scale,anchor={x:stage.clientWidth/2,y:stage.clientHeight/2}){if(!camera)return;camera=zoomAt(camera,scale,anchor,viewport(),dimensions);paint();}
  function doubleTap(p){if(camera)zoom(camera.scale>fit(viewport(),dimensions)*1.1?fit(viewport(),dimensions):camera.scale*2.5,p);}
  function cancelTap(){clearTimeout(tapTimer);tapTimer=null;lastTap=null;}
  // Controls are a separate gesture surface: a prior image tap must not hide
  // them or close Tools after a user has already touched a control.
  dialog.addEventListener('pointerdown',e=>{if(!stage.contains(e.target))cancelTap();},{capture:true});
  function lockPage(){savedPage={x:window.scrollX,y:window.scrollY};document.body.style.setProperty('--viewer-page-top',`${-savedPage.y}px`);document.documentElement.classList.add('viewer-open');document.body.classList.add('viewer-open');}
  function unlockPage(){if(!savedPage)return;const position=savedPage;savedPage=null;document.body.classList.remove('viewer-open');document.documentElement.classList.remove('viewer-open');document.body.style.removeProperty('--viewer-page-top');window.scrollTo(position.x,position.y);}
  function showTools(show){$('viewer-options').hidden=!show;$('viewer-tools-toggle').setAttribute('aria-expanded',String(show));}
  function showControls(show){controlsShown=show;showTools(false);dialog.classList.toggle('controls-hidden',!show);
    $('viewer-controls').textContent=show?'Hide':'Show';$('viewer-controls').setAttribute('aria-label',show?'Hide controls':'Show controls');$('viewer-controls').setAttribute('aria-expanded',String(show));
    if(!show&&document.activeElement!==stage&&document.activeElement!==$('viewer-controls'))$('viewer-controls').focus({preventScroll:true});
  }
  function tap(p){const now=performance.now();if(lastTap&&now-lastTap.time<330&&Math.hypot(p.x-lastTap.x,p.y-lastTap.y)<30){cancelTap();doubleTap(p);}
    else{cancelTap();lastTap={...p,time:now};tapTimer=setTimeout(()=>{lastTap=null;tapTimer=null;if(!dialog.open)return;if(!$('viewer-options').hidden)showTools(false);else showControls(!controlsShown);},330);}
  }
  function beginGesture(){const p=[...pointers.values()];if(p.length>=2&&camera){cancelTap();gesture={camera:{...camera},mid:{x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2},distance:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)};moved=true;}else{gesture=null;dragStart=p[0]&&camera?{point:p[0],camera:{...camera}}:null;}}
  stage.onpointerdown=e=>{if(!camera||e.button>0)return;stage.setPointerCapture(e.pointerId);pointers.set(e.pointerId,point(e));if(pointers.size===1){moved=false;pressedAt=performance.now();}beginGesture();};
  stage.onpointermove=e=>{if(!pointers.has(e.pointerId)||!camera)return;const p=point(e);pointers.set(e.pointerId,p);if(gesture&&pointers.size>=2){const pts=[...pointers.values()],mid={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2},distance=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
      const scale=gesture.camera.scale*distance/Math.max(gesture.distance,1),v=viewport();
      const bounded=constrain({...gesture.camera,scale},v,dimensions).scale,ratio=bounded/gesture.camera.scale;
      camera=constrain({scale:bounded,x:mid.x-(gesture.mid.x-gesture.camera.x)*ratio,y:mid.y-(gesture.mid.y-gesture.camera.y)*ratio},v,dimensions);
    }else if(dragStart){const dx=p.x-dragStart.point.x,dy=p.y-dragStart.point.y;if(Math.hypot(dx,dy)>5){moved=true;cancelTap();}camera=constrain({...camera,x:dragStart.camera.x+dx,y:dragStart.camera.y+dy},viewport(),dimensions);}paint();};
  function release(e){if(!pointers.has(e.pointerId))return;const p=pointers.get(e.pointerId),isTap=e.type==='pointerup'&&!moved&&pointers.size===1&&performance.now()-pressedAt<500;pointers.delete(e.pointerId);if(isTap)tap(p);else cancelTap();beginGesture();}
  stage.onpointerup=release;stage.onpointercancel=release;stage.onlostpointercapture=release;
  stage.addEventListener('wheel',e=>{if(!camera)return;e.preventDefault();cancelTap();zoom(camera.scale*Math.exp(-e.deltaY*0.002),point(e));},{passive:false});
  $('viewer-in').onclick=()=>zoom(camera?.scale*1.5);$('viewer-out').onclick=()=>zoom(camera?.scale/1.5);$('viewer-fit').onclick=reset;$('viewer-original').onclick=()=>zoom(1);
  $('viewer-previous').onclick=()=>actions.navigate(-1);$('viewer-next').onclick=()=>actions.navigate(1);
  for(const v of ['plain','annotated'])$('viewer-'+v).onclick=()=>actions.variant(v);
  $('viewer-variant').onclick=()=>actions.variant(data.variant==='annotated'?'plain':'annotated');
  $('viewer-captions').onclick=()=>actions.captions(!data.captions);
  $('viewer-close').onclick=()=>dialog.close();$('viewer-controls').onclick=()=>{cancelTap();showControls(!controlsShown);};
  $('viewer-tools-toggle').onclick=()=>showTools($('viewer-options').hidden);$('viewer-tools-close').onclick=()=>{showTools(false);$('viewer-tools-toggle').focus();};
  const clock=seconds=>Number.isFinite(seconds)?`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`:'0:00';
  function syncPlayback(){const ready=media&&!media.hidden&&Number.isFinite(media.duration)&&media.duration>0;
    for(const id of ['viewer-play','viewer-seek','viewer-rewind','viewer-forward','viewer-speed'])$(id).disabled=!ready;dialog.classList.toggle('viewer-no-audio',!ready);
    if(media){$('viewer-speed').value=String(media.playbackRate);const original=player?.querySelector('#speed');if(original)original.value=String(media.playbackRate);}
    $('viewer-play').textContent=media&&!media.paused?'Ⅱ':'▶';$('viewer-play').setAttribute('aria-label',media&&!media.paused?'Pause lecture':'Play lecture');
    $('viewer-seek').max=String(ready?media.duration:0);$('viewer-seek').value=String(ready?media.currentTime:0);
    $('viewer-seek').setAttribute('aria-valuetext',`${clock(media?.currentTime)} of ${clock(media?.duration)}`);
    $('viewer-elapsed').textContent=clock(media?.currentTime);$('viewer-duration').textContent=clock(media?.duration);
  }
  $('viewer-play').onclick=async()=>{if(!media)return;const error=$('viewer-play-error');error.hidden=true;try{if(media.paused)await media.play();else media.pause();}catch(e){error.textContent=e.message||'Playback could not start. Open Tools to retry with the audio controls.';error.hidden=false;}syncPlayback();};
  $('viewer-seek').oninput=()=>{if(media&&Number.isFinite(media.duration)){media.currentTime=Math.max(0,Math.min(media.duration,Number($('viewer-seek').value)));syncPlayback();}};
  function skip(seconds){if(media&&!media.hidden&&Number.isFinite(media.duration)){media.currentTime=Math.max(0,Math.min(media.duration,media.currentTime+seconds));syncPlayback();}}
  $('viewer-rewind').onclick=()=>skip(-5);$('viewer-forward').onclick=()=>skip(5);
  $('viewer-speed').onchange=()=>{const original=player?.querySelector('#speed');if(!original||!media)return;original.value=$('viewer-speed').value;original.dispatchEvent(new Event('change',{bubbles:true}));syncPlayback();};
  function movePlayer(move){const audio=player?.querySelector('audio'),playing=audio&&!audio.paused;move();if(playing)void audio.play().catch(()=>{});}
  function moveControl(id,target){const node=player?.querySelector('#'+id);if(!node)return;const mark=document.createComment(id+' position');node.before(mark);movedControls.push({node,mark});target.append(node);}
  function restore(){cancelTap();audioEvents?.abort();audioEvents=null;
    for(const {node,mark} of movedControls)if(mark.isConnected)mark.replaceWith(node);movedControls=[];
    if(player&&placeholder?.isConnected)movePlayer(()=>placeholder.replaceWith(player));player=null;placeholder=null;media=null;unlockPage();pointers.clear();gesture=null;showTools(false);
  }
  dialog.addEventListener('close',()=>{if(!dialog.open)restore();});
  dialog.addEventListener('cancel',e=>{if(!$('viewer-options').hidden){e.preventDefault();showTools(false);$('viewer-tools-toggle').focus();}});
  dialog.addEventListener('keydown',e=>{if(/INPUT|SELECT|TEXTAREA|AUDIO/.test(e.target.tagName))return;
    if(e.target===stage&&(e.key==='Enter'||e.key===' ')){e.preventDefault();showControls(!controlsShown);return;}
    const act={'ArrowLeft':()=>actions.navigate(-1),'ArrowRight':()=>actions.navigate(1),'+':()=>zoom(camera?.scale*1.5),'=':()=>zoom(camera?.scale*1.5),'-':()=>zoom(camera?.scale/1.5),'0':reset}[e.key];if(act){e.preventDefault();act();}});
  new ResizeObserver(()=>{if(dialog.open&&dimensions&&stage.clientWidth&&stage.clientHeight){camera=resizeCamera(camera,paintedView,viewport(),dimensions);paint();}}).observe(stage);
  function update(next){const changed=data.key!==next.key;data=next;if(changed){camera=null;dimensions=null;paintedView=null;cancelTap();pointers.clear();gesture=null;}
    $('viewer-title').textContent=next.title||'';$('viewer-count').textContent=(next.count||'').replace(/\s/g,'');
    $('viewer-previous').disabled=!next.previous;$('viewer-next').disabled=!next.next;
    for(const v of ['plain','annotated']){$('viewer-'+v).disabled=!next.variants?.includes(v);$('viewer-'+v).setAttribute('aria-pressed',String(next.variant===v));}
    $('viewer-variant').textContent=next.variant==='annotated'?'Annotated':'Plain';$('viewer-variant').setAttribute('aria-pressed',String(next.variant==='annotated'));$('viewer-variant').setAttribute('aria-label',next.variant==='annotated'?'Show plain image':'Show annotated image');$('viewer-variant').disabled=(next.variants?.length||0)<2;
    $('viewer-captions').setAttribute('aria-pressed',String(next.captions));dialog.querySelector('.viewer-caption').hidden=!next.captions;
    $('viewer-caption-body').replaceChildren(globalThis.VisualLectureCaptions.render(next.caption||'No source caption supplied.'));
    $('viewer-relationship').textContent=next.relationship||'';$('viewer-source').hidden=!next.source;if(next.source)$('viewer-source').href=next.source;
    if(changed||!next.src){sourceVersion++;img.hidden=true;img.removeAttribute('src');$('viewer-loading').hidden=false;$('viewer-loading').textContent='Loading original image…';$('viewer-resolution').textContent='Original resolution · no image cropping';}
    if(next.src&&img.getAttribute('src')!==next.src){const serial=++sourceVersion;img.hidden=true;$('viewer-loading').hidden=false;img.alt=next.alt;
      img.onload=()=>{if(serial!==sourceVersion)return;const same=dimensions?.width===img.naturalWidth&&dimensions?.height===img.naturalHeight;dimensions={width:img.naturalWidth,height:img.naturalHeight};img.hidden=false;$('viewer-loading').hidden=true;if(!same||!camera)reset();else {camera=constrain(camera,viewport(),dimensions);paint();}};
      img.onerror=()=>{if(serial===sourceVersion)$('viewer-loading').textContent='Image unavailable. Close and reopen the image to retry.';};img.src=next.src;
    }
  }
  return {update,open(audioPlayer){if(dialog.open)return;lockPage();player=audioPlayer;placeholder=document.createComment('audio player position');player.before(placeholder);movePlayer(()=>$('viewer-audio-tools').append(player));
    moveControl('subtitle-toggle',$('viewer-cc'));moveControl('narration-subtitle',$('viewer-subtitles'));
    $('viewer-speed').replaceChildren(...[...(player.querySelector('#speed')?.options||[])].map(option=>option.cloneNode(true)));
    media=player.querySelector('audio');audioEvents=new AbortController();for(const event of ['timeupdate','seeking','seeked','ratechange','play','pause','ended','loadedmetadata','durationchange','emptied','error'])media?.addEventListener(event,syncPlayback,{signal:audioEvents.signal});
    showControls(true);syncPlayback();$('viewer-play-error').hidden=true;dialog.showModal();reset();
  },close(){if(dialog.open){dialog.close();restore();}},get isOpen(){return dialog.open;}};
}
