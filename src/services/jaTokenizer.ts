/** 일본어 형태소 분석기를 처음 쓸 때 한 번만 불러온다(사전 약 17MB, 첫 화면에는 넣지 않음).
 *  kuromoji 의 브라우저 불러오기 대신 사전 파일을 직접 받아 브라우저 기본 기능(DecompressionStream)으로 푼다. */
import type { JaToken } from '../engine/reading/ja'

let pending: Promise<(s: string) => JaToken[]> | null = null

/** 받은 파일이 아직 gzip 이면 풀고, 서버가 이미 풀어 줬으면 그대로 쓴다 */
async function fetchDict(name: string): Promise<ArrayBuffer> {
  const res = await fetch(`${import.meta.env.BASE_URL}dict/${name}.dat.bin`)
  if (!res.ok) throw new Error(`사전을 받지 못했어요: ${name} (${res.status})`)
  const buf = await res.arrayBuffer()
  const head = new Uint8Array(buf, 0, 2)
  if (head[0] !== 0x1f || head[1] !== 0x8b) return buf
  return new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
}

async function build(): Promise<(s: string) => JaToken[]> {
  const [{ default: DynamicDictionaries }, { default: Tokenizer }] = await Promise.all([
    import('kuromoji/src/dict/DynamicDictionaries.js'),
    import('kuromoji/src/Tokenizer.js'),
  ])
  const names = ['base', 'check', 'tid', 'tid_pos', 'tid_map', 'cc', 'unk', 'unk_pos', 'unk_map', 'unk_char', 'unk_compat', 'unk_invoke']
  const b = Object.fromEntries(await Promise.all(names.map(async (n) => [n, await fetchDict(n)] as const)))
  const dic = new DynamicDictionaries()
  dic.loadTrie(new Int32Array(b.base), new Int32Array(b.check))
  dic.loadTokenInfoDictionaries(new Uint8Array(b.tid), new Uint8Array(b.tid_pos), new Uint8Array(b.tid_map))
  dic.loadConnectionCosts(new Int16Array(b.cc))
  dic.loadUnknownDictionaries(
    new Uint8Array(b.unk), new Uint8Array(b.unk_pos), new Uint8Array(b.unk_map),
    new Uint8Array(b.unk_char), new Uint32Array(b.unk_compat), new Uint8Array(b.unk_invoke),
  )
  const t = new Tokenizer(dic)
  return (s) => t.tokenize(s)
}

export function loadJaTokenizer(): Promise<(s: string) => JaToken[]> {
  pending ??= build().catch((e) => {
    pending = null // 실패하면 다음에 다시 시도한다
    throw e
  })
  return pending
}
