import { expect, test } from 'vitest'
import { href, parseRoute, type Route } from './routes'

test('빈 해시는 홈', () => expect(parseRoute('')).toEqual({ name: 'home' }))
test('#/ 는 홈', () => expect(parseRoute('#/')).toEqual({ name: 'home' }))
test('입력 시험', () => expect(parseRoute('#/lab/input')).toEqual({ name: 'lab-input' }))
test('뒤 슬래시 허용', () => expect(parseRoute('#/lab/input/')).toEqual({ name: 'lab-input' }))
test('모르는 경로', () => expect(parseRoute('#/nope')).toEqual({ name: 'not-found' }))

test('재료 화면', () =>
  expect(parseRoute('#/materials?lang=ja&tab=starter')).toEqual({ name: 'materials', lang: 'ja', tab: 'starter' }))
test('재료 화면 탭 기본값은 기본 연습', () =>
  expect(parseRoute('#/materials?lang=tw')).toEqual({ name: 'materials', lang: 'tw', tab: 'starter' }))
test('모르는 언어는 찾을 수 없음', () => expect(parseRoute('#/materials?lang=xx')).toEqual({ name: 'not-found' }))
test('모르는 탭은 찾을 수 없음', () =>
  expect(parseRoute('#/materials?lang=ja&tab=zzz')).toEqual({ name: 'not-found' }))
test('학습 화면', () => expect(parseRoute('#/study/ja-greet')).toEqual({ name: 'study', materialId: 'ja-greet' }))
test('완료 화면', () => expect(parseRoute('#/done/ja-greet')).toEqual({ name: 'done', materialId: 'ja-greet' }))
test('친구·설정·안내', () => {
  expect(parseRoute('#/friend')).toEqual({ name: 'friend' })
  expect(parseRoute('#/settings')).toEqual({ name: 'settings' })
  expect(parseRoute('#/guide')).toEqual({ name: 'guide' })
})

test('href 와 parseRoute 는 서로 되돌린다', () => {
  const routes: Route[] = [
    { name: 'home' },
    { name: 'materials', lang: 'ja', tab: 'starter' },
    { name: 'materials', lang: 'mn', tab: 'script' },
    { name: 'study', materialId: 'ja-plan' },
    { name: 'review', materialId: 'ja-s1abc' },
    { name: 'share', data: 'N4Ig+$-abc' },
    { name: 'done', materialId: 'ja-plan' },
    { name: 'friend' },
    { name: 'settings' },
    { name: 'guide' },
    { name: 'lab-input' },
    { name: 'learn' },
    { name: 'learn-list', native: 'zh' },
    { name: 'learn-video', native: 'mn', videoId: '_WBvFWL9a0c' },
    { name: 'learn-sheet', native: 'en' },
  ]
  for (const r of routes) expect(parseRoute(href(r))).toEqual(r)
})

test('한국어 배우기 주소: 모르는 모국어나 잘못된 영상 id 는 없는 페이지', () => {
  expect(parseRoute('#/learn/ko')).toEqual({ name: 'not-found' })
  expect(parseRoute('#/learn/zh/v/short')).toEqual({ name: 'not-found' })
})
