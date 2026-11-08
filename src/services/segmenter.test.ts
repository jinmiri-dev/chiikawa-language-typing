import { expect, test } from 'vitest'
import { loadSegmenter } from './segmenter'

const readings = (segs: { text: string; reading?: string }[]) => segs.filter((s) => /\p{Script=Han}/u.test(s.text)).map((s) => `${s.text}:${s.reading}`)

test('번체도 낱말 읽기로(時間 shí jiān, 高興 gāo xìng, 於 yú), 대만 표준 읽기는 그대로(期間 qí jiān)', async () => {
  const tw = await loadSegmenter('tw')
  const all = readings([...tw('我沒有時間。'), ...tw('很高興認識你。'), ...tw('畢業於首爾大學。'), ...tw('在學期間'), ...tw('你為什麼來？')]).join(' ')
  expect(all).toContain('時間:shí jiān')
  expect(all).toContain('高興:gāo xìng')
  expect(all).toContain('於:yú')
  expect(all).toContain('期間:qí jiān')
  expect(all).toContain('為什麼:wèi shén me')
})

test('간체 문맥 읽기 보정(看中国 zhōng guó, 倒吐 dào)', async () => {
  const zh = await loadSegmenter('zh')
  expect(readings(zh('我喜欢看中国电视剧。')).join(' ')).toContain('中国:zhōng guó')
  expect(readings(zh('不吃葡萄倒吐葡萄皮。')).join(' ')).toContain('倒:dào')
})
