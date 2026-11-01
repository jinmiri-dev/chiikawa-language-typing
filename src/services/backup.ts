/** 백업·복원·공유 (기획안 16장, 프론트-설계 6장). 받은 파일은 검사한 뒤에만 저장소를 바꾼다. */
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import { LANGS, type Lang } from '../engine/lang'
import type { Line, Material, Progress, Settings } from '../engine/types'
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
  data: Record<DataStore, unknown[]> & { settings: Settings }
}

export const backupFileName = (d = new Date()) =>
  `${APP}-backup-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`

export async function exportBackup(store: Store): Promise<BackupFile> {
  const data = Object.fromEntries(await Promise.all(DATA_STORES.map(async (n) => [n, await store.raw.all(n)] as const))) as Record<DataStore, unknown[]>
  return { app: APP, version: VERSION, exportedAt: new Date().toISOString(), data: { ...data, settings: await store.getSettings() } }
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
  if (data.settings && mode === 'overwrite') await store.saveSettings(data.settings)
  return { ok: true, counts }
}

/** 공유에는 연습에 필요한 것만 담는다 */
function slim(m: Material) {
  return { lang: m.lang, title: m.title, lines: m.lines.map(({ src, ko, start, end, segments }) => ({ src, ko, start, end, segments })) }
}

function fromShared(s: unknown): Material | null {
  const v = s as ReturnType<typeof slim> | null
  if (!v || !LANGS.includes(v.lang as Lang) || typeof v.title !== 'string' || !Array.isArray(v.lines) || !v.lines.length) return null
  if (v.lines.some((l) => typeof l?.src !== 'string' || !Array.isArray(l.segments))) return null
  const lines: Line[] = v.lines.map((l, i) => ({
    id: `l${String(i + 1).padStart(3, '0')}`,
    src: l.src,
    ...(typeof l.ko === 'string' ? { ko: l.ko } : {}),
    ...(typeof l.start === 'number' ? { start: l.start } : {}),
    ...(typeof l.end === 'number' ? { end: l.end } : {}),
    segments: l.segments,
  }))
  return { id: newScriptId(v.lang), lang: v.lang, kind: 'script', title: v.title, koSource: lines.some((l) => l.ko) ? 'given' : 'none', lines, createdAt: Date.now() }
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
