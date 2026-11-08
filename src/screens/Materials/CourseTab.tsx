/** 초보 코스 탭(와이어프레임 02-0): 왼쪽 0단계·단계별 주제 주차·채팅 표현, 오른쪽 오늘 할 일(다음 레슨·연속 학습일·진도·복습) */
import { useEffect, useState } from 'react'
import { useApp } from '../../app/AppState'
import { href } from '../../app/routes'
import { Sentences } from '../../components/components'
import { allLessons, lessonId, loadCourse, type CourseData } from '../../content/course'
import { starterSets } from '../../content/starter'
import { practiceId, SITUATIONS, TWISTER } from '../../content/practice'
import type { Progress } from '../../engine/types'
import type { Lang } from '../../engine/lang'
import { getCourseProgress, nextLesson, streak, type CourseProgress } from '../../services/course'
import { buildReviewMaterial, reviewCount } from '../../services/review'
import { dueWords, type WordStates } from '../../engine/quiz'

const LEVELS = ['입문', '기초', '초급']
const LEVEL_HINT = ['아주 짧은 문장', '조금 긴 문장', '이어지는 문장']

export default function CourseTab({ lang }: { lang: Lang }) {
  const { store } = useApp()
  const [course, setCourse] = useState<CourseData | null>(null)
  const [prog, setProg] = useState<CourseProgress>({ done: [], days: [] })
  const [due, setDue] = useState(0)
  const [wordsDue, setWordsDue] = useState(0)
  const [setProgress, setSetProgress] = useState<Record<string, Progress>>({})
  useEffect(() => {
    void store.listProgress(lang).then((list) => setSetProgress(Object.fromEntries(list.map((p) => [p.materialId, p]))))
    void loadCourse(lang).then(setCourse)
    void getCourseProgress(store, lang).then(setProg)
    void reviewCount(store).then(setDue, () => setDue(0))
    void Promise.all([store.listWords(lang), store.getMeta<WordStates>(`wordQuiz:${lang}`)]).then(([words, st]) => setWordsDue(dueWords(words, st ?? {}, Date.now()).length))
  }, [store, lang])

  if (!course) return <p className="busy">코스를 불러오고 있어요…</p>
  const done = new Set(prog.done)
  const next = nextLesson(course, lang, prog.done)
  const total = allLessons(course).length
  const days = streak(prog.days)
  const today = prog.days.includes(localDay())
  const curWeek = next?.week ?? 24
  const sets = starterSets(lang)
  const go = (w: number, l: number) => href({ name: 'study', materialId: lessonId(lang, w, l) })

  return (
    <div className="course">
      <section className="course-main" aria-label="코스">
        <p className="materials-lead">
          <Sentences text="하루 한 레슨(10줄, 약 5분)씩 24주. 주제 8개를 입문·기초·초급으로 세 번 돌며 차근차근 올라가요." />
        </p>
        <h2 className="course-h">0단계 · 글자 익히기</h2>
        <ul className="course-chips">
          {course.letters.map((l, i) => {
            const id = lessonId(lang, 0, i + 1)
            const isNow = next?.week === 0 && next.lesson === i + 1
            return (
              <li key={id}>
                <a className="course-chip" data-state={done.has(id) ? 'done' : isNow ? 'now' : undefined} href={go(0, i + 1)}>
                  {done.has(id) && <span aria-label="끝냄">✓</span>}
                  {l.title}
                </a>
              </li>
            )
          })}
        </ul>
        {LEVELS.map((level, li) => {
          const weeks = course.weeks.map((w, wi) => ({ w, week: wi + 1 })).filter((x) => x.w.level === level)
          if (!weeks.length) return null
          return (
            <section key={level} aria-label={level}>
              <h2 className="course-h">
                {level} <span className="course-h-sub">· {weeks[0].week}~{weeks[weeks.length - 1].week}주 · {LEVEL_HINT[li]}</span>
              </h2>
              <ul className="course-weeks">
                {weeks.map(({ w, week }) => {
                  const n = w.lessons.filter((_, i) => done.has(lessonId(lang, week, i + 1))).length
                  const state = n === w.lessons.length ? 'done' : week === curWeek ? 'now' : undefined
                  const first = w.lessons.findIndex((_, i) => !done.has(lessonId(lang, week, i + 1)))
                  return (
                    <li key={week}>
                      <a className="course-week" data-state={state} href={go(week, first < 0 ? 1 : first + 1)} aria-label={`${week}주차 ${w.theme}, ${w.lessons.length}개 중 ${n}개 끝냄`}>
                        <span className="course-week-no">{week}주차</span>
                        <b>{w.theme}</b>
                        <span>{state === 'done' ? `✓ ${n} / ${w.lessons.length}` : `${n} / ${w.lessons.length}`}</span>
                      </a>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
        {sets.length > 0 && (
          <section aria-label="자주 쓰는 채팅 표현">
            <h2 className="course-h">
              자주 쓰는 채팅 표현 <span className="course-h-sub">· 친구와 채팅할 때 바로 쓰는 짧은 말</span>
            </h2>
            <ul className="course-chips">
              {sets.map((set) => {
                const p = setProgress[set.id]
                const finished = !!p && p.lineIndex >= set.lines
                return (
                  <li key={set.id}>
                    <a className="course-chip" data-state={finished ? 'done' : undefined} href={href({ name: 'study', materialId: set.id })}>
                      {finished && <span aria-label="끝냄">✓</span>}
                      {set.title}
                    </a>
                  </li>
                )
              })}
            </ul>
          </section>
        )}
        <section aria-label="상황별 예문">
          <h2 className="course-h">
            상황별 예문 <span className="course-h-sub">· 면접·이메일·편지처럼 실제로 쓰는 글을 쳐 봐요</span>
          </h2>
          <ul className="practice-grid">
            {SITUATIONS.map((s) => {
              const id = practiceId(lang, s.id)
              const p = setProgress[id]
              const finished = !!p && p.lineIndex >= 8
              return (
                <li key={s.id}>
                  <a className="practice-card" data-state={finished ? 'done' : undefined} href={href({ name: 'study', materialId: id })}>
                    <b>
                      {finished && <span aria-label="끝냄">✓ </span>}
                      {s.title}
                    </b>
                    <span>
                      {s.desc} <span className="nowrap">· 8줄</span>
                    </span>
                  </a>
                </li>
              )
            })}
          </ul>
        </section>
        <section aria-label="발음 연습">
          <h2 className="course-h">
            발음 연습 <span className="course-h-sub">· {lang === 'mn' ? '헷갈리는 소리를 모은 문장' : '잰말놀이'}를 듣고 소리 내어 따라 해요</span>
          </h2>
          <div className="practice-twister">
            <a className="practice-card practice-listen" href={href({ name: 'read', materialId: practiceId(lang, TWISTER) })}>
              <b>🔊 듣고 따라 말하기</b>
              <span>8문장 · 천천히(0.75배)부터 시작해 보세요</span>
            </a>
            <a className="practice-card" href={`${href({ name: 'materials', lang, tab: 'youtube' })}&tag=twister`}>
              <b>▶ 유튜브 발음 연습 영상</b>
              <span>영상을 한 문장씩 듣고 따라 쳐요</span>
            </a>
          </div>
        </section>
      </section>
      <aside className="course-side" aria-label="오늘 할 일">
        <h2 className="course-h">오늘 할 일</h2>
        {next ? (
          <a className="course-today" href={go(next.week, next.lesson)}>
            <span className="course-today-where">
              {next.week === 0 ? `글자 익히기 · ${course.letters[next.lesson - 1]?.title}` : `${next.week}주차 ${course.weeks[next.week - 1].theme} · ${next.lesson}번째 레슨`}
            </span>
            <b className="course-today-title">{today ? '오늘 목표 달성! 한 레슨 더 할까요?' : '오늘의 레슨 시작'}</b>
            <span className="course-today-meta">10줄 · 약 5분</span>
          </a>
        ) : (
          <p className="course-finished">
            <Sentences text="24주 코스를 다 끝냈어요! 이제 유튜브 노래와 영상으로 이어서 연습해요." />
          </p>
        )}
        <div className="course-stats">
          <div>
            <span>연속 학습</span>
            <b>{days}일</b>
          </div>
          <div>
            <span>전체 진도</span>
            <b>
              {prog.done.length} / {total}
            </b>
          </div>
        </div>
        {due > 0 && (
          <button
            type="button"
            className="course-review"
            onClick={() =>
              void buildReviewMaterial(store).then((m) => {
                if (m) location.hash = href({ name: 'study', materialId: m.id })
              })
            }
          >
            <span>오늘의 복습 · 틀린 줄과 담은 단어 {due}개</span>
            <span aria-hidden="true">›</span>
          </button>
        )}
        {wordsDue > 0 && (
          <a className="course-review" href={href({ name: 'words', lang })}>
            <span>단어 복습 · 담은 단어 {wordsDue}개 (뜻 고르기 → 직접 치기)</span>
            <span aria-hidden="true">›</span>
          </a>
        )}
        <p className="course-note">
          <Sentences text="주차 문장은 공개 문장 모음 Tatoeba에서 사람이 옮긴 한국어 뜻과 함께 골랐어요." />
        </p>
      </aside>
    </div>
  )
}

function localDay() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
