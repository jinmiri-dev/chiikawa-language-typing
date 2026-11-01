import { LANGS, type Lang } from '../engine/lang'

export const MATERIAL_TABS = ['starter', 'youtube', 'script'] as const
export type MaterialTab = (typeof MATERIAL_TABS)[number]

export type Route =
  | { name: 'home' }
  | { name: 'materials'; lang: Lang; tab: MaterialTab }
  | { name: 'study'; materialId: string }
  | { name: 'review'; materialId: string }
  | { name: 'done'; materialId: string }
  | { name: 'friend' }
  | { name: 'settings' }
  | { name: 'guide' }
  | { name: 'lab-input' }
  | { name: 'not-found' }

const SIMPLE: Record<string, Route> = {
  '/': { name: 'home' },
  '/friend': { name: 'friend' },
  '/settings': { name: 'settings' },
  '/guide': { name: 'guide' },
  '/lab/input': { name: 'lab-input' },
}

export function parseRoute(hash: string): Route {
  const raw = hash.replace(/^#/, '')
  const [pathPart, query = ''] = raw.split('?')
  const path = pathPart.replace(/\/+$/, '') || '/'
  if (SIMPLE[path]) return SIMPLE[path]

  if (path === '/materials') {
    const q = new URLSearchParams(query)
    const lang = q.get('lang')
    const tab = q.get('tab') ?? 'starter'
    if (!LANGS.includes(lang as Lang) || !MATERIAL_TABS.includes(tab as MaterialTab)) return { name: 'not-found' }
    return { name: 'materials', lang: lang as Lang, tab: tab as MaterialTab }
  }

  const m = path.match(/^\/(study|done|review)\/([\w-]+)$/)
  if (m) return { name: m[1] as 'study' | 'done' | 'review', materialId: m[2] }
  return { name: 'not-found' }
}

/** 라우트 → `#/...` 주소 */
export function href(r: Route): string {
  switch (r.name) {
    case 'home':
      return '#/'
    case 'materials':
      return `#/materials?lang=${r.lang}&tab=${r.tab}`
    case 'study':
    case 'done':
    case 'review':
      return `#/${r.name}/${r.materialId}`
    case 'lab-input':
      return '#/lab/input'
    case 'not-found':
      return '#/not-found'
    default:
      return `#/${r.name}`
  }
}
