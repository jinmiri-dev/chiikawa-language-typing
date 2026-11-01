# 단계 3 — 나머지 4개 언어 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 대만어(번체)·중국어(간체)·영어·몽골어도 일본어처럼 기본 연습 4세트, 읽기(주음·병음·로마자 전사), 키 안내, 틀린 이유, 대본 넣기가 된다.

**Architecture:** 언어마다 다른 부분을 `engine/reading/<lang>.ts`(읽기)·`engine/layouts/data/<layoutId>.ts`(배열)·`engine/layouts/steps.ts`(키 순서)로 나누고, 학습 화면·키보드 시트·설정은 언어를 받아 같은 코드로 그린다. 기본 연습 읽기는 생성 스크립트로 만든 뒤 눈으로 검수해 JSON으로 고정한다(첫 화면에 병음 사전을 싣지 않음). 대본의 중국어 읽기는 `pinyin-pro`를 그때만 불러온다.

**Tech Stack:** 단계 2 + `pinyin-pro`(MIT, 대본 읽기에서만 동적 import), `tsx`(기본 연습 생성 스크립트)

**Spec:** `docs/기획안.md` 6·11.4·12·20(단계 3)·20.3장, `docs/프론트-설계.md` 4·5장

## Global Constraints

- 단계 1·2 Global Constraints 전부.
- 순서: 대만어 → 중국어 → 영어 → 몽골어(기획안 20장). 이번 계획은 네 언어를 한 번에 열되 언어마다 테스트를 따로 둔다.
- 기본 연습은 일본어 세트와 같은 뜻(같은 한국어 40줄)으로 맞춘다(기획안 20.3). 모두 "검수 전".
- 배열 검증(기획안 15장): 표준이 정해진 PC 배열(영어 쿼티, 중국어 병음, 대만 주음 大千)은 `verified: true`. 휴대폰 배열과 몽골어 키릴(PC 포함, 기획안 11.4 "기기에서 확인한 뒤")은 `verified: false`.
- 대만어 읽기는 주음(성조 기호)으로 보여 주고, 대만 표준 발음이 다른 낱말은 보정표로 고친다(기획안 12장).
- 첫 화면 JS 150KB(gzip) 이하 유지.

## Review Focus

1. 대만어에서 `還`이 `huán`으로 읽히면 안 된다(대화에서는 거의 `hái`). 보정표 테스트.
2. 주음 변환: `zhi/chi/shi/ri/zi/ci/si`, `ju/qu/xu/yu`의 ü, `yi/wu/you/wei` 같은 표기 규칙, 경성(˙)이 맞아야 한다.
3. 영어 대문자는 Shift를 함께 안내하고, 판정은 대소문자를 무시한다(너그러운 판정).
4. 몽골어 `ө`·`ү`는 키 안내와 로마자 전사(ö, ü)가 빠지면 안 된다.
5. 일본어에서 쓰던 `'ja'` 고정값이 학습·시트·설정·듣기에 남아 있으면 다른 언어가 일본어 안내로 나온다. → 학습 화면 테스트를 언어마다 하나씩.

---

### Task 1: 읽기 — 병음·주음·몽골어 전사
**Files:** `src/engine/reading/{zhuyin,zh,mn}.ts` + 테스트
**Produces:** `pinyinToZhuyin(numbered: string): string`(`ni3`→`ㄋㄧˇ`, `ma0`→`˙ㄇㄚ`), `toneless(pinyin): string`(ü→v), `buildZhSegments(lang: 'zh'|'tw', text, pinyin: PinyinFn): Segment[]`(Intl.Segmenter 낱말, `reading`=성조 병음, tw는 `zhuyin`), `TW_FIX`(대만 보정), `mnRomaji(text): string`, `buildPlainSegments(lang: 'en'|'mn', text): Segment[]`(낱말, mn은 `romaji`).
- [ ] 테스트 → 구현. **Commit** `feat: 중국어·대만어·몽골어 읽기`

### Task 2: 배열과 키 순서
**Files:** `engine/layouts/data/{en-qwerty,zh-pinyin,zh-pinyin-9key,tw-zhuyin,mn-cyrillic}.ts`, `engine/layouts/index.ts`, `guide.ts`, `types.ts`(LayoutId 추가: `en-qwerty-mobile`, `zh-pinyin-mobile`, `tw-pinyin-mobile`, `mn-cyrillic-mobile`)
- 영어: 글자 키, 대문자는 `shift` + 키. 병음: 성조 없는 병음 글자 + `space`(후보). 9키: 숫자 키(2 ABC … 9 WXYZ). 주음 大千: 기호 키와 성조 키(1성 `space`, 2성 `6`, 3성 `3`, 4성 `4`, 경성 `7`). 몽골어 키릴: 글자 키(ф ц у ж э н г ш ү з к ъ / й ы б ө а х р о л д п / я ч ё с м и т ь в ю, `-` е, `=` щ).
- `guideFor`·`guideText`를 언어 일반으로: 일본어 밖은 단계 글자를 이은 목표와 조합 글자를 비교한다.
- [ ] 테스트: 언어마다 키 순서, 기본 연습 160줄 모든 키가 그 배열 그림 안, 한 줄 안내 문구. **Commit** `feat: 4개 언어 배열과 키 안내`

### Task 3: 기본 연습 4개 언어
**Files:** `src/content/starter/source/{tw,zh,en,mn}.json`(문장·뜻), `scripts/gen-starter.ts`, 생성된 `src/content/starter/{tw,zh,en,mn}.json`, `index.ts`, 테스트
- 생성 스크립트가 읽기·주음·전사를 넣고, 사람이 결과를 검수한다(보정은 source 쪽 `fix`).
- [ ] 테스트: 언어마다 4세트×10줄, 한국어 뜻이 일본어 세트와 같음, 대만어에 간체 전용 글자 없음·중국어에 번체 전용 글자 없음, 몽골어에 ө/ү, 조각을 이으면 원문. **Commit** `feat: 4개 언어 기본 연습`

### Task 4: 판정·학습 화면·시트·설정·듣기의 언어 일반화
**Files:** `engine/judge/explain.ts`, `engine/ja/detect.ts`→`engine/detect.ts`, `Study.tsx`, `KeyboardSheet.tsx`, `Settings.tsx`, `services/speech.ts`, `Materials.tsx`
- 틀린 이유: 중국어·대만어 `같은 소리 다른 한자를 골랐어요: 再 → 在`(병음이 같을 때), 그 밖 `б 대신 в를 쳤어요`. 입력기 꺼짐 안내는 언어별 문구.
- 10초 확인: 언어별 글자(대만 `ㄋ`, 중국 `你`, 그 밖은 확인 없이 목록).
- 목소리 이름 표: 언어별 여자·남자.
- [ ] 테스트: 언어마다 학습 화면이 열리고 그 언어 안내·`lang` 속성, 틀린 이유. **Commit** `feat: 4개 언어 학습`

### Task 5: 대본·넷플릭스 추천
- 대본 탭을 모든 언어에 연다. 읽기는 `buildSegments(lang)`(ja 사전, zh/tw `pinyin-pro` 동적, en/mn 바로).
- 넷플릭스 직접 고른 작품: 대만어·중국어·영어. 몽골어는 "지금 한국 넷플릭스에는 몽골어 작품이 거의 없어요" + 유튜브 탭 버튼.
- [ ] 테스트: 언어별 대본 붙여넣기 → 읽기. **Commit** `feat: 4개 언어 대본`

### Task 6: 점검과 배포
- [ ] lint·test·build, 첫 화면 JS 크기, 브라우저(PC·휴대폰)에서 네 언어 기본 연습 한 줄씩, 배포 확인, 문서.
