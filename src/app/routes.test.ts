import { expect, test } from 'vitest'
import { parseRoute } from './routes'

test('빈 해시는 홈', () => expect(parseRoute('')).toEqual({ name: 'home' }))
test('#/ 는 홈', () => expect(parseRoute('#/')).toEqual({ name: 'home' }))
test('입력 시험', () => expect(parseRoute('#/lab/input')).toEqual({ name: 'lab-input' }))
test('뒤 슬래시 허용', () => expect(parseRoute('#/lab/input/')).toEqual({ name: 'lab-input' }))
test('모르는 경로', () => expect(parseRoute('#/nope')).toEqual({ name: 'not-found' }))
