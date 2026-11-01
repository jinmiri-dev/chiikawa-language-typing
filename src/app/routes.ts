export type Route = { name: 'home' } | { name: 'lab-input' } | { name: 'not-found' }

/** `#/lab/input/` 같은 해시를 화면 이름으로 바꾼다. 뒤 슬래시와 빈 해시는 허용한다. */
export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '').replace(/\/+$/, '') || '/'
  if (path === '/') return { name: 'home' }
  if (path === '/lab/input') return { name: 'lab-input' }
  return { name: 'not-found' }
}
