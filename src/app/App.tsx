import { useEffect, useState } from 'react'
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
      <p>좋아하는 영상 대사로 손이 먼저 외우는 외국어.</p>
      <p className="sub">지금 만들고 있어요.</p>
      <a className="link" href="#/lab/input">
        입력 시험 페이지
      </a>
    </section>
  )
}

function LabPlaceholder() {
  return (
    <section className="center">
      <h1>입력 시험</h1>
      <p className="sub">곧 열려요.</p>
      <a className="link" href="#/">
        처음으로
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
    <main className="app">
      {route.name === 'home' && <Home />}
      {route.name === 'lab-input' && <LabPlaceholder />}
      {route.name === 'not-found' && <NotFound />}
    </main>
  )
}
