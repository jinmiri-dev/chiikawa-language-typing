# 언어 1급 — 1차 계획: 기반 + 선행 시험 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 저장소와 배포 파이프라인을 세우고, 기획안이 "만들기 전에 반드시" 확인하라고 한 두 가지(휴대폰 조합 중 글자 받기, 유튜브 자막 서비스)를 실제로 시험해 결과를 문서로 남긴다.

**Architecture:** Vite + React + TypeScript 정적 앱을 GitHub Pages(`/chiikawa-language-typing/`)에 배포한다. 첫 화면은 임시 안내, `#/lab/input`에 휴대폰에서 열 입력 시험 페이지를 둔다. 유튜브 자막 시험은 배포하지 않는 Node 스크립트로 하고, 중계 함수(Cloudflare Workers)는 시험 결과를 본 뒤 다음 계획에서 만든다.

**Tech Stack:** Node 24, npm, Vite, React 18, TypeScript, Vitest + jsdom, GitHub Actions(Pages), tsx(스크립트 실행)

**Spec:** `docs/기획안.md` (v4), `docs/프론트-설계.md`, `docs/캐릭터-말투.md`. 특히 8장(유튜브 자막 선행 시험), 11.2장(조합 중 글자), 15장(실제 기기 검증), 17장(열린 질문).

## 로드맵 (기획안 v4 20장과 같다)

이 계획의 시험 결과가 뒤 단계의 설계를 바꾼다. 그래서 각 단계의 계획은 앞 단계가 끝난 뒤 따로 쓴다. 1차 범위에서 빼는 기능은 없다.

0. **기반 + 선행 시험** ← 이 문서
1. 일본어 끝까지(입력 엔진, 기본 연습, 학습 화면, 키보드 고르기, 친구·말투, 완료 카드, 저장) → `2026-11-01-stage1-japanese.md`
2. 대본 넣기(가져오기, 확인·정리, 단어장, 백업·공유, 오늘의 복습, 효과 기록)
3. 나머지 4개 언어(대만어 → 중국어 → 영어 → 몽골어)
4. 유튜브(중계 함수, 검색·링크, 자동 자막, 구간 재생, 한도 안내)
5. 마무리(점검표, 접근성, 성능, README와 화면별 캡처)

코드 구조와 데이터 모양은 `docs/프론트-설계.md`를 따른다. 이 문서의 뼈대(Task 1)도 그 폴더 구조로 만든다.

## Global Constraints

- 저장소: `https://github.com/jinmiri-dev/chiikawa-language-typing`, 로컬 경로 `C:\Users\SSAFY\Desktop\진미리\언어1급\chiikawa-language-typing`
- 배포 하위 경로: `/chiikawa-language-typing/`. 새로고침해도 깨지지 않게 해시 라우팅(`#/...`)을 쓴다.
- `언어1급` 상위 폴더의 이력서·포트폴리오 PDF, 압축 파일, 캐릭터 이미지는 이 계획에서 저장소에 넣지 않는다(이미지 공개 여부는 기획안 17장 3번 확인 후).
- API 키는 `.env`(Git 제외)에만 둔다. 저장소 어디에도 키 문자열이 있으면 안 된다.
- 화면 언어는 한국어. 문구는 짧게.
- 커밋 메시지 끝: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

## Review Focus

1. 휴대폰 키보드 중에는 영어 입력에도 조합 이벤트를 보내는 것이 있다(Android Gboard). 요약은 "조합 이벤트가 왔다"가 아니라 "조합 중 글자에 대상 문자(가나·주음·한자)가 나왔다"로 판단해야 한다. → Task 3 `summarizeLog` 테스트.
2. 배포 사이트를 하위 경로에서 새로고침하거나 `#/lab/input`으로 바로 열어도 흰 화면이 아니어야 한다. → Task 1 빌드 산출물 검사, Task 4 배포 확인.
3. 상위 폴더의 개인 PDF나 키가 실수로 커밋되면 안 된다. → Task 1 `.gitignore`와 `git status` 확인, Task 5 키 검사.
4. 휴대폰에서 오래 시험하면 로그가 끝없이 쌓인다. 2,000개를 넘으면 오래된 것부터 버린다. → Task 3 테스트.
5. 자막 서비스가 실패(키 없음, 한도 초과, 자막 없음)해도 스크립트가 멈추지 않고 그 영상을 "실패: 이유"로 기록한다. → Task 5 테스트.

---

### Task 1: 저장소와 앱 뼈대

**Files:**
- Create: `chiikawa-language-typing/` (저장소 클론), Vite React TS 템플릿 파일 일체
- Create: `chiikawa-language-typing/.gitignore`, `chiikawa-language-typing/.env.example`
- Move: `언어1급/docs/` → `chiikawa-language-typing/docs/` (기획안, 시안, 이 계획)
- Modify: `chiikawa-language-typing/vite.config.ts`
- Create: `chiikawa-language-typing/src/App.tsx`, `src/routes.ts`
- Test: `chiikawa-language-typing/src/routes.test.ts`

**Interfaces:**
- Produces: `parseRoute(hash: string): { name: 'home' } | { name: 'lab-input' } | { name: 'not-found' }`, `npm test`, `npm run build`

- [ ] **Step 1:** `C:\Users\SSAFY\Desktop\진미리\언어1급`에서 `git clone https://github.com/jinmiri-dev/chiikawa-language-typing.git` 실행. 빈 저장소 경고가 나오면 정상.
- [ ] **Step 2:** 클론 폴더 안에서 `npm create vite@latest . -- --template react-ts` 후 `npm install`, `npm install -D vitest jsdom`. `package.json` scripts에 `"test": "vitest run"` 추가.
- [ ] **Step 3:** `.gitignore`에 `node_modules/`, `dist/`, `.env`, `*.zip`, `*.pdf`, `spike-output/` 추가. `.env.example`에 `TRANSCRIPT_API_KEY=`, `TRANSLATE_API_KEY=` 두 줄.
- [ ] **Step 4:** `vite.config.ts`에 `base: '/chiikawa-language-typing/'`, `test: { environment: 'jsdom' }`.
- [ ] **Step 5: 실패 테스트 작성** `src/routes.test.ts`

```ts
import { parseRoute } from './routes'
test('빈 해시는 홈', () => expect(parseRoute('')).toEqual({ name: 'home' }))
test('#/ 는 홈', () => expect(parseRoute('#/')).toEqual({ name: 'home' }))
test('입력 시험', () => expect(parseRoute('#/lab/input')).toEqual({ name: 'lab-input' }))
test('뒤 슬래시 허용', () => expect(parseRoute('#/lab/input/')).toEqual({ name: 'lab-input' }))
test('모르는 경로', () => expect(parseRoute('#/nope')).toEqual({ name: 'not-found' }))
```

- [ ] **Step 6:** `npm test` → FAIL(`parseRoute` 없음).
- [ ] **Step 7:** `src/routes.ts`에 `parseRoute` 구현. `src/App.tsx`는 `hashchange`를 듣고 route에 따라 홈(로고 텍스트 "언어 1급" + "준비 중이에요" + 입력 시험 링크), 입력 시험(Task 3의 `InputLab`, 이 Task에서는 자리만), 404("페이지를 찾을 수 없어요" + 홈 링크)를 그린다. 템플릿 예제 코드·이미지는 지운다.
- [ ] **Step 8:** `npm test` → PASS. `npm run build` → 성공하고 `dist/index.html` 안의 스크립트 경로가 `/chiikawa-language-typing/assets/`로 시작한다.
- [ ] **Step 9:** 상위 `언어1급/docs`를 클론 폴더의 `docs`로 옮긴다. `git status`에 PDF·zip·캐릭터 이미지 폴더가 없음을 확인.
- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: Vite React TS 뼈대, 해시 라우팅, 기획 문서"
```

### Task 2: GitHub Pages 배포 파이프라인

**Files:**
- Create: `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: Task 1의 `npm test`, `npm run build`
- Produces: `main`에 push하면 `https://jinmiri-dev.github.io/chiikawa-language-typing/`에 배포

- [ ] **Step 1:** 워크플로 작성. 트리거 `push: branches: [main]`와 `workflow_dispatch`. 순서: `actions/checkout` → `actions/setup-node`(node 24, npm 캐시) → `npm ci` → `npm test` → `npm run build` → `actions/configure-pages` → `actions/upload-pages-artifact`(`path: dist`) → `actions/deploy-pages`. 권한 `pages: write`, `id-token: write`, `contents: read`. 각 액션은 현재 최신 메이저 버전을 쓴다.
- [ ] **Step 2: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: GitHub Pages 배포 워크플로"
```

- [ ] **Step 3: 사용자 작업 요청** 저장소 Settings → Pages → Source를 "GitHub Actions"로 바꿔 달라고 요청한다(계정 설정이라 사용자가 직접 한다).
- [ ] **Step 4:** `git push -u origin main`. Actions 실행이 초록이고, 배포 주소에서 "언어 1급 / 준비 중이에요"가 보이는지 확인한다. `.../#/lab/input`을 직접 열어도 흰 화면이 아니다.

### Task 3: 입력 시험 페이지 (`#/lab/input`)

기획안 11.2·15장 3·4번을 실제 휴대폰에서 확인하기 위한 페이지다. 사용자가 휴대폰으로 열어 키보드별로 예문을 치고, 결과 파일을 내려받아 전달한다.

**Files:**
- Create: `src/lab/inputLog.ts`, `src/lab/inputLog.test.ts`
- Create: `src/lab/samples.ts`
- Create: `src/lab/InputLab.tsx`, `src/lab/InputLab.css`
- Modify: `src/App.tsx` (lab 자리에 `InputLab` 연결)

**Interfaces:**
- Produces:
  - `type LoggedEvent = { t: number; type: 'keydown'|'beforeinput'|'compositionstart'|'compositionupdate'|'compositionend'|'input'; key?: string; code?: string; isComposing?: boolean; inputType?: string; data?: string | null; value?: string; vvHeight?: number }`
  - `createInputLogger(el: HTMLInputElement | HTMLTextAreaElement, opts?: { max?: number }): { events(): LoggedEvent[]; clear(): void; dispose(): void }` — 기본 `max` 2000
  - `type Script = 'kana' | 'kanji' | 'bopomofo' | 'hanzi' | 'cyrillic' | 'latin'`
  - `summarizeLog(events: LoggedEvent[], target: Script[]): { compositionEvents: number; targetInComposition: boolean; compositionSamples: string[]; keydownKeys: string[]; finalValue: string; minViewportHeight: number | null }`
  - `type LabReport = { createdAt: string; userAgent: string; language: string; keyboardLabel: string; sampleId: string; summary: ReturnType<typeof summarizeLog>; events: LoggedEvent[] }`
  - `SAMPLES: { id: string; language: 'ja'|'zh-TW'|'zh'|'mn'|'en'; text: string; target: Script[] }[]`

- [ ] **Step 1: 실패 테스트 작성** `src/lab/inputLog.test.ts`

```ts
import { createInputLogger, summarizeLog } from './inputLog'

function fire(el: HTMLElement, type: string, init: any = {}) {
  const ev = type.startsWith('composition')
    ? new CompositionEvent(type, { data: init.data ?? '' })
    : type === 'keydown' ? new KeyboardEvent('keydown', init)
    : new Event(type)
  el.dispatchEvent(ev)
}

test('조합 이벤트의 data를 기록한다', () => {
  const el = document.createElement('input')
  const log = createInputLogger(el)
  fire(el, 'compositionstart')
  fire(el, 'compositionupdate', { data: 'た' })
  fire(el, 'compositionupdate', { data: 'たべ' })
  fire(el, 'compositionend', { data: '食べ' })
  expect(log.events().map(e => e.data).filter(Boolean)).toEqual(['た', 'たべ', '食べ'])
})

test('2000개를 넘으면 오래된 것부터 버린다', () => {
  const el = document.createElement('input')
  const log = createInputLogger(el)
  for (let i = 0; i < 2100; i++) fire(el, 'keydown', { key: 'a' })
  expect(log.events()).toHaveLength(2000)
})

test('영어 조합만 오면 대상 문자 조합은 아님 (Gboard 영어)', () => {
  const s = summarizeLog([
    { t: 0, type: 'compositionupdate', data: 'hel' },
    { t: 1, type: 'compositionend', data: 'hello' },
  ], ['kana', 'kanji'])
  expect(s.compositionEvents).toBe(2)
  expect(s.targetInComposition).toBe(false)
})

test('가나가 조합 중에 보이면 대상 문자 조합', () => {
  const s = summarizeLog([{ t: 0, type: 'compositionupdate', data: 'たべ' }], ['kana', 'kanji'])
  expect(s.targetInComposition).toBe(true)
  expect(s.compositionSamples).toEqual(['たべ'])
})

test('주음 감지', () => {
  const s = summarizeLog([{ t: 0, type: 'compositionupdate', data: 'ㄋㄧˇ' }], ['bopomofo'])
  expect(s.targetInComposition).toBe(true)
})

test('keydown 키와 최소 화면 높이를 모은다', () => {
  const s = summarizeLog([
    { t: 0, type: 'keydown', key: 'Process', vvHeight: 800 },
    { t: 1, type: 'input', value: '你', vvHeight: 420 },
  ], ['hanzi'])
  expect(s.keydownKeys).toEqual(['Process'])
  expect(s.minViewportHeight).toBe(420)
  expect(s.finalValue).toBe('你')
})
```

- [ ] **Step 2:** `npm test` → FAIL(모듈 없음).
- [ ] **Step 3:** `src/lab/inputLog.ts` 구현. 각 이벤트에 `performance.now()`와 `window.visualViewport?.height`를 붙인다. 문자 판별 정규식: kana `[\u3040-\u30ff]`, kanji·hanzi `\p{Script=Han}`, bopomofo `[\u3100-\u312f\u02ca\u02c7\u02cb\u02d9]`, cyrillic `\p{Script=Cyrillic}`, latin `[A-Za-z]`. `compositionSamples`는 `compositionupdate` data를 중복 없이 최대 20개.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** `src/lab/samples.ts`에 예문을 정의한다: ja `食べる`, `ありがとう`, `ちょっと待って` / zh-TW `你好`, `謝謝你`, `我想喝水` / zh `你好`, `我想喝水` / mn `Сайн байна уу`, `Өглөөний мэнд` / en `How are you?`. 대상 문자는 ja `['kana','kanji']`, zh-TW `['bopomofo','hanzi']`, zh `['hanzi']`, mn `['cyrillic']`, en `['latin']`.
- [ ] **Step 6:** `src/lab/InputLab.tsx` 구현. 화면 위에서 아래로: 제목 "입력 시험", 짧은 안내("휴대폰 키보드를 고르고 예문을 그대로 쳐 보세요. 결과 파일을 보내 주시면 키보드 안내를 맞출게요."), 언어·예문 선택, 키보드 이름 입력칸(예: "iPhone 일본어 12키 플릭"), 예문 크게, 입력창(`autocomplete/autocorrect/autocapitalize/spellcheck` 끔), 실시간 요약(조합 이벤트 수, 대상 문자 조합 여부, 조합 샘플, 현재 화면 높이), 버튼 "결과 내려받기"(`lab-<sampleId>-<시각>.json`으로 `LabReport` 저장)와 "지우기". 폭 360px에서 가로 스크롤이 없고, 키보드가 올라와도 입력창과 요약이 보이게 요약을 입력창 바로 아래에 둔다.
- [ ] **Step 7:** `npm run dev`로 PC 크롬에서 열어 Windows 일본어 IME로 `食べる`를 쳐 본다. 요약에 `targetInComposition: true`, 샘플에 가나가 보이고, 내려받은 JSON에 이벤트가 들어 있으면 통과.
- [ ] **Step 8: Commit 후 push**

```bash
git add src/lab src/App.tsx
git commit -m "feat: 휴대폰 입력 조합 시험 페이지"
git push
```

배포 후 `.../#/lab/input`이 휴대폰에서 열리는지 확인한다.

### Task 4: 기기 시험 진행과 결과 문서

**Files:**
- Create: `docs/spikes/input-composition.md`
- Create: `docs/spikes/input-reports/` (사용자가 보낸 JSON)

- [ ] **Step 1: 사용자 작업 요청** 아래 조합을 휴대폰에서 시험하고 JSON을 받아 달라고 요청한다. 가진 기기만 하면 되고, 없는 칸은 "미시험"으로 남긴다.
  - iPhone: 일본어 12키(플릭), 일본어 로마자, 주음(注音), 병음(간체), 병음 9키, 몽골어(있으면), 영어
  - Android Gboard: 같은 목록
  - PC: Windows 일본어 IME, 주음 IME(微軟注音), 병음 IME
- [ ] **Step 2:** 받은 JSON을 `docs/spikes/input-reports/`에 넣고 `docs/spikes/input-composition.md`에 표로 정리한다. 열: 기기 / 키보드 / 조합 이벤트 옴 / 대상 문자가 조합 중에 보임 / 조합 샘플 / keydown key 값 / 키보드 올라온 화면 높이 / 결론(읽기 실시간 확인 가능·확정 글자만·불가).
- [ ] **Step 3:** 결론에 맞춰 `docs/기획안.md` 11.2장을 고친다(가능한 조합, 불가능한 조합, 대체 방식).
- [ ] **Step 4: Commit**

```bash
git add docs/spikes docs/기획안.md
git commit -m "docs: 휴대폰 입력 조합 시험 결과"
```

### Task 5: 유튜브 자막 서비스 시험 스크립트

배포하지 않는 Node 스크립트다. 서비스 하나당 어댑터 하나를 두고, 같은 영상 목록으로 돌려 비교한다.

**Files:**
- Create: `spike/youtube/types.ts`, `spike/youtube/normalize.ts`, `spike/youtube/normalize.test.ts`
- Create: `spike/youtube/providers/searchapi.ts`
- Create: `spike/youtube/videos.json`
- Create: `spike/youtube/run.ts`
- Create: `docs/spikes/youtube-transcript.md`
- Modify: `package.json` (`"spike:yt": "tsx --env-file=.env spike/youtube/run.ts"`), `vite.config.ts` 테스트 대상에 `spike/**/*.test.ts` 포함

**Interfaces:**
- Produces:
  - `type Cue = { start: number; end: number; text: string }` (초 단위)
  - `type TrackResult = { ok: true; kind: 'manual'|'asr'|'translated'; cues: Cue[] } | { ok: false; reason: 'no-key'|'quota'|'no-track'|'network'|'other'; detail?: string }`
  - `interface TranscriptProvider { name: string; fetchTrack(videoId: string, lang: string): Promise<TrackResult> }`
  - `normalizeCues(raw: Cue[]): Cue[]` — 빈 글자 제거, 앞뒤 공백 정리, 시간순 정렬
  - `mergeIntoLines(cues: Cue[], opts?: { minSec?: number; maxSec?: number }): Cue[]` — 기본 2초~12초. 이어진 조각을 합치되 합친 길이가 `maxSec`를 넘지 않게 하고, 조각 사이 공백이 1.5초 이상이면 끊는다
  - `pairWithKorean(src: Cue[], ko: Cue[]): { src: Cue; ko: string | null }[]` — 시간이 가장 많이 겹치는 한국어 줄을 짝짓는다. 겹침이 없으면 `null`
  - `safeFetch(p: TranscriptProvider, videoId: string, lang: string): Promise<TrackResult>` — 예외를 `{ ok:false, reason:'network'|'other' }`로 바꾼다

- [ ] **Step 1: 실패 테스트 작성** `spike/youtube/normalize.test.ts`

```ts
import { normalizeCues, mergeIntoLines, pairWithKorean } from './normalize'
import { safeFetch } from './run'

test('빈 줄 제거와 정렬', () => {
  expect(normalizeCues([{ start: 2, end: 3, text: ' b ' }, { start: 0, end: 1, text: '' }, { start: 1, end: 2, text: 'a' }]))
    .toEqual([{ start: 1, end: 2, text: 'a' }, { start: 2, end: 3, text: 'b' }])
})

test('자동 자막 조각을 12초 이하로 합친다', () => {
  const parts = Array.from({ length: 10 }, (_, i) => ({ start: i * 2, end: i * 2 + 2, text: `w${i}` }))
  const lines = mergeIntoLines(parts)
  expect(lines.every(l => l.end - l.start <= 12)).toBe(true)
  expect(lines.map(l => l.text).join(' ')).toBe(parts.map(p => p.text).join(' '))
})

test('1.5초 이상 쉬면 끊는다', () => {
  const lines = mergeIntoLines([{ start: 0, end: 1, text: 'a' }, { start: 3, end: 4, text: 'b' }])
  expect(lines).toHaveLength(2)
})

test('한국어는 가장 많이 겹치는 줄과 짝짓는다', () => {
  const r = pairWithKorean(
    [{ start: 0, end: 4, text: 'こんにちは' }, { start: 10, end: 12, text: 'さようなら' }],
    [{ start: 0.5, end: 3.5, text: '안녕하세요' }, { start: 20, end: 22, text: '딴 줄' }],
  )
  expect(r.map(x => x.ko)).toEqual(['안녕하세요', null])
})

test('어댑터가 예외를 던져도 실패 결과로 바꾼다', async () => {
  const boom = { name: 'x', fetchTrack: async () => { throw new Error('ECONNRESET') } }
  expect(await safeFetch(boom, 'id', 'ja')).toMatchObject({ ok: false, reason: 'network' })
})
```

- [ ] **Step 2:** `npm install -D tsx` 후 `npm test` → FAIL.
- [ ] **Step 3:** `normalize.ts` 구현, `run.ts`에 `safeFetch` export. `npm test` → PASS.
- [ ] **Step 4: 사용자 작업 요청** SearchAPI(searchapi.io) 무료 가입과 API 키 발급을 요청한다. 키는 사용자가 `.env`의 `TRANSCRIPT_API_KEY`에 직접 넣는다. 다른 서비스를 원하면 같은 인터페이스로 어댑터를 추가한다.
- [ ] **Step 5:** `providers/searchapi.ts` 구현. `GET https://www.searchapi.io/api/v1/search?engine=youtube_transcripts&video_id=<id>&lang=<lang>&api_key=<key>`. 응답의 자막 조각을 `Cue[]`로 바꾸고, 요청 언어가 없어 사용 가능한 언어 목록만 오면 `{ ok:false, reason:'no-track', detail: 언어목록 }`. 401·403은 `no-key`, 429는 `quota`. 응답 필드 이름은 실제 응답을 한 번 받아 보고 맞춘다.
- [ ] **Step 6:** `videos.json`에 언어별 3개(사람 자막 / 자동 자막 / 노래)씩 15개 영상을 넣는다. YouTube에서 해당 언어로 검색해 자막 있는 영상을 고르고, 각 항목에 `{ id, language, kind, title }`.
- [ ] **Step 7:** `run.ts` 본체: 영상마다 원문(`language`)과 `ko`를 받아 `normalizeCues` → (자동 자막이면) `mergeIntoLines` → `pairWithKorean`. 본체는 직접 실행할 때만 돈다(`import.meta.url === pathToFileURL(process.argv[1]).href`). 테스트가 `safeFetch`를 import해도 실행되지 않게 하기 위해서다. 결과를 `spike-output/<id>.json`에 쓰고, 마지막에 표(영상 / 원문 결과 / 한국어 결과 / 줄 수 / 한국어 짝 비율 / 첫 3줄)를 콘솔과 `spike-output/summary.md`에 출력한다. 영상 사이 1초 쉰다.
- [ ] **Step 8:** `npm run spike:yt` 실행. 15개 모두 결과(성공 또는 "실패: 이유")가 표에 나오면 통과.
- [ ] **Step 9:** `docs/spikes/youtube-transcript.md`에 정리한다: 언어별 성공률, 한국어를 받은 비율(번역 자막 포함), 시간 정확도(첫 3줄을 영상과 눈으로 대조), 쓴 크레딧과 무료 한도, 초과 요금, 몽골어 결과. 결론: 이 서비스를 쓸지, 한국어가 없을 때 번역 API가 얼마나 필요한지.
- [ ] **Step 10:** 키 유출 검사: `git grep -n -I "$(sed -n 's/^TRANSCRIPT_API_KEY=//p' .env)"` 결과가 없어야 한다. `spike-output/`이 Git에 안 잡히는지 `git status`로 확인.
- [ ] **Step 11:** 결과에 맞춰 `docs/기획안.md` 8장을 고친다.
- [ ] **Step 12: Commit 후 push**

```bash
git add spike package.json package-lock.json vite.config.ts docs/spikes/youtube-transcript.md docs/기획안.md
git commit -m "spike: 유튜브 자막 서비스 시험 스크립트와 결과"
git push
```

### Task 6: 다음 계획으로 넘기기

- [ ] **Step 1:** Task 4·5 결과를 사용자에게 요약해 보고하고, 기획안 17장 1번을 닫는다. 2번(대본 견본 파일)과 3번(캐릭터 이미지 공개)의 상태를 확인한다.
- [ ] **Step 2:** 로드맵 2번(입력 엔진) 계획을 `docs/superpowers/plans/`에 새로 쓴다.
