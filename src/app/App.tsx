import { useEffect, useState } from 'react'
import InputLab from '../lab/InputLab'
import Done from '../screens/Done/Done'
import Friend from '../screens/Friend/Friend'
import Guide from '../screens/Guide/Guide'
import Home from '../screens/Home/Home'
import Materials from '../screens/Materials/Materials'
import Read from '../screens/Read/Read'
import Review from '../screens/Review/Review'
import Settings from '../screens/Settings/Settings'
import Share from '../screens/Share/Share'
import Study from '../screens/Study/Study'
import WordQuiz from '../screens/Words/WordQuiz'
import LearnSheet from '../learn/LearnSheet'
import { LearnList, LearnStart } from '../learn/LearnList'
import LearnVideo from '../learn/LearnVideo'
import { AppProvider } from './AppState'
import ErrorBoundary from './ErrorBoundary'
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
    case 'read':
      return <Read key={route.materialId} materialId={route.materialId} />
    case 'share':
      return <Share data={route.data} />
    case 'friend':
      return <Friend />
    case 'settings':
      return <Settings />
    case 'guide':
      return <Guide />
    case 'learn':
      return <LearnStart />
    case 'learn-list':
      return <LearnList key={route.native} native={route.native} />
    case 'learn-video':
      return <LearnVideo key={route.videoId + route.native} native={route.native} videoId={route.videoId} />
    case 'words':
      return <WordQuiz lang={route.lang} />
    case 'learn-sheet':
      return <LearnSheet native={route.native} />
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
      <ErrorBoundary resetKey={window.location.hash}>
        <Screen route={route} />
      </ErrorBoundary>
    </AppProvider>
  )
}
