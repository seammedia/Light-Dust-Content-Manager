import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import { SelfServeSignup } from './components/SelfServeSignup';
import { SelfServeOnboarding } from './components/SelfServeOnboarding';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
const path = window.location.pathname.replace(/\/$/, '') || '/';
const RootComponent = path === '/signup' || path === '/login' || path === '/auth/callback'
  ? SelfServeSignup
  : path === '/onboarding'
    ? SelfServeOnboarding
    : App;
root.render(
  <React.StrictMode>
    <RootComponent />
  </React.StrictMode>
);
