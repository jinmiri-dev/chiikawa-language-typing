/**
 * 상황별 예문(면접·자기소개·이메일·편지 …)과 발음 연습(잰말놀이). 직접 쓴 문장과 한국어 뜻.
 * 예문은 타자로, 발음 연습은 뉴스 듣기 화면처럼 듣고 따라 말한다. 언어마다 파일이 따로라 열 때만 받는다.
 */
import type { Lang } from '../../engine/lang'

/** [원문, 한국어 뜻, 정해 둔 조각·읽기(사전이 틀리기 쉬운 잰말놀이 등)?] */
export type PracticeLine = [src: string, ko: string, segs?: [text: string, reading?: string][]]
export interface PracticeData {
  situations: Record<string, PracticeLine[]>
  twisters: PracticeLine[]
}

/** 상황 순서와 이름(언어 공통) */
export const SITUATIONS: { id: string; title: string; desc: string }[] = [
  { id: 'intro', title: '자기소개', desc: '처음 만난 자리에서' },
  { id: 'interview', title: '면접', desc: '질문과 답변' },
  { id: 'resume', title: '이력서·자기소개서', desc: '경력과 지원 동기' },
  { id: 'email', title: '업무 이메일', desc: '인사부터 맺음말까지' },
  { id: 'letter', title: '편지·감사 카드', desc: '친구에게 쓰는 글' },
  { id: 'phone', title: '전화', desc: '바꿔 달라·메시지 남기기' },
  { id: 'request', title: '부탁·사과', desc: '정중하게 말하기' },
  { id: 'travel', title: '여행·호텔', desc: '체크인·길 묻기' },
]
export const TWISTER = 'twister'

const LOADERS: Record<Lang, () => Promise<{ default: unknown }>> = {
  ja: () => import('./ja.json'),
  zh: () => import('./zh.json'),
  tw: () => import('./tw.json'),
  en: () => import('./en.json'),
  mn: () => import('./mn.json'),
}
export async function loadPractice(lang: Lang): Promise<PracticeData> {
  return (await LOADERS[lang]()).default as PracticeData
}

/** 재료 id: `<lang>-p<상황 id>`, 발음 연습은 `<lang>-ptwister` */
export const practiceId = (lang: Lang, id: string) => `${lang}-p${id}`
export function parsePracticeId(id: string): { lang: Lang; id: string } | null {
  const m = id.match(/^(ja|zh|tw|en|mn)-p([a-z]+)$/)
  if (!m || (m[2] !== TWISTER && !SITUATIONS.some((s) => s.id === m[2]))) return null
  return { lang: m[1] as Lang, id: m[2] }
}
export function practiceTitle(id: string): string {
  return id === TWISTER ? '발음 연습' : (SITUATIONS.find((s) => s.id === id)?.title ?? id)
}
