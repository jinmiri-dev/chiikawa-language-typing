/**
 * 외국인 한국어 배우기: 고른 영상(다른 사이트에서 재생되고, 한국어 자막 또는 공개 가사 저장소의 시간 가사로 실제 열리는 것만. 2026-11-06 확인).
 * 동요·이야기 몇 편과, 말이 또렷하고 느린 한국 노래(발라드 등).
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
  { videoId: '1cOpEqnm6QE', title: '손가락 가족', channel: '콩순이 Kongsuni', durationSec: 109, kind: 'song', tags: ['family', 'body'] },
  { videoId: 'a22AMNZqduI', title: '진찰송', channel: '콩순이 Kongsuni', durationSec: 81, kind: 'song', tags: ['body'] },
  { videoId: 'SIf58hhUWgY', title: '우리는 언제나 다시 만나', channel: '달로와의 책 이야기', durationSec: 150, kind: 'story', tags: ['family', 'feeling'] },
  { videoId: '5i-GDvqldc8', title: '멋쟁이 토마토', channel: '핑크퐁', durationSec: 95, kind: 'song', tags: ['nature'] },
  { videoId: 'V2Mzp7ewg9M', title: '아이유 - 가을 아침', channel: '웅키', durationSec: 220, kind: 'song', tags: ['season', 'feeling'] },
  { videoId: 'bVaKSJX2uW0', title: '바이브 - 가을 타나 봐', channel: '웅키', durationSec: 233, kind: 'song', tags: ['season', 'feeling'] },
  { videoId: '8WYz-UEcLks', title: '성시경 - 거리에서', channel: '웅키', durationSec: 280, kind: 'song', tags: ['feeling'] },
  { videoId: '1qzbXDsUd2E', title: '성시경 - 너의 모든 순간', channel: '웅키', durationSec: 244, kind: 'song', tags: ['feeling'] },
  { videoId: '9nuJKtKnGCM', title: '나윤권 - 나였으면', channel: '웅키', durationSec: 263, kind: 'song', tags: ['feeling'] },
  { videoId: 'DkYXmxp7ZQA', title: '볼빨간사춘기 - 여행', channel: '웅키', durationSec: 222, kind: 'song', tags: ['nature', 'feeling'] },
  { videoId: 't9fCr47tGS4', title: '볼빨간사춘기 - 우주를 줄게', channel: '쎈언니', durationSec: 215, kind: 'song', tags: ['feeling'] },
  { videoId: 'Je-AOvGZVso', title: '볼빨간사춘기 - 썸 탈꺼야', channel: 'SUPER SOUND Bugs!', durationSec: 182, kind: 'song', tags: ['feeling'] },
  { videoId: 'xMpxBy6V0Vo', title: '우디 - 어제보다 슬픈 오늘', channel: 'Music Time', durationSec: 237, kind: 'song', tags: ['feeling'] },
  { videoId: 'e-WmbZFn72A', title: '세븐틴 - 울고 싶지 않아', channel: 'yankat', durationSec: 206, kind: 'song', tags: ['feeling'] },
  { videoId: 'hkStCKeLlec', title: '빅뱅 - If You', channel: 'yankat', durationSec: 263, kind: 'song', tags: ['season', 'feeling'] },
]

export const thumbOf = (videoId: string) => `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`
