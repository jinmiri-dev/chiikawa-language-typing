/** 오늘의 뉴스 기사를 연습 재료로(읽기를 만들어 저장) */
import { safeLink } from '../engine/url'
import { buildDraftMaterial } from '../engine/import/material'
import type { Lang } from '../engine/lang'
import type { Material } from '../engine/types'
import type { NewsArticle, NewsTag } from './api'
import { loadSegmenter } from './segmenter'
import type { Store } from './storage'

export const newsMaterialId = (lang: Lang, id: string) => `${lang}-n${id}`

export async function openNews(store: Store, lang: Lang, a: NewsArticle): Promise<Material> {
  const id = newsMaterialId(lang, a.id)
  const saved = await store.getMaterial(id)
  // 한국어 뜻이 나중에 채워졌으면 다시 만든다
  if (saved && saved.lines.length === a.lines.length && saved.lines.every((l, i) => l.ko === a.lines[i]?.ko)) return saved
  const segment = await loadSegmenter(lang).catch(() => null)
  const draft = buildDraftMaterial({ id, lang, title: a.title, lines: a.lines.map((l) => ({ src: l.src, ...(l.ko ? { ko: l.ko } : {}), flags: [] })), segment })
  const link = safeLink(a.link)
  const m: Material = { ...draft, kind: 'script', ...(link ? { link } : {}), sourceName: a.source }
  await store.saveMaterial(m)
  return m
}

export const NEWS_TAG_NAME: Record<NewsTag, string> = {
  reading: '읽을거리',
  world: '국제',
  society: '사회',
  economy: '경제',
  science: '과학·IT',
  health: '건강',
  sports: '스포츠',
  culture: '문화·연예',
  etc: '기타',
}
export const NEWS_TAG_ORDER: NewsTag[] = ['reading', 'world', 'society', 'economy', 'science', 'health', 'sports', 'culture', 'etc']

/** 쉬움/보통/어려움: 줄 평균 길이로(한자·가나는 글자, 그 밖은 2.5글자를 한 덩이로) */
export function levelOf(a: Pick<NewsArticle, 'title' | 'lines'>): '쉬움' | '보통' | '어려움' {
  const avg = a.lines.reduce((n, l) => n + [...l.src].length, 0) / Math.max(1, a.lines.length)
  const per = /[぀-ヿ一-鿿]/.test(a.title) ? avg : avg / 2.5
  return per <= 25 ? '쉬움' : per <= 45 ? '보통' : '어려움'
}

