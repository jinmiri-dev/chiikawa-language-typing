/**
 * 일본어 초보 코스·상황별 예문의 읽기(후리가나 조각)를 미리 만들어 둔다.
 * 그래야 코스 레슨을 열 때 17MB 일본어 사전을 받지 않아도 된다(느린 휴대폰에서 1분 넘게 걸리던 것).
 * 앱과 같은 규칙(buildJaSegments, 日本 → にほん 보정 등)을 쓰므로 결과가 똑같다.
 * 실행: npx tsx scripts/build-readings.ts  (코스·예문 문장을 바꾸면 다시 실행. 시험이 빠진 문장을 알려 준다)
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import kuromoji from 'kuromoji'
import { buildJaSegments, type JaToken } from '../src/engine/reading/ja'
import { packSegments } from '../src/content/readings/pack'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const tokenizer = await new Promise<{ tokenize(s: string): JaToken[] }>((ok, fail) =>
  kuromoji.builder({ dicPath: join(root, 'node_modules', 'kuromoji', 'dict') }).build((err, t) => (err ? fail(err) : ok(t as never))),
)

const srcs = new Set<string>()
const course = JSON.parse(readFileSync(join(root, 'src/content/course/ja.json'), 'utf8')) as { letters: { lines: [string, string][] }[]; weeks: { lessons: [string, string][][] }[] }
for (const l of course.letters) for (const [s] of l.lines) srcs.add(s)
for (const w of course.weeks) for (const les of w.lessons) for (const [s] of les) srcs.add(s)
const practice = JSON.parse(readFileSync(join(root, 'src/content/practice/ja.json'), 'utf8')) as { situations: Record<string, [string, string][]>; twisters: [string, string, unknown?][] }
for (const lines of Object.values(practice.situations)) for (const [s] of lines) srcs.add(s)
for (const [s] of practice.twisters) srcs.add(s)

const out: Record<string, ReturnType<typeof packSegments>> = {}
for (const s of [...srcs].sort()) out[s] = packSegments(buildJaSegments(s, (t) => tokenizer.tokenize(t)))
writeFileSync(join(root, 'src/content/readings/ja.json'), JSON.stringify(out))
console.log('일본어 읽기 미리 만듦:', Object.keys(out).length, '줄')
