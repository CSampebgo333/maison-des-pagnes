import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dialog } from 'radix-ui';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Box, Check, ChevronDown, ChevronRight, CircleHelp, Copy, LayoutGrid, Maximize2, Minus, Pause, Play, Plus, RotateCcw, Search, ShoppingBag, Trash2, X } from 'lucide-react';
import catalogue from './catalogue.json';
import shop from '../config/boutique.json';
import { findProducts, readBag } from './lib/catalogue';
import type { Product, BagItem } from './lib/types';
import type { SceneHandle } from './components/ShopScene';
import ProductViewer from './components/ProductViewer';
import { asset } from './lib/assets';

const ShopScene = lazy(() => import('./components/ShopScene'));
const products = catalogue as Product[];
const BAG_KEY = 'maison-des-pagnes-selection-v1';
const refLabel = (product: Product) => `PAG-${String(product.number).padStart(3, '0')}`;
const priceLabel = (product: Product) => product.price === null ? 'Prix sur demande' : new Intl.NumberFormat(shop.locale, { style: 'currency', currency: shop.currency }).format(product.price);
function loadBag() { try { return readBag(localStorage.getItem(BAG_KEY), products); } catch { return []; } }

function Brand({ small = false }: { small?: boolean }) {
  return <span className={`brand ${small ? 'brand-small' : ''}`}><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M9 34V13l15 18 15-18v21M14 10l10 12 10-12" /></svg><span>{shop.name}<small>{shop.tagline}</small></span></span>;
}

export default function App() {
  const [query, setQuery] = useState('');
  const [color, setColor] = useState('');
  const [sort, setSort] = useState('collection');
  const [view, setView] = useState<'boutique' | 'galerie'>('boutique');
  const [intro, setIntro] = useState(true);
  const [touring, setTouring] = useState(false);
  const [ready, setReady] = useState(false);
  const [sceneError, setSceneError] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<Product | null>(null);
  const [bag, setBag] = useState<BagItem[]>(loadBag);
  const [bagOpen, setBagOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const scene = useRef<SceneHandle>(null);
  const stage = useRef<HTMLElement>(null);
  const collection = useRef<HTMLElement>(null);
  const search = useRef<HTMLInputElement>(null);

  const visible = useMemo(() => findProducts(products, query, color, sort), [query, color, sort]);
  const colors = useMemo(() => [...new Set(products.flatMap((product) => product.colors))], []);
  const bagCount = bag.reduce((count, item) => count + item.quantity, 0);
  const hoveredProduct = visible.find((product) => product.id === hovered);
  const selectedItems = bag.flatMap((item) => { const product = products.find((p) => p.id === item.id); return product ? [{ ...item, product }] : []; });
  const interrupt = useCallback(() => setTouring(false), []);
  const onReady = useCallback(() => setReady(true), []);
  const onError = useCallback(() => { setSceneError(true); setView('galerie'); setTouring(false); setNotice('La galerie est disponible sur cet appareil.'); }, []);
  const onSelect = useCallback((id: string) => { const product = products.find((p) => p.id === id); if (product) { setSelected(product); setTouring(false); } }, []);

  useEffect(() => { try { localStorage.setItem(BAG_KEY, JSON.stringify(bag)); } catch { /* La sélection fonctionne aussi sans stockage local. */ } }, [bag]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 4200); return () => clearTimeout(timer); }, [notice]);
  useEffect(() => {
    const update = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);
  useEffect(() => { setTouring(false); setHovered(null); if (query || color) setIntro(false); scene.current?.reset(); }, [query, color, sort]);

  function addToBag(id: string) {
    setBag((items) => {
      const existing = items.find((item) => item.id === id);
      if (existing) return items.map((item) => item.id === id ? { ...item, quantity: Math.min(99, item.quantity + 1) } : item);
      return [...items, { id, quantity: 1 }];
    });
    setCopied(false); setNotice('Pagne ajouté à votre sélection.');
  }
  function changeQuantity(id: string, change: number) {
    setBag((items) => items.map((item) => item.id === id ? { ...item, quantity: Math.min(99, item.quantity + change) } : item).filter((item) => item.quantity > 0)); setCopied(false);
  }
  function showGallery() { setView('galerie'); setTouring(false); collection.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }); }
  function selectionText() { return `Bonjour, voici ma sélection chez ${shop.name} :\n\n${selectedItems.map(({ product, quantity }) => `• ${refLabel(product)} — ${product.name} × ${quantity}`).join('\n')}\n\nPouvez-vous me confirmer les prix et la disponibilité ?`; }
  async function copySelection() {
    try { await navigator.clipboard.writeText(selectionText()); setCopied(true); setNotice('Sélection copiée. Vous pouvez la partager avec la boutique.'); }
    catch { setNotice('La copie automatique est indisponible. Sélectionnez le texte ci-dessous.'); }
  }
  async function toggleFullscreen() {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen(); else setNotice('Le plein écran n’est pas disponible sur cet appareil.'); }
    catch { setNotice('Le plein écran n’est pas disponible sur cet appareil.'); }
  }

  return <>
    <div className="announcement"><span>Des motifs à découvrir. Des détails à aimer.</span><span className="announcement-end">Une boutique familiale <span aria-hidden="true">✦</span></span></div>
    <header className="site-header">
      <a className="brand-link" href="#" aria-label={`${shop.name}, accueil`} onClick={(event) => { event.preventDefault(); if (view !== 'boutique') setReady(false); setView(sceneError ? 'galerie' : 'boutique'); setIntro(true); setQuery(''); setColor(''); scene.current?.reset(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><Brand /></a>
      <form className="header-search" role="search" onSubmit={(event) => { event.preventDefault(); setIntro(false); collection.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>
        <Search size={18} aria-hidden="true" /><input ref={search} type="search" placeholder="Un motif, une couleur…" aria-label="Rechercher un pagne" value={query} onChange={(event) => setQuery(event.target.value)} />
        {query && <button type="button" aria-label="Effacer la recherche" onClick={() => { setQuery(''); search.current?.focus(); }}><X size={16} /></button>}
      </form>
      <nav className="header-actions" aria-label="Navigation principale"><button className="text-button collection-link" onClick={showGallery}>La collection</button><button className="bag-button" onClick={() => { setBagOpen(true); setTouring(false); }} aria-label={`Ma sélection, ${bagCount} pagne${bagCount !== 1 ? 's' : ''}`}><ShoppingBag size={19} /><span>Ma sélection</span><b>{bagCount}</b></button></nav>
    </header>

    <main>
      <section className="collection" ref={collection} id="collection" aria-label="Collection de pagnes">
        <div className="collection-toolbar">
          <div className="view-switch" role="group" aria-label="Choisir une vue"><button aria-pressed={view === 'boutique'} disabled={sceneError} onClick={() => { if (view !== 'boutique') setReady(false); setView('boutique'); setIntro(false); }}><Box size={16} />Boutique 3D</button><button aria-pressed={view === 'galerie'} onClick={() => { setView('galerie'); setTouring(false); }}><LayoutGrid size={16} />Galerie</button></div>
          <div className="filters"><label><span className="sr-only">Filtrer par couleur</span><select value={color} onChange={(event) => setColor(event.target.value)}><option value="">Toutes les couleurs</option>{colors.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={13} /></label><label><span className="sr-only">Trier la collection</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="collection">Ordre de la collection</option><option value="name">Nom, de A à Z</option>{products.some((p) => p.price !== null) && <option value="price">Prix croissant</option>}</select><ChevronDown size={13} /></label></div>
        </div>

        {view === 'boutique' ? <section className={`shop-stage ${intro ? 'with-intro' : ''}`} ref={stage} aria-label="Boutique immersive">
          <Suspense fallback={<div className="scene-loading"><span className="loading-ring" /><p>La boutique ouvre ses portes…</p></div>}><ShopScene ref={scene} products={visible} touring={touring} active={!selected && !bagOpen && !helpOpen} onSelect={onSelect} onHover={setHovered} onReady={onReady} onError={onError} onInterrupt={interrupt} /></Suspense>
          {!ready && <div className="loading-label" role="status">Préparation de votre visite…</div>}
          <div className="stage-topline"><span className="room-badge"><i /> {query || color ? 'Votre collection' : 'Le salon des pagnes'}</span><button className="stage-icon" aria-label="Comment visiter la boutique" onClick={() => setHelpOpen(true)}><CircleHelp size={19} /></button></div>
          {intro && <div className="intro-card"><p className="eyebrow">BIENVENUE CHEZ {shop.name.toUpperCase()}</p><h1>Le beau tissu.<br />Le plaisir<br /><em>de choisir.</em></h1><p className="intro-text">Entrez, prenez votre temps.<br />Votre prochain pagne vous attend.</p><button className="primary-button" onClick={() => { setIntro(false); scene.current?.reset(); }}>Explorer la boutique <ArrowRight size={18} /></button><button className="intro-secondary" onClick={showGallery}>Voir les pagnes en galerie <ChevronRight size={15} /></button><div className="intro-detail"><span>01 — REGARDER</span><span>02 — CHOISIR</span></div></div>}
          {!intro && <div className="stage-title"><span className="eyebrow">UNE AUTRE FAÇON DE CHOISIR</span><p>Promenez-vous.<br /><em>Laissez-vous inspirer.</em></p></div>}
          {visible.length === 0 && <div className="empty-scene"><Search size={24} /><h2>Aucun pagne ne correspond.</h2><p>Essayez une autre couleur ou un mot plus simple.</p><button className="primary-button" onClick={() => { setQuery(''); setColor(''); }}>Revoir la collection <ArrowRight size={16} /></button></div>}
          {hoveredProduct && !intro && <div className="hover-card"><span>{refLabel(hoveredProduct)}</span><strong>{hoveredProduct.name}</strong><small>Cliquez pour découvrir les {hoveredProduct.photos.length} vues <ArrowRight size={12} /></small></div>}
          <div className="stage-bottomline"><span className="navigation-hint">Glissez pour regarder · cliquez sur un pagne</span><div className="stage-actions"><button className={`tour-button ${touring ? 'is-touring' : ''}`} onClick={() => { setIntro(false); setTouring((value) => !value); }} disabled={!ready || !visible.length} aria-pressed={touring}>{touring ? <Pause size={15} /> : <Play size={15} />}<span>{touring ? 'Pause' : 'Visite guidée'}</span></button><button className="stage-icon" aria-label="Revenir à l’entrée" onClick={() => scene.current?.reset()}><RotateCcw size={16} /></button><button className="stage-icon" aria-label={fullscreen ? 'Quitter le plein écran' : 'Afficher en plein écran'} onClick={toggleFullscreen}><Maximize2 size={16} /></button></div></div>
          {!intro && <div className="movement-controls" aria-label="Déplacement dans la boutique"><div className="movement-pad"><button aria-label="Avancer" onClick={() => scene.current?.move('forward')}><ArrowUp size={16} /></button><div><button aria-label="Aller à gauche" onClick={() => scene.current?.move('left')}><ArrowLeft size={16} /></button><button aria-label="Reculer" onClick={() => scene.current?.move('back')}><ArrowDown size={16} /></button><button aria-label="Aller à droite" onClick={() => scene.current?.move('right')}><ArrowRight size={16} /></button></div></div><div className="scene-zoom"><button aria-label="Zoomer dans la boutique" onClick={() => scene.current?.zoom(-8)}><Plus size={17} /></button><button aria-label="Dézoomer dans la boutique" onClick={() => scene.current?.zoom(8)}><Minus size={17} /></button></div></div>}
        </section> : <div className="gallery-heading"><div><p className="eyebrow">LA COLLECTION</p><h1>Un motif.<br /><em>Votre histoire.</em></h1></div><p>Regardez les couleurs. Approchez les détails.<br />Choisissez le pagne qui vous ressemble.</p></div>}

        <div className="results-heading"><p role="status" aria-live="polite"><strong>{visible.length}</strong> pagne{visible.length !== 1 ? 's' : ''}{query ? <> pour « {query} »</> : color ? <> · {color}</> : ' à découvrir'}</p>{(query || color) && <button className="text-button" onClick={() => { setQuery(''); setColor(''); }}>Effacer les filtres <X size={13} /></button>}<span className="photos-note">Plusieurs vues, pour mieux choisir <span aria-hidden="true">↗</span></span></div>

        {view === 'boutique' ? <div className="product-rail">{visible.map((product) => <div className="rail-product" key={product.id}><button className="rail-photo" onClick={() => setSelected(product)} aria-label={`Découvrir ${product.name}`}><img src={asset(product.photos[0].thumbnail)} alt={product.name} loading="lazy" /></button><button className="rail-info" onClick={() => setSelected(product)}><small>{refLabel(product)}</small><strong>{product.name}</strong><span>{product.photos.length} vues · {priceLabel(product)}</span></button><button className="rail-focus icon-button" aria-label={`S’approcher de ${product.name} dans la boutique`} onClick={() => { setIntro(false); scene.current?.focus(product.id); }}><Box size={17} /></button><button className="rail-open icon-button" aria-label={`Ouvrir les photos de ${product.name}`} onClick={() => setSelected(product)}><ArrowRight size={18} /></button></div>)}</div> : <div className="product-grid">{visible.map((product, index) => <article className="product-card" key={product.id}><button className="product-image" onClick={() => setSelected(product)} aria-label={`Découvrir ${product.name}`}><img className="product-cover" src={asset(product.photos[0].thumbnail)} alt={product.name} fetchPriority={index < 2 ? 'high' : 'auto'} /><img className="product-alternate" src={asset((product.photos.find((photo) => photo.view === 3) ?? product.photos[0]).thumbnail)} alt="" loading="lazy" /><span className="product-photo-count">{product.photos.length} vues</span><span className="product-discover">Découvrir <ArrowRight size={16} /></span></button><div className="product-meta"><div><p className="product-reference">{refLabel(product)}</p><button className="product-name" onClick={() => setSelected(product)}>{product.name}</button><p className="product-color">{product.colors.join(' · ')}</p></div><button className="product-add" onClick={() => addToBag(product.id)} aria-label={`Ajouter ${product.name} à ma sélection`}><Plus size={18} /></button></div><p className="product-price">{priceLabel(product)}{product.unit && <small> / {product.unit}</small>}</p></article>)}</div>}
        {view === 'galerie' && !visible.length && <div className="empty-gallery"><Search size={26} /><h2>Aucun pagne ne correspond à votre recherche.</h2><p>Essayez « bleu », « violet » ou « rayures ».</p><button className="primary-button" onClick={() => { setQuery(''); setColor(''); }}>Revoir tous les pagnes <ArrowRight size={16} /></button></div>}
      </section>

      <section className="detail-story" aria-label="Découvrir les détails"><div className="detail-story-photo">{products[0] && <img src={asset((products[0].photos.find((photo) => photo.view === 4) ?? products[0].photos[0]).thumbnail)} alt={`Détail du motif de ${products[0].name}`} loading="lazy" />}<span>CHAQUE DÉTAIL COMPTE.</span></div><div className="detail-story-copy"><p className="eyebrow">À REGARDER DE PLUS PRÈS</p><h2>La beauté est<br /><em>dans les détails.</em></h2><p>Le motif à plat. Le tissu drapé. La texture de près. Explorez chaque pagne sous plusieurs angles et prenez le temps de trouver votre coup de cœur.</p><button className="underlined-button" onClick={() => products[0] && setSelected(products[0])}>Approcher un motif <ArrowRight size={18} /></button></div></section>
      <div className="values-strip"><div><span>01</span><strong>Choisir à votre rythme</strong><p>Une galerie simple ou une visite immersive.</p></div><div><span>02</span><strong>Voir sous tous les angles</strong><p>Plusieurs photos et un zoom sur les détails.</p></div><div><span>03</span><strong>Préparer votre sélection</strong><p>Gardez vos coups de cœur à portée de main.</p></div></div>
    </main>

    <footer className="site-footer"><Brand small /><span>Une histoire de famille.<br />Et de beaux tissus.</span><button className="text-button" onClick={() => { setHelpOpen(true); setTouring(false); }}>Besoin d’un petit guide ? <CircleHelp size={14} /></button></footer>

    <Dialog.Root open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}><Dialog.Portal><Dialog.Overlay className="modal-overlay" /><Dialog.Content className="product-dialog" aria-describedby="product-description">{selected && <><Dialog.Close className="dialog-close" aria-label="Fermer la fiche du pagne"><X size={20} /></Dialog.Close><ProductViewer product={selected} key={selected.id} /><div className="product-details"><p className="eyebrow">{refLabel(selected)} · LA COLLECTION</p><Dialog.Title>{selected.name}</Dialog.Title><p className="detail-colors"><i style={{ backgroundColor: selected.accent }} />{selected.colors.join(' · ') || 'Explorez le motif'}</p><p className="detail-price">{priceLabel(selected)}{selected.unit && <small> / {selected.unit}</small>}</p><Dialog.Description id="product-description">{selected.description}</Dialog.Description><dl className="detail-specs"><div><dt>Motif</dt><dd>{selected.pattern || 'Voir les photos'}</dd></div><div><dt>Photos</dt><dd>{selected.photos.length} vues à explorer</dd></div>{selected.composition && <div><dt>Composition</dt><dd>{selected.composition}</dd></div>}{selected.dimensions && <div><dt>Dimensions</dt><dd>{selected.dimensions}</dd></div>}</dl><button className="primary-button" onClick={() => addToBag(selected.id)}><ShoppingBag size={17} />Ajouter à ma sélection <Plus size={16} /></button><p className="detail-selection-note"><Check size={13} /> Prenez le temps de choisir vos coups de cœur.</p><button className="text-button" onClick={() => { setSelected(null); setBagOpen(true); }}>Voir ma sélection ({bagCount}) <ArrowRight size={15} /></button><div className="detail-tip"><span>LE CONSEIL DE LA MAISON</span><p>La vue « Détail du motif » est idéale pour regarder la texture. Zoomez et faites glisser la photo.</p></div></div></>}</Dialog.Content></Dialog.Portal></Dialog.Root>

    <Dialog.Root open={bagOpen} onOpenChange={setBagOpen}><Dialog.Portal><Dialog.Overlay className="modal-overlay" /><Dialog.Content className="bag-drawer"><div className="drawer-heading"><div><p className="eyebrow">VOS COUPS DE CŒUR</p><Dialog.Title>Ma sélection <span>({bagCount})</span></Dialog.Title></div><Dialog.Close className="icon-button" aria-label="Fermer ma sélection"><X size={21} /></Dialog.Close></div><Dialog.Description className="drawer-description">Gardez les pagnes qui vous plaisent, puis partagez votre sélection avec la boutique.</Dialog.Description>{selectedItems.length ? <><div className="bag-items">{selectedItems.map(({ product, quantity }) => <div className="bag-item" key={product.id}><button className="bag-photo" onClick={() => { setBagOpen(false); setSelected(product); }} aria-label={`Revoir ${product.name}`}><img src={asset(product.photos[0].thumbnail)} alt={product.name} /></button><div className="bag-item-info"><small>{refLabel(product)}</small><strong>{product.name}</strong><p>{priceLabel(product)}</p><div className="quantity-control"><button aria-label={`Retirer une unité de ${product.name}`} onClick={() => changeQuantity(product.id, -1)}><Minus size={12} /></button><span aria-live="polite">{quantity}</span><button aria-label={`Ajouter une unité de ${product.name}`} onClick={() => changeQuantity(product.id, 1)} disabled={quantity >= 99}><Plus size={12} /></button></div></div><button className="icon-button remove-item" aria-label={`Retirer ${product.name} de ma sélection`} onClick={() => { setBag((items) => items.filter((item) => item.id !== product.id)); setCopied(false); }}><Trash2 size={16} /></button></div>)}</div><div className="bag-summary"><p><span>Votre sélection</span><strong>{bagCount} pagne{bagCount > 1 ? 's' : ''}</strong></p><small>La boutique confirmera les prix et la disponibilité.</small>{shop.whatsapp ? <a className="primary-button" href={`https://wa.me/${shop.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(selectionText())}`} target="_blank" rel="noopener noreferrer">Partager sur WhatsApp <ArrowRight size={17} /></a> : <button className="primary-button" onClick={copySelection}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'Sélection copiée' : 'Copier ma sélection'}</button>}<details className="selection-text"><summary>Voir le texte à partager <ChevronDown size={13} /></summary><textarea readOnly aria-label="Texte de ma sélection" value={selectionText()} onFocus={(event) => event.target.select()} /></details></div></> : <div className="empty-bag"><ShoppingBag size={34} strokeWidth={1} /><h2>Vos coups de cœur<br />commencent ici.</h2><p>Ouvrez un pagne et ajoutez-le à votre sélection.</p><Dialog.Close className="primary-button">Découvrir la collection <ArrowRight size={17} /></Dialog.Close></div>}</Dialog.Content></Dialog.Portal></Dialog.Root>

    <Dialog.Root open={helpOpen} onOpenChange={setHelpOpen}><Dialog.Portal><Dialog.Overlay className="modal-overlay" /><Dialog.Content className="help-dialog"><Dialog.Close className="dialog-close" aria-label="Fermer le guide"><X size={20} /></Dialog.Close><p className="eyebrow">BIENVENUE DANS LA MAISON</p><Dialog.Title>Une visite toute simple.</Dialog.Title><Dialog.Description>Choisissez la façon de découvrir les pagnes qui vous convient.</Dialog.Description><ol><li><span>01</span><div><strong>Regardez autour de vous.</strong><p>Glissez dans la boutique. Utilisez les flèches à l’écran pour avancer, ou lancez la visite guidée.</p></div></li><li><span>02</span><div><strong>Approchez un pagne.</strong><p>Cliquez sur sa photo dans la boutique ou dans la galerie. Parcourez les vues, zoomez et glissez pour regarder les détails.</p></div></li><li><span>03</span><div><strong>Gardez vos coups de cœur.</strong><p>Ajoutez des pagnes à votre sélection. Vous pourrez copier la liste et la partager avec la boutique.</p></div></li></ol><p className="keyboard-note">Au clavier dans la boutique : flèches pour avancer et tourner, ZQSD ou WASD pour se déplacer. Sur téléphone : glissez pour regarder et pincez pour zoomer.</p><Dialog.Close className="primary-button">C’est parti <ArrowRight size={17} /></Dialog.Close></Dialog.Content></Dialog.Portal></Dialog.Root>

    <div className={`toast ${notice ? 'is-visible' : ''}`} role="status" aria-live="polite">{notice && <><Check size={16} /><span>{notice}</span></>}</div>
  </>;
}
