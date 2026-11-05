/**
 * 자격증 태그: 시험과 급수를 고르면 그 급수 학습 영상을 유튜브에서 찾는다.
 * 검색어는 그 언어로(그 언어 자막이 있는 영상이 걸리게), 한국어 설명 영상은 피한다.
 */
import type { Lang } from '../engine/lang'

export interface CertLevel {
  label: string
  q: string
}
export interface Cert {
  name: string
  levels: CertLevel[]
}

export const CERTS: Partial<Record<Lang, Cert[]>> = {
  zh: [{ name: 'HSK', levels: [1, 2, 3, 4, 5, 6].map((n) => ({ label: `${n}급`, q: `HSK${n}级 词汇 听力` })) }],
  tw: [
    {
      name: 'TOCFL',
      levels: [
        ['A1 入門', '入門級'],
        ['A2 基礎', '基礎級'],
        ['B1 進階', '進階級'],
        ['B2 高階', '高階級'],
        ['C1 流利', '流利級'],
        ['C2 精通', '精通級'],
      ].map(([label, lv]) => ({ label, q: `TOCFL ${lv} 華語文能力測驗 詞彙` })),
    },
  ],
  ja: [{ name: 'JLPT', levels: [5, 4, 3, 2, 1].map((n) => ({ label: `N${n}`, q: `JLPT N${n} 単語 聴解` })) }],
  en: [
    {
      name: '토익',
      levels: [
        { label: 'LC 듣기', q: 'TOEIC listening practice test with answers' },
        { label: 'RC 단어', q: 'TOEIC vocabulary words with examples' },
      ],
    },
    {
      name: '오픽',
      levels: [
        { label: 'IM', q: 'OPIc IM sample answer English speaking' },
        { label: 'IH', q: 'OPIc IH sample answer English speaking' },
        { label: 'AL', q: 'OPIc AL sample answer English speaking' },
      ],
    },
  ],
}
