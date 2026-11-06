/**
 * 초보 6개월 코스: 0단계 글자 익히기(5레슨) + 24주 × 5레슨 × 10줄.
 * 주제 8개(인사·마음 … 날씨·건강)를 입문·기초·초급 단계마다 한 바퀴씩 돈다. 욕설·폭력·성·민감한 문장은 뺐다.
 * 주차 문장은 Tatoeba(https://tatoeba.org, CC BY 2.0 FR)에서 사람이 한국어로 옮긴 문장을 쉬운 순으로 골랐다.
 * 몽골어는 한국어 연결이 적어 영어 연결 문장의 뜻을 직접 옮겨 달았다. 0단계는 직접 쓴 것.
 * 언어마다 파일이 따로라, 그 언어 코스를 열 때만 내려받는다.
 */
import type { Lang } from '../../engine/lang'

export type CourseLine = [src: string, ko: string]
export interface CourseWeek {
  /** 주제: 인사·마음, 사람·가족, 먹고 마시기, 시간·하루, 장소·이동, 학교·일, 쇼핑·취미, 날씨·건강 */
  theme: string
  /** 단계: 입문 → 기초 → 초급(주제 8개를 단계마다 한 바퀴) */
  level: string
  /** lessons[레슨-1] = 줄들 */
  lessons: CourseLine[][]
}
export interface CourseData {
  letters: { title: string; lines: CourseLine[] }[]
  weeks: CourseWeek[]
}

const LOADERS: Record<Lang, () => Promise<{ default: unknown }>> = {
  ja: () => import('./ja.json'),
  zh: () => import('./zh.json'),
  tw: () => import('./tw.json'),
  en: () => import('./en.json'),
  mn: () => import('./mn.json'),
}

export async function loadCourse(lang: Lang): Promise<CourseData> {
  return (await LOADERS[lang]()).default as CourseData
}

/** 레슨 id: `<lang>-c<주>x<레슨>` (0주 = 글자 익히기). 라우트 규칙 [\w-]+ 에 맞음 */
export const lessonId = (lang: Lang, week: number, lesson: number) => `${lang}-c${week}x${lesson}`
export function parseLessonId(id: string): { lang: Lang; week: number; lesson: number } | null {
  const m = id.match(/^(ja|zh|tw|en|mn)-c(\d+)x(\d+)$/)
  return m ? { lang: m[1] as Lang, week: Number(m[2]), lesson: Number(m[3]) } : null
}

export function lessonLines(course: CourseData, week: number, lesson: number): CourseLine[] | null {
  if (week === 0) return course.letters[lesson - 1]?.lines ?? null
  return course.weeks[week - 1]?.lessons[lesson - 1] ?? null
}

export function lessonTitle(course: CourseData, week: number, lesson: number): string {
  if (week === 0) return `글자 익히기 · ${course.letters[lesson - 1]?.title ?? lesson}`
  const w = course.weeks[week - 1]
  return `${week}주차 ${w?.theme ?? ''} · ${lesson}번째 레슨`
}

/** 코스 안 모든 레슨을 순서대로 */
export function allLessons(course: CourseData): { week: number; lesson: number }[] {
  return [
    ...course.letters.map((_, i) => ({ week: 0, lesson: i + 1 })),
    ...course.weeks.flatMap((w, wi) => w.lessons.map((_, li) => ({ week: wi + 1, lesson: li + 1 }))),
  ]
}
