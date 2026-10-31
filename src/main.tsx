import {initializeLanguage} from './lib/i18n';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import './motion.css';

await initializeLanguage();
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);

// Registration runs alongside rendering and gracefully degrades if unavailable.
if (import.meta.env.PROD && 'serviceWorker' in navigator && location.protocol === 'https:') {
  void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}image-cache-sw.js`, {
    scope: import.meta.env.BASE_URL, updateViaCache: 'none',
  }).catch(() => { /* Photos still load normally when local caching is blocked. */ });
}
