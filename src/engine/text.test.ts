import { expect, test } from 'vitest'
import { splitSentences } from './text'

test('문장 끝(!?.…)과 띄어쓰기에서 나눈다', () => {
  expect(splitSentences('30분이나 했어! 간식 먹고 잠깐 쉴까?')).toEqual(['30분이나 했어!', '간식 먹고 잠깐 쉴까?'])
  expect(splitSentences('다시 왔네요! 오늘도 한 줄씩 쳐 봐요.')).toEqual(['다시 왔네요!', '오늘도 한 줄씩 쳐 봐요.'])
  expect(splitSentences('그… 같이 해도 돼…?')).toEqual(['그…', '같이 해도 돼…?'])
})
test('숫자 속 점이나 가운뎃점에서는 나누지 않는다', () => {
  expect(splitSentences('지난번보다 한 줄에 1.2초 빨라졌어요 · 8.4초 → 7.2초')).toEqual(['지난번보다 한 줄에 1.2초 빨라졌어요 · 8.4초 → 7.2초'])
})
test('닫는 괄호·따옴표는 앞 문장에 붙인다', () => expect(splitSentences('좋아요!) 다음 줄')).toEqual(['좋아요!)', '다음 줄']))
test('한 문장이면 그대로', () => expect(splitSentences('와아…!')).toEqual(['와아…!']))
