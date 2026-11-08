import { expect, test } from 'vitest'
import { loadCourse } from '../course'
import { loadPractice } from '../practice'
import { loadJaReadings, unpackSegments } from './pack'

test('일본어 코스·예문은 모든 문장의 읽기를 미리 만들어 두었다(빠지면 npx tsx scripts/build-readings.ts)', async () => {
  const r = await loadJaReadings()
  const course = await loadCourse('ja')
  const practice = await loadPractice('ja')
  const srcs = [
    ...course.letters.flatMap((l) => l.lines.map(([s]) => s)),
    ...course.weeks.flatMap((w) => w.lessons.flatMap((les) => les.map(([s]) => s))),
    ...Object.values(practice.situations).flatMap((ls) => ls.map(([s]) => s)),
    ...practice.twisters.map(([s]) => s),
  ]
  const missing = srcs.filter((s) => !r[s])
  expect(missing).toEqual([])
  // 조각을 이으면 원문 그대로, 日本 은 にほん
  for (const s of srcs.slice(0, 200)) expect(unpackSegments(r[s]).map((g) => g.text).join('')).toBe(s)
  const nihon = Object.entries(r).flatMap(([, p]) => unpackSegments(p)).filter((g) => g.text === '日本')
  expect(nihon.length).toBeGreaterThan(0)
  expect(nihon.every((g) => g.reading === 'にほん')).toBe(true)
})
