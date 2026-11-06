/**
 * 단어 복습: 뜻 고르기(4지선다) → 뜻 보고 직접 쳐 보기. 맞히면 1·3·7일 뒤, 틀리면 내일 다시.
 * 담은 낱말 중 뜻이 있는 것만 쓴다(줄 전체를 담은 것은 빼고).
 */
import type { Word } from './types'

export interface WordState {
  /** 0: 새 단어·틀림(다음 날) 1: 3일 2: 7일 3: 외움 */
  step: number
  /** 다시 볼 날(밀리초) */
  due: number
}
export type WordStates = Record<string, WordState>

const DAY = 86_400_000
const GAP = [1, 3, 7]

export const quizWords = (words: Word[]) => words.filter((w) => !w.wholeLine && !!w.meaning?.trim())

/** 오늘 볼 단어(새 단어 먼저, 오래 기다린 순), 최대 n개 */
export function dueWords(words: Word[], states: WordStates, now: number, n = 10): Word[] {
  return quizWords(words)
    .filter((w) => (states[w.id]?.step ?? 0) < 3 && (states[w.id]?.due ?? 0) <= now)
    .sort((a, b) => (states[a.id]?.due ?? 0) - (states[b.id]?.due ?? 0) || (a.savedAt ?? 0) - (b.savedAt ?? 0))
    .slice(0, n)
}

export function nextState(prev: WordState | undefined, correct: boolean, now: number): WordState {
  if (!correct) return { step: 0, due: now + DAY }
  const step = Math.min(3, (prev?.step ?? 0) + 1)
  return { step, due: now + (GAP[step - 1] ?? 30) * DAY }
}

/** 오답 보기에 섞을 흔한 뜻(담은 단어가 적을 때) */
const FILLER = ['먹다', '가다', '오늘', '친구', '물', '크다', '보다', '집', '학교', '좋다', '시간', '사람', '말하다', '새롭다', '비']

/** 보기 4개: 정답 + 다른 단어 뜻 3개(겹치지 않게), 섞어서 */
export function choices(word: Word, pool: Word[], rand: () => number = Math.random): string[] {
  const right = word.meaning!.trim()
  const others = [...new Set([...pool.map((w) => w.meaning?.trim() ?? ''), ...FILLER])].filter((m) => m && m !== right)
  const picked: string[] = []
  while (picked.length < 3 && others.length) picked.push(others.splice(Math.floor(rand() * others.length), 1)[0])
  const all = [right, ...picked]
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[all[i], all[j]] = [all[j], all[i]]
  }
  return all
}

/** 직접 쳐 보기 채점: 전각·반각, 대소문자, 앞뒤 공백·끝 문장부호는 보지 않는다 */
export function sameWord(typed: string, word: string): boolean {
  const norm = (s: string) => s.normalize('NFKC').trim().toLowerCase().replace(/[\s.。,，!！?？]+$/u, '')
  return norm(typed) === norm(word)
}
