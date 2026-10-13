import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";
import type { Product } from "../lib/types";
import { asset } from "../lib/assets";
import { imageVariant } from "../lib/images";
import shop from "../../config/boutique.json";

const displayOrder = [1, 4, 0, 2, 3, 5, 6, 9, 7, 10, 8, 11];

export type SceneHandle = {
  reset: () => void;
  move: (direction: "forward"|"back"|"left"|"right") => void;
  zoom: (amount: number) => void;
  focus: (id: string) => void;
};
type Props = {products: Product[]; touring: boolean; active: boolean; onSelect: (id:string)=>void; onHover: (id:string|null)=>void; onReady:()=>void; onProgress:(loaded:number,total:number)=>void; onError:()=>void; onInterrupt:()=>void};
type Fixture = {group: THREE.Group; photo: THREE.Mesh; label: THREE.Mesh; slot: number; photoWidth: number; photoHeight: number; texture?: THREE.Texture};

const ShopScene = forwardRef<SceneHandle,Props>(function ShopScene(props,ref) {
  const host = useRef<HTMLDivElement>(null);
  const current = useRef(props);
  current.current = props;
  const actions = useRef<SceneHandle>({reset:()=>{},move:()=>{},zoom:()=>{},focus:()=>{}});
  const fixtures = useRef<Fixture[]>([]);
  const refresh = useRef<()=>void>(()=>{});
  useImperativeHandle(ref,()=>({reset:()=>actions.current.reset(),move:d=>actions.current.move(d),zoom:a=>actions.current.zoom(a),focus:s=>actions.current.focus(s)}),[]);

  useEffect(()=> {
    const element = host.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:"high-performance"}); }
    catch { current.current.onError(); return; }
    let disposed = false;
    let dirty = true;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#e8ded0");
    scene.fog = new THREE.Fog("#e8ded0",22,42);
    const camera = new THREE.PerspectiveCamera(58,1,.08,60);
    const position = new THREE.Vector3(0,2.45,6.4);
    camera.position.set(0,2.6,7.4);
    let yaw = 0, pitch = -.03, fov = 58;
    let currentYaw = 0, currentPitch = -.03;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    element.appendChild(renderer.domElement);
    renderer.domElement.setAttribute("aria-label","Intérieur de la boutique en trois dimensions. Faites glisser pour regarder autour de vous.");
    renderer.domElement.setAttribute("tabindex","0");
    const materials: THREE.Material[] = [];
    const textures = new Set<THREE.Texture>();
    function material(color:string,metalness=0,roughness=.75) {
      const m = new THREE.MeshStandardMaterial({color,metalness,roughness}); materials.push(m); return m;
    }
    const wall = material("#e7dfd4");
    const dark = material("#654552");
    const wood = material("#997c68",0,.65);
    const brass = material("#bca07b",.58,.32);
    const floor = material("#dcd0bd",.05,.64);
    const lamp = new THREE.MeshBasicMaterial({color:"#ffe0a5"}); materials.push(lamp);
    function box(parent:THREE.Object3D,w:number,h:number,d:number,x:number,y:number,z:number,m:THREE.Material) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m); mesh.position.set(x,y,z); mesh.castShadow=true; mesh.receiveShadow=true; parent.add(mesh); return mesh;
    }
    box(scene,12,.15,17,0,-.1,.8,floor);
    box(scene,12,5.8,.22,0,2.8,-6.6,wall);
    box(scene,.22,5.8,17,-5.9,2.8,.8,wall);
    box(scene,.22,5.8,17,5.9,2.8,.8,wall);
    box(scene,12,.18,17,0,5.65,.8,material("#f0e9de"));
    // Architectural seams and brass skirting make perspective and depth readable.
    for(let x=-5.5;x<6;x+=1.1) box(scene,.015,.012,17,x,.003,.8,material("#c4b6a0"));
    for(let z=-6;z<9;z+=1.5) box(scene,12,.012,.018,0,.005,z,material("#c4b6a0"));
    box(scene,11.7,.1,.09,0,.11,-6.4,brass);
    box(scene,.09,.1,16.8,-5.7,.11,.8,brass);
    box(scene,.09,.1,16.8,5.7,.11,.8,brass);
    for(let x=-5.5;x<=5.6;x+=.28) box(scene,.05,5,.04,x,2.8,-6.42,wood);
    // Ceiling light strips, not decorative bitmap scenery.
    for(const x of [-3.5,3.5]) box(scene,.055,.035,11,x,5.53,-.1,lamp);
    box(scene,9.5,.035,.055,0,5.53,-5.2,lamp);
    scene.add(new THREE.HemisphereLight("#fff0d4","#a698a0",2.5));
    const key = new THREE.DirectionalLight("#fff0d7",3.1); key.position.set(4,5,4); key.castShadow=true;
    key.shadow.mapSize.set(1024,1024); key.shadow.camera.left=-9; key.shadow.camera.right=9; key.shadow.camera.top=9; key.shadow.camera.bottom=-9; key.shadow.bias=-.0005; scene.add(key);
    const backLight = new THREE.PointLight("#ffddab",55,18,2); backLight.position.set(0,4.8,-4.4); scene.add(backLight);
    const fill = new THREE.PointLight("#fff6e2",30,17,2); fill.position.set(-4,4,1); scene.add(fill);

    function textTexture(text:string,detail:string,color="#edcf96",bg?:string) {
      const canvas = document.createElement("canvas"); canvas.width=1024; canvas.height=256;
      const ctx=canvas.getContext("2d")!;
      if(bg){ctx.fillStyle=bg;ctx.fillRect(0,0,1024,256);}
      ctx.fillStyle=color; ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.font="500 65px Georgia, serif"; ctx.fillText(text,512,102,945);
      if(detail){ctx.font="24px Arial, sans-serif";ctx.fillText(detail,512,179,930);}
      const texture=new THREE.CanvasTexture(canvas); texture.colorSpace=THREE.SRGBColorSpace; textures.add(texture); return texture;
    }
    const signMaterial = new THREE.MeshBasicMaterial({map:textTexture(shop.name,"LE SALON DES PAGNES"),transparent:true,depthWrite:false}); materials.push(signMaterial);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.8,.95),signMaterial); sign.position.set(0,5,-6.36); scene.add(sign);

    const hitTargets: THREE.Mesh[]=[];
    const fixtureList:Fixture[]=[];
    function niche(slot:number,x:number,y:number,z:number,rotation:number,w=3,h=1.95) {
      const group = new THREE.Group(); group.position.set(x,y,z); group.rotation.y=rotation; scene.add(group);
      box(group,w,h,.1,0,0,-.42,dark);
      box(group,w+.13,.1,.92,0,-h/2,.0,wood);
      box(group,w+.13,.08,.92,0,h/2,.0,wood);
      box(group,.075,h,.92,-w/2,0,0,brass); box(group,.075,h,.92,w/2,0,0,brass);
      box(group,w-.1,.035,.04,0,h/2-.06,.25,lamp);
      const glowMat=new THREE.MeshBasicMaterial({color:"#9d8b60",transparent:true,opacity:.08}); materials.push(glowMat);
      box(group,w-.1,h-.12,.01,0,0,-.36,glowMat);
      const photoMat = new THREE.MeshBasicMaterial({color:"#ffffff",transparent:true,toneMapped:false}); materials.push(photoMat);
      const photo = new THREE.Mesh(new THREE.PlaneGeometry(1,1),photoMat); photo.position.set(0,0,-.08); photo.visible=false; group.add(photo);
      const labelMat = new THREE.MeshBasicMaterial({transparent:true,depthWrite:false,toneMapped:false});materials.push(labelMat);
      const label = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(1.5,w-.12),.36),labelMat);label.position.set(0,-h/2-.22,.48);group.add(label);
      const hit=new THREE.Mesh(new THREE.PlaneGeometry(w-.1,h-.1),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));materials.push(hit.material);hit.position.z=.49; hit.userData.slot=slot;group.add(hit);hitTargets.push(hit);
      fixtureList.push({slot,group,photo,label,photoWidth:w-.28,photoHeight:h-.28});
    }
    for(let col=0;col<6;col++) niche(col,(col-2.5)*1.64,2.55,-5.85,0,1.53,2.00);
    for(let i=0;i<3;i++) { niche(6+i,-5.1,2.55,-3.45+i*3.1,Math.PI/2,2.2,2.90); niche(9+i,5.1,2.55,-3.45+i*3.1,-Math.PI/2,2.2,2.90); }
    fixtures.current=fixtureList;
    const loader=new THREE.TextureLoader();
    // Textures belong to the scene, not to individual slots. Filters reuse them.
    const photoCache = new Map<string, Promise<THREE.Texture<HTMLImageElement> | null>>();
    function loadPhoto(path:string) {
      if (!photoCache.has(path)) photoCache.set(path,new Promise(resolve => {
        loader.load(asset(path),texture => {
          if(disposed){texture.dispose();resolve(null);return;}
          texture.offset.set(.12,.12);texture.repeat.set(.76,.76);
          texture.colorSpace=THREE.SRGBColorSpace;
          texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
          textures.add(texture);resolve(texture);
        },undefined,()=>{photoCache.delete(path);resolve(null);});
      }));
      return photoCache.get(path)!;
    }
    let generation=0;
    refresh.current=()=> {
      const version=++generation;
      let completed=0;
      const total=Math.min(current.current.products.length,fixtureList.length);
      current.current.onProgress(0,total);
      if(!total)current.current.onReady();
      fixtureList.forEach(f=> {
        const article=current.current.products[displayOrder.indexOf(f.slot)];
        const lm=f.label.material as THREE.MeshBasicMaterial;
        const old=lm.map;
        lm.map=textTexture(article?.name??"",article?`${article.photos.length} VUES · DÉCOUVRIR`:""); lm.needsUpdate=true;
        if(old){textures.delete(old);old.dispose();}
        f.photo.visible=false;f.texture=undefined;dirty=true;
        if(article?.photos[0]) void loadPhoto(imageVariant(article.photos[0].src).scene).then(texture=> {
          if(disposed||generation!==version)return;
          if(texture){
            f.texture=texture;
            const aspect=texture.image.width/texture.image.height;
            const width=Math.min(f.photoWidth,f.photoHeight*aspect);
            f.photo.scale.set(width,width/aspect,1);
            const m=f.photo.material as THREE.MeshBasicMaterial;m.map=texture;m.needsUpdate=true;f.photo.visible=true;
          }
          dirty=true;current.current.onProgress(++completed,total);
          if(completed===total)current.current.onReady();
        });
      });
    };
    refresh.current();
    function lookAt(target:THREE.Vector3) {
      const dx=target.x-position.x,dy=target.y-position.y,dz=target.z-position.z;
      yaw=Math.atan2(-dx,-dz);pitch=Math.atan2(dy,Math.hypot(dx,dz));
    }
    function constrain() { position.x=THREE.MathUtils.clamp(position.x,-4.2,4.2);position.z=THREE.MathUtils.clamp(position.z,-4.55,7.5); }
    function move(direction: "forward"|"back"|"left"|"right",amount=.7) {
      current.current.onInterrupt();
      const angle = yaw+(direction==="left"?Math.PI/2:direction==="right"?-Math.PI/2:0);
      const sign=direction==="back"?-1:1;
      position.x-=Math.sin(angle)*amount*sign;position.z-=Math.cos(angle)*amount*sign;constrain();
    }
    actions.current={
      reset:()=>{current.current.onInterrupt();position.set(0,2.45,6.4);yaw=0;pitch=-.03;fov=58;},
      move,
      zoom:amount=>{current.current.onInterrupt();fov=THREE.MathUtils.clamp(fov+amount,30,80);},
      focus:id=> { const slot=displayOrder[current.current.products.findIndex(p=>p.id===id)]; const f=fixtureList.find(n=>n.slot===slot);if(!f)return;current.current.onInterrupt();
        const normal=new THREE.Vector3(0,0,1).applyQuaternion(f.group.quaternion);
        position.copy(f.group.position).addScaledVector(normal,3.3);position.y=2.45;constrain();lookAt(f.group.position);fov=52;
      },
    };
    const resize=()=>{const w=element.clientWidth,h=element.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();dirty=true;};
    const observer=new ResizeObserver(resize);observer.observe(element);resize();
    const ray=new THREE.Raycaster();const pointer=new THREE.Vector2();
    const hitAt=(x:number,y:number)=>{const rect=renderer.domElement.getBoundingClientRect();pointer.set(((x-rect.left)/rect.width)*2-1,-((y-rect.top)/rect.height)*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(hitTargets,false)[0];return hit?current.current.products[displayOrder.indexOf(hit.object.userData.slot as number)]?.id??null:null;};
    let dragging=false,lastX=0,lastY=0,downX=0,downY=0,travel=0;
    const touches=new Map<number,{x:number;y:number}>();let pinchDistance=0;
    const onDown=(e:PointerEvent)=>{if(!current.current.active)return;renderer.domElement.focus();touches.set(e.pointerId,{x:e.clientX,y:e.clientY});dragging=true;lastX=downX=e.clientX;lastY=downY=e.clientY;travel=0;renderer.domElement.setPointerCapture(e.pointerId);
      if(touches.size===2){const [a,b]=[...touches.values()];pinchDistance=Math.hypot(a.x-b.x,a.y-b.y);travel=10;}
    };
    const onMove=(e:PointerEvent)=>{
      if(!current.current.active)return;
      if(touches.has(e.pointerId))touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(touches.size===2){const [a,b]=[...touches.values()];const distance=Math.hypot(a.x-b.x,a.y-b.y);fov=THREE.MathUtils.clamp(fov-(distance-pinchDistance)*.12,30,80);pinchDistance=distance;travel=10;current.current.onInterrupt();return;}
      if(dragging){const dx=e.clientX-lastX,dy=e.clientY-lastY;travel+=Math.abs(dx)+Math.abs(dy);yaw-=dx*.0035;pitch=THREE.MathUtils.clamp(pitch-dy*.0035,-.65,.65);lastX=e.clientX;lastY=e.clientY;if(travel>3)current.current.onInterrupt();}
      else{const slot=hitAt(e.clientX,e.clientY);current.current.onHover(slot);renderer.domElement.style.cursor=slot!==null?"pointer":"grab";}
    };
    const onUp=(e:PointerEvent)=>{touches.delete(e.pointerId);if(!dragging)return;dragging=false;if(travel<7&&Math.hypot(e.clientX-downX,e.clientY-downY)<7){const slot=hitAt(e.clientX,e.clientY);if(slot!==null)current.current.onSelect(slot);} };
    const onCancel=(e:PointerEvent)=>{touches.delete(e.pointerId);dragging=false;};
    const onWheel=(e:WheelEvent)=>{if(!current.current.active)return;e.preventDefault();current.current.onInterrupt();fov=THREE.MathUtils.clamp(fov+e.deltaY*.035,30,80);};
    const keys=new Set<string>();
    const onKey=(e:KeyboardEvent)=>{if(!current.current.active||e.target!==renderer.domElement)return;const k=e.key.toLowerCase();if(["arrowup","arrowdown","arrowleft","arrowright","w","a","s","d","z","q"].includes(k)){e.preventDefault();keys.add(k);current.current.onInterrupt();}};
    const onKeyUp=(e:KeyboardEvent)=>keys.delete(e.key.toLowerCase());
    const blur=()=>keys.clear();
    const leave=()=>{current.current.onHover(null);};
    const onLost=(e:Event)=>{e.preventDefault();current.current.onError();};
    const canvas=renderer.domElement;
    canvas.addEventListener("pointerdown",onDown);canvas.addEventListener("pointermove",onMove);canvas.addEventListener("pointerup",onUp);canvas.addEventListener("pointercancel",onCancel);canvas.addEventListener("pointerleave",leave);canvas.addEventListener("wheel",onWheel,{passive:false});canvas.addEventListener("keydown",onKey);canvas.addEventListener("keyup",onKeyUp);canvas.addEventListener("blur",blur);canvas.addEventListener("webglcontextlost",onLost);
    let frame=0,lastTime=performance.now(),tourTime=0,wasTour=false;
    function tourPath() {
      const entry = {p:[0,2.45,6.4],t:[0,2.6,-5.8]};
      const stops = current.current.products.slice(0,12).map((_,i)=> {
        const f=fixtureList.find(n=>n.slot===displayOrder[i])!;
        const normal=new THREE.Vector3(0,0,1).applyQuaternion(f.group.quaternion);
        const p=f.group.position.clone().addScaledVector(normal,3.3);p.y=2.45;
        p.x=THREE.MathUtils.clamp(p.x,-4.2,4.2);p.z=THREE.MathUtils.clamp(p.z,-4.55,7.5);
        return {p:p.toArray(),t:f.group.position.toArray()};
      });
      return [entry,...stops,entry];
    }
    const tick=(time:number)=>{
      if(document.hidden || !current.current.active){lastTime=time;frame=requestAnimationFrame(tick);return;}
      const dt=Math.min((time-lastTime)/1000,.05);lastTime=time;
      if(current.current.touring&&current.current.active){if(!wasTour){tourTime=0;wasTour=true;}tourTime+=dt;const path=tourPath();const phase=(tourTime/7)%(path.length-1),index=Math.floor(phase),t=THREE.MathUtils.smoothstep(phase-index,0,1);const a=path[index],b=path[index+1];position.set(...a.p as [number,number,number]).lerp(new THREE.Vector3(...b.p as [number,number,number]),t);lookAt(new THREE.Vector3(...a.t as [number,number,number]).lerp(new THREE.Vector3(...b.t as [number,number,number]),t));fov=58;}
      else{wasTour=false;if(current.current.active){if(keys.has("arrowup")||keys.has("w")||keys.has("z"))move("forward",dt*2.4);if(keys.has("arrowdown")||keys.has("s"))move("back",dt*2.4);if(keys.has("a")||keys.has("q"))move("left",dt*2.4);if(keys.has("d"))move("right",dt*2.4);if(keys.has("arrowleft"))yaw+=dt*.9;if(keys.has("arrowright"))yaw-=dt*.9;}else keys.clear();}
      dirty ||= camera.position.distanceToSquared(position)>0.000001 || Math.abs(yaw-currentYaw)>.0001 || Math.abs(pitch-currentPitch)>.0001 || Math.abs(camera.fov-fov)>.001;
      const smoothing=reduced?1:1-Math.exp(-dt*7);
      camera.position.lerp(position,smoothing);
      let angle=yaw-currentYaw;angle=Math.atan2(Math.sin(angle),Math.cos(angle));currentYaw+=angle*smoothing;currentPitch=THREE.MathUtils.lerp(currentPitch,pitch,smoothing);
      camera.rotation.set(currentPitch,currentYaw,0,"YXZ");camera.fov=THREE.MathUtils.lerp(camera.fov,fov,smoothing);camera.updateProjectionMatrix();
      if(dirty){renderer.render(scene,camera);dirty=false;}
      frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);
    return()=>{
      disposed=true;cancelAnimationFrame(frame);observer.disconnect();
      canvas.removeEventListener("pointerdown",onDown);canvas.removeEventListener("pointermove",onMove);canvas.removeEventListener("pointerup",onUp);canvas.removeEventListener("pointercancel",onCancel);canvas.removeEventListener("pointerleave",leave);canvas.removeEventListener("wheel",onWheel);canvas.removeEventListener("keydown",onKey);canvas.removeEventListener("keyup",onKeyUp);canvas.removeEventListener("blur",blur);canvas.removeEventListener("webglcontextlost",onLost);
      scene.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();canvas.remove();fixtures.current=[];
    };
  },[]);
  useEffect(()=>refresh.current(),[props.products]);
  return <div className="scene-canvas" ref={host}/>;
});
export default ShopScene;
