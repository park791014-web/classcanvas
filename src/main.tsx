import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/global.css'

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean
}

const standaloneMedia = window.matchMedia('(display-mode: standalone)')
const updateDisplayModeDiagnostic = () => {
  const iosStandalone = Boolean((navigator as NavigatorWithStandalone).standalone)
  document.documentElement.dataset.displayMode = standaloneMedia.matches || iosStandalone ? 'standalone' : 'browser'
}

updateDisplayModeDiagnostic()
standaloneMedia.addEventListener('change', updateDisplayModeDiagnostic)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
