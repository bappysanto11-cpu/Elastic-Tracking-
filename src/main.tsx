import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProviderComponent } from './context/AuthContext';

// Clear obsolete service workers and caches that may intercept API requests
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  }).catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProviderComponent>
      <App />
    </AuthProviderComponent>
  </StrictMode>,
);
