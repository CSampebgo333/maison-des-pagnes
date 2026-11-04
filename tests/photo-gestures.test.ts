import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bindPhotoGestures} from '../src/lib/photo-gestures.ts';
function setup(){
 const node=new EventTarget();let zoom=1,time=0,enabled=true;const pans:{x:number;y:number}[]=[];let resets=0;
 const stop=bindPhotoGestures(node as HTMLElement,{getZoom:()=>zoom,setZoom:z=>{zoom=z;},pan:p=>pans.push(p),resetPan:()=>{resets++;},activity:()=>{}},()=>enabled,()=>time);
 function touch(type:string,points:number[][]){const event=Object.assign(new Event(type,{cancelable:true}),{touches:points.map(([clientX,clientY])=>({clientX,clientY}))});node.dispatchEvent(event);return event.defaultPrevented;}
 return {touch,stop,pans,zoom:()=>zoom,resets:()=>resets,advance:(t:number)=>{time+=t;},desktop:()=>{enabled=false;}};
}
test('One-finger movement never consumes scrolling, even after zooming',()=>{
 const g=setup();assert.equal(g.touch('touchstart',[[50,50]]),false);assert.equal(g.touch('touchmove',[[50,150]]),false);g.touch('touchend',[]);assert.equal(g.zoom(),1);
 g.touch('touchstart',[[0,0],[100,0]]);assert.equal(g.touch('touchmove',[[0,0],[200,0]]),true);g.touch('touchend',[]);assert.equal(g.zoom(),2);
 assert.equal(g.touch('touchstart',[[50,50]]),false);assert.equal(g.touch('touchmove',[[50,180]]),false);g.touch('touchend',[]);assert.equal(g.zoom(),2);g.stop();
});
test('Pinch zoom is bounded, can pan with two fingers and never turns into a tap',()=>{
 const g=setup();assert.equal(g.touch('touchstart',[[0,0],[100,0]]),true);g.touch('touchmove',[[20,20],[520,20]]);assert.equal(g.zoom(),4);assert.deepEqual(g.pans[0],{x:220,y:20});g.touch('touchend',[[20,20]]);g.touch('touchend',[]);assert.equal(g.resets(),0);
 g.touch('touchstart',[[0,0],[100,0]]);g.touch('touchmove',[[0,0],[1,0]]);assert.equal(g.zoom(),1);g.stop();
});
test('Only a nearby, quick double tap toggles zoom; scrolling and cancellation clear taps',()=>{
 const g=setup();const tap=(x=50)=>{g.touch('touchstart',[[x,50]]);g.advance(50);return g.touch('touchend',[]);};
 assert.equal(tap(),false);g.advance(120);assert.equal(tap(),true);assert.equal(g.zoom(),2);assert.equal(g.resets(),1);
 g.advance(400);tap();g.advance(100);tap();assert.equal(g.zoom(),1);
 g.advance(400);tap();g.touch('touchcancel',[]);g.advance(100);tap();assert.equal(g.zoom(),1);
 g.advance(400);tap();g.advance(100);tap(150);assert.equal(g.zoom(),1);g.stop();
});
test('Desktop gestures and detached viewers do not consume touch events',()=>{
 const g=setup();g.desktop();assert.equal(g.touch('touchstart',[[0,0],[100,0]]),false);g.touch('touchmove',[[0,0],[200,0]]);assert.equal(g.zoom(),1);g.stop();assert.equal(g.touch('touchmove',[[0,0],[300,0]]),false);
});
