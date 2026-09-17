import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router';
import { AdminApp } from './App';
import '../styles/base.css';
import './admin.css';
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><HashRouter><AdminApp /></HashRouter></React.StrictMode>);
