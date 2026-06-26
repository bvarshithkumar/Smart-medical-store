import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

// Import existing styling sheets globally
import '../style.css'
import '../detail.css'
import '../reservation.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
