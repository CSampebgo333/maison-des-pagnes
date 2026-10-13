export type SceneView = { x:number; y:number; z:number; fov:number };
export function overviewView(aspect:number):SceneView {
 // Stay inside the original room and preserve the text-led entrance composition.
 return {x:0,y:2.6,z:aspect<.85?8.2:6.8,fov:aspect<.85?70:aspect<1.3?64:60};
}
export function wrappedIndex(index:number,direction:number,count:number) {
 if(count<1)return -1;
 if(index<0)return direction<0?count-1:0;
 return ((index+direction)%count+count)%count;
}
export function approachReady(elapsed:number,distanceSquared:number,angleError:number) {
 return elapsed>=.65&&distanceSquared<.035&&angleError<.025 || elapsed>=1.5;
}
