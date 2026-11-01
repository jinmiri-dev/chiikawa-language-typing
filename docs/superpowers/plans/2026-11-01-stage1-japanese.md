# 단계 1 — 일본어 끝까지 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 처음 온 사람이 일본어를 골라 기본 연습 한 세트를 PC와 휴대폰에서 끝까지 치고 완료 카드를 받는다. 키 안내, 틀린 이유, 친구 반응, 저장, 듣기가 모두 된다.

**Architecture:** 판정·키 순서·안내 단계·시간 계산은 React를 모르는 순수 함수(`src/engine/`)로 만들고 테스트로 고정한다. 저장(IndexedDB)과 듣기(음성)는 `src/services/`, 화면은 `src/screens/`가 둘을 부르기만 한다. 기본 연습 문장과 읽기는 미리 검수한 고정 자료라서 이 단계에는 형태소 분석기가 필요 없다.

**Tech Stack:** Vite 8, React 19, TypeScript 7, Vitest 5 + jsdom, `idb`, `fake-indexeddb`(테스트), `@testing-library/react`(화면 테스트)

**Spec:** `docs/기획안.md`(7.1~7.3, 7.8, 10, 11, 14, 20장), `docs/프론트-설계.md`, `docs/캐릭터-말투.md`, 와이어프레임 https://claude.ai/artifact/GCFCH4CsMJLgiCPTCoxgX3

## 이 단계에서 나눠 둔 것

- **1-A (이 문서):** 위 목표 전부. 듣기는 기기 음성(`speechSynthesis`)으로 한다.
- **1-B (다음 문서):** 중계 함수(Cloudflare Workers) `/tts`와 Azure 여자/남자 목소리, 캐시. Azure 키가 있어야 해서 따로 둔다. 1-A의 `services/speech`가 같은 함수 모양을 쓰므로 화면은 바뀌지 않는다.
- **휴대폰 키 안내 열기:** 플릭·탭·휴대폰 로마자 배열은 기획안 15장 기기 검증 전까지 `verified: false`(안내 준비 중, 타자·채점은 됨)다. 사용자가 입력 시험 JSON을 보내면 데이터의 `verified`만 `true`로 바꾼다.

## Global Constraints

- 배포 하위 경로 `/chiikawa-language-typing/`, 해시 라우팅. 라우트는 프론트-설계 3장 표 그대로.
- `engine/`은 React와 브라우저 저장소를 모른다. 화면은 `engine/`과 `services/`를 부르기만 한다.
- 색·크기는 `src/styles/tokens.css` 토큰만 쓴다. 노란 강조(`--point`)는 지금 칠 글자·키 한 곳에만.
- 실제 입력창은 화면에 보이는 입력 줄 그 자체다(숨은 입력창 쓰지 않음). 기획안 10장 4번의 "숨은 입력창"과 다르며, 휴대폰 커서 문제로 프론트-설계 7장을 따른다.
- 판정은 `compositionend`와 조합 중이 아닌 `input`에서만 한다. 조합 중에는 오답을 표시하지 않는다.
- 입력창: 글자 16px 이상, `autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"`, `lang="ja"`.
- 가로 스크롤 없음(PC 1280, 휴대폰 360·390), 누를 수 있는 것은 44×44 이상, 애매한 빈 공간 없음, 좌우 여백 대칭.
- 화면 문구는 한국어, 짧게. 개발자 표시는 "개발자: 진미리"(시작 화면 맨 아래, 학습 화면에는 없음).
- 캐릭터 그림(`public/friends/<id>-<nn>.webp`)과 완료 카드(`public/cards/<nn>-<id>.png`)는 Git에 넣지 않는다(`.gitignore`). 파일이 없으면 화면은 이름 배지로 대신한다. 사용권 확인 뒤 사용자가 넣기로 한다.
- 커밋 메시지 끝: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

## Review Focus

1. Windows·Mac 일본어 IME는 조합 중 `たべ`를 보내다가 확정 때 `食べ`로 바꾼다. 조합이 끝나기 전 오답 표시가 한 번이라도 뜨면 안 된다. → Task 12 화면 테스트(조합 이벤트 흉내).
2. 같은 줄을 지우고 다시 칠 때 "처음 친 글자 정확도"는 처음 시도만 센다. 지운 뒤 맞혀도 100%가 되면 안 된다. → Task 12 `lineRecorder` 테스트.
3. 사생활 보호 모드 등 IndexedDB가 안 되는 브라우저에서 앱이 멈추면 안 된다. 메모리로 돌고 시작 화면에 알린다. → Task 9 테스트.
4. 탭을 숨기거나 60초 동안 입력이 없으면 연습 시간이 멈춘다. 다시 돌아와도 숨긴 동안의 시간이 들어가면 안 된다. → Task 8 테스트.
5. 휴대폰에서 키보드가 올라와도 원문·뜻·한 줄 안내·입력창이 보인다. → Task 15 390×844, 높이 420(키보드 올라온 상태 흉내) 점검.

---

### Task 1: 공용 타입과 라우트

**Files:**
- Create: `src/engine/types.ts`
- Modify: `src/app/routes.ts`, `src/app/routes.test.ts`

**Interfaces:**
- Produces: 프론트-설계 4장의 `Lang`(기존 `engine/lang.ts`에서 다시 내보냄), `FriendId`, `LayoutId`, `Material`, `Line`, `Segment`, `LineResult`, `Progress`, `Settings`, `DEFAULT_SETTINGS`, `FRIENDS: FriendId[]`(말투 문서 순서).
- Produces: `Route` = `home | materials{lang, tab} | study{materialId} | done{materialId} | friend | settings | guide | lab-input | not-found`, `parseRoute(hash)`, `href(route): string`.

- [ ] **Step 1: 실패 테스트** `routes.test.ts`에 추가: `parseRoute('#/materials?lang=ja&tab=starter')` → `{name:'materials', lang:'ja', tab:'starter'}`; `tab` 없으면 `'starter'`; 모르는 lang(`xx`) → `not-found`; `#/study/ja-greet` → `{name:'study', materialId:'ja-greet'}`; `#/done/ja-greet`, `#/friend`, `#/settings`, `#/guide`; 모든 Route에 대해 `parseRoute(href(r))`가 `r`과 같다.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** 구현. `DEFAULT_SETTINGS`: `device:'auto', layout:{}, hintMode:'full', hintFading:true, show:{ko:true,reading:true,src:true}, strict:false, autoListen:false, reduceMotion:false, voice:{}, rate:1, friend:'chiikawa'`.
- [ ] **Step 4:** `npm test` → PASS. **Commit** `feat: 공용 타입과 라우트`

### Task 2: 일본어 기본 연습 4세트

**Files:**
- Create: `src/content/starter/ja.json`, `src/content/starter/index.ts`, `src/content/starter/starter.test.ts`

**Interfaces:**
- Produces: `starterSets(lang: Lang): StarterSet[]`, `starterMaterial(id: string): Material | null`. `StarterSet = { id: string; lang; title; minutes: number; reviewed: boolean; lines: number }`. 재료 id는 `<lang>-<setId>`(예: `ja-plan`).
- JSON 모양: `{ "reviewed": false, "sets": [{ "id": "greet"|"plan"|"react"|"bye", "title": "인사와 대답"|"약속 잡기"|"리액션"|"마무리 인사", "lines": [{ "ko": "…", "segs": [["今日","きょう"],["は"],…] }] }] }`. `segs`의 한 칸은 `[원문 조각, 읽기?]`이고 읽기가 없으면 원문이 곧 읽기(가나)다. 조각 하나가 한 단어(`isWord: true`).
- 문장: 친구와 채팅하는 짧은 말, 세트당 10줄, 줄당 4~16자. 기획안 20.3에 따라 5개 언어가 같은 뜻으로 맞춰지도록 한국어 뜻을 먼저 정하고 일본어를 쓴다. `reviewed:false`면 화면에 "검수 전"을 붙인다.

- [ ] **Step 1: 실패 테스트** 4세트 × 10줄; 세트 id 순서 `greet, plan, react, bye`; 줄마다 `segs`의 원문을 이으면 `src`; 읽기는 히라가나·`ー`·문장부호만(`/^[ぁ-ゖー、。！？!?…〜 ]+$/`); 한자가 있는 조각은 반드시 읽기가 있다; `ko`가 비어 있지 않다; 줄 id는 `<setId>-01`~`<setId>-10`; `starterMaterial('ja-plan')!.lines[0].segments[0].confident === true`.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** JSON 작성과 `index.ts`(JSON → `Material`, `koSource:'given'`, `kind:'starter'`, `createdAt:0`).
- [ ] **Step 4:** PASS. **Commit** `feat: 일본어 기본 연습 4세트`

### Task 3: 가나 → 로마자 키

**Files:**
- Create: `src/engine/ja/romaji.ts`, `src/engine/ja/romaji.test.ts`

**Interfaces:**
- Produces: `kanaUnits(reading: string): string[]`(요음을 한 단위로: `きょう` → `['きょ','う']`), `romajiOf(unit: string): string`, `romajiKeys(reading: string): string[]`(키 하나씩, 소문자).
- 규칙: 헵번식(`し shi, ち chi, つ tsu, ふ fu, じ ji, を wo`), `ん`은 `nn`, `っ`은 다음 단위 첫 글자를 두 번(`っち` → `cchi`), 단독 작은 글자는 `x` 앞붙임(`ぁ xa`), `ー`는 `-`, 가타카나는 히라가나로 바꿔 같은 키, `、。！？`는 `, . ! ?`.

- [ ] **Step 1: 실패 테스트** `romajiKeys('たべる')` = `t a b e r u`; `きょう` = `k y o u`; `ちょっと` = `c h o t t o`; `しんぶん` = `s h i n n b u n n`; `コーヒー` = `k o - h i -`; `ぁ` = `x a`; `kanaUnits('しゅっぱつ')` = `['しゅ','っ','ぱ','つ']`; 모르는 문자(`漢`)는 예외를 던진다.
- [ ] **Step 2~4:** FAIL → 구현(표 + 앞에서부터 가장 긴 단위 고르기) → PASS. **Commit** `feat: 일본어 로마자 키 순서`

### Task 4: 12키 플릭·탭 순서

**Files:**
- Create: `src/engine/ja/kana12.ts`, `src/engine/ja/kana12.test.ts`

**Interfaces:**
- Consumes: `kanaUnits` (Task 3)
- Produces: `KeyStep`(프론트-설계 5장), `flickSteps(unit: string): KeyStep[]`, `tapSteps(unit: string): KeyStep[]`.
- 행 키 id: `a ka sa ta na ha ma ya ra wa`, 꾸밈 키 `mod`(゛゜小, 탭 1번 = 탁음 또는 작은 글자, 2번 = 반탁음), 문장부호 키 `punct`(、。？！ 차례로 탭 1~4).
- 플릭 방향: あ단 tap, い단 left, う단 up, え단 right, お단 down. や행은 や tap, ゆ up, よ down. わ키는 わ tap, を left, ん up, ー right.
- 요음 `きょ` = `き` 순서 + `よ` 순서 + `mod` 1번.

- [ ] **Step 1: 실패 테스트** `flickSteps('べ')` = `[{keyId:'ha',gesture:'right',text:'へ'},{keyId:'mod',gesture:'tap',taps:1,text:'べ'}]`; `flickSteps('ぱ')`의 `mod` taps 2; `flickSteps('っ')` = つ(up) + mod 1; `flickSteps('ん')` = `wa` up; `flickSteps('ー')` = `wa` right; `tapSteps('う')` = `[{keyId:'a',gesture:'tap',taps:3,text:'う'}]`; `tapSteps('ご')` = ko(`ka` 5번) + mod 1; `flickSteps('きょ')` 길이 4(き, よ, mod).
- [ ] **Step 2~4:** FAIL → 구현 → PASS. **Commit** `feat: 일본어 12키 플릭·탭 순서`

### Task 5: 배열 데이터와 `keySteps`

**Files:**
- Create: `src/engine/layouts/types.ts`, `src/engine/layouts/data/ja-pc-romaji.ts`, `ja-mobile-romaji.ts`, `ja-flick.ts`, `ja-tap.ts`, `src/engine/layouts/index.ts`, `src/engine/layouts/layouts.test.ts`

**Interfaces:**
- Consumes: `romajiKeys`, `flickSteps`, `tapSteps`, `Segment`
- Produces: `Layout`, `KeyDef`(프론트-설계 5장), `getLayout(id: LayoutId): Layout`, `layoutsFor(lang: Lang, device: 'pc'|'mobile'): Layout[]`, `keySteps(layout: Layout, seg: Segment): { steps: KeyStep[]; convert?: string; confident: boolean }`, `LAYOUT_LABEL: Record<LayoutId, { name: string; desc: string }>`.
- PC 로마자 배열: 숫자 줄·Q·A·Z 줄·Space, 키 id는 소문자 글자(`q`…`m`, `minus`, `space`, `enter`, `shift`). 와이어프레임 04의 키보드 그림과 같은 줄 구성.
- `verified`: `ja-pc-romaji`만 `true`, 나머지 셋은 `false`.
- `convert`: 조각 원문이 읽기와 다르면(한자·가타카나) 원문. 로마자 배열의 마지막 안내는 `{keyId:'space', text:'변환'}`, `{keyId:'enter', text:'확정'}`.

- [ ] **Step 1: 실패 테스트** `keySteps(ja-pc-romaji, {text:'食べ', reading:'たべ'})` → steps 키 id `t a b e space enter`, `convert:'食べ'`; 가나만인 조각은 `space`/`enter` 없음; `layoutsFor('ja','mobile')` id 순서 `ja-flick, ja-tap, ja-mobile-romaji`; 모든 배열에서 `keySteps`가 내놓는 `keyId`가 그 배열의 `rows` 안에 있다(기본 연습 40줄 전체로 검사); `confident:false`인 조각이면 결과도 `confident:false`.
- [ ] **Step 2~4:** FAIL → 구현 → PASS. **Commit** `feat: 일본어 키보드 배열과 키 순서`

### Task 6: 판정과 틀린 이유

**Files:**
- Create: `src/engine/judge/judge.ts`, `src/engine/judge/explain.ts`, `src/engine/judge/judge.test.ts`

**Interfaces:**
- Produces: `normalizeLoose(s: string): string`, `judge(expected: string, committed: string, opts: { strict: boolean }): { okUpTo: number; wrongAt?: number; done: boolean }`, `explainMistake(lang: Lang, expected: string, typed: string): string | null`.
- Produces: `readingProgress(expectedReading: string, composing: string): { matches: boolean; at: number }`(조합 중 글자 확인, 기획안 11.2). 조합 중 글자가 가나면 남은 읽기가 그것으로 시작하는지, 로마자면 남은 읽기의 `romajiKeys`를 이은 것이 그것으로 시작하는지 본다. `at`은 맞은 데까지의 길이.
- 너그러운 판정: 문장부호(、。,.!?！？…〜)·공백·대소문자·전각/반각·곧은/굽은 따옴표를 무시한다. `okUpTo`·`wrongAt`은 원래 `expected` 기준 글자 위치다.
- 틀린 이유 문구(일본어): `゛가 빠졌어요`, `゜가 빠졌어요`, `작은 っ이에요`(작은/큰 글자), `ー(장음)가 빠졌어요`, `다른 한자를 골랐어요: 書く → 描く`(둘 다 한자일 때 원문 단어와 친 단어), 그 밖에는 `○ 대신 △를 쳤어요`.

- [ ] **Step 1: 실패 테스트** `judge('今日は、', '今日は', {strict:false}).done === true`; strict면 false; `judge('たべる','たへ',…)` → `{okUpTo:1, wrongAt:1, done:false}`; `judge('ＡＢ','ab',{strict:false}).done`; 친 것이 더 짧고 다 맞으면 `wrongAt` 없음; `explainMistake('ja','たべ','たへ')` = `゛가 빠졌어요`; `('ja','ぱ','は')` = `゜가 빠졌어요`; `('ja','ちょっと','ちょつと')` = `작은 っ이에요`; `('ja','コーヒー','コヒー')` = `ー(장음)가 빠졌어요`; `('ja','書く','描く')` = `다른 한자를 골랐어요: 書く → 描く`; 같으면 `null`. `readingProgress('たべる','たべ')` = `{matches:true, at:2}`; `('たべる','たへ')` = `{matches:false, at:1}`; `('たべる','tab')` = `{matches:true, at:3}`.
- [ ] **Step 2~4:** FAIL → 구현 → PASS. **Commit** `feat: 판정과 틀린 이유`

### Task 7: 안내 줄이기

**Files:**
- Create: `src/engine/hint/hint.ts`, `src/engine/hint/hint.test.ts`

**Interfaces:**
- Produces: `HintMemory = Record<string, { streak: number; level: 'full'|'line'|'off' }>`, `nextHintLevel(mem: HintMemory, unitKey: string, correct: boolean, idleMs: number): { mem: HintMemory; level: 'full'|'line'|'off' }`. `unitKey`는 가나 단위(`べ`).
- 규칙(기획안 11.3): 3번 연속 맞으면 `full → line`, 다시 3번이면 `line → off`. 틀리거나 `idleMs >= 2000`이면 그 단위만 `full`, streak 0.

- [ ] **Step 1: 실패 테스트** 처음 `full`; 맞음 3번 → `line`; 3번 더 → `off`; `off`에서 틀림 → `full`; `off`에서 idle 2000 → `full`; 다른 단위는 영향 없음; 입력 `mem`을 바꾸지 않는다(새 객체).
- [ ] **Step 2~4:** FAIL → 구현 → PASS. **Commit** `feat: 안내 줄이기 규칙`

### Task 8: 연습 시간, 친구 단계, 말투

**Files:**
- Create: `src/engine/friend/clock.ts`, `src/engine/friend/clock.test.ts`, `src/content/friendLines.ts`, `src/content/friendLines.test.ts`

**Interfaces:**
- Produces: `ClockState = { activeMs: number; lastAt: number | null }`, `clockEvent(s: ClockState, now: number, kind: 'input' | 'hide' | 'show' | 'tick'): ClockState`(입력 사이 간격이 60,000ms 이하일 때만 그 간격을 더한다. `hide` 뒤 `show`까지는 더하지 않는다), `stageOf(activeMs: number): number`(0~12, 5분마다 1, 60분 넘으면 12).
- Produces: `Situation = 'hello'|'line'|'streak'|'oops'|'comeback'|'step'|'rest'|'sixty'|'finish'|'review'|'welcome'`, `FRIEND_LINES: Record<FriendId, Record<Situation, string[]>>`, `STAGE_LINES: Record<FriendId, { pose: string; line: string }[]>`(13칸), `FRIEND_INFO: Record<FriendId, { name: string; intro: string }>`, `pickLine(friend, situation, last?: string, rand = Math.random): string`.
- 문구는 `docs/캐릭터-말투.md` 2-B·3·4장을 그대로 옮긴다. 새로 쓰지 않는다.

- [ ] **Step 1: 실패 테스트** 입력 0, 1000, 3000 → activeMs 3000; 입력 사이 61초 → 그 간격은 0; `hide` → `show`(10분 뒤) → 입력 → 숨긴 시간 안 들어감; `stageOf(299_999)=0, (300_000)=1, (3_600_000)=12, (9_999_999)=12`; 8명 × 11상황 모두 문구 2개 이상; `STAGE_LINES` 8명 × 13칸; 말풍선 길이 상한(치이카와·우사기 8자, 쿠리만쥬 14자, 나머지 24자) 이하; 이모지 없음(`/\p{Extended_Pictographic}/u`); `pickLine`은 `last`와 같은 문구를 고르지 않는다.
- [ ] **Step 2~4:** FAIL → 구현 → PASS. **Commit** `feat: 연습 시간과 친구 말투`

### Task 9: 저장

**Files:**
- Create: `src/services/storage.ts`, `src/services/storage.test.ts`
- Modify: `package.json`(`idb` 의존성, `fake-indexeddb` 개발 의존성)

**Interfaces:**
- Consumes: `Progress`, `Settings`, `DEFAULT_SETTINGS`, `LineResult`
- Produces: `openStore(): Promise<Store>`; `Store = { persistent: boolean; getSettings(): Promise<Settings>; saveSettings(s): Promise<void>; getProgress(materialId): Promise<Progress | null>; saveProgress(p): Promise<void>; lastProgress(): Promise<Progress | null>; listProgress(lang?: Lang): Promise<Progress[]> }`; `requestPersist(): Promise<boolean>`(`navigator.storage.persist`).
- DB 이름 `language-grade1`, 버전 1, 저장소 7개(프론트-설계 6장). `Progress`에 `updatedAt: number`를 더한다(이어서 공부하기 순서).
- IndexedDB가 열리지 않으면 같은 모양의 메모리 저장소를 돌려주고 `persistent:false`.

- [ ] **Step 1: 실패 테스트** (`fake-indexeddb/auto`) 설정 기본값; 저장 후 다시 열어도 남음; `lastProgress`는 `updatedAt`이 가장 큰 것; `indexedDB`를 지운 환경에서 `persistent:false`이고 저장·읽기가 된다.
- [ ] **Step 2~4:** FAIL → 구현 → PASS. **Commit** `feat: 브라우저 저장`

### Task 10: 듣기(기기 음성)

**Files:**
- Create: `src/services/speech.ts`, `src/services/speech.test.ts`

**Interfaces:**
- Produces: `speak(text: string, opts: { lang: Lang; voice: 'female'|'male'; rate: 1 | 0.75 }): Promise<{ source: 'device' | 'none' }>`, `stopSpeaking(): void`, `canSpeak(lang: Lang): Promise<boolean>`. 1-B에서 `source:'worker'`가 더해진다.
- 목소리 고르기: `speechSynthesis.getVoices()`에서 `lang`이 `ja`로 시작하는 것 중 이름에 여자 목소리 표(`Nanami, Kyoko, Haruka, Ayumi, Female`) 또는 남자 표(`Keita, Otoya, Ichiro, Male`)가 들어간 것을 먼저, 없으면 그 언어 첫 목소리.

- [ ] **Step 1: 실패 테스트** 가짜 `speechSynthesis`로: 여자 요청 → 이름에 Nanami 있는 목소리; 남자 요청인데 남자 목소리 없음 → 그 언어 첫 목소리; 그 언어 목소리가 없으면 `{source:'none'}`이고 말하지 않음; `rate` 0.75 전달.
- [ ] **Step 2~4:** FAIL → 구현 → PASS. **Commit** `feat: 기기 음성 듣기`

### Task 11: 공통 부품, 시작 화면, 재료 화면

**Files:**
- Create: `src/components/{Button,Chip,Sheet,FriendImage,FriendBubble,StatusNotice}.tsx`와 같은 이름 `.css`, `src/screens/Home/Home.tsx`, `src/screens/Materials/Materials.tsx`, `src/app/AppState.tsx`(Store·Settings 제공), `src/screens/Home/Home.test.tsx`
- Modify: `src/app/App.tsx`, `.gitignore`(`public/friends/`, `public/cards/`), `package.json`(`@testing-library/react`)

**Interfaces:**
- Consumes: `parseRoute/href`, `starterSets`, `Store`, `FRIEND_INFO`, `LANG_NAME`
- Produces: `useApp(): { store: Store; settings: Settings; setSettings(p: Partial<Settings>): void }`, `<FriendImage friend stage size />`(이미지 없으면 이름 첫 글자 원형 배지, `alt`는 "치이카와 5분 자세"처럼), `<Sheet open onClose title>`(열 때 `history.pushState`, 뒤로 가기로 닫힘).
- 시작 화면: 와이어프레임 01(처음)과 01-B(다시). 처음: 머리글 "언어 1급 · 외국어 타자 연습", 제목·부제(기획안 7.1 문구 그대로), 언어 카드 5개(누르면 `#/materials?lang=…`), "이렇게 연습해요" 3단계, "로그인 없이 바로 써요. 기록은 이 브라우저에만 저장돼요.", 맨 아래 "개발자: 진미리". 다시: `lastProgress`가 있으면 "다시 왔네요! 오늘도 한 줄씩 쳐 봐요."와 이어서 공부하기(주요 버튼). `persistent:false`면 "이 브라우저에서는 기록이 저장되지 않아요" 알림.
- 재료 화면: 와이어프레임 02-A·M02. 탭 셋(기본 연습·유튜브·대본). 기본 연습만 이 단계에서 연다. 나머지 두 탭은 상태 안내 "이 단계에서는 기본 연습부터 열었어요. 유튜브와 대본은 곧 열려요."를 보여 준다. 일본어 외 언어의 기본 연습 탭도 같은 안내. 세트 카드: 제목, "10줄 · 약 3분", 진도(있으면 `3/10`), 검수 전 표시.

- [ ] **Step 1: 실패 테스트** 저장 기록 없음 → "배울 언어를 누르면 바로 시작해요"와 카드 5개, 영어·일본어·중국어 (간체)·대만어 (번체)·몽골어 순; 기록 있음 → "이어서 공부하기"; 일본어 카드의 링크가 `#/materials?lang=ja&tab=starter`.
- [ ] **Step 2~4:** FAIL → 구현 → PASS. 브라우저로 1280·390 폭에서 가로 스크롤 없음 확인. **Commit** `feat: 시작 화면과 재료 화면`

### Task 12: 학습 화면

**Files:**
- Create: `src/screens/Study/Study.tsx`, `Study.css`, `src/screens/Study/useTyping.ts`, `src/screens/Study/lineRecorder.ts`, `src/screens/Study/lineRecorder.test.ts`, `src/screens/Study/Study.test.tsx`, `src/components/KeyboardMap.tsx`, `src/components/KeyGuideLine.tsx`

**Interfaces:**
- Consumes: Task 1~10 전부
- Produces: `lineRecorder(expected: string)` → `{ onCommit(committed: string, now: number): void; result(lineId: string, now: number): LineResult }`(처음 친 글자 정확도 = 처음 시도에서 맞은 글자 수 / 글자 수, 지우고 다시 쳐도 바뀌지 않음, 틀림 횟수는 새로 틀린 위치마다 1).
- 배치는 기획안 10장과 와이어프레임 04(PC)·M04(휴대폰). PC: 가운데 열에 대사(이전 줄 흐리게·지금 줄 원문과 읽기 루비·뜻) → 입력 줄 → 한 줄 안내 → 키보드 그림, 오른쪽 열에 듣기(다시 듣기·0.75배·목소리)·이 줄(이전·건너뛰기)·키보드(배열 바꾸기·안내 단계), 왼쪽 열 세로 가운데에 친구·말풍선·연습 시간·친구 바꾸기. 휴대폰: `--vvh`로 높이를 잡고 대사 → 입력창 → 한 줄 안내(+펼치면 작은 배열 그림) 순, 상단 바에 진도·친구 얼굴.
- 입력 처리: 조합 중(`isComposing`)에는 `readingProgress`만 보고 오답 표시 없음. `compositionend`·비조합 `input`에서 `judge`. 틀리면 그 위치 물결 밑줄 + 빨간 글자, 안내 줄 맨 위 `✕ <explainMistake>`, `aria-live="polite"`.
- 줄을 다 맞히면 "✓ 맞았어요"와 `Enter`/다음 버튼. 줄마다 `saveProgress`. 마지막 줄 뒤 `#/done/<id>`.
- 친구: `hello`(들어올 때), `line`(5줄에 한 번 이하), `streak`, `oops`, `comeback`, 단계가 바뀌면 지금 줄을 마친 뒤 `STAGE_LINES` 포즈·문구. 말풍선 4초.
- 배열이 `verified:false`면 한 줄 안내와 그림 자리에 "이 키보드는 안내를 준비하고 있어요. 타자와 채점은 그대로 돼요."
- 단축키(PC): `Enter` 다음 줄, `Ctrl+Space` 듣기, `Ctrl+←/→` 이전·다음 줄.

- [ ] **Step 1: 실패 테스트** `lineRecorder`: `たべる`에 `たへ` → `たべる` 순서로 확정하면 정확도 2/3, 틀림 1; 처음부터 맞게 치면 1, 틀림 0. `Study.test.tsx`: `compositionstart` → 입력값 `たへ` + `compositionupdate` 동안 오답 표시(`[data-wrong]`)가 없다; `compositionend`로 `たへ` 확정 → 오답 표시와 "゛가 빠졌어요"; 첫 줄을 맞게 확정하면 "맞았어요"가 보이고 저장소에 `lineIndex:1`.
- [ ] **Step 2~4:** FAIL → 구현 → PASS. 브라우저로 Windows 일본어 IME 실제 입력 확인(PC 1280). **Commit** `feat: 학습 화면`

### Task 13: 키보드 고르기 시트와 10초 확인

**Files:**
- Create: `src/engine/ja/detect.ts`, `src/engine/ja/detect.test.ts`, `src/screens/Study/KeyboardSheet.tsx`

**Interfaces:**
- Consumes: `layoutsFor`, `LAYOUT_LABEL`, `Sheet`, `createInputLogger`/`summarizeLog`(기존 `src/lab/inputLog.ts`)
- Produces: `recommendLayout(lang: 'ja', sample: { compositionSamples: string[]; keydownKeys: string[]; finalValue: string }): LayoutId | null`. 첫 조합 글자가 가나면 `ja-flick`, 첫 조합이 로마자(`k`)면 `ja-mobile-romaji`, 판단 못 하면 `null`(직접 고르게). 판별 규칙은 기기 검증 뒤 바꿀 수 있게 이 함수에만 둔다.
- 시트: 기획안 11.5 그대로("일본어 키보드 고르기", 설명, "か를 한 번 쳐 보세요", 추천 결과 "✓ 12키 플릭으로 보여요", 목록에 `verified:false`면 "안내 준비 중", 주요 버튼 "이 키보드로 연습"). 휴대폰에서 일본어를 처음 연습할 때 자동으로 열고, 학습 화면 배열 버튼과 설정에서 연다. 고르면 `settings.layout.ja` 저장, 진도 그대로.

- [ ] **Step 1: 실패 테스트** `{compositionSamples:['か']}` → `ja-flick`; `{compositionSamples:['k','か']}` → `ja-mobile-romaji`; 빈 값 → `null`.
- [ ] **Step 2~4:** FAIL → 구현 → PASS. **Commit** `feat: 키보드 고르기와 10초 확인`

### Task 14: 완료, 친구 바꾸기, 설정 화면

**Files:**
- Create: `src/engine/stats/compare.ts`, `src/engine/stats/compare.test.ts`, `src/screens/Done/Done.tsx`, `src/screens/Friend/Friend.tsx`, `src/screens/Settings/Settings.tsx`

**Interfaces:**
- Consumes: `Store.listProgress`, `FRIEND_INFO`, `STAGE_LINES`, `FriendImage`
- Produces: `avgLineMs(results: LineResult[]): number`, `compareText(prevMs: number | null, nowMs: number): string`. 빨라졌으면 `지난번보다 한 줄에 1.2초 빨라졌어요 · 8.4초 → 7.2초`, 느려졌거나 같으면 `오늘은 꼼꼼하게 쳤어요`, 지난번이 없으면 `첫 기록이에요`.
- 완료(와이어프레임 05·M05): 축하 제목, 카드(`public/cards/<nn>-<id>.png`, 없으면 이름 배지 카드), 기록(완료 줄·정확도·연습 시간), 비교 문구, 버튼 "카드 이미지 저장"(주요, 이미지 있을 때만)·"틀린 줄만 다시"·"다른 재료". 친구 `finish` 문구.
- 친구 바꾸기(07): 8명 PC 4×2, 휴대폰 2×4, 고르면 오른쪽에 기본 자세·소개·5/30/60분 자세 예시, "○○로 바꾸기". 진도·시간 그대로.
- 설정(08): 기기(자동·PC·휴대폰), 일본어 키보드(시트 열기), 안내 줄이기, 뜻·발음·원문 보이기, 엄격하게, 줄 시작 때 자동으로 듣기, 목소리(여자/남자), 캐릭터 움직임 줄이기(`prefers-reduced-motion`이면 기본 켬), 함께하는 친구.

- [ ] **Step 1: 실패 테스트** `compareText(8400, 7200)`, `compareText(7000, 7200)`, `compareText(null, 7200)` 문구 그대로; `avgLineMs([])`는 0.
- [ ] **Step 2~4:** FAIL → 구현 → PASS. **Commit** `feat: 완료 카드, 친구 바꾸기, 설정`

### Task 15: 흐름 점검과 배포

**Files:**
- Create: `src/app/flow.test.tsx`
- Modify: `docs/기획안.md`(20장 단계 1 진행 표시), `docs/보안-점검.md`(점검 기록 한 줄)

- [ ] **Step 1: 흐름 테스트** 시작 → 일본어 카드 → 인사와 대답 → 10줄을 `compositionend`로 맞게 확정 → 완료 화면에 "10줄"과 비교 문구. 새로 렌더하면 시작 화면이 "이어서 공부하기"로 바뀐다.
- [ ] **Step 2:** `npm run lint && npm test && npm run build` 모두 통과. 첫 화면 JS(gzip) 150KB 이하(`dist/assets/*.js` 크기 확인).
- [ ] **Step 3: 브라우저 점검** 개발 서버에서 PC 1280×800과 휴대폰 390×844, 390×420(키보드 올라옴 흉내): 모든 라우트 `scrollWidth <= innerWidth`, 학습 화면에서 원문·뜻·한 줄 안내·입력창이 한 화면에 보임, 44px 미만 버튼 없음, 콘솔 오류 없음. 사용자 배려 점검표 8가지(기획안 18장) 확인.
- [ ] **Step 4:** 커밋·푸시 후 Actions 초록, 배포 주소에서 같은 흐름을 한 번 더 확인. **Commit** `chore: 단계 1-A 점검과 배포`
