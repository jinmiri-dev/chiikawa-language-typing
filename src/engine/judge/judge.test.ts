import { describe, expect, test } from 'vitest'
import { judge, normalizeLoose, readingProgress } from './judge'
import { explainMistake } from './explain'

const loose = { strict: false }

describe('판정', () => {
  test('너그러운 판정은 문장부호를 채워 준다', () => expect(judge('今日は、', '今日は', loose).done).toBe(true))
  test('엄격하면 문장부호도 친다', () => expect(judge('今日は、', '今日は', { strict: true }).done).toBe(false))
  test('틀린 위치', () => expect(judge('たべる', 'たへ', loose)).toEqual({ okUpTo: 1, wrongAt: 1, done: false }))
  test('전각·대소문자 무시', () => expect(judge('ＡＢ', 'ab', loose).done).toBe(true))
  test('덜 쳤으면 틀림 없음', () => expect(judge('たべる', 'たべ', loose)).toEqual({ okUpTo: 2, done: false }))
  test('다 치면 끝', () => expect(judge('ご飯もう食べた？', 'ご飯もう食べた', loose)).toEqual({ okUpTo: 8, done: true }))
  test('더 치면 틀림', () => expect(judge('たべ', 'たべる', loose)).toMatchObject({ wrongAt: 2, done: false }))
  test('곧은·굽은 따옴표', () => expect(normalizeLoose('“a”')).toBe(normalizeLoose('"a"')))
})

describe('틀린 이유', () => {
  test('탁음', () => expect(explainMistake('ja', 'たべ', 'たへ')).toBe('゛가 빠졌어요'))
  test('반탁음', () => expect(explainMistake('ja', 'ぱ', 'は')).toBe('゜가 빠졌어요'))
  test('작은 글자', () => expect(explainMistake('ja', 'ちょっと', 'ちょつと')).toBe('작은 っ이에요'))
  test('장음', () => expect(explainMistake('ja', 'コーヒー', 'コヒー')).toBe('ー(장음)가 빠졌어요'))
  test('다른 한자', () => expect(explainMistake('ja', '書く', '描く')).toBe('다른 한자를 골랐어요: 書く → 描く'))
  test('그 밖', () => expect(explainMistake('ja', 'たべ', 'ため')).toBe('べ 대신 め를 쳤어요'))
  test('같으면 없음', () => expect(explainMistake('ja', 'たべ', 'たべ')).toBeNull())
  test('입력기가 꺼져 로마자가 들어오면 알려 준다', () =>
    expect(explainMistake('ja', 'たべ', 'ta')).toBe('일본어 입력기가 꺼져 있어요. 켜고 다시 쳐 보세요(Windows: Alt+`, Mac: Ctrl+Space).'))
})

describe('조합 중 읽기', () => {
  test('가나 조합', () => expect(readingProgress('たべる', 'たべ')).toEqual({ matches: true, at: 2 }))
  test('가나 조합 틀림', () => expect(readingProgress('たべる', 'たへ')).toEqual({ matches: false, at: 1 }))
  test('로마자 조합', () => expect(readingProgress('たべる', 'tab')).toEqual({ matches: true, at: 3 }))
  test('가나와 로마자가 섞인 조합', () => expect(readingProgress('たべる', 'たb')).toEqual({ matches: true, at: 3 }))
})

describe('다른 언어 틀린 이유', () => {
  test('중국어·대만어 입력기 꺼짐', () => {
    expect(explainMistake('zh', '你好', 'ni')).toBe('중국어 입력기가 꺼져 있어요. 켜고 다시 쳐 보세요(Windows: Win+Space).')
    expect(explainMistake('tw', '你好', 'ni')).toBe('대만어(주음) 입력기가 꺼져 있어요. 켜고 다시 쳐 보세요(Windows: Win+Space).')
  })
  test('몽골어 자판 꺼짐', () => expect(explainMistake('mn', 'сайн', 'sain')).toBe('몽골어 자판이 꺼져 있어 영문이 들어가요. 자판을 바꿔 주세요(Windows: Win+Space).'))
  test('영어에 한글', () => expect(explainMistake('en', 'hello', 'ㅗ')).toBe('한글이 들어가요. 한/영 키로 영어 입력으로 바꿔 주세요.'))
  test('그 밖은 무엇을 쳤는지', () => {
    expect(explainMistake('mn', 'сайн', 'сайм')).toBe('н 대신 м를 쳤어요')
    expect(explainMistake('zh', '在', '再')).toBe('在 대신 再를 쳤어요')
  })
})

describe('기본 채점: 띄어쓰기와 문장부호도 친다', () => {
  const full = { strict: true }
  test('띄어쓰기를 빼먹으면 틀린다', () => expect(judge('I am', 'Iam', full).wrongAt).toBe(1))
  test('문장부호를 빼먹으면 다 친 것이 아니다', () => expect(judge('Yeah, good.', 'Yeah good', full).done).toBe(false))
  test('전각·반각, 굽은 따옴표 차이는 같다고 본다', () => {
    expect(judge('早上好！你好吗？', '早上好!你好吗?', full).done).toBe(true)
    expect(judge('I’m home.', "I'm home.", full).done).toBe(true)
  })
  test('띄어쓰기 여러 칸은 한 칸으로 본다', () => expect(judge('a  b', 'a b', full).done).toBe(true))
  test('그 키보드에 없는 글자는 건너뛴다(몽골어 키릴 PC 의 !)', () => expect(judge('Сайн уу!', 'Сайн уу', { strict: true, skip: /[!]/ }).done).toBe(true))
  test('대소문자는 맞아야 한다', () => expect(judge('Yeah', 'yeah', full).wrongAt).toBe(0))
})
