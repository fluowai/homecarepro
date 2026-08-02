import React, {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initWhitelabel } from './lib/whitelabel';

// Initialize whitelabel branding before React renders
initWhitelabel().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
