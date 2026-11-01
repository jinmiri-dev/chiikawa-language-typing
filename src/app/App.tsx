import { useEffect, useState } from 'react'
import InputLab from '../lab/InputLab'
import Done from '../screens/Done/Done'
import Friend from '../screens/Friend/Friend'
import Guide from '../screens/Guide/Guide'
import Home from '../screens/Home/Home'
import Materials from '../screens/Materials/Materials'
import Review from '../screens/Review/Review'
import Settings from '../screens/Settings/Settings'
import Share from '../screens/Share/Share'
import Study from '../screens/Study/Study'
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
    case 'study':
      return <Study key={route.materialId} materialId={route.materialId} />
    case 'review':
      return <Review key={route.materialId} materialId={route.materialId} />
    case 'done':
      return <Done key={route.materialId} materialId={route.materialId} />
    case 'share':
      return <Share data={route.data} />
    case 'friend':
      return <Friend />
    case 'settings':
      return <Settings />
    case 'guide':
      return <Guide />
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
