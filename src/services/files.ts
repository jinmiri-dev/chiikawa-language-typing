/** 대본 파일 읽기. 파일은 브라우저 안에서만 읽고 어디로도 보내지 않는다. */
import type { Lang } from '../engine/lang'

const TITLE_MAX = 24

export function titleFrom(src: { fileName?: string; text?: string }): string {
  if (src.fileName) return src.fileName.replace(/\.[^.]+$/, '')
  const first = src.text?.split(/\r?\n/).map((l) => l.trim()).find(Boolean)
  if (!first) return '내 대본'
  return [...first].length > TITLE_MAX ? [...first].slice(0, TITLE_MAX).join('') + '…' : first
}

/** youtube.com/watch?v=, youtu.be/, youtube.com/shorts/ 만 받는다 */
export function youtubeIdFrom(url: string): string | undefined {
  try {
    const u = new URL(url.trim())
    const host = u.hostname.replace(/^www\.|^m\./, '')
    const id = host === 'youtu.be' ? u.pathname.slice(1) : host === 'youtube.com' ? (u.searchParams.get('v') ?? u.pathname.match(/^\/shorts\/([\w-]+)/)?.[1]) : undefined
    return id && /^[\w-]{11}$/.test(id) ? id : undefined
  } catch {
    return undefined
  }
}

const hangulRatio = (s: string) => (s.match(/\p{Script=Hangul}/gu)?.length ?? 0) / Math.max(1, s.replace(/\s/g, '').length)

/** 파일이 두 개면(원문 SRT + 한국어 SRT) 한글이 많은 쪽을 뜻으로 */
export function pairTexts(texts: string[], _lang: Lang): { text: string; koText?: string } {
  if (texts.length < 2) return { text: texts[0] ?? '' }
  const [a, b] = texts
  return hangulRatio(a) > hangulRatio(b) ? { text: b, koText: a } : { text: a, koText: b }
}

export const isPdf = (f: File) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name)

/** PDF 글자를 줄 단위로 뽑는다(pdf.js 는 이때만 불러옴). 같은 높이의 글자 조각을 한 줄로 모은다. */
export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  const out: string[] = []
  for (let p = 1; p <= doc.numPages; p++) {
    const content = await (await doc.getPage(p)).getTextContent()
    const rows = new Map<number, string[]>()
    for (const item of content.items) {
      if (!('str' in item) || !item.str.trim()) continue
      const y = Math.round(item.transform[5])
      rows.set(y, [...(rows.get(y) ?? []), item.str])
    }
    for (const y of [...rows.keys()].sort((a, b) => b - a)) out.push(rows.get(y)!.join(' '))
  }
  return out.join('\n')
}

export async function readScriptFile(f: File): Promise<string> {
  return isPdf(f) ? extractPdfText(f) : f.text()
}
