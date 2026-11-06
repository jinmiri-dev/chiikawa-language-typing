import { useEffect, useState } from 'react'
import { useApp } from '../../app/AppState'
import { href } from '../../app/routes'
import { AppHeader, StatusNotice, Sentences } from '../../components/components'
import { FRIEND_INFO, pickLine } from '../../content/friendLines'
import { downloadBackup } from '../../services/backup'
import { getMaterial } from '../../services/materials'
import { lessonId, loadCourse, parseLessonId } from '../../content/course'
import { getCourseProgress, markLessonDone, nextLesson } from '../../services/course'
import { eul } from '../../engine/josa'
import { KIND_NAME, LANG_NAME } from '../../engine/lang'
import { avgLineMs, compareText } from '../../engine/stats/compare'
import { FRIENDS, type Material, type Progress } from '../../engine/types'
import '../pages.css'

const BASE = import.meta.env.BASE_URL

export default function Done({ materialId }: { materialId: string }) {
  const { store, settings } = useApp()
  const [m, setM] = useState<Material | null | undefined>(undefined)
  const [p, setP] = useState<Progress | null | undefined>(undefined)
  const [others, setOthers] = useState<Progress[]>([])
  const [cardOk, setCardOk] = useState(true)
  const [cheer] = useState(() => pickLine(settings.friend, 'finish'))
  const [nudge, setNudge] = useState(false)
  /** 초보 코스 레슨이면 다음 레슨 id */
  const [nextId, setNextId] = useState<string | null>(null)
  useEffect(() => {
    void (async () => {
      const lesson = parseLessonId(materialId)
      if (lesson) {
        const prog = await store.getProgress(materialId)
        if (prog && prog.results.length) await markLessonDone(store, materialId)
        const course = await loadCourse(lesson.lang)
        const n = nextLesson(course, lesson.lang, (await getCourseProgress(store, lesson.lang)).done)
        setNextId(n ? lessonId(lesson.lang, n.week, n.lesson) : null)
      }
      const mat = await getMaterial(store, materialId)
      setM(mat)
      setP(await store.getProgress(materialId))
      if (mat) setOthers(await store.listProgress(mat.lang))
      // 30줄 이상 쳤는데 백업을 한 번도 안 받았으면 한 번만 권한다 (기획안 16장)
      const typed = (await store.listProgress()).reduce((a, x) => a + x.results.length, 0)
      if (typed >= 30 && !(await store.getMeta('backupAt')) && !(await store.getMeta('backupNudged'))) {
        setNudge(true)
        await store.setMeta('backupNudged', Date.now())
      }
    })()
  }, [store, materialId])
  if (m === undefined || p === undefined) return null
  if (!m) return null
  if (!p || p.results.length === 0)
    return (
      <main className="app">
        <section className="center">
          <h1>아직 친 기록이 없어요</h1>
          <a className="link" href={href({ name: 'study', materialId })}>
            연습하러 가기
          </a>
        </section>
      </main>
    )

  const now = avgLineMs(p.results)
  // 같은 재료 지난 회차가 있으면 그것과, 없으면 같은 언어의 다른 재료 중 최근 것과 비교
  const other = others.filter((o) => o.materialId !== materialId && o.results.length).sort((a, b) => b.updatedAt - a.updatedAt)[0]
  const prev = p.prevAvgMs ?? (other ? avgLineMs(other.results) : null)
  const accuracy = Math.round((p.results.reduce((a, r) => a + r.firstTryAccuracy, 0) / p.results.length) * 100)
  const wrong = m.lines.filter((l) => p.results.find((r) => r.lineId === l.id && r.mistakes > 0))
  const nn = String(FRIENDS.indexOf(p.friend) + 1).padStart(2, '0')
  const card = `${BASE}cards/${nn}-${p.friend}.webp`
  const name = FRIEND_INFO[p.friend].name

  return (
    <div className="page">
      <AppHeader back={href({ name: 'materials', lang: m.lang, tab: 'course' })} />
      <main className="done">
        <h1>언어 1급 따냈어요!</h1>
        <p className="done-sub">
          {LANG_NAME[m.lang].ko} · {KIND_NAME[m.kind]} · {m.title}
          {eul(m.title)} 끝까지 쳤어요.
        </p>
        <div className="done-card">
          {cardOk ? (
            <img src={card} alt={`${name}와 함께 받은 ${LANG_NAME[m.lang].ko} 1급 카드`} onError={() => setCardOk(false)} />
          ) : (
            <div className="done-card-fallback" role="img" aria-label={`${name}와 함께 받은 ${LANG_NAME[m.lang].ko} 1급 카드`}>
              <span>{LANG_NAME[m.lang].ko}</span>
              <b>1급</b>
              <span>{name}와 함께</span>
            </div>
          )}
        </div>
        {/* 완료 화면의 축하는 사라지지 않는다 */}
        <p className="bubble" aria-live="polite">
          <b><Sentences text={cheer.text} /></b>
          {cheer.action && <span className="bubble-action">{cheer.action}</span>}
        </p>
        <dl className="done-stats">
          <div>
            <dt>완료한 줄</dt>
            <dd>{p.results.length}줄</dd>
          </div>
          <div>
            <dt>처음 친 글자 정확도</dt>
            <dd>{accuracy}%</dd>
          </div>
          <div>
            <dt>연습 시간</dt>
            <dd>{Math.max(1, Math.round(p.activeMs / 60000))}분</dd>
          </div>
        </dl>
        <p className="done-compare">{compareText(prev, now)}</p>
        {wrong.length > 0 && (
          <section className="done-wrong" aria-label="틀렸던 줄">
            <h2>틀렸던 줄 {wrong.length}개</h2>
            <ul>
              {wrong.map((l) => (
                <li key={l.id}>
                  <span lang={LANG_NAME[m.lang].htmlLang}>{l.src}</span> <span className="done-ko">{l.ko}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {nudge && (
          <StatusNotice title="벌써 30줄 넘게 쳤어요! 백업 파일을 받아 둘까요?">
            기록은 이 브라우저에만 있어요. 받아 두면 다른 기기에서도 이어서 할 수 있어요.
            <div className="done-actions">
              <button type="button" className="btn btn-sub" onClick={() => void downloadBackup(store).then(() => setNudge(false))}>
                백업 파일 받기
              </button>
              <button type="button" className="btn btn-sub" onClick={() => setNudge(false)}>
                다음에
              </button>
            </div>
          </StatusNotice>
        )}
        <div className="done-actions">
          {nextId && (
            <a className="btn btn-primary" href={href({ name: 'study', materialId: nextId })}>
              다음 레슨
            </a>
          )}
          {cardOk && (
            <a className={nextId ? 'btn' : 'btn btn-primary'} href={card} download={`언어1급-${LANG_NAME[m.lang].ko}-${p.friend}.webp`}>
              카드 이미지 저장
            </a>
          )}
          <a className="btn" href={href({ name: 'words', lang: m.lang })}>
            단어 복습
          </a>
          <a className="btn" href={href({ name: 'study', materialId })}>
            처음부터 다시
          </a>
          <a className="btn" href={href({ name: 'materials', lang: m.lang, tab: 'course' })}>
            {nextId ? '코스 보기' : '다른 재료'}
          </a>
        </div>
      </main>
    </div>
  )
}
