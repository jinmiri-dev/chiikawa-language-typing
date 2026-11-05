/**
 * 유튜브 추천 영상: 그 언어 글자 자막과 한국어 뜻이 실제로 붙는 것을 확인한 영상(2026-11-05 확인).
 * 유튜브 탭을 열면 검색 전에 먼저 보인다. 검색 한도를 쓰지 않는다.
 */
import type { Lang } from '../engine/lang'

export interface VideoPick {
  videoId: string
  title: string
  channel: string
  durationSec: number
}

export const YOUTUBE_PICKS: Record<Lang, VideoPick[]> = {
  ja: [
    { videoId: 'PweksFQGzmI', title: '【字幕付き＆日本語リスニング】私の日本での朝の過ごし方 (vlog)', channel: 'Japanese in Japan', durationSec: 538 },
    { videoId: 'U_ZtNOWgAD8', title: 'vlog》社会人の日常と秋の台所日記｜お弁当・ビビンバレシピ・焼きそば', channel: 'annko', durationSec: 892 },
  ],
  en: [
    { videoId: 'pZw9veQ76fo', title: 'Five Little Ducks | Kids Songs | Super Simple Songs', channel: 'Super Simple Songs', durationSec: 174 },
    { videoId: 'YQHsXMglC9A', title: 'Adele - Hello (Official Music Video)', channel: 'Adele', durationSec: 367 },
  ],
  zh: [
    { videoId: 'Ze1APy-CgSc', title: '两只老虎 Two Tigers Chinese Nursery Rhymes', channel: 'Learn Mandarin Chinese 中文 with AliMiMi', durationSec: 143 },
    { videoId: '33q13StMfiY', title: '太阳 星星 月亮 彩虹 Sun and Moon in Chinese', channel: 'Learn Mandarin Chinese 中文 with AliMiMi', durationSec: 248 },
  ],
  tw: [
    { videoId: 'z2Df3Pk7c18', title: 'VLOG 第一次去台灣 EP .1 (中文字幕)', channel: 'Shangrila香格拉', durationSec: 295 },
    { videoId: 'InjTFx4VIuc', title: '[대만 Vlog] 2021년 연말 파티ㅣ台灣日常（中文字幕）', channel: '줠니 Journey', durationSec: 283 },
  ],
  mn: [
    { videoId: '80Mp2clgjWg', title: 'Маамуу - Найзууд', channel: 'Maamuu', durationSec: 123 },
    { videoId: 'ZR6IsSUcQJA', title: 'Маамуу нааш ир - Монгол хүүхдийн дуу (Үгтэй)', channel: 'Хөгжилтэй ертөнц', durationSec: 88 },
    { videoId: '2NIhY24buwo', title: 'Зургийн Хичээл - хүүхдийн дуу', channel: 'Анар Болор', durationSec: 82 },
    { videoId: '2VULgfen95I', title: 'Маамуу - Зүүдний ертөнц (Бүүвэйн дуу)', channel: 'Maamuu', durationSec: 172 },
    { videoId: 'ZASDWUBECZc', title: 'Дуулим - Хайртай шүү Ээжээ', channel: 'Battulga Duulim', durationSec: 257 },
    { videoId: '_iPNHpQ1Xas', title: 'Самгалдай - Цаатан ардын дуу', channel: 'SNA', durationSec: 174 },
    { videoId: 'm9fVU_d7ULY', title: 'Nartai ft. Chiki - Silly (Official Music Video)', channel: '146 Records', durationSec: 215 },
  ],
}

export const pickThumb = (videoId: string) => `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`
