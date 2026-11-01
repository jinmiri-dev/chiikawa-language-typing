import { useEffect, useState } from 'react'
import InputLab from '../lab/InputLab'
import { parseRoute, type Route } from './routes'
import './App.css'

function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash))
  useEffect(() => {
    const onChange = () => setRoute(parseRoute(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

function Home() {
  return (
    <section className="center">
      <h1>언어 1급</h1>
      <p>좋아하는 영상 대사를 따라 치며 외국어 타자와 키 누르는 법을 익히는 사이트예요.</p>
      <p className="sub">
        영어 · 일본어 · 중국어(간체) · 대만어(번체) · 몽골어
        <br />
        지금 만들고 있어요. 먼저 내 키보드로 입력을 시험해 볼 수 있어요.
      </p>
      <a className="link" href="#/lab/input">
        내 키보드로 입력 시험하기 →
      </a>
    </section>
  )
}

function NotFound() {
  return (
    <section className="center">
      <h1>페이지를 찾을 수 없어요</h1>
      <a className="link" href="#/">
        처음으로
      </a>
    </section>
  )
}

export default function App() {
  const route = useRoute()
  return (
    <main className={route.name === 'lab-input' ? 'app app-top' : 'app'}>
      {route.name === 'home' && <Home />}
      {route.name === 'lab-input' && <InputLab />}
      {route.name === 'not-found' && <NotFound />}
    </main>
  )
}
