/**
 * 한국어 배우기(외국인 학습자): 소리 나는 대로 바꾸기와 로마자 표기, 낱말 나누기.
 * 발음 규칙은 학습자에게 가장 자주 보이는 것만 둔다: 연음, ㅎ 탈락·격음화, 구개음화, 비음화, 유음화, 받침 대표음.
 */

const BASE = 0xac00
const L = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'
const V = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'
const T = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']

interface Syl {
  l: string
  v: string
  t: string
}

function split(ch: string): Syl {
  const i = ch.charCodeAt(0) - BASE
  return { l: L[Math.floor(i / 588)], v: V[Math.floor((i % 588) / 28)], t: T[i % 28] }
}
const join = (s: Syl) => String.fromCharCode(BASE + L.indexOf(s.l) * 588 + V.indexOf(s.v) * 28 + T.indexOf(s.t))

/** 겹받침: 모음 앞에서는 [남는 받침, 넘어가는 소리] */
const DOUBLE: Record<string, [string, string]> = {
  ㄳ: ['ㄱ', 'ㅆ'], ㄵ: ['ㄴ', 'ㅈ'], ㄶ: ['ㄴ', 'ㅎ'], ㄺ: ['ㄹ', 'ㄱ'], ㄻ: ['ㄹ', 'ㅁ'], ㄼ: ['ㄹ', 'ㅂ'],
  ㄽ: ['ㄹ', 'ㅆ'], ㄾ: ['ㄹ', 'ㅌ'], ㄿ: ['ㄹ', 'ㅍ'], ㅀ: ['ㄹ', 'ㅎ'], ㅄ: ['ㅂ', 'ㅆ'],
}
/** 받침 대표음(자음 앞·끝에서) */
const REP: Record<string, string> = {
  ㄲ: 'ㄱ', ㅋ: 'ㄱ', ㄳ: 'ㄱ', ㄺ: 'ㄱ', ㅅ: 'ㄷ', ㅆ: 'ㄷ', ㅈ: 'ㄷ', ㅊ: 'ㄷ', ㅌ: 'ㄷ', ㅎ: 'ㄷ',
  ㅍ: 'ㅂ', ㄿ: 'ㅂ', ㅄ: 'ㅂ', ㄵ: 'ㄴ', ㄶ: 'ㄴ', ㄻ: 'ㅁ', ㄼ: 'ㄹ', ㄽ: 'ㄹ', ㄾ: 'ㄹ', ㅀ: 'ㄹ',
}
const ASPIRATE: Record<string, string> = { ㄱ: 'ㅋ', ㄷ: 'ㅌ', ㅂ: 'ㅍ', ㅈ: 'ㅊ' }
const NASAL: Record<string, string> = { ㄱ: 'ㅇ', ㄷ: 'ㄴ', ㅂ: 'ㅁ' }

/** 한 어절(띄어쓰기 없는 한글 덩어리)을 소리 나는 대로 */
function pronounceWord(word: string): string {
  const s = [...word].map(split)
  for (let i = 0; i < s.length; i++) {
    const cur = s[i]
    const next = s[i + 1]
    if (!next) {
      cur.t = REP[cur.t] ?? cur.t
      break
    }
    // ㅎ 받침: 다음 ㄱㄷㅈ 은 거센소리, 모음 앞에서는 사라진다
    if (cur.t === 'ㅎ' || cur.t === 'ㄶ' || cur.t === 'ㅀ') {
      const keep = cur.t === 'ㅎ' ? '' : DOUBLE[cur.t][0]
      if (ASPIRATE[next.l] && next.l !== 'ㅂ') [cur.t, next.l] = [keep, ASPIRATE[next.l]]
      else if (next.l === 'ㅇ') cur.t = keep
    }
    // 다음 첫소리 ㅎ: 앞 받침 ㄱㄷㅂㅈ 과 합쳐 거센소리
    if (next.l === 'ㅎ') {
      const base = REP[cur.t] ?? cur.t
      if (ASPIRATE[base] && base !== 'ㄹ') [cur.t, next.l] = ['', ASPIRATE[base]]
    }
    // 연음: 받침이 다음 모음으로 넘어간다(ㄷㅌ+이 는 지·치)
    if (next.l === 'ㅇ' && cur.t && cur.t !== 'ㅇ') {
      const [stay, move] = DOUBLE[cur.t] ?? ['', cur.t]
      const palatal = next.v === 'ㅣ' && (move === 'ㄷ' || move === 'ㅌ')
      next.l = palatal ? (move === 'ㄷ' ? 'ㅈ' : 'ㅊ') : move
      cur.t = stay
      continue
    }
    if (!cur.t) continue
    cur.t = REP[cur.t] ?? cur.t
    // 비음화: ㄱㄷㅂ + ㄴㅁ
    if ((next.l === 'ㄴ' || next.l === 'ㅁ') && NASAL[cur.t]) cur.t = NASAL[cur.t]
    // 유음화: ㄴ+ㄹ, ㄹ+ㄴ → ㄹㄹ
    else if (cur.t === 'ㄴ' && next.l === 'ㄹ') cur.t = 'ㄹ'
    else if (cur.t === 'ㄹ' && next.l === 'ㄴ') next.l = 'ㄹ'
    // ㅁㅇ + ㄹ → ㄴ
    else if ((cur.t === 'ㅁ' || cur.t === 'ㅇ') && next.l === 'ㄹ') next.l = 'ㄴ'
  }
  return s.map(join).join('')
}

/** 글을 소리 나는 대로(한글 덩어리만 바꾸고 띄어쓰기·문장부호·다른 글자는 그대로) */
export function pronounce(text: string): string {
  return text.replace(/[가-힣]+/g, pronounceWord)
}

const RL: Record<string, string> = {
  ㄱ: 'g', ㄲ: 'kk', ㄴ: 'n', ㄷ: 'd', ㄸ: 'tt', ㄹ: 'r', ㅁ: 'm', ㅂ: 'b', ㅃ: 'pp', ㅅ: 's', ㅆ: 'ss',
  ㅇ: '', ㅈ: 'j', ㅉ: 'jj', ㅊ: 'ch', ㅋ: 'k', ㅌ: 't', ㅍ: 'p', ㅎ: 'h',
}
const RV: Record<string, string> = {
  ㅏ: 'a', ㅐ: 'ae', ㅑ: 'ya', ㅒ: 'yae', ㅓ: 'eo', ㅔ: 'e', ㅕ: 'yeo', ㅖ: 'ye', ㅗ: 'o', ㅘ: 'wa', ㅙ: 'wae',
  ㅚ: 'oe', ㅛ: 'yo', ㅜ: 'u', ㅝ: 'wo', ㅞ: 'we', ㅟ: 'wi', ㅠ: 'yu', ㅡ: 'eu', ㅢ: 'ui', ㅣ: 'i',
}
const RT: Record<string, string> = { ㄱ: 'k', ㄴ: 'n', ㄷ: 't', ㄹ: 'l', ㅁ: 'm', ㅂ: 'p', ㅇ: 'ng' }

/** 로마자(국어의 로마자 표기법, 소리 나는 대로. 된소리는 적지 않는다) */
export function romanize(text: string): string {
  return pronounce(text).replace(/[가-힣]+/g, (word) => {
    const s = [...word].map(split)
    return s
      .map((x, i) => {
        // ㄹ 받침 뒤 ㄹ 은 l (ㄹㄹ → ll)
        const l = x.l === 'ㄹ' && s[i - 1]?.t === 'ㄹ' ? 'l' : RL[x.l]
        return l + RV[x.v] + (RT[x.t] ?? '')
      })
      .join('')
  })
}

/** 문장을 어절로(문장부호는 떼어 낸다) */
export function koWords(text: string): string[] {
  return text
    .split(/\s+/)
    .map((w) => w.replace(/^[^가-힣A-Za-z0-9]+|[^가-힣A-Za-z0-9]+$/g, ''))
    .filter(Boolean)
}

/** 흔한 조사(긴 것부터). 단어장에 '친구가' 대신 '친구'로 담으려고 */
const PARTICLES = ['에서는', '에게서', '한테서', '으로', '에서', '에게', '한테', '까지', '부터', '처럼', '보다', '하고', '이랑', '은', '는', '이', '가', '을', '를', '에', '의', '와', '과', '도', '로', '랑', '만', '요']

/** 어절 끝의 조사를 뗀다. 남는 것이 두 글자 이상일 때만(나·아이 같은 낱말은 그대로) */
export function stripParticle(word: string): string {
  for (const p of PARTICLES) if (word.endsWith(p) && [...word].length - [...p].length >= 2) return word.slice(0, -p.length)
  return word
}
