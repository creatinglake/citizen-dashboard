import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { FeedProvider } from './context/FeedContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <FeedProvider>
      <App />
    </FeedProvider>
  </StrictMode>,
)
