/** 대본 가져오기 (기획안 9장): 형식 판별, 원문·뜻 나누기, 자동 정리. */
import type { Lang } from '../lang'

export type ScriptFormat = 'table' | 'csv' | 'srt' | 'vtt' | 'text'
export type LineFlag = 'title' | 'no-ko' | 'reading'

export interface DraftLine {
  src: string
  ko?: string
  start?: number
  end?: number
  /** 원문에서 뺀 소리 표시 (되살리기용) */
  removed?: string[]
  flags: LineFlag[]
}

const TARGET: Record<Lang, RegExp> = {
  ja: /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/gu,
  zh: /\p{Script=Han}/gu,
  tw: /[\p{Script=Han}㄀-ㄯ]/gu,
  en: /[A-Za-z]/g,
  mn: /\p{Script=Cyrillic}/gu,
}
const HANGUL = /\p{Script=Hangul}/gu
const count = (s: string, re: RegExp) => s.match(re)?.length ?? 0
const isKo = (s: string, lang: Lang) => count(s, HANGUL) > count(s, TARGET[lang])

const TIME_LINE = /(\d{1,2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,.]\d{3})/
const TAG = /\[[^\]]*\]|\([^)]*\)|（[^）]*）|［[^］]*］|♪+/g
const SPEAKER = /^(?:[A-Z][A-Z .'’-]{0,20}|[\p{L}\p{N}]{1,6})\s*[:：]\s*/u
const DASH = /(?:^|\s)[-－‐–]\s*/
const TITLE = /NETFLIX|ネットフリックス|字幕|翻訳|제작|자막|번역|오리지널 시리즈/i

/** `3:01`, `1:02:03`, `00:03:01,000`, `00:00:01.500`, `30s` → 초 */
export function parseTime(s: string): number | undefined {
  const t = s.trim()
  const sec = t.match(/^(\d+(?:\.\d+)?)s$/)
  if (sec) return Number(sec[1])
  const m = t.match(/^(\d+):(\d{2})(?::(\d{2}))?(?:[,.](\d{1,3}))?$/)
  if (!m) return undefined
  const [h, mi, s2] = m[3] !== undefined ? [Number(m[1]), Number(m[2]), Number(m[3])] : [0, Number(m[1]), Number(m[2])]
  const ms = m[4] ? Number(m[4].padEnd(3, '0')) / 1000 : 0
  return h * 3600 + mi * 60 + s2 + ms
}

/** 따옴표를 지키며 쉼표로 나눈다 */
function splitCsv(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let q = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (q && c === '"' && line[i + 1] === '"') {
      cur += '"'
      i++
    } else if (c === '"') q = !q
    else if (c === ',' && !q) {
      out.push(cur)
      cur = ''
    } else cur += c
  }
  out.push(cur)
  return out
}

const nonEmpty = (text: string) => text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)

export function detectFormat(text: string): ScriptFormat {
  const t = text.replace(/^﻿/, '').trim()
  if (/^WEBVTT/.test(t)) return 'vtt'
  if (TIME_LINE.test(t)) return 'srt'
  const lines = nonEmpty(t)
  if (lines.length && lines.filter((l) => l.includes('\t')).length >= lines.length * 0.8) return 'table'
  const commas = lines.map((l) => splitCsv(l).length - 1)
  if (lines.length >= 3 && commas[0] >= 1 && commas.every((c) => c === commas[0])) return 'csv'
  return 'text'
}

/** 한 줄 안에 원문과 한국어가 함께 있으면 첫 한글 앞에서 나눈다(앞의 대시·공백·괄호는 뜻 쪽으로) */
function splitMixed(line: string, lang: Lang): [string, string | undefined] {
  const hasTarget = count(line, TARGET[lang]) > 0
  const first = line.search(/\p{Script=Hangul}/u)
  if (!hasTarget || first < 0) return [line, undefined]
  let i = first
  while (i > 0 && /[\s\-－‐–"“'‘(（[]/.test(line[i - 1])) i--
  return [line.slice(0, i).trim(), line.slice(i).trim()]
}

interface Cue {
  src: string
  ko?: string
  start?: number
  end?: number
}

function fromCells(rows: string[][], lang: Lang): Cue[] {
  const cues: Cue[] = []
  rows.forEach((cells, r) => {
    const target = cells.map((c) => count(c, TARGET[lang]))
    if (r === 0 && target.every((n) => n === 0)) return // 머리 줄
    const si = target.indexOf(Math.max(...target))
    const hangul = cells.map((c, i) => (i === si ? -1 : count(c, HANGUL)))
    const ki = hangul.indexOf(Math.max(...hangul))
    const ti = cells.findIndex((c, i) => i !== si && i !== ki && /^\d/.test(c.trim()) && parseTime(c) !== undefined)
    cues.push({ src: cells[si] ?? '', ko: ki >= 0 && hangul[ki] > 0 ? cells[ki] : undefined, start: ti >= 0 ? parseTime(cells[ti]) : undefined })
  })
  return cues
}

function fromSubtitles(text: string, lang: Lang): Cue[] {
  const cues: Cue[] = []
  for (const block of text.replace(/^﻿/, '').split(/\r?\n\s*\r?\n/)) {
    const lines = block.split(/\r?\n/).map((l) => l.trim())
    const ti = lines.findIndex((l) => TIME_LINE.test(l))
    if (ti < 0) continue
    const [, a, b] = lines[ti].match(TIME_LINE)!
    const src: string[] = []
    const ko: string[] = []
    for (const raw of lines.slice(ti + 1)) {
      const l = raw.replace(/<[^>]+>/g, '').trim()
      if (!l) continue
      const [s, k] = splitMixed(l, lang)
      if (k !== undefined) {
        src.push(s)
        ko.push(k)
      } else (isKo(l, lang) ? ko : src).push(l)
    }
    cues.push({ src: src.join(' '), ko: ko.join(' ') || undefined, start: parseTime(a), end: parseTime(b) })
  }
  return cues
}

function fromText(text: string, lang: Lang): Cue[] {
  const cues: Cue[] = []
  for (const line of nonEmpty(text)) {
    const [s, k] = splitMixed(line, lang)
    const last = cues[cues.length - 1]
    if (k !== undefined) cues.push({ src: s, ko: k })
    else if (isKo(line, lang) && last && last.ko === undefined) last.ko = line
    else if (isKo(line, lang)) cues.push({ src: '', ko: line })
    else cues.push({ src: line })
  }
  return cues
}

/** 원문 SRT 와 한국어 SRT 를 시간이 가장 많이 겹치는 것끼리 짝짓는다 */
function pairByTime(src: Cue[], ko: Cue[]): Cue[] {
  const overlap = (a: Cue, b: Cue) => Math.max(0, Math.min(a.end ?? 0, b.end ?? 0) - Math.max(a.start ?? 0, b.start ?? 0))
  return src.map((c) => {
    const best = ko.reduce<Cue | undefined>((m, k) => (overlap(c, k) > (m ? overlap(c, m) : 0) ? k : m), undefined)
    return { ...c, ko: best ? [best.src, best.ko].filter(Boolean).join(' ') : c.ko }
  })
}

function stripTags(s: string): { text: string; removed: string[] } {
  const removed = s.match(TAG) ?? []
  const text = s.replace(TAG, ' ').replace(/\s+/g, ' ').trim().replace(SPEAKER, '').trim()
  return { text, removed }
}

/** 정리: 소리 표시·화자 이름 빼기, 대시 대사 나누기, 제목 줄 표시, 빈 줄 지우기 */
function clean(cues: Cue[]): { lines: DraftLine[]; removedCount: number } {
  const lines: DraftLine[] = []
  let removedCount = 0
  for (const c of cues) {
    const s = stripTags(c.src)
    const k = c.ko !== undefined ? stripTags(c.ko).text : undefined
    if (!/\p{L}/u.test(s.text)) {
      removedCount++
      continue
    }
    const sParts = s.text.split(DASH).map((x) => x.trim()).filter(Boolean)
    const kParts = k?.split(DASH).map((x) => x.trim()).filter(Boolean) ?? []
    const pairs: [string, string | undefined][] =
      sParts.length > 1 && sParts.length === kParts.length ? sParts.map((p, i) => [p, kParts[i]]) : [[sParts.join(' '), kParts.join(' ') || undefined]]
    pairs.forEach(([src, ko], i) => {
      const flags: LineFlag[] = []
      if (TITLE.test(src)) flags.push('title')
      if (!ko) flags.push('no-ko')
      lines.push({
        src,
        ...(ko ? { ko } : {}),
        ...(c.start !== undefined ? { start: c.start } : {}),
        ...(c.end !== undefined ? { end: c.end } : {}),
        ...(i === 0 && s.removed.length ? { removed: s.removed } : {}),
        flags,
      })
    })
  }
  return { lines, removedCount }
}

export function parseScript(text: string, lang: Lang, opts: { koText?: string } = {}): { lines: DraftLine[]; removedCount: number; checkCount: number } {
  const format = detectFormat(text)
  let cues: Cue[]
  if (format === 'srt' || format === 'vtt') cues = fromSubtitles(text, lang)
  else if (format === 'table') cues = fromCells(nonEmpty(text).map((l) => l.split('\t')), lang)
  else if (format === 'csv') cues = fromCells(nonEmpty(text).map(splitCsv), lang)
  else cues = fromText(text, lang)
  if (opts.koText) cues = pairByTime(cues, fromSubtitles(opts.koText, lang))
  const { lines, removedCount } = clean(cues)
  return { lines, removedCount, checkCount: lines.filter((l) => l.flags.length).length }
}

/** 유튜브 자막 줄도 대본과 같은 규칙으로 정리한다(소리 표시·화자·대시·빈 줄) */
export function cleanCues(cues: { src: string; ko?: string; start?: number; end?: number }[]): DraftLine[] {
  return clean(cues).lines
}
