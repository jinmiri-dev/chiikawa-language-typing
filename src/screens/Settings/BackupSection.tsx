import { useState } from 'react'
import { useApp } from '../../app/AppState'
import { StatusNotice, Sentences } from '../../components/components'
import { conflicts, downloadBackup, importBackup } from '../../services/backup'

/** 설정 › 기록 지키기: 백업 파일 받기·올리기 (기획안 16장) */
export default function BackupSection() {
  const { store } = useApp()
  const [msg, setMsg] = useState<{ title: string; tone: 'info' | 'warn' } | null>(null)
  const [pending, setPending] = useState<{ file: unknown; clash: number } | null>(null)

  async function pick(f: File | undefined) {
    if (!f) return
    let file: unknown
    try {
      file = JSON.parse(await f.text())
    } catch {
      setMsg({ title: '백업 파일을 읽지 못했어요. 언어 1급에서 받은 .json 파일인지 확인해 주세요.', tone: 'warn' })
      return
    }
    const clash = await conflicts(store, file)
    if (clash) setPending({ file, clash })
    else await apply(file, 'overwrite')
  }

  async function apply(file: unknown, mode: 'overwrite' | 'keepBoth') {
    setPending(null)
    const r = await importBackup(store, file, mode)
    setMsg(
      r.ok
        ? { title: `복원했어요 · 재료 ${r.counts.materials}개, 단어 ${r.counts.words}개, 진도 ${r.counts.progress}개`, tone: 'info' }
        : { title: r.reason, tone: 'warn' },
    )
  }

  return (
    <section aria-label="기록 지키기">
      <h2>기록 지키기</h2>
      <p className="set-sub backup-lead"><Sentences text="기록은 이 브라우저에만 저장돼요. 다른 기기로 옮기거나 지워질 때를 대비해 백업 파일을 받아 두세요." /></p>
      <div className="backup-actions">
        <button type="button" className="btn btn-sub" onClick={() => void downloadBackup(store).then(() => setMsg({ title: '백업 파일을 받았어요.', tone: 'info' }))}>
          백업 파일 받기
        </button>
        <label className="btn btn-sub">
          백업 파일 올리기
          <input type="file" accept=".json,application/json" hidden onChange={(e) => void pick(e.target.files?.[0])} />
        </label>
      </div>
      {pending && (
        <StatusNotice title={`같은 연습이 ${pending.clash}개 있어요. 어떻게 할까요?`} tone="warn">
          <div className="backup-actions">
            <button type="button" className="btn btn-sub" onClick={() => void apply(pending.file, 'overwrite')}>
              덮어쓰기
            </button>
            <button type="button" className="btn btn-sub" onClick={() => void apply(pending.file, 'keepBoth')}>
              둘 다 두기
            </button>
          </div>
        </StatusNotice>
      )}
      {msg && <StatusNotice title={msg.title} tone={msg.tone} />}
    </section>
  )
}
