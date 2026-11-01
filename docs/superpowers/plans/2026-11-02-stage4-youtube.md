# 단계 4 — 유튜브와 중계 함수 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 유튜브 검색·태그·링크로 영상을 골라 자막(원문+한국어)으로 연습하고, 영상 구간을 듣는다. 같은 중계 함수로 여자/남자 목소리(단계 1-B)와 넷플릭스 추천(TMDB)도 연다.

**Architecture:** `worker/`의 Cloudflare Worker 하나가 키를 숨기고 외부 서비스(YouTube Data API, 자막 서비스, Azure Speech·Translator, TMDB)를 부른다. 경로·오류·캐시·하루 상한은 `docs/아키텍처-API-ERD.md` 3·5장 그대로다. 외부 호출은 주입한 `fetch`로 해서 가짜 응답으로 테스트한다. 화면은 `services/api.ts`로만 Worker를 부르고, Worker 주소(`VITE_WORKER_ORIGIN`)가 없으면 "중계 서버 연결 전" 안내를 보인다. 영상은 youtube-nocookie 임베드를 postMessage로 조종한다(외부 스크립트를 싣지 않아 CSP를 넓히지 않음).

**Tech Stack:** 단계 3 + Cloudflare Workers(KV), `wrangler`(사용자가 배포)

**Spec:** `docs/기획안.md` 7.4·8·10장, `docs/아키텍처-API-ERD.md` 2.1·3·5장, 와이어프레임 02-B·10

## Global Constraints

- 키는 Worker 비밀값에만. 저장소·화면 코드에 키 문자열이 있으면 안 된다.
- 허용 출처(CORS): `https://jinmiri-dev.github.io`, `http://localhost:5173`, `http://localhost:4173`.
- 하루 상한: 검색 90회, 새 자막 60개, 새 합성 2만 자, 넷플릭스 캐시 하루. 넘으면 429 `QUOTA_EXCEEDED`와 `retryAfter`.
- 외부 서비스 응답 모양(특히 자막 서비스)은 실제 키로 한 번 받아 보고 맞춘다. 어댑터 한 파일에만 둔다.
- 첫 화면 JS 150KB(gzip) 이하.

## Review Focus

1. 자동 자막은 잘게 끊겨 온다. 2~12초 줄로 합쳐져야 하고, 문장부호가 있으면 거기서 끊는다.
2. 한국어 자막이 없으면 번역으로 채우고 `koSource:'auto'`(화면 "자동 번역" 표시). 번역도 실패하면 뜻 없이 연습할 수 있어야 한다.
3. Worker 주소가 없거나 Worker가 죽어도 유튜브 탭이 멈추지 않고 이유를 알린다. 기본 연습·대본은 그대로.
4. 링크 붙여넣기는 검색 한도를 쓰지 않는다. 저장한 영상 목록도 한도를 쓰지 않는다.
5. 영상 구간 재생: 줄 시작으로 가서 재생하고 끝에서 멈춘다. 0.75배·다시 듣기.

---

### Task 1: Worker 뼈대 — 공통(CORS·오류·상한·캐시)과 `/health`
`worker/src/{index,http,quota,cache}.ts`, `worker/wrangler.toml`, 테스트. `Env = { KV; YOUTUBE_API_KEY; TRANSCRIPT_API_KEY; AZURE_SPEECH_KEY; AZURE_SPEECH_REGION; AZURE_TRANSLATOR_KEY; AZURE_TRANSLATOR_REGION; TMDB_TOKEN; ALLOWED_ORIGINS }`. 테스트: 허용 출처만 CORS, 오류 형식, 상한 넘으면 429와 헤더, 모르는 경로 404.

### Task 2: `/search`
YouTube `search.list`(videoCaption=closedCaption, videoEmbeddable=true, relevanceLanguage) + `videos.list`(길이). 태그 검색어 표(언어×태그). 캐시 1시간. 테스트: 응답 모양, 캐시 적중 시 상한 안 씀, ISO 8601 길이.

### Task 3: `/transcript`
자막 서비스 어댑터(SearchAPI `youtube_transcripts`), 언어 코드(zh→zh-Hans·zh-CN, tw→zh-Hant·zh-TW), 사람 자막 우선, 자동 자막 줄 합치기(2~12초), 한국어 자막 짝짓기, 없으면 Azure Translator. 404 `NO_TRACK`, 캐시 30일. 테스트: 합치기·짝짓기·번역 대신하기·실패.

### Task 4: `/tts`·`/netflix`
Azure Speech REST(SSML, 언어별 여자·남자 목소리 표), 캐시 영구, 300자 상한. TMDB Discover(넷플릭스 8, KR, 원어, tw/zh 제작 국가), 직접 고른 표시 붙이기, 출처 문구. 테스트: SSML 이스케이프, 목소리 표, TMDB 매핑.

### Task 5: 화면 — `services/api.ts`, 유튜브 탭, 저장한 영상
API 클라이언트(주소 없음·오류 코드 처리), 유튜브 탭(입력 하나: 검색어 또는 링크, 태그 줄, 저장한 영상 n, 결과 카드·저장 버튼), 영상 고르면 자막 확인 → 재료(`kind:'youtube'`) 저장 → 학습. 상태 안내(한도·자막 없음·재생 막힘·실패·연결 전). 저장소 `saved` API. 테스트: 링크 판별, 오류→안내 문구, 저장 목록.

### Task 6: 학습 화면 영상과 듣기
`components/YouTubePlayer.tsx`(nocookie 임베드 + postMessage: 이동·재생·멈춤·빠르기·현재 시각), 줄 구간 재생과 다시 듣기, 휴대폰은 작게. 듣기는 Worker `/tts` 먼저, 실패하면 기기 음성("기기 목소리로 읽고 있어요"). 넷플릭스 패널은 `/netflix` 결과를 앞에 붙임. 테스트: 명령 메시지 모양, 구간 끝에서 멈춤 계산, 듣기 대신하기.

### Task 7: 점검·배포·설정 안내
lint·test·build, CSP 확인, 브라우저 점검(가짜 Worker로 흐름), `docs/직접-해야-할-일.md`에 Worker 배포·비밀값 명령 정리, 배포.
