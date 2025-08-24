import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n' // Initialize i18n
import App from './App.tsx'
import ReduxProvider from './store'
import ThemeProvider from './components/ThemeProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ReduxProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </ReduxProvider>
  </StrictMode>,
)
