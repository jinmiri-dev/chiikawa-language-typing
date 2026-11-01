import { useMemo, useState } from 'react'
import { useApp } from '../../app/AppState'
import { href } from '../../app/routes'
import { AppHeader, StatusNotice } from '../../components/components'
import { LANG_NAME } from '../../engine/lang'
import { readShare } from '../../services/backup'
import '../pages.css'

/** 공유 링크로 받은 연습 (기획안 16장) */
export default function Share({ data }: { data: string }) {
  const { store } = useApp()
  const m = useMemo(() => readShare(data), [data])
  const [saving, setSaving] = useState(false)
  async function add() {
    if (!m) return
    setSaving(true)
    await store.saveMaterial(m)
    location.hash = href({ name: 'study', materialId: m.id })
  }
  return (
    <div className="page">
      <AppHeader back="#/" />
      <main className="done">
        {m ? (
          <>
            <h1>받은 연습이에요</h1>
            <p className="done-sub">
              {LANG_NAME[m.lang].ko} · {m.title} · {m.lines.length}줄
            </p>
            <ol className="share-preview" lang={LANG_NAME[m.lang].htmlLang}>
              {m.lines.slice(0, 5).map((l) => (
                <li key={l.id}>
                  {l.src} {l.ko && <span className="done-ko">{l.ko}</span>}
                </li>
              ))}
            </ol>
            <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void add()}>
              내 연습에 넣고 시작
            </button>
          </>
        ) : (
          <StatusNotice title="링크를 열지 못했어요" tone="warn">
            주소가 잘렸을 수 있어요. 보낸 사람에게 다시 받거나, 공유 파일로 받아 대본 탭에서 올려 주세요.
          </StatusNotice>
        )}
      </main>
    </div>
  )
}
