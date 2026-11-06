/** 초보 코스 탭(와이어프레임 02-0): 왼쪽 0단계·24주, 오른쪽 오늘 할 일(다음 레슨·연속 학습일·진도·복습) */
import { useEffect, useState } from 'react'
import { useApp } from '../../app/AppState'
import { href } from '../../app/routes'
import { Sentences } from '../../components/components'
import { allLessons, lessonId, loadCourse, stageName, type CourseData } from '../../content/course'
import type { Lang } from '../../engine/lang'
import { getCourseProgress, nextLesson, streak, type CourseProgress } from '../../services/course'
import { buildReviewMaterial, reviewCount } from '../../services/review'

export default function CourseTab({ lang }: { lang: Lang }) {
  const { store } = useApp()
  const [course, setCourse] = useState<CourseData | null>(null)
  const [prog, setProg] = useState<CourseProgress>({ done: [], days: [] })
  const [due, setDue] = useState(0)
  useEffect(() => {
    void loadCourse(lang).then(setCourse)
    void getCourseProgress(store, lang).then(setProg)
    void reviewCount(store).then(setDue, () => setDue(0))
  }, [store, lang])

  if (!course) return <p className="busy">코스를 불러오고 있어요…</p>
  const done = new Set(prog.done)
  const next = nextLesson(course, lang, prog.done)
  const total = allLessons(course).length
  const days = streak(prog.days)
  const today = prog.days.includes(localDay())
  const curWeek = next?.week ?? 24
  const go = (w: number, l: number) => href({ name: 'study', materialId: lessonId(lang, w, l) })

  return (
    <div className="course">
      <section className="course-main" aria-label="코스">
        <p className="materials-lead">
          <Sentences text="하루 한 레슨(10줄, 약 5분)씩 24주. 쉬운 문장부터 차근차근 올라가요." />
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
        <h2 className="course-h">
          주차별 문장 {next && next.week > 0 && <span className="course-h-sub">· {next.week}주차 공부 중</span>}
        </h2>
        <ul className="course-weeks">
          {course.weeks.map((w, wi) => {
            const week = wi + 1
            const n = w.filter((_, li) => done.has(lessonId(lang, week, li + 1))).length
            const state = n === w.length ? 'done' : week === curWeek ? 'now' : undefined
            const first = w.findIndex((_, li) => !done.has(lessonId(lang, week, li + 1)))
            return (
              <li key={week}>
                <a className="course-week" data-state={state} href={go(week, first < 0 ? 1 : first + 1)} aria-label={`${week}주차 ${stageName(week)}, ${w.length}개 중 ${n}개 끝냄`}>
                  <b>{week}주차</b>
                  <span>{state === 'done' ? `✓ ${n} / ${w.length}` : `${n} / ${w.length}`}</span>
                </a>
              </li>
            )
          })}
        </ul>
      </section>
      <aside className="course-side" aria-label="오늘 할 일">
        <h2 className="course-h">오늘 할 일</h2>
        {next ? (
          <a className="course-today" href={go(next.week, next.lesson)}>
            <span className="course-today-where">{next.week === 0 ? `글자 익히기 · ${course.letters[next.lesson - 1]?.title}` : `${next.week}주차 · ${next.lesson}번째 레슨`}</span>
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
