import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/base.css'
import App from './app/App'

// 다른 사이트가 이 사이트를 몰래 틀(iframe) 안에 넣어 누르게 하지 못하게(클릭재킹).
// GitHub Pages 는 X-Frame-Options 헤더를 붙일 수 없어 스크립트로 막는다
if (window.top !== window.self) {
  try {
    window.top!.location.href = window.location.href
  } catch {
    document.documentElement.style.display = 'none'
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
