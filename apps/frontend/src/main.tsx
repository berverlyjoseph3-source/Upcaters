// enterprise-ai-agent-platform/apps/frontend/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Enable React StrictMode for development
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

// Performance monitoring in development
if (import.meta.env.DEV) {
  const reportWebVitals = async () => {
    const { onCLS, onFID, onLCP, onFCP, onTTFB } = await import('web-vitals');
    onCLS(console.log);
    onFID(console.log);
    onLCP(console.log);
    onFCP(console.log);
    onTTFB(console.log);
  };
  reportWebVitals();
}

// Render the app
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
export default Main;
