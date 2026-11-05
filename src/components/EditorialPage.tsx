import {memo,useEffect,useMemo,useRef} from 'react';
import {renderEditorialPage,type EditorialKind} from '../lib/editorial-pages.js';
export default memo(function EditorialPage({kind,language}:{kind:EditorialKind;language:'fr'|'en'}){
 const choice=useRef('stock');
 const root=useRef<HTMLDivElement>(null),html=useMemo(()=>renderEditorialPage(kind,language),[kind,language]);
 useEffect(()=>{
  const node=root.current;if(!node)return;
  const select=(event:Event)=>{const button=(event.target as Element).closest<HTMLButtonElement>('[data-delivery-choice]');if(!button||!node.contains(button))return;const made=button.dataset.deliveryChoice==='made',en=language==='en';choice.current=made?'made':'stock';
   const buttons=[...node.querySelectorAll<HTMLButtonElement>('[data-delivery-choice]')];
   buttons.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
   const info=node.querySelector('[data-delivery-explanation]'),estimate=node.querySelector('[data-journey-estimate]');
   if(info)info.textContent=made?(en?'A model to be made follows the weaving path, after agreement on feasibility and price.':'Un modèle à confectionner suit le parcours de tissage, après accord sur la faisabilité et le prix.'):(en?'An available model follows the preparation path.':'Un modèle disponible suit le parcours de préparation.');
   if(estimate)estimate.textContent=made?(en?'Made to order · around 5 days':'À confectionner · environ 5 jours'):(en?'Available model · up to 2 days':'Modèle disponible · deux jours maximum');
   node.querySelector('.delivery-journey')?.classList.toggle('is-made-to-order',made);
  };
  node.addEventListener('click',select);
  if(choice.current==='made'){const button=node.querySelector('[data-delivery-choice="made"]');if(button)select({target:button} as unknown as Event);}
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  let observer:IntersectionObserver|undefined;
  if(!motion.matches&&'IntersectionObserver'in window){observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-in-view');observer?.unobserve(entry.target);}}),{threshold:.15});node.querySelectorAll('.editorial-chapter,.delivery-journey li,.destination-grid article').forEach(el=>observer!.observe(el));}
  let frame=0;const progress=node.querySelector<HTMLElement>('.editorial-progress');
  const update=()=>{frame=0;if(progress){const rect=node.getBoundingClientRect(),height=rect.height-innerHeight;progress.style.transform=`scaleX(${height>0?Math.max(0,Math.min(1,-rect.top/height)):0})`;}};
  const scroll=()=>{if(!frame)frame=requestAnimationFrame(update);};window.addEventListener('scroll',scroll,{passive:true});update();
  return()=>{node.removeEventListener('click',select);observer?.disconnect();window.removeEventListener('scroll',scroll);cancelAnimationFrame(frame);};
 },[kind,language]);
 return <div ref={root} dangerouslySetInnerHTML={{__html:html}}/>;
});
