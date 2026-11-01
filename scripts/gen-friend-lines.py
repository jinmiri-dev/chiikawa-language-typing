"""docs/캐릭터-말투.md 의 표를 읽어 src/content/friendLines.data.ts 를 만든다.
문구는 문서가 원본이다. 문서를 고치면 이 스크립트를 다시 돌린다.

    python scripts/gen-friend-lines.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOC = (ROOT / 'docs' / '캐릭터-말투.md').read_text(encoding='utf-8')
OUT = ROOT / 'src' / 'content' / 'friendLines.data.ts'

NAMES = {'치이카와': 'chiikawa', '하치와레': 'hachiware', '우사기': 'usagi', '모몽가': 'momonga',
         '쿠리만쥬': 'kurimanju', '시사': 'shisa', '랏코': 'rakko', '카니': 'kani'}


def section(title_re):
    m = re.search(title_re, DOC, re.M)
    rest = DOC[m.end():]
    end = re.search(r'^## ', rest, re.M)
    return rest[: end.start()] if end else rest


def rows(block):
    for line in block.splitlines():
        if line.startswith('|') and not re.match(r'^\|\s*-', line):
            yield [c.strip() for c in line.strip().strip('|').split('|')]


def parse_line(s):
    m = re.match(r'^(.*?)\s*\(([^)]*)\)\s*$', s)
    return {'text': m.group(1), 'action': m.group(2)} if m else {'text': s}


# 3장: 상황별 문구
situations = {}
for part in re.split(r'^### ', section(r'^## 3\. '), flags=re.M)[1:]:
    name = part.splitlines()[0].strip()
    fid = NAMES[name]
    situations[fid] = {}
    for cells in rows(part):
        if cells[0] in ('상황',):
            continue
        situations[fid][cells[0]] = [parse_line(x.strip()) for x in cells[1].split(' · ')]

# 2-B장: 5분 단계 포즈와 말풍선
stages = {}
for part in re.split(r'^### ', section(r'^## 2-B\. '), flags=re.M)[1:]:
    name = part.split(' (')[0].strip()
    fid = NAMES[name]
    stages[fid] = [{'pose': c[1], 'line': c[2]} for c in rows(part) if c[0] != '시간']

# 4장: 소개
info = {}
for c in rows(section(r'^## 4\. ')):
    if c[0] in NAMES:
        info[NAMES[c[0]]] = {'name': c[0], 'intro': c[1], 'preview': c[2]}

dump = lambda v: json.dumps(v, ensure_ascii=False, indent=2)
OUT.write_text(
    '// 자동 생성: python scripts/gen-friend-lines.py (원본: docs/캐릭터-말투.md). 직접 고치지 않는다.\n'
    "import type { FriendId } from '../engine/types'\n"
    "import type { FriendLine, Situation } from './friendLines'\n\n"
    f'export const SITUATION_LINES: Record<FriendId, Record<Situation, FriendLine[]>> = {dump(situations)}\n\n'
    f'export const STAGE_LINES: Record<FriendId, {{ pose: string; line: string }}[]> = {dump(stages)}\n\n'
    f'export const FRIEND_INFO: Record<FriendId, {{ name: string; intro: string; preview: string }}> = {dump(info)}\n',
    encoding='utf-8', newline='\n')
print('friends', len(situations), 'stages', {k: len(v) for k, v in stages.items()})
