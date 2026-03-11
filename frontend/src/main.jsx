import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          fontFamily: "'DM Sans', sans-serif",
          fontSize: '14px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0'
        }
      }}
    />
  </React.StrictMode>
)
