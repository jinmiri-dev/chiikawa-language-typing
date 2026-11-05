/**
 * 유튜브 추천 영상(2026-11-05 확인). 고른 기준:
 * - 그 언어 글자 자막이 영상 주인이 직접 올린 것으로 있다
 * - 소리가 그 언어다(유튜브 자동 자막 언어, 제목·채널로 확인. 한국어·영어 소리에 자막만 그 언어인 영상은 뺐다)
 * - 다른 사이트에서 재생되고 15분 안쪽
 * 유튜브 탭을 열면 검색 전에 종류별로 먼저 보인다. 검색 한도를 쓰지 않는다.
 */
import { LANGS, type Lang } from '../engine/lang'
import { MORE_PICKS } from './youtubePicksMore'

export const PICK_KINDS = ['kids', 'song', 'quote', 'news', 'movie', 'vlog'] as const
export type PickKind = (typeof PICK_KINDS)[number]
export const PICK_KIND_NAME: Record<PickKind, string> = {
  kids: '동요·동화',
  song: '노래',
  quote: '명언·이야기',
  news: '뉴스',
  movie: '영화·방송',
  vlog: '일상',
}

export interface VideoPick {
  videoId: string
  title: string
  channel: string
  durationSec: number
  kind: PickKind
}

const BASE_PICKS: Record<Lang, VideoPick[]> = {
  ja: [
    { kind: 'kids', videoId: 'VVJV1TkwPqY', title: 'みかんの花咲く丘（歌詞付き）', channel: '藤色くおん♫思い出の名歌', durationSec: 168 },
    { kind: 'song', videoId: 'hN5MBlGv2Ac', title: 'Official髭男dism - Subtitle', channel: 'Official髭男dism', durationSec: 322 },
    { kind: 'song', videoId: 'oZpYEEcvu5I', title: 'tuki.『晩餐歌』', channel: 'tuki.', durationSec: 220 },
    { kind: 'quote', videoId: 'XvzDM01bXzs', title: '【名言・声優朗読】擁護者(ISFJ)', channel: '名言の森', durationSec: 323 },
    { kind: 'news', videoId: 'JI53WTfMErs', title: 'NHK やさしいことばニュース　歌舞伎', channel: 'mamechan', durationSec: 567 },
    { kind: 'news', videoId: '-e_uejZwX7U', title: 'NHK やさしいことばニュース　システムのトラブル', channel: 'mamechan', durationSec: 489 },
    { kind: 'movie', videoId: 'nmw3ESwTTBI', title: '映画「還ら去る君へ」予告', channel: '映画脳 filmo cerbo', durationSec: 125 },
    { kind: 'vlog', videoId: 'PweksFQGzmI', title: '私の日本での朝の過ごし方（字幕付き）', channel: 'Japanese in Japan', durationSec: 538 },
    { kind: 'vlog', videoId: 'U_ZtNOWgAD8', title: '社会人の日常と秋の台所日記', channel: 'annko', durationSec: 892 },
  ],
  en: [
    { kind: 'kids', videoId: 'l4WNrvVjiTw', title: "If You're Happy", channel: 'Super Simple Songs', durationSec: 123 },
    { kind: 'kids', videoId: 'pZw9veQ76fo', title: 'Five Little Ducks', channel: 'Super Simple Songs', durationSec: 174 },
    { kind: 'song', videoId: '9_DLCOX_ngk', title: 'Novi - Will You Be (Lyric Video)', channel: 'Novi', durationSec: 209 },
    { kind: 'song', videoId: 'YQHsXMglC9A', title: 'Adele - Hello', channel: 'Adele', durationSec: 367 },
    { kind: 'quote', videoId: 'AWjZwffTyqA', title: 'Oprah Winfrey - Who am I?', channel: 'MOTIVATED the extra push', durationSec: 805 },
    { kind: 'news', videoId: '6eBEGgGegOE', title: 'Hackers make freezers heat to 50C', channel: 'BBC Learning English', durationSec: 466 },
    { kind: 'news', videoId: 'LMtpF7ZQqGA', title: 'Octopuses or dolphins? (Real Easy English)', channel: 'BBC Learning English', durationSec: 299 },
    { kind: 'movie', videoId: 'uJqaGLmZpGo', title: 'Dune: Part Three | Final Trailer', channel: 'Warner Bros.', durationSec: 161 },
    { kind: 'movie', videoId: 'oMeVvhr7GZw', title: 'Trinity | Official Trailer', channel: 'Netflix', durationSec: 116 },
    { kind: 'vlog', videoId: 'ZPf95S0Pzhs', title: 'Make lunch with me! (Slow English vlog)', channel: 'Miss Jean Teaches', durationSec: 560 },
    { kind: 'vlog', videoId: '52t241OQ7Ec', title: 'My Trip to London', channel: 'English by Jay', durationSec: 627 },
  ],
  zh: [
    { kind: 'kids', videoId: 'Ze1APy-CgSc', title: '两只老虎', channel: 'Learn Mandarin Chinese with AliMiMi', durationSec: 143 },
    { kind: 'kids', videoId: '33q13StMfiY', title: '太阳 星星 月亮 彩虹', channel: 'Learn Mandarin Chinese with AliMiMi', durationSec: 248 },
    { kind: 'song', videoId: 'HegSBovl24I', title: '利比《跳楼机》', channel: 'Sony Music China', durationSec: 202 },
    { kind: 'quote', videoId: 'h8-_9B8Zwvk', title: '名人名言精选', channel: '余悦读书', durationSec: 301 },
    { kind: 'news', videoId: 'umLnp1kiM1I', title: 'CCTV新闻周刊 | 丁真：“真”的世界', channel: '丁真Fan club', durationSec: 587 },
    { kind: 'movie', videoId: '3lLKhu_jhFE', title: '低智商犯罪 预告', channel: 'iQIYI 爱奇艺', durationSec: 87 },
    { kind: 'vlog', videoId: 'qcqQbMj4s-w', title: 'My daily routine | Chinese Vlog', channel: 'Natural Mandarin with Emma', durationSec: 414 },
    { kind: 'vlog', videoId: 'LcUoiBwG-OA', title: '中国美食街 Vlog', channel: 'Lala Chinese 啦啦的中文课', durationSec: 631 },
  ],
  tw: [
    { kind: 'kids', videoId: '4K6tuF-O9t0', title: '安徒生童話：賣火柴的小女孩', channel: '樂樂TV', durationSec: 504 },
    { kind: 'kids', videoId: 'JorBer35wws', title: '睡前故事：慢慢走的小烏龜', channel: '星光說故事 Nightlight Story', durationSec: 549 },
    { kind: 'song', videoId: 'i5YRIjxyJP8', title: '盧廣仲【太陽與地球】', channel: '添翼音樂 TEAM EAR MUSIC', durationSec: 262 },
    { kind: 'quote', videoId: 'mo6kpr7YMok', title: '塞翁失馬：不要太早替命運下判斷', channel: 'Daily Storytime for You 每天讀給你聽', durationSec: 357 },
    { kind: 'news', videoId: '2UWmFe2Bvw0', title: '公視新聞 記者會', channel: '公視新聞網', durationSec: 724 },
    { kind: 'vlog', videoId: 'z2Df3Pk7c18', title: 'VLOG 第一次去台灣 EP.1', channel: 'Shangrila香格拉', durationSec: 295 },
  ],
  mn: [
    { kind: 'kids', videoId: '80Mp2clgjWg', title: 'Маамуу - Найзууд', channel: 'Maamuu', durationSec: 123 },
    { kind: 'kids', videoId: 'ZR6IsSUcQJA', title: 'Маамуу нааш ир - Монгол хүүхдийн дуу', channel: 'Хөгжилтэй ертөнц', durationSec: 88 },
    { kind: 'kids', videoId: '2NIhY24buwo', title: 'Зургийн Хичээл - хүүхдийн дуу', channel: 'Анар Болор', durationSec: 82 },
    { kind: 'kids', videoId: '2VULgfen95I', title: 'Маамуу - Зүүдний ертөнц (Бүүвэйн дуу)', channel: 'Maamuu', durationSec: 172 },
    { kind: 'song', videoId: 'HP28rLnAbXE', title: 'Tonjoo - Bayanjargal ft Luuya', channel: 'Bayanjargal', durationSec: 177 },
    { kind: 'song', videoId: 'zRHwjcBIyIA', title: 'Gangaa ft Lhagvasuren - Bratan', channel: 'Gangaa', durationSec: 186 },
    { kind: 'song', videoId: 'ZASDWUBECZc', title: 'Дуулим - Хайртай шүү Ээжээ', channel: 'Battulga Duulim', durationSec: 257 },
    { kind: 'song', videoId: '_iPNHpQ1Xas', title: 'Самгалдай - Цаатан ардын дуу', channel: 'SNA', durationSec: 174 },
    { kind: 'quote', videoId: 'uRCc1INvd2s', title: 'Эрдэнээ анддаа зориулсан мэндчилгээ', channel: 'Orgil Purev', durationSec: 361 },
    { kind: 'news', videoId: '2fG5mKfqG3Y', title: 'Цөөн хормын мэдээ', channel: 'Aist Global', durationSec: 196 },
    { kind: 'movie', videoId: '5MBEqDdDoUw', title: 'Б.Орхонбаяр | The Tonight Show', channel: 'Central Television', durationSec: 620 },
    { kind: 'vlog', videoId: 'OrGVYV9gDxE', title: 'Амжилттай Сурах 13 арга', channel: 'MinuteVideos Mongolia', durationSec: 341 },
  ],
}

/** 언어마다 처음 고른 영상 + 보충 영상(언어마다 30개). 종류 순서대로 보이고, 같은 영상은 한 번만 */
export const YOUTUBE_PICKS: Record<Lang, VideoPick[]> = Object.fromEntries(
  LANGS.map((l) => {
    const all = [...BASE_PICKS[l], ...MORE_PICKS[l]]
    const unique = all.filter((v, i) => all.findIndex((x) => x.videoId === v.videoId) === i)
    return [l, PICK_KINDS.flatMap((k) => unique.filter((v) => v.kind === k))]
  }),
) as Record<Lang, VideoPick[]>

export const pickThumb = (videoId: string) => `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`
