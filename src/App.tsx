import {LOOM_VIEWBOX,LOOM_MARKUP} from './lib/brand-mark';
import EditorialPage from './components/EditorialPage';
import {editorialKind,editorialLinks,editorialPath} from './lib/editorial-pages.js';
import {commercePolicy,deliveryPath} from './lib/commerce-policy.js';
import {photoAlt} from './lib/product-seo.js';
import {localizeProduct} from './lib/product-language';
import {t,useLanguage,localeFor,shopFetch,LanguageSwitcher} from './lib/i18n';
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DropdownMenu } from 'radix-ui';
import { ArrowRight, Check, ChevronDown, CircleHelp, Heart, Settings, Phone, MessageCircle, Minus, Plus, Search, ShoppingBag, Trash2, X } from 'lucide-react';
import catalogue from './catalogue.json';
import shop from '../config/boutique.json';
import { findProducts, readBag } from './lib/catalogue';
import type { Product, BagItem } from './lib/types';
import ProductViewer from './components/ProductViewer';
import ProductDetails from './components/ProductDetails';
import {productPath,productIdFromPath} from './lib/product-seo.js';
import {usePageMetadata} from './lib/page-metadata';
import HeroCarousel from './components/HeroCarousel';
import CollectionCarousel from './components/CollectionCarousel';
import { groupCollectionRows } from './lib/collection-rows.js';
import InstallNotice from './components/InstallNotice';
import StorefrontHeader from './components/StorefrontHeader';
import OrderForm from './components/OrderForm';
import { asset } from './lib/assets';
import { imageVariant, warmImage, canPrefetch } from './lib/images';
import ProgressiveImage from './components/ProgressiveImage';
import { availabilityLabel, occasions, productOccasions, readFavorites } from './lib/catalogue-features';
import { fetchCatalogue, type CatalogueDocument } from './lib/catalogue-client';

const initialProducts = catalogue as Product[];
const CatalogueAdmin = lazy(() => import('./components/ManagementDashboard'));
const OrderTracking=lazy(()=>import('./components/OrderTracking'));
const SAVED_KEY = 'maison-faso-favoris-v1';
const contactLabel = (number:string) => `+${number.slice(0,3)} ${number.slice(3).match(/.{1,2}/g)?.join(' ')}`;
const BAG_KEY = 'maison-des-pagnes-selection-v1';
const FAVORITE_KEY = 'maison-des-pagnes-prefere-v1';
function loadFavorite() {
  try { const id = localStorage.getItem(FAVORITE_KEY); return id && /^[a-zA-Z0-9-]{1,80}$/.test(id) ? id : ''; }
  catch { return ''; }
}
const priceLabel = (product: Product) => product.price === null ? t("Prix sur demande") : shop.currency === 'XOF' ? `${new Intl.NumberFormat(localeFor()).format(product.price)} CFA` : new Intl.NumberFormat(localeFor(), { style: 'currency', currency: shop.currency }).format(product.price);
function loadBag() { try { return readBag(localStorage.getItem(BAG_KEY)); } catch { return []; } }

function Brand({ small = false }: { small?: boolean }) {
  return <span className={`brand ${small ? 'brand-small' : ''}`}><svg className="brand-emblem" viewBox={LOOM_VIEWBOX} aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{__html:LOOM_MARKUP}} /><span>{shop.name}<small>{t(shop.tagline)}</small></span></span>;
}

export default function App() {
 const language=useLanguage();
  const [rawProducts, setProducts] = useState<Product[]>(initialProducts);
  const products=useMemo(()=>rawProducts.map(p=>localizeProduct(p,language)),[rawProducts,language]);
  const [adminOpen, setAdminOpen] = useState(() => new URLSearchParams(location.search).get('gestion') === '1');
  const [adminAllowed, setAdminAllowed] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>(() => { try { return readFavorites(localStorage.getItem(SAVED_KEY)); } catch { return []; } });
  const [onlyFavorites, setOnlyFavorites] = useState(()=>new URLSearchParams(location.search).get('favoris')==='1');
  const [occasion, setOccasion] = useState('');
  const [catalogueError, setCatalogueError] = useState('');
  const [catalogueReady,setCatalogueReady]=useState(false);
  const [query, setQuery] = useState(()=>new URLSearchParams(location.search).get('q')??'');
  const [color, setColor] = useState('');
  const [sort, setSort] = useState('collection');
  const [selectedStored, setSelected] = useState<Product | null>(null);
  const selected=selectedStored?products.find(p=>p.id===selectedStored.id)??null:null;
  const editorial=editorialKind(location.pathname);
  const onEditorialPage=!!editorial;
  const policy=commercePolicy(language);
  const onProductPage=location.pathname.startsWith('/pagnes/');
  const onCollectionPage=location.pathname.replace(/\/$/,'')==='/collection';
  const pageId=productIdFromPath(location.pathname);
  const rawPageProduct=rawProducts.find(p=>p.id===pageId&&p.published!==false);
  const pageProduct=products.find(p=>p.id===pageId&&p.published!==false);
  const homeHref=language==='en'?'/?lang=en':'/';
  const collectionHref=language==='en'?'/collection?lang=en':'/collection';
  const productHref=(p:Product)=>productPath(rawProducts.find(raw=>raw.id===p.id)??p,language);
  usePageMetadata(rawPageProduct,language,onProductPage,catalogueReady,rawProducts,onCollectionPage,editorial);
  const [favoriteId, setFavoriteId] = useState(loadFavorite);
  const favorite = products.find((product) => product.id === favoriteId) ?? products[0];
  const chosenFeatured = Boolean(favoriteId && products.some(p=>p.id===favoriteId));
  const [bag, setBag] = useState<BagItem[]>(loadBag);
  const [orderOpen, setOrderOpen] = useState(false);
  const [customOrder, setCustomOrder] = useState(false);
  const [bagOpen, setBagOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const collection = useRef<HTMLElement>(null);
  const search = useRef<HTMLInputElement>(null);

  const visible = useMemo(() => findProducts(products, query, color, sort,language).filter(p => (!onlyFavorites || savedIds.includes(p.id)) && (!occasion || productOccasions(p).includes(occasion))), [products, query, color, sort, onlyFavorites, savedIds, occasion,language]);
  const colors = useMemo(() => [...new Set(products.flatMap((product) => product.colors))], [products]);
  const bagCount = bag.reduce((count, item) => count + item.quantity, 0);
  const selectedItems = bag.flatMap((item) => { const product = products.find((p) => p.id === item.id); return product ? [{ ...item, product }] : []; });
  useEffect(() => { try { localStorage.setItem(BAG_KEY, JSON.stringify(bag)); } catch { /* La sélection fonctionne aussi sans stockage local. */ } }, [bag]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 4200); return () => clearTimeout(timer); }, [notice]);
  function applyCatalogue(doc: CatalogueDocument) {
    const list=doc.products.filter(p=>p.published!==false); setProducts(list);setCatalogueReady(true);
    setSelected(old=>old?list.find(p=>p.id===old.id)??null:null);
    setBag(old=>old.filter(item=>list.some(p=>p.id===item.id))); setCatalogueError('');
  }
  useEffect(() => { let alive=true; const refresh=()=>fetchCatalogue().then(doc=>{if(alive)applyCatalogue(doc);}).catch(()=>{if(alive)setCatalogueError(t("La disponibilité et les prix n’ont pas pu être actualisés. Réessayez avant de commander."));}); void refresh(); const focus=()=>{if(!document.hidden)void refresh();}; const timer=setInterval(focus,60000); window.addEventListener('focus',focus); return()=>{alive=false;clearInterval(timer);window.removeEventListener('focus',focus);}; }, []);
  useEffect(() => { shopFetch('/api/admin/session',{cache:'no-store'}).then(r=>setAdminAllowed(r.ok)).catch(()=>{}); }, []);
  useEffect(() => { try {localStorage.setItem(SAVED_KEY,JSON.stringify(savedIds));} catch { /* Favoris disponibles pendant la visite. */ } }, [savedIds]);
  function toggleSaved(id:string) { const already=savedIds.includes(id);setSavedIds(ids=>ids.includes(id)?ids.filter(item=>item!==id):[...ids,id]);setNotice(already?t("Pagne retiré de vos favoris."):t("Pagne ajouté à vos favoris, gardés sur cet appareil.")); }
  function clearFilters() {setQuery('');setColor('');setOccasion('');setOnlyFavorites(false);}
  function openOrder(custom = false) { setCustomOrder(custom); setOrderOpen(true); setBagOpen(false); }
  function addToBag(id: string) {
    if(products.find(p=>p.id===id)?.availability==='unavailable'){setNotice(t("Ce pagne est indisponible pour le moment. Gardez-le dans vos favoris."));return;}
    setBag((items) => {
      const existing = items.find((item) => item.id === id);
      if (existing) return items.map((item) => item.id === id ? { ...item, quantity: Math.min(99, item.quantity + 1) } : item);
      return [...items, { id, quantity: 1 }];
    });
     setNotice(t("Pagne ajouté à votre sélection."));
  }
  function changeQuantity(id: string, change: number) {
    setBag((items) => items.map((item) => item.id === id ? { ...item, quantity: Math.min(99, item.quantity + change) } : item).filter((item) => item.quantity > 0));
  }
  function showGallery() { if(!onCollectionPage){location.assign(collectionHref);return;} collection.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }); }
  function selectionText() { return t("Bonjour, voici ma sélection chez {0} :\n\n{1}\n\nPouvez-vous me confirmer les prix et la disponibilité ?",shop.name,selectedItems.map(({ product, quantity }) => `• ${product.name} × ${quantity}`).join('\n')); }
  const collectionContent=(<>
      <section className={`collection${onCollectionPage?' collection-full':''}`} ref={collection} id="collection" aria-label={t("Collection de pagnes")}>
        <div className="catalogue-title"><div><p className="eyebrow">{t(onCollectionPage?"FASO DAN FANI":"LA COLLECTION")}</p><>{onCollectionPage?<h1>{t("La collection")}</h1>:<h2>{t("Trouvez votre coup de cœur.")}</h2>}</></div><p>{language==='en'?"Explore our Faso Dan Fani pagnes and choose from the available colours and patterns.":"Explorez nos pagnes Faso Dan Fani et choisissez votre modèle parmi les couleurs et les motifs disponibles."}</p></div>
        <div className="collection-toolbar">
          <div className="filters"><label><span className="sr-only">{t("Choisir une occasion")}</span><select value={occasion} onChange={e=>setOccasion(e.target.value)}><option value="">{t("Toutes les occasions")}</option>{occasions.map(o=><option key={o} value={o}>{t(o)}</option>)}</select><ChevronDown size={13}/></label><label><span className="sr-only">{t("Filtrer par couleur")}</span><select value={color} onChange={(event) => setColor(event.target.value)}><option value="">{t("Toutes les couleurs")}</option>{colors.map((item) => <option key={item} value={item}>{t(item)}</option>)}</select><ChevronDown size={13} /></label><label><span className="sr-only">{t("Trier la collection")}</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="collection">{t("Ordre de la collection")}</option><option value="name">{t("Nom, de A à Z")}</option>{products.some((p) => p.price !== null) && <option value="price">{t("Prix croissant")}</option>}</select><ChevronDown size={13} /></label></div>
        </div>

        {catalogueError&&<p className="catalogue-refresh" role="status">{t(catalogueError)}<button className="text-button" onClick={()=>void fetchCatalogue().then(applyCatalogue).catch(()=>setNotice(t("Actualisation indisponible. Réessayez.")))}>{t("Actualiser")}</button></p>}
        {onlyFavorites&&<p className="favorites-note">{t("Vos favoris sont gardés sur cet appareil. Appuyez sur le cœur pour en retirer un.")}</p>}
        {occasion&&<p className="favorites-note">{t("Une sélection pour vous inspirer : chaque pagne peut accompagner d’autres occasions.")}</p>}
        {(query || color || occasion || onlyFavorites) && <div className="results-heading"><p role="status" aria-live="polite">{visible.length?t("Votre sélection, selon vos envies."):t("Aucun pagne ne correspond à votre recherche.")}</p><button className="text-button" onClick={clearFilters}>{t("Effacer les filtres ")}<X size={13}/></button></div>}

        {groupCollectionRows(visible).filter(row=>row.products.length>0&&(onCollectionPage||row.id<=3)).map(row=><section className="collection-row" key={row.id} aria-labelledby={'collection-row-'+row.id}><h3 id={'collection-row-'+row.id}>{(row.id<=3?t(row.title):t("Sélection {0}",row.id))}</h3><CollectionCarousel label={(row.id<=3?t(row.title):t("Sélection {0}",row.id))} resetKey={JSON.stringify([query,color,occasion,sort,onlyFavorites,row.products.map(p=>p.id)])}>{row.products.map((product, index) => <article className="product-card" key={product.id}><div className="product-image-wrap"><a href={productHref(product)} className="product-image" onPointerEnter={() => { if (canPrefetch()) void warmImage(imageVariant(product.photos[0].src).display); }} onFocus={() => { if (canPrefetch()) void warmImage(imageVariant(product.photos[0].src).display); }} aria-label={t("Découvrir {0}",product.name)}><ProgressiveImage key={product.id} className="product-cover" src={imageVariant(product.photos[0].src).scene} preview={imageVariant(product.photos[0].src).thumbnail} alt={photoAlt(rawProducts.find(p=>p.id===product.id)??product,product.photos[0],language)} width={imageVariant(product.photos[0].src).width} height={imageVariant(product.photos[0].src).height} loading={row.id===1 && index < 4 ? "eager" : "lazy"} fetchPriority="auto" /></a><button className="product-quick-view" aria-label={t("Vue rapide de {0}",product.name)} onClick={()=>setSelected(product)}><ShoppingBag size={20}/><span className="quick-view-plus" aria-hidden="true">+</span></button><button className={`favorite-heart ${savedIds.includes(product.id)?'is-saved':''}`} aria-pressed={savedIds.includes(product.id)} aria-label={t(savedIds.includes(product.id)?"Retirer {0} de mes favoris":"Ajouter {0} à mes favoris",product.name)} onClick={()=>toggleSaved(product.id)}><Heart size={21} fill={savedIds.includes(product.id)?'currentColor':'none'}/></button></div><div className="product-meta"><div><a className="product-name mobile-product-title" href={productHref(product)}>{product.name}</a></div><button className="product-add" disabled={product.availability==='unavailable'} onClick={() => addToBag(product.id)} aria-label={t("Ajouter {0} à ma sélection",product.name)}><Plus size={18} /></button></div><p className="product-price">{priceLabel(product)}{product.unit && <small> / {product.unit}</small>}<small> {t(" · hors livraison")}</small></p><p className={`stock-label stock-${product.availability??'confirm'}`}>{t(availabilityLabel(product))}</p></article>)}</CollectionCarousel></section>)}
        {!visible.length && <div className="empty-gallery"><Search size={26} /><h2>{onlyFavorites?t("Vos favoris attendent vos coups de cœur."):t("Aucun pagne ne correspond à votre recherche.")}</h2><p>{onlyFavorites?t("Touchez le cœur d’un pagne pour le retrouver ici."):t("Essayez une autre occasion, une couleur ou un motif.")}</p><button className="primary-button" onClick={clearFilters}>{t("Revoir tous les pagnes ")}<ArrowRight size={16} /></button></div>}
        {!onCollectionPage&&<div className="collection-more"><a className="primary-button" href={collectionHref}>{t("Explorer toute la collection")}<ArrowRight size={18}/></a></div>}
      </section>
  </>);
  if(location.hash.startsWith('#suivi/'))return <><div className="utility-language"><LanguageSwitcher/></div><Suspense fallback={<p>{t("Chargement du suivi…")}</p>}><OrderTracking/></Suspense></>;
  if(adminOpen) return <><div className="utility-language"><LanguageSwitcher/></div><Suspense fallback={<div className="management-loading">{t("Ouverture de la gestion…")}</div>}><CatalogueAdmin onSaved={applyCatalogue} onClose={()=>{setAdminOpen(false);history.replaceState(null,'',location.pathname);void fetchCatalogue().then(applyCatalogue).catch(()=>{});}} /></Suspense></>;
  return <div className={`storefront${onProductPage||onCollectionPage||onEditorialPage?' has-product-page':''}${onCollectionPage?' has-collection-page':''}`}>
    <StorefrontHeader>
      <a className="brand-link" href={homeHref} aria-label={t("{0}, accueil",shop.name)} onClick={(event) => { if(onProductPage||onCollectionPage||onEditorialPage)return;event.preventDefault(); clearFilters(); window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); }}><Brand /></a>
      <form className="header-search" role="search" onSubmit={(event) => { event.preventDefault(); if(!onCollectionPage){location.assign(collectionHref+(collectionHref.includes('?')?'&':'?')+'q='+encodeURIComponent(query));return;}showGallery(); }}>
        <Search size={18} aria-hidden="true" /><input ref={search} type="search" placeholder={t("Un motif, une couleur…")} aria-label={t("Rechercher un pagne")} value={query} onChange={(event) => setQuery(event.target.value)} />
        {query && <button type="button" aria-label={t("Effacer la recherche")} onClick={() => { setQuery(''); search.current?.focus(); }}><X size={16} /></button>}
      </form>
      <nav className="header-actions" aria-label={t("Navigation principale")}><a className="text-button contact-nav" href={onProductPage||onCollectionPage||onEditorialPage?homeHref+'#contact':'#contact'}>{t("Contact")}</a><a className="text-button collection-link" href={collectionHref} aria-current={onCollectionPage?"page":undefined}>{t("La collection")}</a><button className="favorites-nav" aria-pressed={onlyFavorites} aria-label={t("Mes favoris, {0} pagnes",savedIds.filter(id=>products.some(p=>p.id===id)).length)} onClick={()=>{if(!onCollectionPage){location.assign(collectionHref+(collectionHref.includes('?')?'&':'?')+'favoris=1');return;}setOnlyFavorites(v=>!v);showGallery();}}><Heart size={19} fill={onlyFavorites?'currentColor':'none'}/><span>{t("Favoris")}</span>{savedIds.some(id=>products.some(p=>p.id===id))&&<b>{savedIds.filter(id=>products.some(p=>p.id===id)).length}</b>}</button><button className="bag-button" onClick={() => { setBagOpen(true); }} aria-label={t("Ma sélection, {0} pagne{1}",bagCount,bagCount !== 1 ? 's' : '')}><ShoppingBag size={19} /><span>{t("Ma sélection")}</span>{bagCount>0&&<b>{bagCount}</b>}</button><LanguageSwitcher/></nav>
    </StorefrontHeader>

    {editorial?<EditorialPage kind={editorial} language={language}/>:onProductPage?<main className="product-page"><nav className="product-breadcrumb" aria-label={t("Fil d’Ariane")}><a href={homeHref}>{shop.name}</a><span aria-hidden="true">/</span><a href={collectionHref}>{t("La collection")}</a>{pageProduct&&<><span aria-hidden="true" className="mobile-product-title">/</span><span className="mobile-product-title" aria-current="page">{pageProduct.name}</span></>}</nav>{pageProduct?<><a className="product-back" href={collectionHref}>← {t("Retour à la collection")}</a><div className="product-page-layout"><ProductViewer product={pageProduct} key={pageProduct.id}/><ProductDetails standalone product={pageProduct} saved={savedIds.includes(pageProduct.id)} bagCount={bagCount} href={productHref(pageProduct)} onToggleSaved={()=>toggleSaved(pageProduct.id)} onAdd={()=>addToBag(pageProduct.id)} onViewSelection={()=>setBagOpen(true)}/></div></>:<section className="product-page-empty"><h1>{catalogueError?t("La collection est temporairement indisponible."):catalogueReady?t("Ce pagne n’est plus dans la collection."):t("Chargement du pagne…")}</h1>{catalogueError&&<button className="underlined-button" onClick={()=>void fetchCatalogue().then(applyCatalogue).catch(()=>{})}>{t("Actualiser")}</button>}<a className="underlined-button" href={collectionHref}>{t("Retour à la collection")}</a></section>}</main>:onCollectionPage?<main className="collection-page"><nav className="collection-breadcrumb" aria-label={t("Fil d’Ariane")}><a href={homeHref}>{t("Accueil")}</a><span aria-hidden="true">/</span><span aria-current="page">{t("La collection")}</span></nav>{collectionContent}</main>:<main>
      <HeroCarousel products={products}/>
      <div className="hero-service-note"><span>{t("Une boutique familiale au Burkina Faso")}</span><span>{t("Livraison à Ouagadougou et Bobo-Dioulasso")}</span><a href="#contact">{t("Un conseil ? Parlons sur WhatsApp")}<ArrowRight size={14}/></a></div>
      {collectionContent}

      <section className="custom-request-banner" aria-label={t("Demander un pagne à rechercher")}><div><p className="eyebrow">{t("UNE ENVIE EN PARTICULIER ?")}</p><h2>{t("Vous cherchez un autre pagne ?")}</h2><p>{t("Envoyez-nous sa photo et vos souhaits. Nous vous confirmerons les possibilités et le prix sur WhatsApp.")}</p></div><button className="primary-button" onClick={() => openOrder(true)}>{t("Demander ce pagne ")}<ArrowRight size={18}/></button></section>

      <section className="detail-story" aria-label={t("À la une")}><div className={`detail-story-photo${chosenFeatured ? ' detail-story-photo-selected' : ''}`}>{<img src={asset(imageVariant(chosenFeatured ? favorite.photos[0].src : 'pagne-default.png').display)} alt={chosenFeatured?favorite.name:t("Faso Dan Fani, visuel à la une")} loading="lazy" />}<span>{t("À LA UNE.")}</span></div><div className="detail-story-copy"><p className="eyebrow">{t("À LA UNE")}</p><h2>{t("La beauté est")}<br /><em>{t("dans les détails.")}</em></h2><p>{t("Les motifs se révèlent, le tissage prend vie. Choisissez le pagne à mettre à la une et explorez ses détails. Votre choix reste affiché jusqu’à ce que vous le changiez.")}</p><div className="favorite-picker"><span id="favorite-picker-label">{t("Choisir le pagne à la une")}</span><DropdownMenu.Root><DropdownMenu.Trigger className="favorite-trigger" aria-labelledby="favorite-picker-label favorite-picker-value"><img src={asset(imageVariant(chosenFeatured ? favorite.photos[0].src : 'pagne-default.png').thumbnail)} alt="" /><span id="favorite-picker-value">{chosenFeatured ? <><span className="mobile-product-title">{favorite.name}</span><span className="mobile-featured-price">{priceLabel(favorite)}</span></> : t("Visuel par défaut")}</span><ChevronDown size={16} /></DropdownMenu.Trigger><DropdownMenu.Portal><DropdownMenu.Content className="favorite-menu" sideOffset={7} align="start" collisionPadding={16}><DropdownMenu.RadioGroup value={favoriteId} onValueChange={(id) => { setFavoriteId(id); try { localStorage.setItem(FAVORITE_KEY, id); setNotice(t("Votre choix à la une est mémorisé sur cet appareil.")); } catch { setNotice(t("Votre choix est affiché. Ce navigateur ne permet pas de le mémoriser après fermeture.")); } }}><DropdownMenu.RadioItem className="favorite-option" value=""><img src={asset(imageVariant('pagne-default.png').thumbnail)} alt="" /><span>{t("Visuel par défaut")}</span><DropdownMenu.ItemIndicator><Check size={16} /></DropdownMenu.ItemIndicator></DropdownMenu.RadioItem>{products.map((product) => <DropdownMenu.RadioItem className="favorite-option" key={product.id} value={product.id} textValue={product.name}><img src={asset(imageVariant(product.photos[0].src).thumbnail)} alt="" loading="lazy" /><span className="mobile-product-title">{product.name}</span><span className="mobile-featured-price" aria-hidden="true">{priceLabel(product)}</span><DropdownMenu.ItemIndicator><Check size={16} /></DropdownMenu.ItemIndicator></DropdownMenu.RadioItem>)}</DropdownMenu.RadioGroup></DropdownMenu.Content></DropdownMenu.Portal></DropdownMenu.Root></div><p className="favorite-reference" role="status"><span className="mobile-product-title">{favorite?.name} · </span>{favorite && priceLabel(favorite)}</p><button className="underlined-button" disabled={!favorite} onClick={() => favorite && setSelected(favorite)}>{t("Découvrir ce pagne ")}<ArrowRight size={18} /></button></div></section>
      <section className="delivery-info" aria-label={t("Livraison et retrait")}><p className="eyebrow">{t("À VOTRE RENCONTRE")}</p><h2>{t("Vos pagnes, chez vous.")}</h2><div><p><strong>{t("Prix hors livraison")}</strong>{policy.delivery}</p><p><strong>{t("Ouagadougou et Bobo-Dioulasso")}</strong>{t("Livraison proposée dans ces deux villes. Pour une autre ville du Burkina Faso, la possibilité et le délai seront étudiés selon la situation générale.")}</p><p><strong>{t("Retrait à Bobo-Dioulasso")}</strong>{t("Le lieu et l’heure sont convenus sur WhatsApp. La date souhaitée reste à confirmer selon le stock et le mode de réception.")}</p></div><a className="underlined-button delivery-page-link" href={deliveryPath(language)}>{policy.link} <ArrowRight size={16}/></a></section>
      <section className="shopping-guide" aria-labelledby="shopping-guide-title"><p className="eyebrow">{t("VOTRE COMMANDE, SIMPLEMENT")}</p><h2 id="shopping-guide-title">{t("Commander un pagne Faso Dan Fani")}</h2><div><article><h3>{t("Comment choisir et commander ?")}</h3><p>{t("Explorez les photos et les détails, ajoutez vos pagnes préférés à votre sélection, puis préparez votre demande de commande. La boutique confirme la disponibilité avant votre accord.")}</p></article><article><h3>{t("Où livrez-vous ?")}</h3><p>{policy.delivery}</p></article><article><h3>{t("Puis-je demander un conseil ?")}</h3><p>{t("Contactez la boutique familiale sur WhatsApp pour toute question sur un motif, ses dimensions ou sa disponibilité.")}</p><a className="underlined-button" href="#contact">{t("Nous contacter.")} <ArrowRight size={15}/></a></article></div></section>
      <section className="culture-note" data-nosnippet="" aria-label={t("Le Faso Dan Fani")}><p className="eyebrow">{t("LE PAGNE TISSÉ DE LA PATRIE")}</p><h2>{t("Le Faso Dan Fani,")}<br /><em>{t("une fierté à porter.")}</em></h2><p>{t("Au Burkina Faso, le Faso Dan Fani fait vivre une tradition de tissage et une identité culturelle forte. Porté au quotidien ou pour les grandes occasions, il trouve sa place dans des tenues traditionnelles comme dans des créations actuelles.")}</p><a href={editorialPath('guide',language)}>{language==='en'?"Discover the history of Faso Dan Fani ":"Découvrir l’histoire du Faso Dan Fani "}<ArrowRight size={14} /></a></section>
      <section className="contact-section" id="contact" aria-labelledby="contact-title"><div className="contact-heading"><p className="eyebrow">{t("PARLONS DE VOTRE PAGNE")}</p><h2 id="contact-title">{t("Nous contacter.")}</h2><p>{t("Une question sur un modèle, sa disponibilité ou votre livraison ? Contactez directement la boutique.")}</p></div><div className="contact-options"><div className="contact-card"><h3><Phone size={20} aria-hidden="true"/>{t("Par téléphone")}</h3><p>{t("Pour vos appels téléphoniques.")}</p>{shop.contacts.phones.map(number=><a className="contact-link contact-call" key={number} href={`tel:+${number}`} aria-label={t("Appeler la boutique au {0}",contactLabel(number))}><Phone size={17} aria-hidden="true"/><span>{contactLabel(number)}</span><span>{t("Appeler ")}<ArrowRight size={16}/></span></a>)}</div><div className="contact-card"><h3><MessageCircle size={20} aria-hidden="true"/>{t("Par WhatsApp")}</h3><p>{t("Pour vos messages WhatsApp uniquement.")}</p>{shop.contacts.whatsapp.map(number=><a className="contact-link contact-whatsapp" key={number} href={`https://wa.me/${number}?text=${encodeURIComponent(t("Bonjour, je souhaite un renseignement sur les pagnes de la Maison du Faso Dan Fani."))}`} target="_blank" rel="noopener noreferrer" aria-label={t("Écrire à la boutique sur WhatsApp au {0}",contactLabel(number))}><MessageCircle size={18} aria-hidden="true"/><span>{contactLabel(number)}</span><span>{t("Écrire ")}<ArrowRight size={16}/></span></a>)}</div></div></section>
      <div className="values-strip"><div><span>01</span><strong>{t("Choisir à votre rythme")}</strong><p>{t("Une collection à parcourir en toute simplicité.")}</p></div><div><span>02</span><strong>{t("Voir sous tous les angles")}</strong><p>{t("Plusieurs photos et un zoom sur les détails.")}</p></div><div><span>03</span><strong>{t("Préparer votre sélection")}</strong><p>{t("Gardez vos coups de cœur à portée de main.")}</p></div></div>
    </main>}

    <InstallNotice blocked={!!selected||bagOpen||orderOpen||helpOpen}/>
    <footer className="site-footer"><Brand small /><nav className="editorial-footer-links" aria-label={language==='en'?"About our house":"À propos de notre maison"}>{editorialLinks(language).map(link=><a key={link.path} href={link.path}>{link.label}</a>)}</nav><span>{t("Une histoire de famille.")}<br />{t("Et de beaux pagnes tissés.")}</span>{adminAllowed&&<button className="text-button" onClick={()=>{setAdminOpen(true);history.replaceState(null,'','?gestion=1');}}><Settings size={16}/>{t("Gérer la boutique")}</button>}<button className="text-button" onClick={() => { setHelpOpen(true); }}>{t("Besoin d’un petit guide ? ")}<CircleHelp size={14} /></button></footer>

    <Dialog.Root open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}><Dialog.Portal><Dialog.Overlay className="modal-overlay" /><Dialog.Content className="product-dialog" aria-describedby="product-description">{selected && <><Dialog.Close className="dialog-close" aria-label={t("Fermer la fiche du pagne")}><X size={20} /></Dialog.Close><ProductViewer product={selected} key={selected.id+'-'+selected.photos.map(p=>p.src).join('|')} /><ProductDetails product={selected} saved={savedIds.includes(selected.id)} bagCount={bagCount} href={productHref(selected)} onToggleSaved={()=>toggleSaved(selected.id)} onAdd={()=>addToBag(selected.id)} onViewSelection={()=>{setSelected(null);setBagOpen(true);}} /></>}</Dialog.Content></Dialog.Portal></Dialog.Root>

    {orderOpen && <OrderForm items={customOrder ? [] : selectedItems} initialCustom={customOrder} whatsapp={shop.whatsapp} onClose={() => {setOrderOpen(false);void fetchCatalogue().then(applyCatalogue).catch(()=>{});}} />}
    <Dialog.Root open={bagOpen} onOpenChange={setBagOpen}><Dialog.Portal><Dialog.Overlay className="modal-overlay" /><Dialog.Content className="bag-drawer"><div className="drawer-heading"><div><p className="eyebrow">{t("VOS COUPS DE CŒUR")}</p><Dialog.Title>{t("Ma sélection ")}<span>({bagCount})</span></Dialog.Title></div><Dialog.Close className="icon-button" aria-label={t("Fermer ma sélection")}><X size={21} /></Dialog.Close></div><Dialog.Description className="drawer-description">{t("Gardez les pagnes qui vous plaisent, puis partagez votre sélection avec la boutique.")}</Dialog.Description>{selectedItems.length ? <><div className="bag-items">{selectedItems.map(({ product, quantity }) => <div className="bag-item" key={product.id}><button className="bag-photo" onClick={() => { setBagOpen(false); setSelected(product); }} aria-label={t("Revoir {0}",product.name)}><img src={asset(imageVariant(product.photos[0].src).thumbnail)} alt={product.name} /></button><div className="bag-item-info"><strong className="mobile-product-title">{product.name}</strong><p>{priceLabel(product)}</p><div className="quantity-control"><button aria-label={t("Retirer une unité de {0}",product.name)} onClick={() => changeQuantity(product.id, -1)}><Minus size={12} /></button><span aria-live="polite">{quantity}</span><button aria-label={t("Ajouter une unité de {0}",product.name)} onClick={() => changeQuantity(product.id, 1)} disabled={quantity >= 99}><Plus size={12} /></button></div></div><button className="icon-button remove-item" aria-label={t("Retirer {0} de ma sélection",product.name)} onClick={() => { setBag((items) => items.filter((item) => item.id !== product.id));  }}><Trash2 size={16} /></button></div>)}</div><div className="bag-summary"><p><span>{t("Votre sélection")}</span><strong>{bagCount} {t(" pagne")}{bagCount > 1 ? 's' : ''}</strong></p><small>{t("Prix des pagnes hors livraison. Disponibilité et frais de livraison confirmés sur WhatsApp.")}</small><button className="primary-button" onClick={() => openOrder()}>{t("Commander avec un bon PDF ")}<ArrowRight size={17} /></button><details className="selection-text"><summary>{t("Voir le texte à partager ")}<ChevronDown size={13} /></summary><textarea readOnly aria-label={t("Texte de ma sélection")} value={selectionText()} onFocus={(event) => event.target.select()} /></details></div></> : <div className="empty-bag"><ShoppingBag size={34} strokeWidth={1} /><h2>{t("Vos coups de cœur")}<br />{t("commencent ici.")}</h2><p>{t("Ouvrez un pagne et ajoutez-le à votre sélection.")}</p><Dialog.Close className="primary-button">{t("Découvrir la collection ")}<ArrowRight size={17} /></Dialog.Close><button className="text-button" onClick={() => openOrder(true)}>{t("Demander un pagne avec une photo ")}<ArrowRight size={15}/></button></div>}</Dialog.Content></Dialog.Portal></Dialog.Root>

    <Dialog.Root open={helpOpen} onOpenChange={setHelpOpen}><Dialog.Portal><Dialog.Overlay className="modal-overlay" /><Dialog.Content className="help-dialog"><Dialog.Close className="dialog-close" aria-label={t("Fermer le guide")}><X size={20} /></Dialog.Close><p className="eyebrow">{t("BIENVENUE DANS LA MAISON")}</p><Dialog.Title>{t("Une visite toute simple.")}</Dialog.Title><Dialog.Description>{t("Découvrez les pagnes et préparez votre sélection en quelques gestes.")}</Dialog.Description><ol><li><span>01</span><div><strong>{t("Parcourez la collection.")}</strong><p>{t("Parcourez les photos et utilisez la recherche ou les filtres pour trouver une couleur, un motif ou une occasion.")}</p></div></li><li><span>02</span><div><strong>{t("Approchez un pagne.")}</strong><p>{t("Cliquez sur sa photo. Parcourez les vues, zoomez et glissez pour regarder les détails.")}</p></div></li><li><span>03</span><div><strong>{t("Gardez vos coups de cœur.")}</strong><p>{t("Ajoutez des pagnes à votre sélection. Vous pourrez copier la liste et la partager avec la boutique.")}</p></div></li></ol><p className="keyboard-note">{t("Au clavier : utilisez Tab pour parcourir les boutons et Entrée pour ouvrir une fiche. Sur téléphone : touchez une photo pour découvrir le pagne.")}</p><Dialog.Close className="primary-button">{t("C’est parti ")}<ArrowRight size={17} /></Dialog.Close></Dialog.Content></Dialog.Portal></Dialog.Root>

    <div className={`toast ${notice ? 'is-visible' : ''}`} role="status" aria-live="polite">{notice && <><Check size={16} /><span>{t(notice)}</span></>}</div>
  </div>;
}
