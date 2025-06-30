import React from 'react'
import ReactDOM from 'react-dom/client'
import FormAgent from './FormAgent.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <FormAgent />
    </ErrorBoundary>
  </React.StrictMode>,
)