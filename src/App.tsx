import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DropdownMenu } from 'radix-ui';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Box, Check, ChevronDown, ChevronRight, CircleHelp, Copy, Heart, Settings, LayoutGrid, Maximize2, Minus, Pause, Play, Plus, RotateCcw, Search, ShoppingBag, Trash2, X } from 'lucide-react';
import catalogue from './catalogue.json';
import shop from '../config/boutique.json';
import { findProducts, readBag } from './lib/catalogue';
import type { Product, BagItem } from './lib/types';
import type { SceneHandle } from './components/ShopScene';
import ProductViewer from './components/ProductViewer';
import OrderForm from './components/OrderForm';
import { asset } from './lib/assets';
import { imageVariant, warmImage, canPrefetch } from './lib/images';
import ProgressiveImage from './components/ProgressiveImage';
import { availabilityLabel, occasions, productOccasions, readFavorites } from './lib/catalogue-features';
import { fetchCatalogue, type CatalogueDocument } from './lib/catalogue-client';
import { wrappedIndex } from './lib/scene-navigation';

const ShopScene = lazy(() => import('./components/ShopScene'));
const initialProducts = catalogue as Product[];
const CatalogueAdmin = lazy(() => import('./components/CatalogueAdmin'));
const SAVED_KEY = 'maison-faso-favoris-v1';
const BAG_KEY = 'maison-des-pagnes-selection-v1';
const FAVORITE_KEY = 'maison-des-pagnes-prefere-v1';
function loadFavorite() {
  try { const id = localStorage.getItem(FAVORITE_KEY); return id && /^[a-zA-Z0-9-]{1,80}$/.test(id) ? id : ''; }
  catch { return ''; }
}
const priceLabel = (product: Product) => product.price === null ? 'Prix sur demande' : shop.currency === 'XOF' ? `${new Intl.NumberFormat(shop.locale).format(product.price)} CFA` : new Intl.NumberFormat(shop.locale, { style: 'currency', currency: shop.currency }).format(product.price);
function loadBag() { try { return readBag(localStorage.getItem(BAG_KEY)); } catch { return []; } }

function Brand({ small = false }: { small?: boolean }) {
  return <span className={`brand ${small ? 'brand-small' : ''}`}><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M9 34V13l15 18 15-18v21M14 10l10 12 10-12" /></svg><span>{shop.name}<small>{shop.tagline}</small></span></span>;
}

export default function App() {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [adminOpen, setAdminOpen] = useState(() => new URLSearchParams(location.search).get('gestion') === '1');
  const [adminAllowed, setAdminAllowed] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>(() => { try { return readFavorites(localStorage.getItem(SAVED_KEY)); } catch { return []; } });
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [occasion, setOccasion] = useState('');
  const [scenePage, setScenePage] = useState(0);
  const [sceneFocusIndex, setSceneFocusIndex] = useState(-1);
  const [catalogueError, setCatalogueError] = useState('');
  const [query, setQuery] = useState('');
  const [color, setColor] = useState('');
  const [sort, setSort] = useState('collection');
  const [view, setView] = useState<'boutique' | 'galerie'>('boutique');
  const [intro, setIntro] = useState(true);
  const [touring, setTouring] = useState(false);
  const [imageProgress, setImageProgress] = useState({ loaded: 0, total: 0 });
  const onProgress = useCallback((loaded: number, total: number) => { setImageProgress({ loaded, total }); setReady(loaded === total); }, []);
  const [ready, setReady] = useState(false);
  const [sceneError, setSceneError] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<Product | null>(null);
  const [favoriteId, setFavoriteId] = useState(loadFavorite);
  const favorite = products.find((product) => product.id === favoriteId) ?? products[0];
  const chosenFeatured = Boolean(favoriteId && products.some(p=>p.id===favoriteId));
  const [bag, setBag] = useState<BagItem[]>(loadBag);
  const [orderOpen, setOrderOpen] = useState(false);
  const [customOrder, setCustomOrder] = useState(false);
  const [bagOpen, setBagOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const scene = useRef<SceneHandle>(null);
  const stage = useRef<HTMLElement>(null);
  const collection = useRef<HTMLElement>(null);
  const search = useRef<HTMLInputElement>(null);

  const visible = useMemo(() => findProducts(products, query, color, sort).filter(p => (!onlyFavorites || savedIds.includes(p.id)) && (!occasion || productOccasions(p).includes(occasion))), [products, query, color, sort, onlyFavorites, savedIds, occasion]);
  const pageCount = Math.max(1, Math.ceil(visible.length / 12));
  const safePage = Math.min(scenePage, pageCount - 1);
  const sceneProducts = useMemo(() => visible.slice(safePage * 12, safePage * 12 + 12), [visible, safePage]);
  const colors = useMemo(() => [...new Set(products.flatMap((product) => product.colors))], [products]);
  const focusedSceneProduct = sceneProducts[sceneFocusIndex];
  const bagCount = bag.reduce((count, item) => count + item.quantity, 0);
  const hoveredProduct = visible.find((product) => product.id === hovered);
  const selectedItems = bag.flatMap((item) => { const product = products.find((p) => p.id === item.id); return product ? [{ ...item, product }] : []; });
  const interrupt = useCallback(() => setTouring(false), []);
  const onReady = useCallback(() => setReady(true), []);
  const onError = useCallback(() => { setSceneError(true); setView('galerie'); setTouring(false); setNotice('La galerie est disponible sur cet appareil.'); }, []);
  const onSelect = useCallback((id: string) => { const product = products.find((p) => p.id === id); if (product) { setSelected(product); setTouring(false); } }, [products]);

  useEffect(() => { try { localStorage.setItem(BAG_KEY, JSON.stringify(bag)); } catch { /* La sélection fonctionne aussi sans stockage local. */ } }, [bag]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 4200); return () => clearTimeout(timer); }, [notice]);
  useEffect(() => {
    const update = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);
  useEffect(() => { setTouring(false); setHovered(null); if (query || color) setIntro(false); scene.current?.reset(); setScenePage(0); }, [query, color, sort]);

  function applyCatalogue(doc: CatalogueDocument) {
    const list=doc.products.filter(p=>p.published!==false); setProducts(list);
    setSelected(old=>old?list.find(p=>p.id===old.id)??null:null);
    setBag(old=>old.filter(item=>list.some(p=>p.id===item.id))); setCatalogueError('');
  }
  useEffect(() => { let alive=true; const refresh=()=>fetchCatalogue().then(doc=>{if(alive)applyCatalogue(doc);}).catch(()=>{if(alive)setCatalogueError('La disponibilité et les prix n’ont pas pu être actualisés. Réessayez avant de commander.');}); void refresh(); const focus=()=>{if(!document.hidden)void refresh();}; const timer=setInterval(focus,60000); window.addEventListener('focus',focus); return()=>{alive=false;clearInterval(timer);window.removeEventListener('focus',focus);}; }, []);
  useEffect(() => { fetch('/api/admin/session',{cache:'no-store'}).then(r=>setAdminAllowed(r.ok)).catch(()=>{}); }, []);
  useEffect(() => { try {localStorage.setItem(SAVED_KEY,JSON.stringify(savedIds));} catch { /* Favoris disponibles pendant la visite. */ } }, [savedIds]);
  useEffect(() => {setScenePage(0);if(occasion||onlyFavorites)setIntro(false);setTouring(false);},[occasion,onlyFavorites]);
  function toggleSaved(id:string) { const already=savedIds.includes(id);setSavedIds(ids=>ids.includes(id)?ids.filter(item=>item!==id):[...ids,id]);setNotice(already?'Pagne retiré de vos favoris.':'Pagne ajouté à vos favoris, gardés sur cet appareil.'); }
  function sceneOverview() {setTouring(false);setSceneFocusIndex(-1);scene.current?.reset();}
  function browseScene(direction:number) {if(!sceneProducts.length)return;const index=wrappedIndex(sceneFocusIndex,direction,sceneProducts.length);setSceneFocusIndex(index);setIntro(false);setTouring(false);scene.current?.focus(sceneProducts[index].id);}
  useEffect(()=>{setSceneFocusIndex(-1);},[sceneProducts]);
  function clearFilters() {setQuery('');setColor('');setOccasion('');setOnlyFavorites(false);setScenePage(0);}
  function openOrder(custom = false) { setCustomOrder(custom); setOrderOpen(true); setBagOpen(false); setTouring(false); }
  function addToBag(id: string) {
    if(products.find(p=>p.id===id)?.availability==='unavailable'){setNotice('Ce pagne est indisponible pour le moment. Gardez-le dans vos favoris.');return;}
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
  function selectionText() { return `Bonjour, voici ma sélection chez ${shop.name} :\n\n${selectedItems.map(({ product, quantity }) => `• ${product.name} × ${quantity}`).join('\n')}\n\nPouvez-vous me confirmer les prix et la disponibilité ?`; }
  async function copySelection() {
    try { await navigator.clipboard.writeText(selectionText()); setCopied(true); setNotice('Sélection copiée. Vous pouvez la partager avec la boutique.'); }
    catch { setNotice('La copie automatique est indisponible. Sélectionnez le texte ci-dessous.'); }
  }
  async function toggleFullscreen() {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen(); else setNotice('Le plein écran n’est pas disponible sur cet appareil.'); }
    catch { setNotice('Le plein écran n’est pas disponible sur cet appareil.'); }
  }

  if(adminOpen) return <Suspense fallback={<div className="scene-loading">Ouverture de la gestion…</div>}><CatalogueAdmin onSaved={applyCatalogue} onClose={()=>{setAdminOpen(false);history.replaceState(null,'',location.pathname);void fetchCatalogue().then(applyCatalogue).catch(()=>{});}} /></Suspense>;
  return <>
    <div className="announcement"><span>Des motifs à découvrir. Des détails à aimer.</span><span className="announcement-end">Une boutique familiale <span aria-hidden="true">✦</span></span></div>
    <header className="site-header">
      <a className="brand-link" href="#" aria-label={`${shop.name}, accueil`} onClick={(event) => { event.preventDefault(); if (view !== 'boutique') setReady(false); setView(sceneError ? 'galerie' : 'boutique'); setIntro(true); clearFilters(); scene.current?.reset(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><Brand /></a>
      <form className="header-search" role="search" onSubmit={(event) => { event.preventDefault(); setIntro(false); collection.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>
        <Search size={18} aria-hidden="true" /><input ref={search} type="search" placeholder="Un motif, une couleur…" aria-label="Rechercher un pagne" value={query} onChange={(event) => setQuery(event.target.value)} />
        {query && <button type="button" aria-label="Effacer la recherche" onClick={() => { setQuery(''); search.current?.focus(); }}><X size={16} /></button>}
      </form>
      <nav className="header-actions" aria-label="Navigation principale"><button className="text-button collection-link" onClick={showGallery}>La collection</button><button className="favorites-nav" aria-pressed={onlyFavorites} aria-label={`Mes favoris, ${savedIds.filter(id=>products.some(p=>p.id===id)).length} pagnes`} onClick={()=>{setOnlyFavorites(v=>!v);showGallery();}}><Heart size={19} fill={onlyFavorites?'currentColor':'none'}/><span>Favoris</span><b>{savedIds.filter(id=>products.some(p=>p.id===id)).length}</b></button><button className="bag-button" onClick={() => { setBagOpen(true); setTouring(false); }} aria-label={`Ma sélection, ${bagCount} pagne${bagCount !== 1 ? 's' : ''}`}><ShoppingBag size={19} /><span>Ma sélection</span><b>{bagCount}</b></button></nav>
    </header>

    <main>
      <section className="collection" ref={collection} id="collection" aria-label="Collection de pagnes">
        <div className="collection-toolbar">
          <div className="view-switch" role="group" aria-label="Choisir une vue"><button aria-pressed={view === 'boutique'} disabled={sceneError} onClick={() => { if (view !== 'boutique') setReady(false); setView('boutique'); setIntro(false); }}><Box size={16} />Boutique 3D</button><button aria-pressed={view === 'galerie'} onClick={() => { setView('galerie'); setTouring(false); }}><LayoutGrid size={16} />Galerie</button></div>
          <div className="filters"><label><span className="sr-only">Choisir une occasion</span><select value={occasion} onChange={e=>setOccasion(e.target.value)}><option value="">Toutes les occasions</option>{occasions.map(o=><option key={o}>{o}</option>)}</select><ChevronDown size={13}/></label><label><span className="sr-only">Filtrer par couleur</span><select value={color} onChange={(event) => setColor(event.target.value)}><option value="">Toutes les couleurs</option>{colors.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={13} /></label><label><span className="sr-only">Trier la collection</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="collection">Ordre de la collection</option><option value="name">Nom, de A à Z</option>{products.some((p) => p.price !== null) && <option value="price">Prix croissant</option>}</select><ChevronDown size={13} /></label></div>
        </div>

        {catalogueError&&<p className="catalogue-refresh" role="status">{catalogueError}<button className="text-button" onClick={()=>void fetchCatalogue().then(applyCatalogue).catch(()=>setNotice('Actualisation indisponible. Réessayez.'))}>Actualiser</button></p>}
        {onlyFavorites&&<p className="favorites-note">Vos favoris sont gardés sur cet appareil. Appuyez sur le cœur pour en retirer un.</p>}
        {occasion&&<p className="favorites-note">Une sélection pour vous inspirer : chaque pagne peut accompagner d’autres occasions.</p>}
        {view === 'boutique' && pageCount>1&&<div className="scene-pages"><button className="text-button" disabled={safePage===0} onClick={()=>{setScenePage(p=>p-1);setTouring(false);setHovered(null);scene.current?.reset();}}><ArrowLeft size={16}/>Précédents</button><span>Salon {safePage+1} / {pageCount} · {visible.length} pagnes</span><button className="text-button" disabled={safePage===pageCount-1} onClick={()=>{setScenePage(p=>p+1);setTouring(false);setHovered(null);scene.current?.reset();}}>Suivants<ArrowRight size={16}/></button></div>}
        {view === 'boutique' && <div className="scene-heading"><span className="room-badge"><i aria-hidden="true" />{query || color || occasion || onlyFavorites ? 'Votre collection' : 'Le salon des pagnes'}</span><button className="stage-icon" aria-label="Comment visiter la boutique" onClick={() => setHelpOpen(true)}><CircleHelp size={19} /></button></div>}

        {view === 'boutique' ? <section className={`shop-stage ${intro ? 'with-intro' : ''}`} ref={stage} aria-label="Boutique immersive">
          <Suspense fallback={<div className="scene-loading"><span className="loading-ring" /><p>La boutique ouvre ses portes…</p></div>}><ShopScene key={safePage} ref={scene} products={sceneProducts} touring={touring} active={!selected && !bagOpen && !helpOpen && !orderOpen && !adminOpen} onSelect={onSelect} onHover={setHovered} onReady={onReady} onProgress={onProgress} onError={onError} onInterrupt={interrupt} /></Suspense>
          {!ready && <div className="loading-label" role="status">Préparation de votre visite… {imageProgress.total > 0 && `${imageProgress.loaded} / ${imageProgress.total} pagnes`}</div>}
          {intro && <div className="intro-card"><p className="eyebrow">BIENVENUE CHEZ {shop.name.toUpperCase()}</p><h1>Le Faso Dan Fani.<br />Le plaisir<br /><em>de choisir.</em></h1><p className="intro-text">Entrez, prenez votre temps.<br />Votre prochain pagne vous attend.</p><button className="primary-button" onClick={() => { setIntro(false); scene.current?.reset(); }}>Explorer la boutique <ArrowRight size={18} /></button><button className="intro-secondary" onClick={showGallery}>Voir les pagnes en galerie <ChevronRight size={15} /></button><div className="intro-detail"><span>01 — REGARDER</span><span>02 — CHOISIR</span></div></div>}
          {!intro && <div className="stage-title"><span className="eyebrow">UNE AUTRE FAÇON DE CHOISIR</span><p>Promenez-vous.<br /><em>Laissez-vous inspirer.</em></p></div>}
          {visible.length === 0 && <div className="empty-scene"><Search size={24} /><h2>Aucun pagne ne correspond.</h2><p>Essayez une autre couleur ou un mot plus simple.</p><button className="primary-button" onClick={clearFilters}>Revoir la collection <ArrowRight size={16} /></button></div>}
          {hoveredProduct && !intro && <div className="hover-card"><strong>{hoveredProduct.name}</strong><small>Cliquez pour découvrir les {hoveredProduct.photos.length} vues <ArrowRight size={12} /></small></div>}
          <div className="stage-bottomline"><span className="navigation-hint">Glissez pour regarder · cliquez sur un pagne</span><div className="stage-actions"><button className={`tour-button ${touring ? 'is-touring' : ''}`} onClick={() => { setIntro(false); setTouring((value) => !value); }} disabled={!ready || !visible.length} aria-pressed={touring}>{touring ? <Pause size={15} /> : <Play size={15} />}<span>{touring ? 'Pause' : 'Visite guidée'}</span></button><button className="stage-icon overview-button" aria-label="Retrouver la vue d’ensemble" onClick={sceneOverview}><RotateCcw size={16} /><span>Vue d’ensemble</span></button><button className="stage-icon" aria-label={fullscreen ? 'Quitter le plein écran' : 'Afficher en plein écran'} onClick={toggleFullscreen}><Maximize2 size={16} /></button></div></div>
          {!intro && <div className="movement-controls" aria-label="Déplacement dans la boutique"><div className="movement-pad"><button aria-label="Avancer" onClick={() => scene.current?.move('forward')}><ArrowUp size={16} /></button><div><button aria-label="Aller à gauche" onClick={() => scene.current?.move('left')}><ArrowLeft size={16} /></button><button aria-label="Reculer" onClick={() => scene.current?.move('back')}><ArrowDown size={16} /></button><button aria-label="Aller à droite" onClick={() => scene.current?.move('right')}><ArrowRight size={16} /></button></div></div><div className="scene-zoom"><button aria-label="Zoomer dans la boutique" onClick={() => scene.current?.zoom(-8)}><Plus size={17} /></button><button aria-label="Dézoomer dans la boutique" onClick={() => scene.current?.zoom(8)}><Minus size={17} /></button></div></div>}
        </section> : <div className="gallery-heading"><div><p className="eyebrow">LA COLLECTION</p><h1>Un motif.<br /><em>Votre histoire.</em></h1></div><p>Regardez les couleurs. Approchez les détails.<br />Choisissez le pagne qui vous ressemble.</p></div>}

        {view==='boutique'&&<div className="mobile-scene-navigation" aria-label="Parcourir les pagnes"><div className="mobile-scene-buttons"><button disabled={!ready||!sceneProducts.length} onClick={()=>browseScene(-1)} aria-label="Approcher le pagne précédent"><ArrowLeft size={20}/><span>Précédent</span></button><button onClick={sceneOverview}><RotateCcw size={18}/><span>Vue d’ensemble</span></button><button disabled={!ready||!sceneProducts.length} onClick={()=>browseScene(1)} aria-label="Approcher le pagne suivant"><span>Suivant</span><ArrowRight size={20}/></button></div>{focusedSceneProduct&&<button className="mobile-scene-product" onClick={()=>setSelected(focusedSceneProduct)}><span>{sceneFocusIndex+1} / {sceneProducts.length} · {focusedSceneProduct.name}</span><span>Voir les détails <ArrowRight size={16}/></span></button>}</div>}
        <div className="results-heading"><p role="status" aria-live="polite"><strong>{visible.length}</strong> pagne{visible.length !== 1 ? 's' : ''}{query ? <> pour « {query} »</> : color ? <> · {color}</> : ' à découvrir'}</p>{(query || color || occasion || onlyFavorites) && <button className="text-button" onClick={clearFilters}>Effacer les filtres <X size={13} /></button>}<span className="photos-note">Plusieurs vues, pour mieux choisir <span aria-hidden="true">↗</span></span></div>

        {view === 'galerie' && <div className="product-grid">{visible.map((product, index) => <article className="product-card" key={product.id}><div className="product-image-wrap"><button className="product-image" onPointerEnter={() => { if (canPrefetch()) void warmImage(imageVariant(product.photos[0].src).display); }} onFocus={() => { if (canPrefetch()) void warmImage(imageVariant(product.photos[0].src).display); }} onClick={() => setSelected(product)} aria-label={`Découvrir ${product.name}`}><ProgressiveImage key={product.id} className="product-cover" src={imageVariant(product.photos[0].src).scene} preview={imageVariant(product.photos[0].src).thumbnail} alt={product.name} loading={index < 4 ? "eager" : "lazy"} fetchPriority={index < 2 ? "high" : "auto"} /><span className="product-photo-count">{product.photos.length} vues</span><span className="product-discover">Découvrir <ArrowRight size={16} /></span></button><button className={`favorite-heart ${savedIds.includes(product.id)?'is-saved':''}`} aria-pressed={savedIds.includes(product.id)} aria-label={`${savedIds.includes(product.id)?'Retirer':'Ajouter'} ${product.name} ${savedIds.includes(product.id)?'de mes':'à mes'} favoris`} onClick={()=>toggleSaved(product.id)}><Heart size={21} fill={savedIds.includes(product.id)?'currentColor':'none'}/></button></div><div className="product-meta"><div><button className="product-name" onClick={() => setSelected(product)}>{product.name}</button><p className="product-color">{product.colors.join(' · ')}</p></div><button className="product-add" disabled={product.availability==='unavailable'} onClick={() => addToBag(product.id)} aria-label={`Ajouter ${product.name} à ma sélection`}><Plus size={18} /></button></div><p className="product-price">{priceLabel(product)}{product.unit && <small> / {product.unit}</small>}<small> · hors livraison</small></p><p className={`stock-label stock-${product.availability??'confirm'}`}>{availabilityLabel(product)}</p></article>)}</div>}
        {view === 'galerie' && !visible.length && <div className="empty-gallery"><Search size={26} /><h2>{onlyFavorites?'Vos favoris attendent vos coups de cœur.':'Aucun pagne ne correspond à votre recherche.'}</h2><p>{onlyFavorites?'Touchez le cœur d’un pagne pour le retrouver ici.':'Essayez une autre occasion, une couleur ou un motif.'}</p><button className="primary-button" onClick={clearFilters}>Revoir tous les pagnes <ArrowRight size={16} /></button></div>}
      </section>

      <section className="custom-request-banner" aria-label="Demander un pagne à rechercher"><div><p className="eyebrow">UNE ENVIE EN PARTICULIER ?</p><h2>Vous cherchez un autre pagne ?</h2><p>Envoyez-nous sa photo et vos souhaits. Nous vous confirmerons les possibilités et le prix sur WhatsApp.</p></div><button className="primary-button" onClick={() => openOrder(true)}>Demander ce pagne <ArrowRight size={18}/></button></section>

      <section className="detail-story" aria-label="À la une"><div className={`detail-story-photo${chosenFeatured ? ' detail-story-photo-selected' : ''}`}>{<img src={asset(imageVariant(chosenFeatured ? favorite.photos[0].src : 'pagne-default.png').display)} alt={chosenFeatured?favorite.name:'Faso Dan Fani, visuel à la une'} loading="lazy" />}<span>À LA UNE.</span></div><div className="detail-story-copy"><p className="eyebrow">À LA UNE</p><h2>La beauté est<br /><em>dans les détails.</em></h2><p>Les motifs se révèlent, le tissage prend vie. Choisissez le pagne à mettre à la une et explorez ses détails. Votre choix reste affiché jusqu’à ce que vous le changiez.</p><div className="favorite-picker"><span id="favorite-picker-label">Choisir le pagne à la une</span><DropdownMenu.Root><DropdownMenu.Trigger className="favorite-trigger" aria-labelledby="favorite-picker-label favorite-picker-value"><img src={asset(imageVariant(chosenFeatured ? favorite.photos[0].src : 'pagne-default.png').thumbnail)} alt="" /><span id="favorite-picker-value">{chosenFeatured ? favorite.name : 'Visuel par défaut'}{!chosenFeatured && <small>Rayures lavande</small>}</span><ChevronDown size={16} /></DropdownMenu.Trigger><DropdownMenu.Portal><DropdownMenu.Content className="favorite-menu" sideOffset={7} align="start" collisionPadding={16}><DropdownMenu.RadioGroup value={favoriteId} onValueChange={(id) => { setFavoriteId(id); try { localStorage.setItem(FAVORITE_KEY, id); setNotice('Votre choix à la une est mémorisé sur cet appareil.'); } catch { setNotice('Votre choix est affiché. Ce navigateur ne permet pas de le mémoriser après fermeture.'); } }}><DropdownMenu.RadioItem className="favorite-option" value=""><img src={asset(imageVariant('pagne-default.png').thumbnail)} alt="" /><span>Visuel par défaut<small>Rayures lavande</small></span><DropdownMenu.ItemIndicator><Check size={16} /></DropdownMenu.ItemIndicator></DropdownMenu.RadioItem>{products.map((product) => <DropdownMenu.RadioItem className="favorite-option" key={product.id} value={product.id} textValue={product.name}><img src={asset(imageVariant(product.photos[0].src).thumbnail)} alt="" loading="lazy" /><span>{product.name}</span><DropdownMenu.ItemIndicator><Check size={16} /></DropdownMenu.ItemIndicator></DropdownMenu.RadioItem>)}</DropdownMenu.RadioGroup></DropdownMenu.Content></DropdownMenu.Portal></DropdownMenu.Root></div><p className="favorite-reference" role="status">{favorite?.name} · {favorite && priceLabel(favorite)}</p><button className="underlined-button" disabled={!favorite} onClick={() => favorite && setSelected(favorite)}>Découvrir ce pagne <ArrowRight size={18} /></button></div></section>
      <section className="delivery-info" aria-label="Livraison et retrait"><p className="eyebrow">À VOTRE RENCONTRE</p><h2>Vos pagnes, chez vous.</h2><div><p><strong>Prix hors livraison</strong>Le prix affiché concerne le pagne. Les frais de livraison sont indiqués par la boutique avant votre confirmation.</p><p><strong>Ouagadougou et Bobo-Dioulasso</strong>Livraison proposée dans ces deux villes. Pour une autre ville du Burkina Faso, la possibilité et le délai seront étudiés selon la situation générale.</p><p><strong>Retrait à Bobo-Dioulasso</strong>Le lieu et l’heure sont convenus sur WhatsApp. La date souhaitée reste à confirmer selon le stock et le mode de réception.</p></div></section>
      <section className="culture-note" aria-label="Le Faso Dan Fani"><p className="eyebrow">LE PAGNE TISSÉ DE LA PATRIE</p><h2>Le Faso Dan Fani,<br /><em>une fierté à porter.</em></h2><p>Au Burkina Faso, le Faso Dan Fani fait vivre une tradition de tissage et une identité culturelle forte. Porté au quotidien ou pour les grandes occasions, il trouve sa place dans des tenues traditionnelles comme dans des créations actuelles.</p><a href="https://www.apexb.bf/labels/faso-dan-fani" target="_blank" rel="noopener noreferrer">Découvrir son histoire auprès de l’Agence pour la promotion des exportations <ArrowRight size={14} /></a></section>
      <div className="values-strip"><div><span>01</span><strong>Choisir à votre rythme</strong><p>Une galerie simple ou une visite immersive.</p></div><div><span>02</span><strong>Voir sous tous les angles</strong><p>Plusieurs photos et un zoom sur les détails.</p></div><div><span>03</span><strong>Préparer votre sélection</strong><p>Gardez vos coups de cœur à portée de main.</p></div></div>
    </main>

    <footer className="site-footer"><Brand small /><span>Une histoire de famille.<br />Et de beaux pagnes tissés.</span>{adminAllowed&&<button className="text-button" onClick={()=>{setAdminOpen(true);history.replaceState(null,'','?gestion=1');}}><Settings size={16}/>Gérer la boutique</button>}<button className="text-button" onClick={() => { setHelpOpen(true); setTouring(false); }}>Besoin d’un petit guide ? <CircleHelp size={14} /></button></footer>

    <Dialog.Root open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}><Dialog.Portal><Dialog.Overlay className="modal-overlay" /><Dialog.Content className="product-dialog" aria-describedby="product-description">{selected && <><Dialog.Close className="dialog-close" aria-label="Fermer la fiche du pagne"><X size={20} /></Dialog.Close><ProductViewer product={selected} key={selected.id+'-'+selected.photos.map(p=>p.src).join('|')} /><div className="product-details"><p className="eyebrow">FASO DAN FANI</p><Dialog.Title>{selected.name}</Dialog.Title><p className="detail-colors"><i style={{ backgroundColor: selected.accent }} />{selected.colors.join(' · ') || 'Explorez le motif'}</p><p className="detail-price">{priceLabel(selected)}{selected.unit && <small> / {selected.unit}</small>}</p><p className={`stock-label stock-${selected.availability??'confirm'}`}>{availabilityLabel(selected)}</p><p className="detail-delivery">Prix du pagne hors livraison. Livraison à Ouagadougou et Bobo-Dioulasso ; autres villes sur confirmation.</p><button className="text-button favorite-detail" aria-pressed={savedIds.includes(selected.id)} onClick={()=>toggleSaved(selected.id)}><Heart size={19} fill={savedIds.includes(selected.id)?'currentColor':'none'}/>{savedIds.includes(selected.id)?'Retirer de mes favoris':'Garder dans mes favoris'}</button><Dialog.Description id="product-description">{selected.description}</Dialog.Description><dl className="detail-specs">{productOccasions(selected).length>0&&<div><dt>Idées d’occasions</dt><dd>{productOccasions(selected).join(' · ')}</dd></div>}<div><dt>Motif</dt><dd>{selected.pattern || 'Voir les photos'}</dd></div><div><dt>Photos</dt><dd>{selected.photos.length} vues à explorer</dd></div>{selected.composition && <div><dt>Composition</dt><dd>{selected.composition}</dd></div>}{selected.dimensions && <div><dt>Dimensions</dt><dd>{selected.dimensions}</dd></div>}</dl><button className="primary-button" disabled={selected.availability==='unavailable'} onClick={() => addToBag(selected.id)}><ShoppingBag size={17} />{selected.availability==='unavailable'?'Indisponible pour le moment':'Ajouter à ma sélection'} <Plus size={16} /></button><p className="detail-selection-note"><Check size={13} /> Prenez le temps de choisir vos coups de cœur.</p><button className="text-button" onClick={() => { setSelected(null); setBagOpen(true); }}>Voir ma sélection ({bagCount}) <ArrowRight size={15} /></button><div className="detail-tip"><span>LE CONSEIL DE LA MAISON</span><p>La vue « Détail du motif » est idéale pour regarder la texture. Zoomez et faites glisser la photo.</p></div></div></>}</Dialog.Content></Dialog.Portal></Dialog.Root>

    {orderOpen && <OrderForm items={customOrder ? [] : selectedItems} initialCustom={customOrder} whatsapp={shop.whatsapp} onClose={() => {setOrderOpen(false);void fetchCatalogue().then(applyCatalogue).catch(()=>{});}} />}
    <Dialog.Root open={bagOpen} onOpenChange={setBagOpen}><Dialog.Portal><Dialog.Overlay className="modal-overlay" /><Dialog.Content className="bag-drawer"><div className="drawer-heading"><div><p className="eyebrow">VOS COUPS DE CŒUR</p><Dialog.Title>Ma sélection <span>({bagCount})</span></Dialog.Title></div><Dialog.Close className="icon-button" aria-label="Fermer ma sélection"><X size={21} /></Dialog.Close></div><Dialog.Description className="drawer-description">Gardez les pagnes qui vous plaisent, puis partagez votre sélection avec la boutique.</Dialog.Description>{selectedItems.length ? <><div className="bag-items">{selectedItems.map(({ product, quantity }) => <div className="bag-item" key={product.id}><button className="bag-photo" onClick={() => { setBagOpen(false); setSelected(product); }} aria-label={`Revoir ${product.name}`}><img src={asset(imageVariant(product.photos[0].src).thumbnail)} alt={product.name} /></button><div className="bag-item-info"><strong>{product.name}</strong><p>{priceLabel(product)}</p><div className="quantity-control"><button aria-label={`Retirer une unité de ${product.name}`} onClick={() => changeQuantity(product.id, -1)}><Minus size={12} /></button><span aria-live="polite">{quantity}</span><button aria-label={`Ajouter une unité de ${product.name}`} onClick={() => changeQuantity(product.id, 1)} disabled={quantity >= 99}><Plus size={12} /></button></div></div><button className="icon-button remove-item" aria-label={`Retirer ${product.name} de ma sélection`} onClick={() => { setBag((items) => items.filter((item) => item.id !== product.id)); setCopied(false); }}><Trash2 size={16} /></button></div>)}</div><div className="bag-summary"><p><span>Votre sélection</span><strong>{bagCount} pagne{bagCount > 1 ? 's' : ''}</strong></p><small>Prix des pagnes hors livraison. Disponibilité et frais de livraison confirmés sur WhatsApp.</small><button className="primary-button" onClick={() => openOrder()}>Commander avec un bon PDF <ArrowRight size={17} /></button><details className="selection-text"><summary>Voir le texte à partager <ChevronDown size={13} /></summary><textarea readOnly aria-label="Texte de ma sélection" value={selectionText()} onFocus={(event) => event.target.select()} /></details></div></> : <div className="empty-bag"><ShoppingBag size={34} strokeWidth={1} /><h2>Vos coups de cœur<br />commencent ici.</h2><p>Ouvrez un pagne et ajoutez-le à votre sélection.</p><Dialog.Close className="primary-button">Découvrir la collection <ArrowRight size={17} /></Dialog.Close><button className="text-button" onClick={() => openOrder(true)}>Demander un pagne avec une photo <ArrowRight size={15}/></button></div>}</Dialog.Content></Dialog.Portal></Dialog.Root>

    <Dialog.Root open={helpOpen} onOpenChange={setHelpOpen}><Dialog.Portal><Dialog.Overlay className="modal-overlay" /><Dialog.Content className="help-dialog"><Dialog.Close className="dialog-close" aria-label="Fermer le guide"><X size={20} /></Dialog.Close><p className="eyebrow">BIENVENUE DANS LA MAISON</p><Dialog.Title>Une visite toute simple.</Dialog.Title><Dialog.Description>Choisissez la façon de découvrir les pagnes qui vous convient.</Dialog.Description><ol><li><span>01</span><div><strong>Regardez autour de vous.</strong><p>Glissez dans la boutique. Sur téléphone, utilisez Précédent et Suivant pour approcher les pagnes. Vue d’ensemble retrouve votre point de départ. Vous pouvez aussi lancer la visite guidée.</p></div></li><li><span>02</span><div><strong>Approchez un pagne.</strong><p>Cliquez sur sa photo dans la boutique ou dans la galerie. Parcourez les vues, zoomez et glissez pour regarder les détails.</p></div></li><li><span>03</span><div><strong>Gardez vos coups de cœur.</strong><p>Ajoutez des pagnes à votre sélection. Vous pourrez copier la liste et la partager avec la boutique.</p></div></li></ol><p className="keyboard-note">Au clavier dans la boutique : flèches pour avancer et tourner, ZQSD ou WASD pour se déplacer. Sur téléphone : glissez pour regarder et pincez pour zoomer.</p><Dialog.Close className="primary-button">C’est parti <ArrowRight size={17} /></Dialog.Close></Dialog.Content></Dialog.Portal></Dialog.Root>

    <div className={`toast ${notice ? 'is-visible' : ''}`} role="status" aria-live="polite">{notice && <><Check size={16} /><span>{notice}</span></>}</div>
  </>;
}
