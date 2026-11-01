/** 직접 고른 학습 추천 넷플릭스 작품 (기획안 7.5). 넷플릭스 오리지널 위주로 골랐다.
 *  TMDB 결과(중계 함수)가 생기면 그 앞에 붙는다. 한국 넷플릭스에서 내려갈 수 있어 화면에 그 사실을 알린다. */
import type { Lang } from '../engine/lang'

export interface NetflixPick {
  title: string
  original: string
  year: number
  type: '드라마' | '영화'
  note: string
}

export const NETFLIX_PICKS: Partial<Record<Lang, NetflixPick[]>> = {
  ja: [
    { title: '마이코네 행복한 밥상', original: '舞妓さんちのまかないさん', year: 2023, type: '드라마', note: '부엌·식사 대화가 많고 말이 느려요' },
    { title: '심야식당: 도쿄 스토리', original: '深夜食堂 -Tokyo Stories-', year: 2016, type: '드라마', note: '짧은 이야기, 손님과 주고받는 말' },
    { title: '퍼스트 러브 하츠코이', original: 'First Love 初恋', year: 2022, type: '드라마', note: '잔잔한 일상 대화' },
    { title: '아리스 인 보더랜드', original: '今際の国のアリス', year: 2020, type: '드라마', note: '말이 빨라요 · 익숙해진 뒤 추천' },
  ],
}

export const netflixSearch = (title: string) => `https://www.netflix.com/search?q=${encodeURIComponent(title)}`
