import { useEffect, useState } from 'react'
import InputLab from '../lab/InputLab'
import Home from '../screens/Home/Home'
import Materials from '../screens/Materials/Materials'
import { AppProvider } from './AppState'
import { parseRoute, type Route } from './routes'
import './App.css'

function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash))
  useEffect(() => {
    const onChange = () => {
      setRoute(parseRoute(window.location.hash))
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

function NotFound() {
  return (
    <main className="app">
      <section className="center">
        <h1>페이지를 찾을 수 없어요</h1>
        <a className="link" href="#/">
          처음으로
        </a>
      </section>
    </main>
  )
}

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'home':
      return <Home />
    case 'materials':
      return <Materials lang={route.lang} tab={route.tab} />
    case 'lab-input':
      return (
        <main className="app app-top">
          <InputLab />
        </main>
      )
    default:
      return <NotFound />
  }
}

export default function App() {
  const route = useRoute()
  return (
    <AppProvider>
      <Screen route={route} />
    </AppProvider>
  )
}
