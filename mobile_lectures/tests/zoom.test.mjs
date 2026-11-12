import test from 'node:test';
import assert from 'node:assert/strict';
import {fit,constrain,zoomAt} from '../src/zoom.js';
test('fit preserves all source pixels in portrait and landscape without upscaling',()=>{
  for(const view of [{width:350,height:450},{width:1100,height:600}]){
    const image={width:900,height:900},c=constrain({scale:fit(view,image),x:0,y:0},view,image);
    assert.ok(c.x>=0&&c.y>=0);assert.ok(c.x+900*c.scale<=view.width+1e-6);assert.ok(c.y+900*c.scale<=view.height+1e-6);
  }
  assert.equal(fit({width:1000,height:1000},{width:400,height:300}),1);
});
test('zoom keeps the inspected point stable and pan cannot lose the image',()=>{
  const view={width:400,height:400},image={width:900,height:900},start={scale:1,x:-200,y:-200},point={x:140,y:130};
  const z=zoomAt(start,2,point,view,image);
  assert.equal((point.x-z.x)/z.scale,(point.x-start.x)/start.scale);
  assert.equal((point.y-z.y)/z.scale,(point.y-start.y)/start.scale);
  const edge=constrain({...z,x:9999,y:-9999},view,image);assert.equal(edge.x,0);assert.equal(edge.y,400-900*2);
});
