/** 화면 글 줄바꿈: 문장 끝(!?.…~ 와 닫는 괄호·따옴표) 뒤 띄어쓰기에서 문장을 나눈다. 숫자 속 점(1.2초)은 띄어쓰기가 없어 그대로. */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[!?.…~！？。][)"'”’）」』]*)\s+/u)
    .map((s) => s.trim())
    .filter(Boolean)
}
