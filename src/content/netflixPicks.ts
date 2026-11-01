/** 직접 고른 학습 추천 넷플릭스 작품 (기획안 7.5). 넷플릭스 오리지널 위주로 골랐다.
 *  TMDB 결과(중계 함수)가 생기면 그 앞에 붙는다. 한국 넷플릭스에서 내려갈 수 있어 화면에 그 사실을 알린다. */
import type { Lang } from '../engine/lang'

export interface NetflixPick {
  title: string
  original: string
  year: number
  type: '드라마' | '영화'
  note: string
  /** 넷플릭스 검색어(한국어 제목이 불확실하면 원제) */
  search?: string
}

export const NETFLIX_PICKS: Partial<Record<Lang, NetflixPick[]>> = {
  ja: [
    { title: '마이코네 행복한 밥상', original: '舞妓さんちのまかないさん', year: 2023, type: '드라마', note: '부엌·식사 대화가 많고 말이 느려요' },
    { title: '심야식당: 도쿄 스토리', original: '深夜食堂 -Tokyo Stories-', year: 2016, type: '드라마', note: '짧은 이야기, 손님과 주고받는 말' },
    { title: '퍼스트 러브 하츠코이', original: 'First Love 初恋', year: 2022, type: '드라마', note: '잔잔한 일상 대화' },
    { title: '아리스 인 보더랜드', original: '今際の国のアリス', year: 2020, type: '드라마', note: '말이 빨라요 · 익숙해진 뒤 추천' },
  ],
  tw: [
    { title: '상견니', original: '想見你', year: 2019, type: '드라마', note: '대만 학교·일상 대화' },
    { title: '슬픔보다 더 슬픈 이야기', original: '比悲傷更悲傷的故事', year: 2018, type: '영화', note: '느린 말, 잔잔한 대화' },
    { title: 'Light the Night', original: '華燈初上', year: 2021, type: '드라마', note: '대만 넷플릭스 오리지널', search: '華燈初上' },
  ],
  zh: [{ title: '유랑지구', original: '流浪地球', year: 2019, type: '영화', note: '표준 중국어 · 말이 빨라요', search: '流浪地球' }],
  en: [
    { title: '하트스토퍼', original: 'Heartstopper', year: 2022, type: '드라마', note: '쉬운 학교 대화' },
    { title: '에밀리, 파리에 가다', original: 'Emily in Paris', year: 2020, type: '드라마', note: '짧은 일상·직장 대화' },
    { title: '웬즈데이', original: 'Wednesday', year: 2022, type: '드라마', note: '또박또박한 말투' },
    { title: '기묘한 이야기', original: 'Stranger Things', year: 2016, type: '드라마', note: '친구끼리 쓰는 말 · 빠름' },
  ],
}

export const netflixSearch = (title: string) => `https://www.netflix.com/search?q=${encodeURIComponent(title)}`
