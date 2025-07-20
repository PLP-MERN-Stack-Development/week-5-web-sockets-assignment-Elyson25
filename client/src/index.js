import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './App.css'; // We can import the main css here too

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);