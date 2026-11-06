import { href, type MaterialTab } from '../../app/routes'
import { AppHeader } from '../../components/components'
import { LANG_NAME, type Lang } from '../../engine/lang'
import CourseTab from './CourseTab'
import NewsTab from './NewsTab'
import ScriptTab from './ScriptTab'
import YouTubeTab from './YouTubeTab'
import './Materials.css'

const TABS: { id: MaterialTab; label: string }[] = [
  { id: 'course', label: '초보 코스' },
  { id: 'youtube', label: '유튜브' },
  { id: 'news', label: '뉴스' },
  { id: 'script', label: '대본' },
]

export default function Materials({ lang, tab }: { lang: Lang; tab: MaterialTab }) {
  return (
    <div className="page">
      <AppHeader back="#/" />
      <main className="materials">
        <h1>
          <span lang={LANG_NAME[lang].htmlLang}>{LANG_NAME[lang].ko}</span> 무엇으로 연습할까요?
        </h1>
        <div role="tablist" aria-label="재료" className="tabs">
          {TABS.map((t) => (
            <a
              key={t.id}
              role="tab"
              aria-selected={t.id === tab || (t.id === 'course' && tab === 'starter')}
              className="tab"
              href={href({ name: 'materials', lang, tab: t.id })}
            >
              {t.label}
            </a>
          ))}
        </div>
        <section role="tabpanel" className="tabpanel">
          {tab === 'course' || tab === 'starter' ? (
            <CourseTab lang={lang} />
          ) : tab === 'news' ? (
            <NewsTab lang={lang} />
          ) : tab === 'youtube' ? (
            <YouTubeTab lang={lang} />
          ) : (
            <ScriptTab lang={lang} />
          )}
        </section>
      </main>
    </div>
  )
}
