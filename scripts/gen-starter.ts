// 기본 연습 생성: source/<lang>.json 의 문장에 읽기(병음·주음·전사)를 넣어 src/content/starter/<lang>.json 을 만든다.
// 뜻(한국어)은 일본어 세트와 같은 것을 쓴다(기획안 20.3). 결과는 사람이 검수하고, 틀린 읽기는 TW_FIX 나 source 를 고친다.
//   npx tsx scripts/gen-starter.ts
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pinyin } from 'pinyin-pro'
import { buildPlainSegments } from '../src/engine/reading/plain'
import { buildZhSegments } from '../src/engine/reading/zh'
import type { Segment } from '../src/engine/types'

const dir = join(import.meta.dirname, '..', 'src', 'content', 'starter')
const ja = JSON.parse(readFileSync(join(dir, 'ja.json'), 'utf-8')) as { sets: { id: string; title: string; lines: { ko: string }[] }[] }

/** 조각 → [원문, 읽기, 주음, 전사] (없으면 빈 칸, 끝의 빈 칸은 뺀다) */
function tuple(g: Segment): string[] {
  const t = [g.text, g.reading && g.reading !== g.text ? g.reading : '', g.zhuyin ?? '', g.romaji ?? '']
  while (t.length > 1 && !t[t.length - 1]) t.pop()
  return t
}

for (const lang of ['tw', 'zh', 'en', 'mn'] as const) {
  const src = JSON.parse(readFileSync(join(dir, 'source', `${lang}.json`), 'utf-8')) as { sets: Record<string, string[]> }
  const sets = ja.sets.map((s) => ({
    id: s.id,
    title: s.title,
    lines: src.sets[s.id].map((text, i) => {
      const segs =
        lang === 'tw' || lang === 'zh'
          ? buildZhSegments(lang, text, (t) => pinyin(t, { type: 'array', toneType: 'num', toneSandhi: false }))
          : buildPlainSegments(lang, text)
      return { ko: s.lines[i].ko, segs: segs.map(tuple) }
    }),
  }))
  writeFileSync(join(dir, `${lang}.json`), JSON.stringify({ reviewed: false, sets }, null, 1) + '\n')
  console.log(lang, sets.map((s) => s.lines.length).join('/'))
}
