/** 일본어 형태소 분석기를 처음 쓸 때 한 번만 불러온다(사전 약 17MB, 첫 화면에는 넣지 않음). */
import type { JaToken } from '../engine/reading/ja'

let pending: Promise<(s: string) => JaToken[]> | null = null

export function loadJaTokenizer(): Promise<(s: string) => JaToken[]> {
  pending ??= import('kuromoji')
    .then(
      ({ default: kuromoji }) =>
        new Promise<(s: string) => JaToken[]>((resolve, reject) =>
          kuromoji.builder({ dicPath: `${import.meta.env.BASE_URL}dict/` }).build((err, t) => (err ? reject(err) : resolve((s) => t.tokenize(s)))),
        ),
    )
    .catch((e) => {
      pending = null // 실패하면 다음에 다시 시도한다
      throw e
    })
  return pending
}
