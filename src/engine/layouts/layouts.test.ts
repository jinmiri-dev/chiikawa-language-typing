import { expect, test } from 'vitest'
import { getLayout, keySteps, layoutsFor, LAYOUT_LABEL } from './index'
import { starterMaterial } from '../../content/starter'
import type { Segment } from '../types'

const seg = (text: string, reading = text, confident = true): Segment => ({ text, reading, isWord: true, confident })
const ids = (r: ReturnType<typeof keySteps>) => r.steps.map((s) => s.keyId).join(' ')

test('PC 로마자: 한자 조각은 변환·확정까지', () => {
  const r = keySteps(getLayout('ja-pc-romaji'), seg('食べ', 'たべ'))
  expect(ids(r)).toBe('t a b e space enter')
  expect(r.convert).toBe('食べ')
  expect(r.confident).toBe(true)
})

test('PC 로마자: 가나만이면 변환 없음', () => {
  const r = keySteps(getLayout('ja-pc-romaji'), seg('だよ'))
  expect(ids(r)).toBe('d a y o')
  expect(r.convert).toBeUndefined()
})

test('PC 로마자: 물음표는 Shift + /', () =>
  expect(ids(keySteps(getLayout('ja-pc-romaji'), seg('？')))).toBe('shift slash'))

test('플릭: 키와 방향', () => {
  const r = keySteps(getLayout('ja-flick'), seg('べ'))
  expect(r.steps).toEqual([
    { keyId: 'ha', gesture: 'right', text: 'へ' },
    { keyId: 'mod', gesture: 'tap', taps: 1, text: 'べ' },
  ])
})

test('휴대폰 배열 순서와 검증 상태', () => {
  expect(layoutsFor('ja', 'mobile').map((l) => l.id)).toEqual(['ja-flick', 'ja-tap', 'ja-mobile-romaji'])
  expect(layoutsFor('ja', 'pc').map((l) => l.id)).toEqual(['ja-pc-romaji'])
  expect(getLayout('ja-pc-romaji').verified).toBe(true)
  for (const id of ['ja-flick', 'ja-tap', 'ja-mobile-romaji'] as const) expect(getLayout(id).verified).toBe(false)
})

test('확신 없는 조각은 결과도 확신 없음', () =>
  expect(keySteps(getLayout('ja-flick'), seg('今', 'いま', false)).confident).toBe(false))

test('기본 연습 40줄: 모든 배열에서 안내하는 키가 그 배열 그림 안에 있다', () => {
  for (const layout of [...layoutsFor('ja', 'pc'), ...layoutsFor('ja', 'mobile')]) {
    const keyIds = new Set(layout.rows.flat().map((k) => k.id))
    for (const id of ['ja-greet', 'ja-plan', 'ja-react', 'ja-bye'])
      for (const line of starterMaterial(id)!.lines)
        for (const g of line.segments)
          for (const s of keySteps(layout, g).steps) expect(keyIds.has(s.keyId), `${layout.id} ${g.text} ${s.keyId}`).toBe(true)
  }
})

test('배열 이름', () => {
  expect(LAYOUT_LABEL['ja-flick'].name).toBe('12키 플릭')
  expect(LAYOUT_LABEL['ja-pc-romaji'].name).toBe('PC 로마자 입력')
})
