export type SceneView = { x:number; y:number; z:number; fov:number };
export function overviewView(aspect:number):SceneView {
 // Frame the frontmost side displays with room for their edges, even in portrait.
 const ratio=Math.max(.4,aspect);
 const fov=ratio<.85?78:ratio<1.3?70:64;
 const minimum=ratio<.85?12.4:ratio<1.3?9.5:7.8;
 const z=Math.max(minimum,3.65+5.6/(Math.tan(fov*Math.PI/360)*ratio));
 return {x:0,y:2.65,z,fov};
}
export function wrappedIndex(index:number,direction:number,count:number) {
 if(count<1)return -1;
 if(index<0)return direction<0?count-1:0;
 return ((index+direction)%count+count)%count;
}
export function approachReady(elapsed:number,distanceSquared:number,angleError:number) {
 return elapsed>=.65&&distanceSquared<.035&&angleError<.025 || elapsed>=1.5;
}
