/** 히라가나 읽기 → 로마자 입력 키 (기획안 11.4 일본어 PC 로마자). 헵번식으로 안내한다. */

const ROWS: [string, string[]][] = [
  ['', ['あ', 'い', 'う', 'え', 'お']],
  ['k', ['か', 'き', 'く', 'け', 'こ']],
  ['g', ['が', 'ぎ', 'ぐ', 'げ', 'ご']],
  ['s', ['さ', 'し', 'す', 'せ', 'そ']],
  ['z', ['ざ', 'じ', 'ず', 'ぜ', 'ぞ']],
  ['t', ['た', 'ち', 'つ', 'て', 'と']],
  ['d', ['だ', 'ぢ', 'づ', 'で', 'ど']],
  ['n', ['な', 'に', 'ぬ', 'ね', 'の']],
  ['h', ['は', 'ひ', 'ふ', 'へ', 'ほ']],
  ['b', ['ば', 'び', 'ぶ', 'べ', 'ぼ']],
  ['p', ['ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ']],
  ['m', ['ま', 'み', 'む', 'め', 'も']],
  ['r', ['ら', 'り', 'る', 'れ', 'ろ']],
]
const VOWELS = ['a', 'i', 'u', 'e', 'o']

const TABLE: Record<string, string> = {}
for (const [c, kana] of ROWS) kana.forEach((k, i) => (TABLE[k] = c + VOWELS[i]))
Object.assign(TABLE, {
  し: 'shi', ち: 'chi', つ: 'tsu', ふ: 'fu', じ: 'ji', ぢ: 'di', づ: 'du',
  や: 'ya', ゆ: 'yu', よ: 'yo', わ: 'wa', を: 'wo', ん: 'nn', ー: '-',
  ぁ: 'xa', ぃ: 'xi', ぅ: 'xu', ぇ: 'xe', ぉ: 'xo', ゃ: 'xya', ゅ: 'xyu', ょ: 'xyo', っ: 'xtsu', ゎ: 'xwa',
  ゔ: 'vu',
  '、': ',', '。': '.', '！': '!', '？': '?', '!': '!', '?': '?', '…': '...', '〜': '~', ' ': ' ',
  '「': '[', '」': ']', '『': '[', '』': ']', '（': '(', '）': ')', '・': '/', '～': '~', '：': ':', '　': ' ',
})

// 요음: き + ゃ → kya, し + ゃ → sha …
const YOUON_BASE: Record<string, string> = {
  き: 'ky', ぎ: 'gy', に: 'ny', ひ: 'hy', び: 'by', ぴ: 'py', み: 'my', り: 'ry',
  し: 'sh', じ: 'j', ち: 'ch',
}
const SMALL_Y: Record<string, string> = { ゃ: 'a', ゅ: 'u', ょ: 'o' }
for (const [base, c] of Object.entries(YOUON_BASE))
  for (const [small, v] of Object.entries(SMALL_Y)) TABLE[base + small] = c + v
// 외래어 소리: ふぇ fe, ふぁ fa, てぃ thi, でぃ dhi, うぃ wi, うぇ we, しぇ she, ちぇ che, じぇ je
Object.assign(TABLE, {
  ふぁ: 'fa', ふぃ: 'fi', ふぇ: 'fe', ふぉ: 'fo', てぃ: 'thi', でぃ: 'dhi', うぃ: 'wi', うぇ: 'we',
  しぇ: 'she', ちぇ: 'che', じぇ: 'je', ゔぁ: 'va',
})

/** 가타카나 → 히라가나 (장음 ー는 그대로) */
function toHiragana(s: string): string {
  return s.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
}

/** 요음은 한 단위로 묶는다: きょう → [きょ, う] */
export function kanaUnits(reading: string): string[] {
  const s = toHiragana(reading)
  const out: string[] = []
  for (let i = 0; i < s.length; ) {
    const two = s.slice(i, i + 2)
    if (two.length === 2 && TABLE[two]) {
      out.push(two)
      i += 2
    } else {
      out.push(s[i])
      i += 1
    }
  }
  return out
}

export function romajiOf(unit: string): string {
  const r = TABLE[toHiragana(unit)]
  if (r === undefined) throw new Error(`로마자로 바꿀 수 없는 글자: ${unit}`)
  return r
}

/** 키 하나씩. っ 는 다음 단위의 첫 자음을 두 번 친다. */
export function romajiKeys(reading: string): string[] {
  const units = kanaUnits(reading)
  let out = ''
  units.forEach((u, i) => {
    if (u === 'っ') {
      const next = units[i + 1] ? romajiOf(units[i + 1]) : ''
      out += /^[bcdfghjkmprstvwyz]/.test(next) ? next[0] : romajiOf(u)
    } else out += romajiOf(u)
  })
  return [...out]
}
