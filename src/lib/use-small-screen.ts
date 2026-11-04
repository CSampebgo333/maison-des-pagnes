import {useEffect,useState} from 'react';
export function useSmallScreen(){
 const [small,setSmall]=useState(()=>window.matchMedia('(max-width:900px)').matches);
 useEffect(()=>{const media=window.matchMedia('(max-width:900px)'),changed=()=>setSmall(media.matches);changed();media.addEventListener('change',changed);return()=>media.removeEventListener('change',changed);},[]);
 return small;
}
