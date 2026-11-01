import type { Lang } from '../../engine/lang'

export interface FixtureScript {
  title: string
  /** 저작권 확인 메모 */
  rights: string
  lines: { src: string; ko: string }[]
}

/**
 * 5개 언어 동요 대본 — 입력 시험과 대본 가져오기 테스트에 쓰는 고정 자료.
 * 저작권이 끝났거나 작자 미상 전래 동요만 쓴다. 몽골어는 직접 쓴 동요풍 문장이다.
 */
export const NURSERY: Record<Lang, FixtureScript> = {
  en: {
    title: 'Twinkle, Twinkle, Little Star',
    rights: 'Jane Taylor(1806) 시, 퍼블릭 도메인',
    lines: [
      { src: 'Twinkle, twinkle, little star,', ko: '반짝반짝 작은 별,' },
      { src: 'How I wonder what you are!', ko: '네가 무엇인지 정말 궁금해!' },
      { src: 'Up above the world so high,', ko: '세상 위 저 높은 곳에서' },
      { src: 'Like a diamond in the sky.', ko: '하늘의 다이아몬드처럼.' },
    ],
  },
  ja: {
    title: 'ちょうちょう',
    rights: '野村秋足(1902년 사망) 작사, 저작권 만료',
    lines: [
      { src: 'ちょうちょう ちょうちょう', ko: '나비야 나비야' },
      { src: '菜の葉にとまれ', ko: '유채 잎에 앉아라' },
      { src: '菜の葉にあいたら', ko: '유채 잎이 싫증 나면' },
      { src: '桜にとまれ', ko: '벚꽃에 앉아라' },
    ],
  },
  zh: {
    title: '两只老虎',
    rights: '작자 미상 전래 동요',
    lines: [
      { src: '两只老虎，两只老虎，', ko: '호랑이 두 마리, 호랑이 두 마리,' },
      { src: '跑得快，跑得快，', ko: '빨리 달려, 빨리 달려,' },
      { src: '一只没有耳朵，', ko: '한 마리는 귀가 없고,' },
      { src: '一只没有尾巴，', ko: '한 마리는 꼬리가 없네,' },
      { src: '真奇怪！真奇怪！', ko: '정말 이상해! 정말 이상해!' },
    ],
  },
  tw: {
    title: '兩隻老虎',
    rights: '작자 미상 전래 동요',
    lines: [
      { src: '兩隻老虎，兩隻老虎，', ko: '호랑이 두 마리, 호랑이 두 마리,' },
      { src: '跑得快，跑得快，', ko: '빨리 달려, 빨리 달려,' },
      { src: '一隻沒有耳朵，', ko: '한 마리는 귀가 없고,' },
      { src: '一隻沒有尾巴，', ko: '한 마리는 꼬리가 없네,' },
      { src: '真奇怪！真奇怪！', ko: '정말 이상해! 정말 이상해!' },
    ],
  },
  mn: {
    title: '아침 노래 (직접 쓴 동요풍 문장)',
    rights: '언어 1급 직접 작성',
    lines: [
      { src: 'Нар гарлаа, өглөө боллоо.', ko: '해가 떴어요, 아침이 됐어요.' },
      { src: 'Шувуу жиргэж байна.', ko: '새가 지저귀고 있어요.' },
      { src: 'Хүүхдүүд гадаа тоглоно.', ko: '아이들은 밖에서 놀아요.' },
      { src: 'Бид хамтдаа дуулъя.', ko: '우리 함께 노래해요.' },
    ],
  },
}
