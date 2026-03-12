import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@primer/css/dist/color-modes.css';
import App from './App.tsx';
import './styles/globals.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
