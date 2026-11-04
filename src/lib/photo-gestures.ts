type Point={x:number;y:number};
type Controls={getZoom:()=>number;setZoom:(zoom:number)=>void;pan:(delta:Point)=>void;resetPan:()=>void;activity:()=>void};
const limit=(value:number)=>Math.max(1,Math.min(4,value));
// One finger belongs to page scrolling. Only a pinch or a deliberate double
// tap is consumed; native listeners must be non-passive for those gestures.
export function bindPhotoGestures(node:HTMLElement,controls:Controls,enabled:()=>boolean,now=()=>performance.now()){
 let start:Point|null=null,startTime=0,moved=false,multi=false,lastTap:Point|null=null,lastTime=-Infinity;
 let distance=0,initialZoom=1,center:Point|null=null;
 const pair=(touches:TouchList)=>{const a=touches[0],b=touches[1];return {distance:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),center:{x:(a.clientX+b.clientX)/2,y:(a.clientY+b.clientY)/2}};};
 const consume=(e:TouchEvent)=>{if(e.cancelable)e.preventDefault();};
 function begin(e:TouchEvent){
  if(!enabled())return;controls.activity();
  if(e.touches.length>=2){consume(e);multi=true;lastTap=null;const p=pair(e.touches);distance=p.distance;initialZoom=controls.getZoom();center=p.center;}
  else if(e.touches.length===1){start={x:e.touches[0].clientX,y:e.touches[0].clientY};startTime=now();moved=false;multi=false;}
 }
 function move(e:TouchEvent){
  if(!enabled())return;
  if(e.touches.length>=2){consume(e);multi=true;const p=pair(e.touches);if(distance>0)controls.setZoom(limit(initialZoom*p.distance/distance));if(center)controls.pan({x:p.center.x-center.x,y:p.center.y-center.y});center=p.center;}
  else if(start&&e.touches.length===1&&Math.hypot(e.touches[0].clientX-start.x,e.touches[0].clientY-start.y)>10){moved=true;lastTap=null;}
 }
 function end(e:TouchEvent){
  if(!enabled())return;controls.activity();
  if(e.touches.length)return;
  if(!multi&&!moved&&start&&now()-startTime<280){
   if(lastTap&&now()-lastTime<320&&Math.hypot(start.x-lastTap.x,start.y-lastTap.y)<30){consume(e);controls.setZoom(controls.getZoom()>1?1:2);controls.resetPan();lastTap=null;lastTime=-Infinity;}
   else {lastTap=start;lastTime=now();}
  }else lastTap=null;
  start=null;distance=0;center=null;multi=false;
 }
 function cancel(){start=null;lastTap=null;multi=false;distance=0;center=null;}
 node.addEventListener('touchstart',begin,{passive:false});node.addEventListener('touchmove',move,{passive:false});node.addEventListener('touchend',end,{passive:false});node.addEventListener('touchcancel',cancel);
 return()=>{node.removeEventListener('touchstart',begin);node.removeEventListener('touchmove',move);node.removeEventListener('touchend',end);node.removeEventListener('touchcancel',cancel);};
}
