import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Remove the old persisted state cache, which included private Firebase records.
if (typeof window !== 'undefined') {
  window.localStorage.removeItem('cit-college-hackathon-portal-production-v1');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
