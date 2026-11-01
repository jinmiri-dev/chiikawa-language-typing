/** 병음 → 주음 (대만 注音符號). 숫자 성조 병음(`ni3`, 경성은 0 또는 5)을 받는다. */

const INITIAL: [string, string][] = [
  ['zh', 'ㄓ'], ['ch', 'ㄔ'], ['sh', 'ㄕ'],
  ['b', 'ㄅ'], ['p', 'ㄆ'], ['m', 'ㄇ'], ['f', 'ㄈ'], ['d', 'ㄉ'], ['t', 'ㄊ'], ['n', 'ㄋ'], ['l', 'ㄌ'],
  ['g', 'ㄍ'], ['k', 'ㄎ'], ['h', 'ㄏ'], ['j', 'ㄐ'], ['q', 'ㄑ'], ['x', 'ㄒ'], ['r', 'ㄖ'], ['z', 'ㄗ'], ['c', 'ㄘ'], ['s', 'ㄙ'],
]
const FINAL: Record<string, string> = {
  a: 'ㄚ', o: 'ㄛ', e: 'ㄜ', ê: 'ㄝ', ai: 'ㄞ', ei: 'ㄟ', ao: 'ㄠ', ou: 'ㄡ', an: 'ㄢ', en: 'ㄣ', ang: 'ㄤ', eng: 'ㄥ', er: 'ㄦ', ong: 'ㄨㄥ',
  i: 'ㄧ', ia: 'ㄧㄚ', ie: 'ㄧㄝ', iao: 'ㄧㄠ', iu: 'ㄧㄡ', ian: 'ㄧㄢ', in: 'ㄧㄣ', iang: 'ㄧㄤ', ing: 'ㄧㄥ', iong: 'ㄩㄥ',
  u: 'ㄨ', ua: 'ㄨㄚ', uo: 'ㄨㄛ', uai: 'ㄨㄞ', ui: 'ㄨㄟ', uan: 'ㄨㄢ', un: 'ㄨㄣ', uang: 'ㄨㄤ', ueng: 'ㄨㄥ',
  ü: 'ㄩ', üe: 'ㄩㄝ', üan: 'ㄩㄢ', ün: 'ㄩㄣ',
}
/** y·w 로 시작하는 표기를 본래 운모로 */
const YW: Record<string, string> = {
  yi: 'i', ya: 'ia', ye: 'ie', yao: 'iao', you: 'iu', yan: 'ian', yin: 'in', yang: 'iang', ying: 'ing', yong: 'iong',
  wu: 'u', wa: 'ua', wo: 'uo', wai: 'uai', wei: 'ui', wan: 'uan', wen: 'un', wang: 'uang', weng: 'ueng',
  yu: 'ü', yue: 'üe', yuan: 'üan', yun: 'ün',
}
const TONE = ['˙', '', 'ˊ', 'ˇ', 'ˋ', '˙']

export function pinyinToZhuyin(numbered: string): string {
  const m = numbered.toLowerCase().replace(/v/g, 'ü').match(/^([a-zü]+)([0-5])?$/)
  if (!m) return numbered
  const tone = Number(m[2] ?? 5)
  let syl = YW[m[1]] ?? m[1]
  let ini = ''
  const found = YW[m[1]] ? undefined : INITIAL.find(([p]) => syl.startsWith(p) && syl.length > p.length)
  if (found) {
    ini = found[1]
    syl = syl.slice(found[0].length)
    if (/^[jqx]$/.test(found[0])) syl = syl.replace(/^u/, 'ü') // ju → jü
    if (/^(zh|ch|sh|r|z|c|s)$/.test(found[0]) && syl === 'i') syl = '' // zhi, si 의 i 는 쓰지 않음
  }
  const fin = syl ? FINAL[syl] : ''
  if (fin === undefined) return numbered
  const body = ini + fin
  return tone === 0 || tone === 5 ? TONE[0] + body : body + TONE[tone]
}

/** 타자용 병음: 성조 부호를 빼고 ü 는 v, 띄어쓰기 없이 */
export function toneless(pinyin: string): string {
  return pinyin
    .normalize('NFD')
    .replace(/ü/g, 'v')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ü/g, 'v')
    .replace(/\s+/g, '')
    .toLowerCase()
}
