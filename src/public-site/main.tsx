import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import '../themes'
import { PublicApp } from './PublicApp'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PublicApp />
  </StrictMode>,
)
