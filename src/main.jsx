import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/inter';
import '@fontsource-variable/plus-jakarta-sans';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/layout.css';
import './styles/pages.css';
import App from './App';
import ErrorBoundary, { muatUlangSekali, bersihkanPenjagaMuat } from './components/ui/ErrorBoundary';
import { daftarkanPwa, pantauPasang } from './lib/pwa';

// Berkas halaman hilang setelah rilis baru: muat ulang sekali agar mendapat versi terbaru.
window.addEventListener('vite:preloadError', (e) => {
  e.preventDefault();
  muatUlangSekali();
});
// Penjaga dibersihkan setelah aplikasi stabil sebentar.
window.setTimeout(bersihkanPenjagaMuat, 10000);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary level="app">
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);

pantauPasang();
daftarkanPwa();
