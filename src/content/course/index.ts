/**
 * 초보 6개월 코스: 0단계 글자 익히기(5레슨) + 24주 × 5레슨 × 10줄.
 * 주차 문장은 Tatoeba(https://tatoeba.org, CC BY 2.0 FR)에서 사람이 한국어로 옮긴 문장을 쉬운 순으로 골랐다.
 * 몽골어는 한국어 연결이 적어 영어 연결 문장의 뜻을 직접 옮겨 달았다. 0단계는 직접 쓴 것.
 * 언어마다 파일이 따로라, 그 언어 코스를 열 때만 내려받는다.
 */
import type { Lang } from '../../engine/lang'

export type CourseLine = [src: string, ko: string]
export interface CourseData {
  letters: { title: string; lines: CourseLine[] }[]
  /** weeks[주-1][레슨-1] = 줄들 */
  weeks: CourseLine[][][]
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
  return course.weeks[week - 1]?.[lesson - 1] ?? null
}

/** 단계 이름: 1~4주 입문, 5~12주 기초, 13~20주 초급, 21~24주 초급 마무리 */
export function stageName(week: number): string {
  if (week === 0) return '글자 익히기'
  if (week <= 4) return '입문'
  if (week <= 12) return '기초'
  if (week <= 20) return '초급'
  return '초급 마무리'
}

export function lessonTitle(course: CourseData, week: number, lesson: number): string {
  if (week === 0) return `글자 익히기 · ${course.letters[lesson - 1]?.title ?? lesson}`
  return `${week}주차 ${lesson}번째 레슨 · ${stageName(week)}`
}

/** 코스 안 모든 레슨을 순서대로 */
export function allLessons(course: CourseData): { week: number; lesson: number }[] {
  return [
    ...course.letters.map((_, i) => ({ week: 0, lesson: i + 1 })),
    ...course.weeks.flatMap((w, wi) => w.map((_, li) => ({ week: wi + 1, lesson: li + 1 }))),
  ]
}
