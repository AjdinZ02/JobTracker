
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles.css';

document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  if (target && target.tagName === 'BUTTON') {
    const rect = target.getBoundingClientRect();
    const x = ((e as MouseEvent).clientX - rect.left) / rect.width * 100;
    const y = ((e as MouseEvent).clientY - rect.top) / rect.height * 100;
    target.style.setProperty('--x', `${x}%`);
    target.style.setProperty('--y', `${y}%`);
  }
});

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
