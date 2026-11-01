// kuromoji 내부 모듈: 브라우저 기본 불러오기(zlibjs·XHR)를 쓰지 않고 사전을 직접 넣으려고 쓴다.
declare module 'kuromoji/src/dict/DynamicDictionaries.js' {
  export default class DynamicDictionaries {
    loadTrie(base: Int32Array, check: Int32Array): this
    loadTokenInfoDictionaries(tokenInfo: Uint8Array, pos: Uint8Array, targetMap: Uint8Array): this
    loadConnectionCosts(cc: Int16Array): this
    loadUnknownDictionaries(unk: Uint8Array, pos: Uint8Array, map: Uint8Array, cat: Uint8Array, compat: Uint32Array, invoke: Uint8Array): this
  }
}
declare module 'kuromoji/src/Tokenizer.js' {
  import type DynamicDictionaries from 'kuromoji/src/dict/DynamicDictionaries.js'
  export default class Tokenizer {
    constructor(dic: DynamicDictionaries)
    tokenize(text: string): import('../engine/reading/ja').JaToken[]
  }
}
