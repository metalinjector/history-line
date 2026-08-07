import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

/* Шрифты подключены пакетами, а не через CDN: страница не зависит
   от доступности внешних доменов и не мигает при загрузке. */
import '@fontsource-variable/lora';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';

import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
