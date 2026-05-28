import * as React from 'react';
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// Отключаем анимации при первом рендере — убирает задержку на iPhone
document.body.classList.add('no-transition');
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    document.body.classList.remove('no-transition');
  });
});

createRoot(document.getElementById("root")!).render(<App />);