import { useEffect, useState } from 'react'
import { useApp } from '../../app/AppState'
import { href } from '../../app/routes'
import { StatusNotice, Sentences } from '../../components/components'
import { buildDraftMaterial } from '../../engine/import/material'
import { parseScript } from '../../engine/import/parse'
import { LANG_NAME, type Lang } from '../../engine/lang'
import type { Material } from '../../engine/types'
import { readShareFile, shareFile, shareLink } from '../../services/backup'
import { downloadText, pairTexts, readScriptFile, titleFrom, youtubeIdFrom } from '../../services/files'
import { LOADING_TEXT, loadSegmenter } from '../../services/segmenter'
import NetflixPanel from './NetflixPanel'
import { newScriptId } from '../../services/materials'

const ACCEPT = '.txt,.srt,.vtt,.csv,.tsv,.pdf,.json,text/plain,application/pdf,application/json'

export default function ScriptTab({ lang }: { lang: Lang }) {
  const { store } = useApp()
  const [text, setText] = useState('')
  const [koPaste, setKoPaste] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [title, setTitle] = useState('')
  const [yt, setYt] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState<Material[]>([])
  const [shared, setShared] = useState('')
  useEffect(() => {
    void store.listMaterials(lang).then((list) => setSaved(list.filter((m) => m.kind === 'script')))
  }, [store, lang])

  async function split() {
    setError('')
    try {
      setBusy('대본을 읽고 있어요…')
      // 공유 파일(.json)이면 그대로 연습에 넣는다
      if (files.length === 1 && /\.json$/i.test(files[0].name)) {
        const shared = readShareFile(JSON.parse(await files[0].text()))
        if (!shared) {
          setError('언어 1급 공유 파일이 아니에요. 백업 파일은 설정에서 올려 주세요.')
          return
        }
        await store.saveMaterial(shared)
        location.hash = href({ name: 'study', materialId: shared.id })
        return
      }
      const texts = files.length ? await Promise.all(files.slice(0, 2).map(readScriptFile)) : [text, koPaste].filter((t) => t.trim())
      const { text: src, koText } = pairTexts(texts, lang)
      const parsed = parseScript(src, lang, { koText })
      if (!parsed.lines.length) {
        setError('대본에서 줄을 찾지 못했어요. 한 줄에 한 문장씩 붙여 넣어 보세요.')
        return
      }
      if (LOADING_TEXT[lang]) setBusy(LOADING_TEXT[lang]!)
      const segment = await loadSegmenter(lang).catch(() => null)
      const m = buildDraftMaterial({
        id: newScriptId(lang),
        lang,
        title: title.trim() || titleFrom({ fileName: files[0]?.name, text: parsed.lines[0].src }),
        lines: parsed.lines,
        segment,
        youtubeId: youtubeIdFrom(yt),
      })
      await store.saveMaterial(m)
      location.hash = href({ name: 'review', materialId: m.id })
    } catch {
      setError('대본을 읽지 못했어요. 파일 형식을 확인하거나 글을 붙여 넣어 보세요.')
    } finally {
      setBusy('')
    }
  }

  async function share(m: Material) {
    const data = shareLink(m)
    if (data) {
      const url = `${location.origin}${location.pathname}${href({ name: 'share', data })}`
      try {
        await navigator.clipboard.writeText(url)
        setShared(`"${m.title}" 공유 링크를 복사했어요. 받은 사람은 링크를 열면 바로 연습할 수 있어요.`)
        return
      } catch {
        /* 복사가 막히면 파일로 */
      }
    }
    downloadText(`언어1급-공유-${m.title}.json`, shareFile(m))
    setShared(`"${m.title}" 공유 파일을 받았어요. 받은 사람은 대본 탭에서 파일을 올리면 돼요.`)
  }

  async function remove(id: string) {
    await store.deleteMaterial(id)
    setSaved((s) => s.filter((m) => m.id !== id))
  }

  return (
    <div className="script-tab">
      <section className="script-input">
        <p className="materials-lead"><Sentences text="넷플릭스 이중 자막 대본이나 내 대본을 넣으면 한 줄씩 나눠 드려요. 형식은 자동으로 알아봐요." /></p>
        <textarea
          className="script-paste"
          aria-label="대본 붙여넣기"
          lang={LANG_NAME[lang].htmlLang}
          placeholder={'예)\nおはよう！ 좋은 아침!\n元気？ 잘 지내?'}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!!files.length}
        />
        <details className="script-yt-help">
          <summary>유튜브 자막을 무료로 가져오는 법</summary>
          <ol>
            <li>유튜브에서 영상을 열고, 설명란 아래의 <b>스크립트 표시</b>를 눌러요.</li>
            <li>오른쪽에 나온 스크립트를 처음부터 끝까지 끌어 복사해 위 칸에 붙여 넣어요. 시간(0:04)도 같이 복사되면 영상과 줄이 맞춰져요.</li>
            <li>스크립트 언어를 한국어로 바꿀 수 있으면, 한 번 더 복사해 아래 한국어 칸에 넣어요. 뜻이 줄마다 붙어요.</li>
            <li>아래 유튜브 링크 칸에 영상 주소를 넣으면 연습할 때 영상이 같이 나와요.</li>
          </ol>
        </details>
        <textarea
          className="script-paste script-paste-ko"
          aria-label="한국어 자막 붙여넣기(있으면)"
          lang="ko"
          placeholder={'한국어 자막 (있으면)\n0:00\n좋은 아침!'}
          value={koPaste}
          onChange={(e) => setKoPaste(e.target.value)}
          disabled={!!files.length}
        />
        <div className="script-files">
          <label className="btn btn-sub">
            파일 올리기
            <input type="file" accept={ACCEPT} multiple hidden onChange={(e) => setFiles([...(e.target.files ?? [])])} />
          </label>
          <span className="script-files-note">
            {files.length ? files.map((f) => f.name).join(', ') : 'txt·srt·vtt·csv·pdf, 원문과 한국어 SRT 두 개도 돼요'}
          </span>
          {files.length > 0 && (
            <button type="button" className="btn btn-sub" onClick={() => setFiles([])}>
              파일 빼기
            </button>
          )}
        </div>
        <label className="field">
          <span>제목 (비우면 파일 이름이나 첫 줄)</span>
          <input className="field-input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="field">
          <span>유튜브 링크 (있으면)</span>
          <input className="field-input" inputMode="url" value={yt} onChange={(e) => setYt(e.target.value)} placeholder="https://youtu.be/…" />
        </label>
        {error && <StatusNotice title={error} tone="warn" />}
        {busy && <p className="busy" aria-live="polite">{busy}</p>}
        <button type="button" className="btn btn-primary" disabled={!!busy || (!text.trim() && !files.length)} onClick={() => void split()}>
          나누기
        </button>

        {saved.length > 0 && (
          <section className="saved-scripts" aria-label="넣어 둔 대본">
            <h2>넣어 둔 대본</h2>
            <ul>
              {saved.map((m) => (
                <li key={m.id}>
                  <a href={href({ name: 'study', materialId: m.id })}>
                    <b>{m.title}</b> <span>{m.lines.length}줄</span>
                  </a>
                  <a className="btn btn-sub" href={href({ name: 'review', materialId: m.id })}>
                    정리
                  </a>
                  <button type="button" className="btn btn-sub" onClick={() => void share(m)}>
                    공유
                  </button>
                  <button type="button" className="btn btn-sub" onClick={() => void remove(m.id)} aria-label={`${m.title} 지우기`}>
                    지우기
                  </button>
                </li>
              ))}
            </ul>
            {shared && <p className="busy" aria-live="polite"><Sentences text={shared} /></p>}
          </section>
        )}
      </section>
      <NetflixPanel lang={lang} />
    </div>
  )
}
