import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register Service Worker for PWA compliance and offline app-shell caching
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // SW registered successfully
        if (import.meta.env.DEV) {
          console.log('[LocalLink PWA] ServiceWorker registered with scope:', reg.scope);
        }
      })
      .catch((err) => {
        // Ignore or log error gracefully without blocking the application
        if (import.meta.env.DEV) {
          console.warn('[LocalLink PWA] ServiceWorker registration skipped/failed:', err);
        }
      });
  });
}

createRoot(document.getElementById('root')!).render(<App />);

