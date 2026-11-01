/** 배울 언어. 화면 순서도 이 순서다(기획안 6장). */
export const LANGS = ['en', 'ja', 'zh', 'tw', 'mn'] as const
export type Lang = (typeof LANGS)[number]

export const LANG_NAME: Record<Lang, { ko: string; native: string; htmlLang: string }> = {
  en: { ko: '영어', native: 'English', htmlLang: 'en' },
  ja: { ko: '일본어', native: '日本語', htmlLang: 'ja' },
  zh: { ko: '중국어 (간체)', native: '简体中文', htmlLang: 'zh-CN' },
  tw: { ko: '대만어 (번체)', native: '繁體中文', htmlLang: 'zh-TW' },
  mn: { ko: '몽골어', native: 'Монгол хэл', htmlLang: 'mn' },
}

/** 재료 종류 이름 */
export const KIND_NAME = { starter: '기본 연습', script: '대본', youtube: '유튜브' } as const
