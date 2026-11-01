/** 한국어 조사: 앞 글자 받침에 따라 고른다. */

/** 마지막 한글의 받침 번호(0이면 받침 없음) */
function jong(word: string): number {
  const c = word.charCodeAt(word.length - 1) - 0xac00
  return c >= 0 && c < 11172 ? c % 28 : 0
}

export const eul = (word: string) => (jong(word) ? '을' : '를')
/** ㄹ 받침(8)은 '로' */
export const ro = (word: string) => (jong(word) && jong(word) !== 8 ? '으로' : '로')
