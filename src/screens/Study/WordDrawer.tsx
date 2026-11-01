import { useState } from 'react'
import { useApp } from '../../app/AppState'
import { href } from '../../app/routes'
import { Sheet } from '../../components/components'
import { LANG_NAME, type Lang } from '../../engine/lang'
import type { Word } from '../../engine/types'
import { wordsCsv, wordsTxt } from '../../engine/words/export'
import { downloadText } from '../../services/files'
import { buildSavedLinesMaterial } from '../../services/review'


const today = () => new Date().toISOString().slice(0, 10).replace(/-/g, '')

/** 단어장 (와이어프레임 06): 단어·발음·뜻(고치기)·나온 줄, 정렬·삭제, 내려받기, 담은 줄만 다시 연습 */
export default function WordDrawer(props: {
  open: boolean
  lang: Lang
  words: Word[]
  onClose: () => void
  onChange: (w: Word) => void
  onDelete: (id: string) => void
}) {
  const { store } = useApp()
  const [sort, setSort] = useState<'recent' | 'abc'>('recent')
  const list = [...props.words].sort((a, b) => (sort === 'abc' ? a.text.localeCompare(b.text, LANG_NAME[props.lang].htmlLang) : (b.savedAt ?? 0) - (a.savedAt ?? 0)))
  const htmlLang = LANG_NAME[props.lang].htmlLang

  async function practice() {
    const m = await buildSavedLinesMaterial(store, props.lang, props.words)
    if (m) location.hash = href({ name: 'study', materialId: m.id })
  }

  return (
    <Sheet open={props.open} onClose={props.onClose} title={`${LANG_NAME[props.lang].ko} 단어장 ${props.words.length}`}>
      {list.length === 0 ? (
        <p className="sheet-desc">연습 중에 원문 단어를 누르면 여기에 담겨요. 담은 단어가 나온 줄은 오늘의 복습에도 들어가요.</p>
      ) : (
        <>
          <div className="words-bar">
            <select className="btn btn-sub" aria-label="정렬" value={sort} onChange={(e) => setSort(e.target.value as 'recent' | 'abc')}>
              <option value="recent">담은 순</option>
              <option value="abc">글자 순</option>
            </select>
            <button type="button" className="btn btn-sub" onClick={() => downloadText(`언어1급-단어장-${today()}.csv`, wordsCsv(list), 'text/csv;charset=utf-8')}>
              CSV 받기
            </button>
            <button type="button" className="btn btn-sub" onClick={() => downloadText(`언어1급-단어장-${today()}.txt`, wordsTxt(list), 'text/plain;charset=utf-8')}>
              TXT 받기
            </button>
          </div>
          <ul className="words-list">
            {list.map((w) => (
              <li key={w.id}>
                <div className="word-head">
                  <b lang={htmlLang}>{w.text}</b>
                  {w.reading && <span lang={htmlLang}>{w.reading}</span>}
                  <button type="button" className="icon-btn" aria-label={`${w.text} 빼기`} onClick={() => props.onDelete(w.id)}>
                    ×
                  </button>
                </div>
                {!w.wholeLine && (
                  <input
                    className="field-input"
                    aria-label={`${w.text} 뜻`}
                    placeholder={w.example?.ko ? `뜻 적기 (참고: ${w.example.ko})` : '뜻 적기'}
                    defaultValue={w.meaning ?? ''}
                    onBlur={(e) => e.target.value !== (w.meaning ?? '') && props.onChange({ ...w, meaning: e.target.value.trim() || undefined })}
                  />
                )}
                {w.example && (
                  <p className="word-example">
                    {!w.wholeLine && <span lang={htmlLang}>{w.example.src}</span>}
                    {w.example.ko && <span>{w.example.ko}</span>}
                  </p>
                )}
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn-primary sheet-go" onClick={() => void practice()}>
            담은 줄만 다시 연습
          </button>
        </>
      )}
    </Sheet>
  )
}
