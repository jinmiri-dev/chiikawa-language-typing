// kuromoji 일본어 사전(약 17MB)을 public/dict 로 복사한다. 저장소에는 넣지 않고 설치·빌드 때마다 복사한다.
// 이름의 .gz 를 .bin 으로 바꾼다: 서버가 .gz 에 Content-Encoding 을 붙여 브라우저가 먼저 풀어 버리는 것을 막는다.
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const from = join(root, 'node_modules', 'kuromoji', 'dict')
const to = join(root, 'public', 'dict')
if (!existsSync(from)) {
  console.warn('kuromoji 사전이 없어 복사하지 않았어요:', from)
  process.exit(0)
}
rmSync(to, { recursive: true, force: true })
mkdirSync(to, { recursive: true })
for (const f of readdirSync(from)) if (f.endsWith('.dat.gz')) copyFileSync(join(from, f), join(to, f.replace(/\.gz$/, '.bin')))
console.log('일본어 사전 복사:', to)
