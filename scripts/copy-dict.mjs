// kuromoji 일본어 사전(약 17MB)을 public/dict 로 복사한다. 저장소에는 넣지 않고 설치·빌드 때마다 복사한다.
import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const from = join(root, 'node_modules', 'kuromoji', 'dict')
const to = join(root, 'public', 'dict')
if (!existsSync(from)) {
  console.warn('kuromoji 사전이 없어 복사하지 않았어요:', from)
  process.exit(0)
}
mkdirSync(to, { recursive: true })
cpSync(from, to, { recursive: true })
console.log('일본어 사전 복사:', to)
