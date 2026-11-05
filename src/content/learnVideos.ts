/**
 * 외국인 한국어 배우기: 고른 영상(한국어 자막이 직접 올려져 있고, 다른 사이트에서 재생되는 것만. 2026-11-05 확인).
 * 가사 본문은 저장소에 두지 않는다. 중계 서버가 처음 한 번 받아 저장해 둔다(/lyrics).
 */

export const SITUATIONS = ['greet', 'family', 'body', 'number', 'nature', 'season', 'feeling'] as const
export type Situation = (typeof SITUATIONS)[number]

export type VideoKind = 'song' | 'cartoon' | 'story'

export interface LearnVideo {
  videoId: string
  title: string
  channel: string
  durationSec: number
  kind: VideoKind
  tags: Situation[]
}

export const LEARN_VIDEOS: LearnVideo[] = [
  { videoId: 'Wdsyfs3JCkQ', title: '곰 세 마리', channel: 'Ottiya Korean Language', durationSec: 161, kind: 'song', tags: ['family'] },
  { videoId: 'kKZh4fLHVUE', title: '안녕! 안녕! 신나는 인사 동요', channel: '팝팝 프룻 바스켓', durationSec: 113, kind: 'song', tags: ['greet'] },
  { videoId: 'MYe03WSROuA', title: '모두 함께 인사해요', channel: '코베베 KObebe', durationSec: 134, kind: 'song', tags: ['greet'] },
  { videoId: 'pJqh_YrXO4o', title: '나라별 인사송', channel: '까꿍구름이', durationSec: 141, kind: 'song', tags: ['greet'] },
  { videoId: '1cOpEqnm6QE', title: '손가락 가족', channel: '콩순이 Kongsuni', durationSec: 109, kind: 'song', tags: ['family', 'body'] },
  { videoId: 'zhYPqzdaM-Q', title: '별나라 가족', channel: '콩순이 Kongsuni', durationSec: 114, kind: 'song', tags: ['family'] },
  { videoId: 'a22AMNZqduI', title: '진찰송', channel: '콩순이 Kongsuni', durationSec: 81, kind: 'song', tags: ['body'] },
  { videoId: 'gpTVzfH77nY', title: '아야 아야 아파!', channel: '베베핀 Bebefinn', durationSec: 206, kind: 'cartoon', tags: ['body', 'feeling'] },
  { videoId: '8aT2X28Qip4', title: '안약, 귀약을 넣어요', channel: '깨비키즈', durationSec: 124, kind: 'cartoon', tags: ['body'] },
  { videoId: 'gFjEf-t48Yc', title: '숫자 1', channel: '해마큐', durationSec: 94, kind: 'song', tags: ['number'] },
  { videoId: '8w7xahg2-9E', title: '잘잘잘 숫자송', channel: '노리야 NORiYA', durationSec: 66, kind: 'song', tags: ['number'] },
  { videoId: 'GrtqL_yuLzs', title: '퐁당퐁당', channel: 'Kids', durationSec: 70, kind: 'song', tags: ['nature'] },
  { videoId: 'Hf7QO70sUZU', title: '개구리송', channel: '베리퐁당', durationSec: 87, kind: 'song', tags: ['nature'] },
  { videoId: 'i-GSglJw_9g', title: '악어떼', channel: '다나랜드', durationSec: 60, kind: 'song', tags: ['nature'] },
  { videoId: 'qjWOaejZzfM', title: '송편 빚어요', channel: '벨라송', durationSec: 61, kind: 'song', tags: ['season', 'family'] },
  { videoId: 'sjl8ULaKNEU', title: '할아버지의 낡은 시계', channel: '베리퐁당', durationSec: 165, kind: 'song', tags: ['family', 'number'] },
  { videoId: 'SIf58hhUWgY', title: '우리는 언제나 다시 만나', channel: '달로와의 책 이야기', durationSec: 150, kind: 'story', tags: ['family', 'feeling'] },
  { videoId: 'bFgm8uosL2Q', title: '꼬꼬닭 마을의 벼슬미용실', channel: '창작동화 어쭈구립', durationSec: 353, kind: 'story', tags: ['nature'] },
  { videoId: '_WBvFWL9a0c', title: '아기 돼지 삼형제', channel: '톰토미', durationSec: 895, kind: 'story', tags: ['family'] },
]

export const thumbOf = (videoId: string) => `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`
