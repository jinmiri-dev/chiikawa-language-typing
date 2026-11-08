import { expect, test } from 'vitest'

/** 학습 문장에 욕설·자해 같은 말이 들어가면 실패한다(초보가 6개월 동안 보는 문장이라) */
const BAD = /존나|졸라|씨발|시발|씨바|새끼|병신|좆|닥쳐|죽고 ?싶|자살|죽여|죽일|섹스|야동|개새|빌어먹|미친놈|미친년|꺼져|\bfuck|\bshit|\bbitch|kill yourself|want to die|自杀|死ね|殺す|他妈|操你|妈的|үхмээр|лайтай/gi

const FILES = import.meta.glob(['./course/*.json', './practice/*.json', './starter/*.json'], { eager: true, query: '?raw', import: 'default' }) as Record<string, string>

test('코스·예문·채팅 표현 문장에 욕설·민감한 말이 없다', () => {
  expect(Object.keys(FILES).length).toBeGreaterThanOrEqual(15)
  for (const [name, text] of Object.entries(FILES)) expect(text.match(BAD) ?? [], name).toEqual([])
})

test('뜻에 옛 맞춤법(읍니다)·정치적 주장 문장이 없다', () => {
  for (const [name, text] of Object.entries(FILES)) {
    expect(text.match(/읍니다|읍니까/g) ?? [], name).toEqual([])
    expect(text.match(/台湾是一个国家|臺灣是一個國家/g) ?? [], name).toEqual([])
  }
})
