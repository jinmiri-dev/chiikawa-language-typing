# 단계 2 — 대본 넣기 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 일본어 넷플릭스 이중 자막 대본(붙여넣기·파일)을 넣어 줄을 확인·정리하고 연습한다. 단어를 담아 단어장으로 받고, 틀린 줄과 담은 단어가 오늘의 복습으로 돌아오며, 백업·공유와 효과 기록이 된다.

**Architecture:** 형식 판별·나누기·정리·읽기 만들기·복습 일정·효과 계산은 `src/engine/`의 순수 함수(읽기는 사전을 주입받아 테스트한다). 대본은 `materials` 저장소에 `Material`로 저장하고, 학습·완료 화면은 기본 연습과 저장 재료를 같은 `getMaterial`로 연다. 무거운 것(일본어 사전 17MB, PDF)은 그 기능을 쓸 때만 불러온다.

**Tech Stack:** 단계 1 + `kuromoji`(읽기, Apache-2.0, 사전은 빌드 때 `public/dict`로 복사), `pdfjs-dist`(PDF 글자), `lz-string`(공유 링크)

**Spec:** `docs/기획안.md` 7.1(오늘의 복습)·7.5·7.6·9·13·16·20.2장, `docs/프론트-설계.md` 4~6장, 와이어프레임 02-C·03·06

## Global Constraints

- 단계 1 계획의 Global Constraints 전부.
- 이번 단계의 대본 넣기는 일본어만 연다(읽기 생성이 언어마다 달라 단계 3에서 언어별로 연다). 다른 언어 대본 탭은 "곧 열려요".
- 일본어 사전·PDF 모듈은 첫 화면 JS에 들어가면 안 된다(동적 `import()`). 첫 화면 JS 150KB(gzip) 이하 유지.
- 대본 원문은 사용자가 넣은 것이라 화면에 글자로만 넣는다(HTML 해석 금지). 파일은 브라우저 안에서만 읽고 어디로도 보내지 않는다.
- 넷플릭스 추천: TMDB는 중계 함수(단계 1-B/4)와 키가 필요하다. 이번 단계는 직접 고른 목록(`src/content/netflixPicks.ts`)만 보여 주고, 중계 함수 주소가 생기면 TMDB 결과를 앞에 붙인다.

## Review Focus

1. 넷플릭스 이중 자막을 그대로 붙이면 한 줄에 일본어와 한국어가 함께 있거나, 일본어 줄 다음 한국어 줄이 번갈아 온다. 둘 다 원문·뜻으로 나뉘어야 한다. → Task 2 테스트.
2. `[ため息]`, `(拍手)`, `（笑）`, `男：` 같은 일본어 자막 표시도 영어 표시처럼 빠져야 한다. → Task 2 테스트.
3. 사전이 안 불러와지면(느린 망, 실패) 대본 넣기가 멈추지 않고, 읽기를 "확인 필요"로 둔 채 계속된다. → Task 3 테스트.
4. 백업 파일이 다른 앱 파일이거나 버전이 다르면 아무것도 덮어쓰지 않고 이유를 알린다. → Task 8 테스트.
5. 같은 줄이 복습에서 맞으면 1일→3일→7일→졸업, 틀리면 1일로 돌아간다. 하루 최대 5개. → Task 6 테스트.

---

### Task 1: 재료 저장과 열기
**Files:** Modify `src/services/storage.ts`(+test), Create `src/services/materials.ts`(+test); Modify `Study.tsx`, `Done.tsx`, `Home.tsx`
**Produces:** `Store.getMaterial(id)`, `saveMaterial(m)`, `listMaterials(lang?)`, `deleteMaterial(id)`; `getMaterial(store, id): Promise<Material | null>`(기본 연습 먼저, 없으면 저장소). 대본 재료 id는 `<lang>-s<시각36진수>`.
- [ ] 테스트: 저장·목록·삭제, 메모리 저장소도 같음, `getMaterial`이 `ja-greet`와 저장 재료를 모두 연다. → 구현 → 학습·완료·시작 화면이 `getMaterial`을 쓴다. **Commit** `feat: 대본 재료 저장`

### Task 2: 대본 형식 판별과 나누기·정리
**Files:** Create `src/engine/import/{detect,parse,clean,time}.ts` + `import.test.ts`, 견본 `src/content/fixtures/scripts/*.ts`
**Produces:** `detectFormat(text): 'table'|'csv'|'srt'|'vtt'|'text'`, `parseScript(text, lang, opts?: { koText?: string }): { lines: DraftLine[]; removedCount: number; checkCount: number }`, `DraftLine = { src; ko?; start?; end?; removed?: string[]; flags: ('title'|'no-ko'|'reading')[] }`, `parseTime(s): number | undefined`(초).
- 판별: `WEBVTT` 머리 → vtt, `-->` 시간 줄 → srt, 줄마다 탭 → table, 쉼표 구분 + 따옴표 규칙 → csv, 나머지 text.
- 원문/뜻: 칸이나 줄마다 한글 비율이 높은 쪽이 뜻(9장). 일반 글은 한 줄 안에 일본어+한국어가 있으면 나누고, 일본어 줄 다음 한국어 줄이면 짝짓는다.
- 정리(9장): `[..]`, `(..)`, `（..）`, `♪` 소리 표시와 줄 앞 화자 이름(`MAN:`, `男：`, `（男）`)을 원문에서 빼고 `removed`에 둔다. `-A -B` 대시 대사는 원문·뜻 대시 개수가 같을 때만 나눈다. `NETFLIX`, `제작`, `字幕` 등 제목 줄은 `title` 표시. 원문이 비면 지운다.
- 두 SRT(원문·한국어)는 시간이 겹치는 것끼리 짝짓는다.
- [ ] 테스트: 형식 판별 5종, 넷플릭스식 한 줄 혼합·번갈아 쓰기, 표(시간/원문/번역), SRT·VTT, 두 SRT 합치기, 소리 표시·화자 이름(영어·일본어), 대시 대사, 제목 줄, `3:01`·`00:03:01,000`·`30s` 시간. → 구현. **Commit** `feat: 대본 형식 판별과 정리`

### Task 3: 일본어 읽기 만들기
**Files:** Create `src/engine/reading/ja.ts`(+test), `src/services/jaTokenizer.ts`, `scripts/copy-dict.mjs`; Modify `package.json`(`postinstall`·`prebuild`로 사전 복사), `.gitignore`(`public/dict/`)
**Produces:** `buildJaSegments(text, tokenize: (s) => Token[]): Segment[]`(조각 = 형태소, 읽기는 히라가나, 읽기 없는 한자 조각은 `confident:false`, 조사·조동사는 앞 단어에 붙여 한 단어로), `loadJaTokenizer(): Promise<(s) => Token[]>`(사전 `BASE_URL + 'dict/'`, 실패하면 reject).
- [ ] 테스트(노드에서 실제 사전): `食べた？` → `食べた(たべた)`+`？`; `今日は楽しかった！`의 읽기 `きょう`·`たのしかった`; 가나만이면 원문=읽기; 모르는 한자는 `confident:false`; 토크나이저가 실패하면 `buildDraftMaterial`이 모든 조각을 `confident:false`로 두고 끝난다. **Commit** `feat: 일본어 읽기 만들기`

### Task 4: 대본 탭(넣기)과 넷플릭스 추천
**Files:** Create `src/screens/Materials/ScriptTab.tsx`, `src/services/files.ts`(+test: 파일 이름·형식, PDF 글자 뽑기는 동적 import), `src/content/netflixPicks.ts`
- 와이어프레임 02-C: 큰 붙여넣기 칸, "파일 올리기"(txt·srt·vtt·csv·tsv·pdf, 원문+한국어 SRT 두 개 가능), 제목(비우면 파일 이름·첫 줄), 유튜브 링크(저장만), "나누기" → 초안 재료 저장 → `#/review/<id>`. 사전 불러오는 동안 "일본어 사전을 불러오고 있어요(처음 한 번, 약 17MB)".
- 넷플릭스 추천(일본어): 직접 고른 4작품(한국어 제목, 연도, 드라마/영화, 학습 표시), 누르면 넷플릭스 검색 새 탭(`rel=noopener noreferrer`). 이용 안내에 "넷플릭스 이중 자막 대본 받는 법" 단계 안내.
- [ ] 테스트: 붙여넣기 → 나누기 → 저장 재료에 줄과 뜻, 주소가 `#/review/…`. **Commit** `feat: 대본 넣기와 넷플릭스 추천`

### Task 5: 나눈 결과 확인·정리 화면 (`#/review/:id`)
**Files:** Create `src/engine/import/edit.ts`(+test), `src/screens/Review/Review.tsx`; Modify `routes.ts`(+test)
**Produces:** `mergeUp(lines, i)`, `splitAt(lines, i, pos)`, `shiftKo(lines, from, dir: -1|1)`, `removeLines(lines, idx[])`, `restoreRemoved(line, tag)` — 모두 새 배열.
- 7.6 그대로: 제목 "N줄로 나눴어요 · M줄만 확인하면 바로 연습할 수 있어요", 보기 전체/확인 필요, 표(선택·번호·시간·원문·읽기·뜻), ⚠ 한 줄, 선택하면 도구 줄(위 줄과 합치기·둘로 나누기·뜻 위로·뜻 아래로·삭제), 칸 눌러 고치기, 지운 표시 되살리기, "연습 시작". 휴대폰은 표 대신 줄 카드.
- [ ] 테스트: 편집 함수 5개(뜻 밀기는 마지막 칸이 비고 줄 수 유지), 라우트. **Commit** `feat: 나눈 결과 확인·정리`

### Task 6: 단어 담기, 단어장, 복습 일정
**Files:** Create `src/engine/review/schedule.ts`(+test), `src/engine/words/export.ts`(+test), `src/screens/Study/WordDrawer.tsx`; Modify `storage.ts`(words·review), `Study.tsx`, `Home.tsx`
**Produces:** `schedule(item, correct, now): ReviewItem`(0:1일 1:3일 2:7일 3:졸업, 틀리면 0), `dueToday(items, now, max=5)`, `wordsCsv(words, lines)`, `wordsTxt(words, lines)`.
- 학습 화면: 원문 단어를 누르면 담기(담은 단어 밑줄, 다른 줄에서도), "이 줄 담기", 상단 "단어 N" → 단어장 서랍(06): 단어·발음·뜻(고치기)·나온 줄, 정렬·삭제, TXT·CSV 받기, "담은 줄만 다시 연습"(새 재료).
- 틀린 줄과 담은 단어는 복습 항목이 된다. 시작 화면 다시 방문의 주요 버튼 "오늘의 복습 N개 · 약 3분"(없으면 이어서 공부하기가 주요). 복습은 그 줄들을 묶은 임시 재료로 치고, 줄마다 `schedule`.
- [ ] 테스트: 일정 규칙과 졸업, 하루 5개, CSV 열(단어/발음/뜻/예문/예문 뜻)과 따옴표 처리. **Commit** `feat: 단어장과 오늘의 복습`

### Task 7: 효과 기록
**Files:** Create `src/engine/stats/trend.ts`(+test); Modify `storage.ts`(stats), `Study.tsx`(완료 때 기록), `Home.tsx`
**Produces:** `StatRecord = { id; lang; day: 'YYYY-MM-DD'; avgMs; accuracy }`, `lineSpeedTrend(records, lang, now): { before; after; text } | null`(기록 3개 미만이면 null, 2주 전 이전의 평균 대 최근 평균).
- 기본 연습 세트를 끝낼 때마다 기록. 시작 화면 이어서 공부하기 아래 작게 "일본어 · 2주 전보다 한 줄 3.1초 빨라졌어요".
- [ ] 테스트: 3개 미만 null, 빨라짐 문구, 느려지면 null(자랑할 때만 보인다). **Commit** `feat: 효과 기록`

### Task 8: 백업·복원·공유
**Files:** Create `src/services/backup.ts`(+test), `src/screens/Settings/BackupSection.tsx`; Modify `Done.tsx`(30줄 이상·백업 없음이면 한 번 권함), `Home.tsx`(사파리 홈 화면 추가 안내 한 번), `routes.ts`(`#/share/:data`)
**Produces:** `exportBackup(store): Promise<BackupFile>`, `importBackup(store, file, mode: 'overwrite'|'keepBoth'): Promise<{ ok: true; counts } | { ok: false; reason }>`, `shareLink(m): string | null`(lz 압축 6,000자 이하만), `readShare(data): Material | null`.
- 파일 이름 `language-grade1-backup-YYYYMMDD.json`, 모양은 프론트-설계 6장.
- [ ] 테스트: 내보내고 새 저장소로 복원하면 같다, 다른 앱·다른 버전은 거절하고 아무것도 안 바뀜, 같은 id `keepBoth`면 새 id, 공유 링크 왕복과 너무 길면 null. **Commit** `feat: 백업과 공유`

### Task 9: 흐름 점검과 배포
- [ ] 흐름 테스트: 대본 붙여넣기 → 확인 → 연습 2줄 → 단어 담기 → CSV 내용 → 백업 → 새 저장소에 복원.
- [ ] lint·test·build, 첫 화면 JS 150KB 이하, 사전·PDF가 따로 나뉜 파일인지 확인.
- [ ] 브라우저(PC 1280, 휴대폰 390·390×420): 모든 새 화면 가로 스크롤 없음, 44px, 실제 넷플릭스식 대본 붙여넣기로 사전 불러오기와 읽기 확인. 배포 주소에서 사전 `.gz`가 제대로 풀리는지 확인.
- [ ] 문서(기획안 20장 진행, 보안 점검 기록), 커밋·푸시·Actions 초록.
