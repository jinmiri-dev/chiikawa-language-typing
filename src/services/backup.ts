/** 백업·복원·공유 (기획안 16장, 프론트-설계 6장). 받은 파일은 검사한 뒤에만 저장소를 바꾼다. */
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import { LANGS, type Lang } from '../engine/lang'
import { DEFAULT_SETTINGS, FRIENDS, type Line, type Material, type Progress, type Segment, type Settings } from '../engine/types'
import { downloadText } from './files'
import { newScriptId } from './materials'
import type { Store, StoreName } from './storage'

const APP = 'language-grade1'
const VERSION = 1
const DATA_STORES = ['materials', 'progress', 'words', 'review', 'stats', 'saved'] as const satisfies readonly StoreName[]
type DataStore = (typeof DATA_STORES)[number]
const KEY: Record<DataStore, string> = { materials: 'id', progress: 'materialId', words: 'id', review: 'id', stats: 'id', saved: 'id' }

export interface BackupFile {
  app: typeof APP
  version: typeof VERSION
  exportedAt: string
  data: Record<DataStore, unknown[]> & { settings: Settings; meta?: Record<string, unknown> }
}

/** 함께 옮기는 기록: 초보 코스 진도·연속 일수, 단어 복습 진도, 최고 기록 */
const META_KEY = /^(course|wordQuiz|bestLang):(en|ja|zh|tw|mn)$|^best:[\w-]{1,80}$/

async function exportMeta(store: Store): Promise<Record<string, unknown>> {
  const keys = [
    ...LANGS.flatMap((l) => [`course:${l}`, `wordQuiz:${l}`, `bestLang:${l}`]),
    // 최고 기록은 친 적 있는 재료마다 있다
    ...(await store.listProgress()).map((p) => `best:${p.materialId}`),
  ]
  const out: Record<string, unknown> = {}
  for (const k of keys) {
    const v = await store.getMeta(k)
    if (v !== undefined) out[k] = v
  }
  return out
}

export const backupFileName = (d = new Date()) =>
  `${APP}-backup-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`

export async function exportBackup(store: Store): Promise<BackupFile> {
  const data = Object.fromEntries(await Promise.all(DATA_STORES.map(async (n) => [n, await store.raw.all(n)] as const))) as Record<DataStore, unknown[]>
  return { app: APP, version: VERSION, exportedAt: new Date().toISOString(), data: { ...data, settings: await store.getSettings(), meta: await exportMeta(store) } }
}

/** 백업 파일을 내려받고, 받은 때를 기록한다(완료 화면 권유를 다시 안 하려고) */
export async function downloadBackup(store: Store): Promise<void> {
  downloadText(backupFileName(), JSON.stringify(await exportBackup(store)))
  await store.setMeta('backupAt', Date.now())
}

function validate(input: unknown): { ok: true; file: BackupFile } | { ok: false; reason: string } {
  const f = typeof input === 'string' ? (() => { try { return JSON.parse(input) } catch { return null } })() : input
  if (!f || typeof f !== 'object' || (f as BackupFile).app !== APP) return { ok: false, reason: '언어 1급 백업 파일이 아니에요.' }
  if ((f as BackupFile).version !== VERSION) return { ok: false, reason: '이 사이트와 버전이 다른 백업 파일이에요.' }
  const data = (f as BackupFile).data
  if (!data || typeof data !== 'object' || DATA_STORES.some((n) => data[n] !== undefined && !Array.isArray(data[n])))
    return { ok: false, reason: '백업 파일이 깨졌어요. 다른 파일로 해 보세요.' }
  return { ok: true, file: f as BackupFile }
}

/** 이미 있는 재료와 id 가 겹치는 수 (덮어쓰기 / 둘 다 두기를 물을지) */
export async function conflicts(store: Store, input: unknown): Promise<number> {
  const v = validate(input)
  if (!v.ok) return 0
  const have = new Set((await store.listMaterials()).map((m) => m.id))
  return ((v.file.data.materials ?? []) as Material[]).filter((m) => have.has(m.id)).length
}

export async function importBackup(
  store: Store,
  input: unknown,
  mode: 'overwrite' | 'keepBoth',
): Promise<{ ok: true; counts: Record<DataStore, number> } | { ok: false; reason: string }> {
  const v = validate(input)
  if (!v.ok) return v
  const { data } = v.file
  const counts = Object.fromEntries(DATA_STORES.map((n) => [n, 0])) as Record<DataStore, number>
  const renamed = new Map<string, string>()

  if (mode === 'keepBoth') {
    const have = new Set((await store.listMaterials()).map((m) => m.id))
    let n = Date.now()
    for (const m of (data.materials ?? []) as Material[]) if (have.has(m.id)) renamed.set(m.id, newScriptId(m.lang, n++))
  }
  for (const name of DATA_STORES) {
    const existing = mode === 'keepBoth' ? new Set((await store.raw.all(name)).map((x) => String((x as Record<string, unknown>)[KEY[name]]))) : null
    for (const raw of (data[name] ?? []) as Record<string, unknown>[]) {
      let item = raw
      if (name === 'materials' && renamed.has(raw.id as string)) item = { ...raw, id: renamed.get(raw.id as string) }
      else if (name === 'progress' && renamed.has(raw.materialId as string)) item = { ...(raw as unknown as Progress), materialId: renamed.get(raw.materialId as string)! } as unknown as Record<string, unknown>
      else if (existing?.has(String(raw[KEY[name]]))) continue // 둘 다 두기: 단어·복습·기록은 이미 있으면 그대로
      await store.raw.put(name, item)
      counts[name]++
    }
  }
  if (data.settings && mode === 'overwrite') await store.saveSettings(cleanSettings(data.settings))
  // 진도·최고 기록: 아는 이름만. 둘 다 두기면 이 기기에 이미 있는 것은 그대로
  if (isPlain(data.meta))
    for (const [k, val] of Object.entries(data.meta)) {
      if (!META_KEY.test(k) || !isPlain(val)) continue
      if (mode === 'keepBoth' && (await store.getMeta(k)) !== undefined) continue
      await store.setMeta(k, val)
    }
  return { ok: true, counts }
}

/** 백업의 설정: 아는 항목만, 기본값과 같은 모양일 때만 받는다(고친 파일이 화면을 깨지 않게) */
const CHOICES: Partial<Record<keyof Settings, readonly unknown[]>> = {
  device: ['auto', 'pc', 'mobile'],
  hintMode: ['full', 'line', 'off'],
  rate: [1, 0.75],
  friend: FRIENDS,
}
const isPlain = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
export function cleanSettings(raw: unknown): Settings {
  const s = isPlain(raw) ? raw : {}
  const out: Record<string, unknown> = { ...DEFAULT_SETTINGS }
  for (const [k, def] of Object.entries(DEFAULT_SETTINGS) as [keyof Settings, unknown][]) {
    const v = s[k]
    if (CHOICES[k]) {
      if (CHOICES[k]!.includes(v)) out[k] = v
    } else if (isPlain(def)) {
      // show 는 참/거짓, layout·voice 는 언어별 글
      if (isPlain(v)) out[k] = Object.fromEntries(Object.entries(v).filter(([kk, vv]) => (k === 'show' ? kk in def && typeof vv === 'boolean' : LANGS.includes(kk as Lang) && typeof vv === 'string')))
      if (k === 'show') out[k] = { ...def, ...(out[k] as object) }
    } else if (typeof v === typeof def) out[k] = v
  }
  return out as unknown as Settings
}

/** 공유에는 연습에 필요한 것만 담는다 */
function slim(m: Material) {
  return { lang: m.lang, title: m.title, lines: m.lines.map(({ src, ko, start, end, segments }) => ({ src, ko, start, end, segments })) }
}

/** 공유로 받는 양의 끝(줄 수, 줄 길이, 제목 길이) */
const SHARE_MAX = { lines: 1000, src: 300, ko: 300, title: 100 }

/** 조각이 모양이 맞고 이으면 원문과 같을 때만 쓴다. 아니면 읽기 확인이 필요한 한 조각 */
function cleanSegments(src: string, segs: unknown): Segment[] {
  const ok =
    Array.isArray(segs) &&
    segs.length > 0 &&
    segs.every((g) => isPlain(g) && typeof g.text === 'string' && typeof g.isWord === 'boolean' && (g.reading === undefined || typeof g.reading === 'string')) &&
    (segs as Segment[]).map((g) => g.text).join('') === src
  if (!ok) return [{ text: src, reading: src, isWord: true, confident: false }]
  return (segs as Segment[]).map((g) => ({
    text: g.text,
    isWord: g.isWord,
    confident: g.confident === true,
    ...(typeof g.reading === 'string' ? { reading: g.reading } : {}),
    ...(typeof g.zhuyin === 'string' ? { zhuyin: g.zhuyin } : {}),
    ...(typeof g.romaji === 'string' ? { romaji: g.romaji } : {}),
  }))
}

function fromShared(s: unknown): Material | null {
  const v = s as ReturnType<typeof slim> | null
  if (!v || !LANGS.includes(v.lang as Lang) || typeof v.title !== 'string' || !Array.isArray(v.lines) || !v.lines.length) return null
  if (v.lines.some((l) => typeof l?.src !== 'string')) return null
  const lines: Line[] = v.lines.slice(0, SHARE_MAX.lines).map((l, i) => {
    const src = l.src.slice(0, SHARE_MAX.src)
    return {
      id: `l${String(i + 1).padStart(3, '0')}`,
      src,
      ...(typeof l.ko === 'string' ? { ko: l.ko.slice(0, SHARE_MAX.ko) } : {}),
      ...(typeof l.start === 'number' && Number.isFinite(l.start) ? { start: l.start } : {}),
      ...(typeof l.end === 'number' && Number.isFinite(l.end) ? { end: l.end } : {}),
      segments: cleanSegments(src, l.segments),
    }
  })
  const title = v.title.slice(0, SHARE_MAX.title)
  return { id: newScriptId(v.lang), lang: v.lang, kind: 'script', title, koSource: lines.some((l) => l.ko) ? 'given' : 'none', lines, createdAt: Date.now() }
}

const LINK_MAX = 6000

/** 짧은 연습은 링크 주소(#/share/…)에 담는다. 너무 길면 null(파일로 공유) */
export function shareLink(m: Material): string | null {
  const data = compressToEncodedURIComponent(JSON.stringify(slim(m)))
  return data.length <= LINK_MAX ? data : null
}

export function readShare(data: string): Material | null {
  try {
    return fromShared(JSON.parse(decompressFromEncodedURIComponent(data) ?? 'null'))
  } catch {
    return null
  }
}

export function shareFile(m: Material): string {
  return JSON.stringify({ app: `${APP}-share`, version: VERSION, material: slim(m) })
}

export function readShareFile(input: unknown): Material | null {
  const f = input as { app?: string; material?: unknown } | null
  return f?.app === `${APP}-share` ? fromShared(f.material) : null
}
