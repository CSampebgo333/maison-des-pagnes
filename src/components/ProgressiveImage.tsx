import { useState, type ImgHTMLAttributes } from 'react';
import { asset } from '../lib/assets';

type Props = ImgHTMLAttributes<HTMLImageElement> & { src: string; preview: string };
// Key the component by source so a late load cannot update a different product.
export default function ProgressiveImage({ src, preview, className = '', alt = '', style, onLoad, ...props }: Props) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  return <>
    <img className={`${className} progressive-preview`} src={asset(preview)} alt={failed ? alt : ""} aria-hidden={!failed} loading={props.loading} decoding="async" style={style} />
    {!failed && <img {...props} src={asset(src)} alt={alt} className={`${className} progressive-full${ready ? ' is-ready' : ''}`} style={style} decoding="async" onLoad={(event) => { setReady(true); onLoad?.(event); }} onError={() => setFailed(true)} />}
    {failed && <span className="image-load-status" role="status">Aperçu disponible · <button onClick={() => { setFailed(false); setReady(false); }}>Réessayer</button></span>}
    {!ready && !failed && <span className="image-load-status" role="status"><i />Chargement de la photo…</span>}
  </>;
}
