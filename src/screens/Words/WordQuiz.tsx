/**
 * 단어 복습(#/words/<lang>): 담은 낱말을 10개씩, 뜻 고르기(4지선다) → 뜻 보고 직접 쳐 보기.
 * 둘 다 맞히면 1·3·7일 뒤, 하나라도 틀리면 내일 다시. 끝나면 결과와 틀린 단어를 보여 준다.
 */
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useApp } from '../../app/AppState'
import { href } from '../../app/routes'
import { AppHeader, Phrases, Sentences } from '../../components/components'
import { LANG_NAME, type Lang } from '../../engine/lang'
import { choices, dueWords, nextState, quizWords, sameWord, type WordStates } from '../../engine/quiz'
import type { Word } from '../../engine/types'
import { speak } from '../../services/speech'
import './WordQuiz.css'

type Phase = 'choose' | 'type' | 'done'
const key = (lang: Lang) => `wordQuiz:${lang}`

export default function WordQuiz({ lang }: { lang: Lang }) {
  const { store, settings } = useApp()
  const [all, setAll] = useState<Word[] | null>(null)
  const [states, setStates] = useState<WordStates>({})
  const [queue, setQueue] = useState<Word[]>([])
  const [i, setI] = useState(0)
  const [phase, setPhase] = useState<Phase>('choose')
  const [picked, setPicked] = useState<string | null>(null)
  const [typed, setTyped] = useState('')
  const [checked, setChecked] = useState<null | boolean>(null)
  const [wrong, setWrong] = useState<Set<string>>(new Set())
  const htmlLang = LANG_NAME[lang].htmlLang

  useEffect(() => {
    void (async () => {
      const words = await store.listWords(lang)
      const st = (await store.getMeta<WordStates>(key(lang))) ?? {}
      setAll(words)
      setStates(st)
      setQueue(dueWords(words, st, Date.now()))
    })()
  }, [store, lang])

  const word = queue[i]
  const opts = useMemo(() => (word && all ? choices(word, quizWords(all)) : []), [word, all])
  const say = (w: Word) => void speak(w.text, { lang, voice: settings.voice[lang] ?? 'female', rate: 1 })

  async function finishWord(ok: boolean) {
    const st = { ...states, [word.id]: nextState(states[word.id], ok, Date.now()) }
    setStates(st)
    await store.setMeta(key(lang), st)
    if (!ok) setWrong((s) => new Set(s).add(word.id))
    if (i + 1 >= queue.length) setPhase('done')
    else {
      setI(i + 1)
      setPhase('choose')
      setPicked(null)
      setTyped('')
      setChecked(null)
    }
  }

  function choose(m: string) {
    if (picked) return
    setPicked(m)
    if (m !== word.meaning) setWrong((s) => new Set(s).add(word.id))
    say(word)
  }

  function check(e: FormEvent) {
    e.preventDefault()
    if (checked !== null) {
      void finishWord(checked && !wrong.has(word.id))
      return
    }
    const ok = sameWord(typed, word.text)
    setChecked(ok)
    say(word)
  }

  const back = href({ name: 'materials', lang, tab: 'course' })
  if (!all) return null
  return (
    <div className="page">
      <AppHeader back={back} title={<span className="logo-sub">단어 복습 · {LANG_NAME[lang].ko}</span>} />
      <main className="quiz">
        {!queue.length ? (
          <section className="quiz-empty">
            <h1>오늘 복습할 단어가 없어요</h1>
            <p>
              <Sentences
                text={
                  quizWords(all).length
                    ? '담은 단어를 다 외웠거나, 다음 복습 날이 아직이에요. 레슨을 치면서 새 단어를 담아 보세요.'
                    : '연습 화면에서 낱말 뜻 옆의 ☆ 담기를 누르면 여기로 모여요. 뜻과 함께 담긴 단어로 복습해요.'
                }
              />
            </p>
            <a className="btn btn-primary" href={back}>
              레슨 하러 가기
            </a>
          </section>
        ) : phase === 'done' ? (
          <section className="quiz-done">
            <h1>복습 끝!</h1>
            <p className="quiz-score">
              {queue.length - wrong.size} / {queue.length} 맞혔어요
            </p>
            {wrong.size > 0 && (
              <>
                <p className="quiz-sub">틀린 단어는 내일 다시 나와요.</p>
                <ul className="quiz-wrong">
                  {queue
                    .filter((w) => wrong.has(w.id))
                    .map((w) => (
                      <li key={w.id}>
                        <b lang={htmlLang}>{w.text}</b>
                        {w.reading && <span lang={htmlLang}>{w.reading}</span>}
                        <span>{w.meaning}</span>
                      </li>
                    ))}
                </ul>
              </>
            )}
            <a className="btn btn-primary" href={back}>
              코스로 돌아가기
            </a>
          </section>
        ) : (
          <section className="quiz-card" aria-live="polite">
            <p className="quiz-progress">
              {i + 1} / {queue.length} · {phase === 'choose' ? '뜻 고르기' : '직접 쳐 보기'}
            </p>
            <div className="quiz-bar" aria-hidden="true">
              <span style={{ width: `${(i / queue.length) * 100}%` }} />
            </div>
            {phase === 'choose' ? (
              <>
                <button type="button" className="quiz-word" lang={htmlLang} onClick={() => say(word)} aria-label={`${word.text} 듣기`}>
                  {word.text}
                  {word.reading && <small>{word.reading}</small>}
                </button>
                <p className="quiz-ask">이 낱말의 뜻은?</p>
                <div className="quiz-options">
                  {opts.map((m) => (
                    <button
                      key={m}
                      type="button"
                      className="quiz-option"
                      data-state={picked ? (m === word.meaning ? 'right' : m === picked ? 'wrong' : undefined) : undefined}
                      onClick={() => choose(m)}
                      disabled={!!picked}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                {picked && (
                  <>
                    {word.example && (
                      <p className="quiz-example" lang={htmlLang}>
                        <Phrases text={word.example.src} lang={htmlLang} />
                        {word.example.ko && <span lang="ko">{word.example.ko}</span>}
                      </p>
                    )}
                    <button type="button" className="btn btn-primary quiz-next" onClick={() => setPhase('type')} autoFocus>
                      다음: 직접 쳐 보기
                    </button>
                  </>
                )}
              </>
            ) : (
              <form onSubmit={check} className="quiz-type">
                <p className="quiz-meaning">{word.meaning}</p>
                <p className="quiz-ask">
                  {LANG_NAME[lang].ko}로 쳐 보세요{word.reading && checked === null ? ` · 읽기: ${word.reading}` : ''}
                </p>
                <input
                  className="type-input"
                  lang={htmlLang}
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  aria-label="낱말 쳐 보기"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  readOnly={checked !== null}
                  autoFocus
                />
                {checked !== null && (
                  <p className="quiz-result" data-ok={checked || undefined}>
                    {checked ? '맞았어요!' : '아쉬워요. 정답은 '}
                    {!checked && <b lang={htmlLang}>{word.text}</b>}
                  </p>
                )}
                <button type="submit" className="btn btn-primary quiz-next">
                  {checked === null ? '확인' : i + 1 >= queue.length ? '결과 보기' : '다음 단어'} <span className="key-hint">Enter</span>
                </button>
              </form>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
