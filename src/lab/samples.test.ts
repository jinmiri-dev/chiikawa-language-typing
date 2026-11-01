import { expect, test } from 'vitest'
import { LANGS } from '../engine/lang'
import { labSamples, LAB_TARGET } from './samples'
import { summarizeLog } from './inputLog'

test.each(LANGS)('%s: 예문이 있고 id가 겹치지 않는다', (lang) => {
  const s = labSamples(lang)
  expect(s.length).toBeGreaterThanOrEqual(5)
  expect(new Set(s.map((x) => x.id)).size).toBe(s.length)
})

test.each(LANGS)('%s: 예문을 그대로 확정 입력하면 그 언어 문자로 판별된다', (lang) => {
  for (const { text } of labSamples(lang)) {
    const s = summarizeLog([{ t: 0, type: 'compositionupdate', data: text }], LAB_TARGET[lang])
    expect(s.targetInComposition, text).toBe(true)
  }
})
