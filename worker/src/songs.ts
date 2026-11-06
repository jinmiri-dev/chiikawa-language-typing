/**
 * 노래 가사(무료): 유튜브 영상 정보(제목·채널·길이)로 LRCLIB(lrclib.net, 누구나 쓰는 공개 가사 저장소)에서
 * 시간이 붙은 가사를 찾는다. 자막 서비스가 없어도 노래 영상은 대부분 이걸로 연습할 수 있다.
 */
import type { Deps, Env } from './env'
import { isoDuration } from './search'
import * as OpenCC from 'opencc-js'
import type { Cue, SrcLang } from './transcript'

export interface VideoMeta {
  title: string
  channel: string
  durationSec: number
  embeddable: boolean
  /** 유튜브 분류 10 = 음악 */
  music: boolean
}

/** 영상 정보 한 번(유튜브 한도 1). 키가 없거나 실패하면 null */
export async function videoMeta(env: Env, deps: Deps, v: string): Promise<VideoMeta | null> {
  if (!env.YOUTUBE_API_KEY) return null
  const u = new URL('https://www.googleapis.com/youtube/v3/videos')
  u.searchParams.set('part', 'snippet,contentDetails,status')
  u.searchParams.set('id', v)
  u.searchParams.set('key', env.YOUTUBE_API_KEY)
  const res = await deps.fetch(u)
  if (!res.ok) return null
  const body = (await res.json()) as {
    items?: { snippet?: { title?: string; channelTitle?: string; categoryId?: string }; contentDetails?: { duration?: string }; status?: { embeddable?: boolean } }[]
  }
  const it = body.items?.[0]
  if (!it) return null
  return {
    title: it.snippet?.title ?? '',
    channel: it.snippet?.channelTitle ?? '',
    durationSec: isoDuration(it.contentDetails?.duration ?? ''),
    embeddable: it.status?.embeddable !== false,
    music: it.snippet?.categoryId === '10',
  }
}

/** 제목에서 노래 이름과 상관없는 말(공식 영상, 가사, 화질 등)을 지운다 */
const NOISE =
  /official|music video|lyric(s)?( video)?|\bmv\b|\bm\/v\b|audio|visualizer|\b4k\b|\bhd\b|\bhq\b|live|full ver(sion)?|歌詞(付き)?|動態歌詞|动态歌词|歌词版?|字幕|中字|官方|完整版|高音質|高音质|ミュージックビデオ|公式|видео|клип|дууны үг/gi
const EXTRA = /cover|原唱|翻唱|pinyin|拼音|中英|ZH\/EN|\bcc\b|ep\b|單曲|单曲|發行|发行|主題|主题|推廣|推广|音質|音质|无损|無損|lyrics?|\d{6,}/i
/** 제목을 덩어리(가수·노래 이름 등)로 나누고, 노래 이름과 상관없는 덩어리는 버린다 */
export function titleParts(title: string): string[] {
  return title
    .split(/\s[-–—~]\s|[-–—]{1}(?=\s)|(?<=\s)[-–—]|[|｜/／【】\[\]()（）［］『』「」〈〉《》:：♪#＃]|\s{2,}/)
    .map((p) => p.replace(NOISE, ' ').replace(/[“”"']/g, '').replace(/\s+/g, ' ').trim())
    .filter((p) => /\p{L}/u.test(p) && p.length <= 30 && !EXTRA.test(p))
}
export function songQuery(title: string, channel: string): string[] {
  const ch = channel.replace(/\s*-\s*Topic$|VEVO$|official|オフィシャル|公式|channel|チャンネル|music$/gi, '').trim()
  const parts = titleParts(title)
  const qs: string[] = []
  if (parts.length >= 2) qs.push(`${parts[0]} ${parts[1]}`)
  if (parts[0]) qs.push(parts[0])
  if (parts[1]) qs.push(parts[1])
  if (parts[0] && ch && !parts.join(' ').toLowerCase().includes(ch.toLowerCase())) qs.push(`${parts[0]} ${ch}`)
  return [...new Set(qs.filter((q) => q.length >= 2))].slice(0, 4)
}

/** 가사가 번체여도 중국어(간체)로, 간체여도 대만어(번체)로 바꾼다 */
let toCn: ((s: string) => string) | null = null
let toTw: ((s: string) => string) | null = null
export function toScript(lang: 'zh' | 'tw', text: string): string {
  if (lang === 'zh') return (toCn ??= OpenCC.Converter({ from: 'tw', to: 'cn' }))(text)
  return (toTw ??= OpenCC.Converter({ from: 'cn', to: 'tw' }))(text)
}

/** 비교용: 글자와 숫자만, 소문자 */
const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')

/** `[01:02.34] 가사` → 줄. 빈 줄(간주)은 앞 줄의 끝으로만 쓴다 */
export function parseLrc(lrc: string): Cue[] {
  const marks: { t: number; text: string }[] = []
  for (const line of lrc.split(/\r?\n/)) {
    const stamps = [...line.matchAll(/\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g)]
    if (!stamps.length) continue
    const text = line.replace(/\[[^\]]*\]/g, '').trim()
    for (const s of stamps) marks.push({ t: Number(s[1]) * 60 + Number(s[2]) + (s[3] ? Number(s[3].padEnd(3, '0')) / 1000 : 0), text })
  }
  marks.sort((a, b) => a.t - b.t)
  const out: Cue[] = []
  marks.forEach((m, i) => {
    if (!m.text) return
    const next = marks[i + 1]
    const end = next ? Math.min(next.t, m.t + 12) : m.t + 6
    out.push({ start: m.t, end, text: m.text })
  })
  return out
}

/** 이 언어 글자인가(중국어는 한자면 되고, 간체·번체는 뒤에서 바꾼다) */
export function scriptFits(text: string, lang: SrcLang): boolean {
  const n = (re: RegExp) => text.match(re)?.length ?? 0
  const total = text.replace(/\s/g, '').length || 1
  switch (lang) {
    case 'ja':
      return n(/[\p{Script=Hiragana}\p{Script=Katakana}]/gu) / total > 0.15
    case 'zh':
    case 'tw': {
      const han = n(/\p{Script=Han}/gu)
      if (han / total < 0.4 || n(/[\p{Script=Hiragana}\p{Script=Katakana}]/gu) > 3) return false
      return true
    }
    case 'mn':
      return n(/\p{Script=Cyrillic}/gu) / total > 0.5
    case 'ko':
      return n(/\p{Script=Hangul}/gu) / total > 0.4
    case 'en':
      return n(/[A-Za-z]/g) / total > 0.7
  }
}

interface LrcHit {
  trackName: string
  artistName: string
  duration: number
  syncedLyrics: string | null
  instrumental?: boolean
}

/**
 * 영상에 맞는 시간 가사를 찾는다. 다음을 모두 만족해야 쓴다(엉뚱한 가사를 내보내지 않게):
 * 노래 이름이 제목에 들어 있고, 길이가 영상과 거의 같거나(±8초) 영상이 조금 더 길고(뮤직비디오 앞뒤 장면, +45초까지),
 * 가사가 그 언어 글자다. 여럿이면 길이가 가장 가까운 것.
 */
export async function findSong(deps: Deps, meta: VideoMeta, lang: SrcLang): Promise<Cue[] | null> {
  // 간체·번체가 달라도 같은 글자로 보고 비교한다
  const same = (s: string) => norm(toScript('zh', s))
  const hay = same(`${meta.title} ${meta.channel}`)
  /** 가수 이름(여럿이면 그중 하나)이 제목이나 채널에 있다: 예고편·동화가 같은 이름의 노래 가사와 잘못 짝지어지지 않게 */
  const artistIn = (artist: string) =>
    artist
      .split(/\s*(?:[,&、/／×x]|feat\.?|ft\.?|and|with|\(|\)|（|）)\s*/i)
      .map(same)
      .some((t) => t.length >= (/^[a-z0-9]+$/.test(t) ? 3 : 2) && hay.includes(t))
  for (const q of songQuery(meta.title, meta.channel)) {
    const u = new URL('https://lrclib.net/api/search')
    u.searchParams.set('q', q)
    let list: LrcHit[]
    try {
      const res = await deps.fetch(u, { signal: AbortSignal.timeout(7000), headers: { 'user-agent': 'language-grade1 (https://github.com/jinmiri-dev/chiikawa-language-typing)' } })
      if (!res.ok) continue
      list = (await res.json()) as LrcHit[]
    } catch {
      continue
    }
    const fit = list
      .filter((h) => h.syncedLyrics && !h.instrumental)
      .filter((h) => {
        const name = same(h.trackName.replace(/\(.*?\)|（.*?）|-.*$/g, ''))
        return name.length >= 1 && hay.includes(name) && artistIn(h.artistName)
      })
      .filter((h) => !meta.durationSec || (h.duration - meta.durationSec <= 8 && meta.durationSec - h.duration <= 45))
      .filter((h) => scriptFits(h.syncedLyrics!.replace(/\[[^\]]*\]/g, ''), lang))
      .sort((a, b) => Math.abs(a.duration - meta.durationSec) - Math.abs(b.duration - meta.durationSec))
    for (const h of fit) {
      const cues = parseLrc(h.syncedLyrics!)
      if (cues.length >= 4) return lang === 'zh' || lang === 'tw' ? cues.map((c) => ({ ...c, text: toScript(lang, c.text) })) : cues
    }
  }
  return null
}
