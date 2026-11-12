import {fit, constrain, zoomAt} from './zoom.js';

export function createImageViewer(dialog, actions) {
  dialog.setAttribute('aria-label','Full-screen case viewer');
  dialog.innerHTML=`<header class="viewer-header"><div class="viewer-heading"><p id="viewer-title"></p><button id="viewer-close" aria-label="Close image ×">Close ×</button></div>
    <div class="viewer-tools"><div class="viewer-group"><button id="viewer-previous" aria-label="Previous image">←</button><span id="viewer-count"></span><button id="viewer-next" aria-label="Next image">→</button></div>
    <div class="viewer-group"><button id="viewer-plain">Plain</button><button id="viewer-annotated">Annotated</button></div>
    <button id="viewer-captions">Captions</button><div class="viewer-group"><button id="viewer-out" aria-label="Zoom out">−</button><button id="viewer-fit">Fit</button><button id="viewer-original" title="One source pixel per CSS pixel">100%</button><button id="viewer-in" aria-label="Zoom in">+</button></div></div></header>
    <div class="viewer-body"><div class="viewer-image-column"><div class="viewer-stage" tabindex="0" role="group" aria-label="Image inspection: pinch to zoom, drag to pan, double-tap to zoom"><img id="viewer-image" alt="" draggable="false"><span id="viewer-loading" role="status">Loading original image…</span></div><p id="viewer-resolution"></p></div><aside class="viewer-caption" aria-label="Original image caption" hidden><div id="viewer-caption-body"></div><p id="viewer-relationship"></p><a id="viewer-source" target="_blank" rel="noopener noreferrer">Open original source ↗</a></aside></div><div id="viewer-player"></div>`;
  const $=id=>dialog.querySelector('#'+id), stage=dialog.querySelector('.viewer-stage'), img=$('viewer-image');
  let data={}, camera=null, dimensions=null, player=null, placeholder=null, sourceVersion=0, lastTap=null;
  const pointers=new Map();let gesture=null, dragStart=null, moved=false;
  const viewport=()=>({width:stage.clientWidth,height:stage.clientHeight});
  const point=e=>{const r=stage.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};};
  function paint(){if(!camera)return;img.style.width=dimensions.width+'px';img.style.height=dimensions.height+'px';img.style.transform=`translate(${camera.x}px,${camera.y}px) scale(${camera.scale})`;
    $('viewer-resolution').textContent=`${Math.round(camera.scale*100)}% · ${dimensions.width} × ${dimensions.height} original · Pinch or + to zoom, drag to inspect`;
    $('viewer-out').disabled=camera.scale<=fit(viewport(),dimensions)+0.0001;
  }
  function reset(){if(!dimensions||!stage.clientWidth||!stage.clientHeight)return;camera=constrain({scale:fit(viewport(),dimensions),x:0,y:0},viewport(),dimensions);paint();}
  function zoom(scale,anchor={x:stage.clientWidth/2,y:stage.clientHeight/2}){if(!camera)return;camera=zoomAt(camera,scale,anchor,viewport(),dimensions);paint();}
  function doubleTap(p){if(camera)zoom(camera.scale>fit(viewport(),dimensions)*1.1?fit(viewport(),dimensions):camera.scale*2.5,p);}
  function beginGesture(){const p=[...pointers.values()];if(p.length>=2&&camera){gesture={camera:{...camera},mid:{x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2},distance:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)};moved=true;}else{gesture=null;dragStart=p[0]&&camera?{point:p[0],camera:{...camera}}:null;}}
  stage.onpointerdown=e=>{if(!camera||e.button>0)return;stage.setPointerCapture(e.pointerId);pointers.set(e.pointerId,point(e));if(pointers.size===1)moved=false;beginGesture();};
  stage.onpointermove=e=>{if(!pointers.has(e.pointerId)||!camera)return;const p=point(e);pointers.set(e.pointerId,p);if(gesture&&pointers.size>=2){const pts=[...pointers.values()],mid={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2},distance=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
      const scale=gesture.camera.scale*distance/Math.max(gesture.distance,1),v=viewport();
      // Translate the same image point under the moving pinch midpoint.
      const bounded=constrain({...gesture.camera,scale},v,dimensions).scale,ratio=bounded/gesture.camera.scale;
      camera=constrain({scale:bounded,x:mid.x-(gesture.mid.x-gesture.camera.x)*ratio,y:mid.y-(gesture.mid.y-gesture.camera.y)*ratio},v,dimensions);
    }else if(dragStart){const dx=p.x-dragStart.point.x,dy=p.y-dragStart.point.y;if(Math.hypot(dx,dy)>5)moved=true;camera=constrain({...camera,x:dragStart.camera.x+dx,y:dragStart.camera.y+dy},viewport(),dimensions);}paint();};
  function release(e){if(!pointers.has(e.pointerId))return;const p=pointers.get(e.pointerId),tap=e.type==='pointerup'&&e.pointerType==='touch'&&!moved&&pointers.size===1;pointers.delete(e.pointerId);if(tap){const now=performance.now();if(lastTap&&now-lastTap.time<320&&Math.hypot(p.x-lastTap.x,p.y-lastTap.y)<30){doubleTap(p);lastTap=null;}else lastTap={...p,time:now};}else lastTap=null;beginGesture();}
  stage.onpointerup=release;stage.onpointercancel=release;stage.onlostpointercapture=release;
  stage.ondblclick=e=>{if(e.pointerType!=='touch')doubleTap(point(e));};
  stage.addEventListener('wheel',e=>{if(!camera)return;e.preventDefault();zoom(camera.scale*Math.exp(-e.deltaY*0.002),point(e));},{passive:false});
  $('viewer-in').onclick=()=>zoom(camera?.scale*1.5);$('viewer-out').onclick=()=>zoom(camera?.scale/1.5);$('viewer-fit').onclick=reset;$('viewer-original').onclick=()=>zoom(1);
  $('viewer-previous').onclick=()=>actions.navigate(-1);$('viewer-next').onclick=()=>actions.navigate(1);
  for(const v of ['plain','annotated'])$('viewer-'+v).onclick=()=>actions.variant(v);
  $('viewer-captions').onclick=()=>actions.captions(!data.captions);
  $('viewer-close').onclick=()=>dialog.close();
  function movePlayer(move){const audio=player?.querySelector('audio'),playing=audio&&!audio.paused;move();if(playing)void audio.play().catch(()=>{});}
  function restore(){if(player&&placeholder?.isConnected)movePlayer(()=>placeholder.replaceWith(player));player=null;placeholder=null;document.body.classList.remove('viewer-open');pointers.clear();gesture=null;}
  dialog.addEventListener('close',restore);
  dialog.addEventListener('keydown',e=>{if(/INPUT|SELECT|TEXTAREA|AUDIO/.test(e.target.tagName))return;
    const act={'ArrowLeft':()=>actions.navigate(-1),'ArrowRight':()=>actions.navigate(1),'+':()=>zoom(camera?.scale*1.5),'=':()=>zoom(camera?.scale*1.5),'-':()=>zoom(camera?.scale/1.5),'0':reset}[e.key];if(act){e.preventDefault();act();}});
  new ResizeObserver(()=>{if(dialog.open)reset();}).observe(stage);
  function update(next){const changed=data.key!==next.key;data=next;if(changed){camera=null;dimensions=null;lastTap=null;pointers.clear();gesture=null;}
    $('viewer-title').textContent=next.title||'';$('viewer-count').textContent=next.count||'';
    $('viewer-previous').disabled=!next.previous;$('viewer-next').disabled=!next.next;
    for(const v of ['plain','annotated']){$('viewer-'+v).disabled=!next.variants?.includes(v);$('viewer-'+v).setAttribute('aria-pressed',String(next.variant===v));}
    $('viewer-captions').setAttribute('aria-pressed',String(next.captions));dialog.querySelector('.viewer-caption').hidden=!next.captions;
    $('viewer-caption-body').replaceChildren(globalThis.VisualLectureCaptions.render(next.caption||'No source caption supplied.'));
    $('viewer-relationship').textContent=next.relationship||'';$('viewer-source').hidden=!next.source;if(next.source)$('viewer-source').href=next.source;
    if(changed||!next.src){sourceVersion++;img.hidden=true;img.removeAttribute('src');$('viewer-loading').hidden=false;$('viewer-loading').textContent='Loading original image…';$('viewer-resolution').textContent='Original resolution · no image cropping';}
    if(next.src&&img.getAttribute('src')!==next.src){const serial=++sourceVersion;img.hidden=true;$('viewer-loading').hidden=false;img.alt=next.alt;
      img.onload=()=>{if(serial!==sourceVersion)return;const same=dimensions?.width===img.naturalWidth&&dimensions?.height===img.naturalHeight;dimensions={width:img.naturalWidth,height:img.naturalHeight};img.hidden=false;$('viewer-loading').hidden=true;if(!same||!camera)reset();else {camera=constrain(camera,viewport(),dimensions);paint();}};
      img.onerror=()=>{if(serial===sourceVersion)$('viewer-loading').textContent='Image unavailable. Close and reopen the image to retry.';};img.src=next.src;
    }
  }
  return {update,open(audioPlayer){if(dialog.open)return;player=audioPlayer;placeholder=document.createComment('audio player position');player.before(placeholder);movePlayer(()=>$('viewer-player').append(player));dialog.showModal();document.body.classList.add('viewer-open');reset();},close(){if(dialog.open){dialog.close();restore();}},get isOpen(){return dialog.open;}};
}
