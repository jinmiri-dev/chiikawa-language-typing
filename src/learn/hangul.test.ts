import { describe, expect, test } from 'vitest'
import { koWords, pronounce, romanize, stripParticle } from './hangul'

describe('소리 나는 대로', () => {
  test.each([
    ['같이', '가치'], // 구개음화
    ['좋아요', '조아요'], // ㅎ 탈락
    ['합니다', '함니다'], // 비음화
    ['먹는', '멍는'],
    ['국물', '궁물'],
    ['먹어요', '머거요'], // 연음
    ['읽어', '일거'],
    ['앉아', '안자'],
    ['많이', '마니'],
    ['신라', '실라'], // 유음화
    ['설날', '설랄'],
    ['축하해', '추카해'], // 격음화
    ['좋다', '조타'],
    ['꽃', '꼳'], // 대표음
    ['닭', '닥'],
  ])('%s → %s', (word, said) => expect(pronounce(word)).toBe(said))
  test('띄어쓰기와 문장부호는 그대로', () => expect(pronounce('같이 가요!')).toBe('가치 가요!'))
})

describe('로마자(국어의 로마자 표기법, 소리대로)', () => {
  test.each([
    ['안녕하세요', 'annyeonghaseyo'],
    ['같이', 'gachi'],
    ['좋아요', 'joayo'],
    ['감사합니다', 'gamsahamnida'],
    ['사랑해', 'saranghae'],
    ['신라', 'silla'],
    ['학교', 'hakgyo'],
    ['곰 세 마리', 'gom se mari'],
    ['꽃', 'kkot'],
    ['축하해', 'chukahae'],
    ['괜찮아', 'gwaenchana'],
  ])('%s → %s', (ko, rr) => expect(romanize(ko)).toBe(rr))
})

describe('단어', () => {
  test('어절로 나누고 문장부호는 뺀다', () => expect(koWords('곰 세 마리가, 한 집에 있어!')).toEqual(['곰', '세', '마리가', '한', '집에', '있어']))
  test.each([
    ['친구가', '친구'],
    ['학교에서', '학교'],
    ['아빠곰은', '아빠곰'],
    ['사과를', '사과'],
    ['엄마랑', '엄마'],
    ['나', '나'], // 한 글자는 그대로
    ['아이', '아이'], // '이'로 끝나도 낱말이면(두 글자) 그대로
    ['있어', '있어'],
  ])('조사 떼기: %s → %s', (w, base) => expect(stripParticle(w)).toBe(base))
})
