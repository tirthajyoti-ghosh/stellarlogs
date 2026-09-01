import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { installWebglShield } from './systems/webglShield'
import { installBlackbox } from './systems/blackbox'
import { installLiveness } from './systems/liveness'
import App from './App'

// must run before any canvas is created (Brave fingerprint farbling fix)
installWebglShield()
installBlackbox()
installLiveness()
import('./config/quality').then(({ IS_TOUCH }) => {
  document.body.dataset.touch = IS_TOUCH ? '1' : ''
})
import '@fontsource/rajdhani/500.css'
import '@fontsource/rajdhani/600.css'
import '@fontsource/rajdhani/700.css'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
