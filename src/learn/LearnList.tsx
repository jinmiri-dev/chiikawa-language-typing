/** 외국인 한국어 배우기: 모국어 고르기(#/learn), 영상 목록(#/learn/<모국어>) */
import { useEffect, useState, type FormEvent } from 'react'
import { useApp } from '../app/AppState'
import { href } from '../app/routes'
import { AppHeader, FriendImage, Phrases } from '../components/components'
import { LEARN_VIDEOS, SITUATIONS, thumbOf, type Situation } from '../content/learnVideos'
import { LANGS, type Lang } from '../engine/lang'
import { youtubeIdFrom } from '../services/files'
import { speakKo } from '../services/speech'
import { LEARN_BUTTON, LEARN_TEXT } from './i18n'
import { listLearnWords, listSentences, removeLearnWord, setNative, type LearnWord } from './learnStore'
import './learn.css'

const time = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`

export function LearnStart() {
  const { store } = useApp()
  return (
    <div className="page">
      <AppHeader back="#/" title={<span className="logo-sub">{LEARN_BUTTON[0]}</span>} right={<span />} />
      <main className="learn learn-start">
        <div className="learn-trio" aria-hidden="true">
          <FriendImage friend="chiikawa" size={72} />
          <FriendImage friend="hachiware" size={72} />
          <FriendImage friend="usagi" size={72} />
        </div>
        <h1 className="learn-multi">
          {LANGS.map((l, i) => (
            <span key={l} lang={LEARN_TEXT[l].htmlLang}>
              {i > 0 && <span aria-hidden="true"> · </span>}
              <span className="nowrap">{LEARN_BUTTON[i]}</span>
            </span>
          ))}
        </h1>
        <p className="learn-choose">
          {LANGS.map((l) => (
            <span key={l} lang={LEARN_TEXT[l].htmlLang}>
              {LEARN_TEXT[l].choose}
            </span>
          ))}
        </p>
        <ul className="learn-langs">
          {LANGS.map((l) => (
            <li key={l}>
              <a
                className="learn-lang"
                lang={LEARN_TEXT[l].htmlLang}
                href={href({ name: 'learn-list', native: l })}
                onClick={() => void setNative(store, l)}
              >
                <b>{LEARN_TEXT[l].langName}</b>
                <span>
                  <Phrases text={LEARN_TEXT[l].lead} lang={LEARN_TEXT[l].htmlLang} />
                </span>
              </a>
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}

export function LearnList({ native }: { native: Lang }) {
  const { store } = useApp()
  const t = LEARN_TEXT[native]
  const [tag, setTag] = useState<Situation | null>(null)
  const [link, setLink] = useState('')
  const [saved, setSaved] = useState(0)
  const [words, setWords] = useState<LearnWord[]>([])
  useEffect(() => {
    void setNative(store, native)
    void listSentences(store).then((s) => setSaved(s.length))
    void listLearnWords(store).then(setWords)
  }, [store, native])

  const shown = tag ? LEARN_VIDEOS.filter((v) => v.tags.includes(tag)) : LEARN_VIDEOS
  const usedTags = SITUATIONS.filter((s) => LEARN_VIDEOS.some((v) => v.tags.includes(s)))

  function submit(e: FormEvent) {
    e.preventDefault()
    const id = youtubeIdFrom(link.trim())
    if (id) location.hash = href({ name: 'learn-video', native, videoId: id })
  }

  return (
    <div className="page" lang={t.htmlLang}>
      <AppHeader
        back="#/"
        title={<span className="logo-sub">{t.title}</span>}
        right={
          <>
            <a href={href({ name: 'learn-sheet', native })}>
              {t.worksheet} {saved > 0 && <span className="learn-count">{saved}</span>}
            </a>
            <a href={href({ name: 'learn' })}>{t.change}</a>
          </>
        }
      />
      <main className="learn">
        <h1>{t.title}</h1>
        <p className="page-lead">
          <Phrases text={t.lead} lang={t.htmlLang} />
        </p>
        <div className="learn-tags" role="group" aria-label={t.all}>
          <button type="button" className="chip-btn" aria-pressed={tag === null} onClick={() => setTag(null)}>
            {t.all}
          </button>
          {usedTags.map((s) => (
            <button key={s} type="button" className="chip-btn" aria-pressed={tag === s} onClick={() => setTag(s)}>
              {t.tags[s]}
            </button>
          ))}
        </div>
        <ul className="learn-grid">
          {shown.map((v) => (
            <li key={v.videoId}>
              <a className="learn-card" href={href({ name: 'learn-video', native, videoId: v.videoId })}>
                <span className="learn-thumb">
                  <img src={thumbOf(v.videoId)} alt="" loading="lazy" />
                  <span className="learn-time">{time(v.durationSec)}</span>
                  <span className="learn-kind">{t.kinds[v.kind]}</span>
                </span>
                <b lang="ko">{v.title}</b>
                <span className="learn-meta">
                  {v.tags.map((s) => t.tags[s]).join(' · ')}
                </span>
              </a>
            </li>
          ))}
        </ul>
        <form className="learn-link" onSubmit={submit}>
          <input className="field-input" aria-label={t.pasteLink} placeholder={t.pasteLink} value={link} onChange={(e) => setLink(e.target.value)} />
          <button type="submit" className="btn btn-sub">
            {t.open}
          </button>
        </form>
        {words.length > 0 && (
          <section className="learn-words" aria-label={t.words}>
            <h2>
              {t.words} <span className="learn-count">{words.length}</span>
            </h2>
            <ul>
              {words.map((w) => (
                <li key={w.word}>
                  <button type="button" className="chip-btn" lang="ko" onClick={() => void speakKo(w.word)}>
                    🔊 {w.word}
                  </button>
                  <button
                    type="button"
                    className="learn-x"
                    aria-label={`${w.word} ${t.remove}`}
                    onClick={() => void removeLearnWord(store, w.word).then(() => setWords((list) => list.filter((x) => x.word !== w.word)))}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  )
}
