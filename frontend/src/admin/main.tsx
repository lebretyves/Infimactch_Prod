import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router';
import { AdminApp } from './App';
import { AdminErrorBoundary } from './AdminErrorBoundary';
import '../styles/base.css';
import './admin.css';
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><AdminErrorBoundary><HashRouter><AdminApp /></HashRouter></AdminErrorBoundary></React.StrictMode>);
