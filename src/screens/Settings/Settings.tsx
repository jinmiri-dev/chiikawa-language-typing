import { useApp } from '../../app/AppState'
import { AppHeader, FriendImage, Sentences } from '../../components/components'
import { FRIEND_INFO } from '../../content/friendLines'
import { LANG_NAME, LANGS } from '../../engine/lang'
import { LAYOUT_LABEL, layoutsFor } from '../../engine/layouts'
import type { LayoutId, Settings as S } from '../../engine/types'
import BackupSection from './BackupSection'
import '../pages.css'

function Toggle({ label, sub, on, onChange }: { label: string; sub?: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="set-row">
      <span className="set-text">
        <span>{label}</span>
        {sub && <span className="set-sub"><Sentences text={sub} /></span>}
      </span>
      <input type="checkbox" role="switch" className="switch" checked={on} onChange={(e) => onChange(e.target.checked)} />
    </label>
  )
}

function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <label className="set-row">
      <span className="set-text">{label}</span>
      <select className="btn btn-sub" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  )
}

export default function Settings() {
  const { settings: s, setSettings: set } = useApp()
  const show = (k: keyof S['show']) => (v: boolean) => set({ show: { ...s.show, [k]: v } })
  return (
    <div className="page">
      <AppHeader back="#/" />
      <main className="settings">
        <h1>설정</h1>
        <section aria-label="키보드">
          <h2>키보드</h2>
          <Choice label="기기" value={s.device} options={[['auto', '자동으로 알아보기'], ['pc', 'PC'], ['mobile', '휴대폰']]} onChange={(device) => set({ device })} />
          {LANGS.map((lang) => {
            const all = [...layoutsFor(lang, 'pc'), ...layoutsFor(lang, 'mobile')]
            return (
              <Choice<LayoutId | ''>
                key={lang}
                label={`${LANG_NAME[lang].ko} 키보드`}
                value={s.layout[lang] ?? ''}
                options={[['', '자동(기기에 맞게)'], ...all.map((l): [LayoutId, string] => [l.id, `${LAYOUT_LABEL[l.id].name}${l.verified ? '' : ' · 안내 준비 중'}`])]}
                onChange={(id) => set({ layout: { ...s.layout, [lang]: id || undefined } })}
              />
            )
          })}
          <Toggle label="안내 줄이기" sub="같은 글자를 3번 맞히면 안내가 줄어요. 멈추거나 틀리면 다시 나와요." on={s.hintFading} onChange={(hintFading) => set({ hintFading })} />
        </section>
        <section aria-label="보기">
          <h2>보기</h2>
          <Toggle label="한국어 뜻 보기" on={s.show.ko} onChange={show('ko')} />
          <Toggle label="발음(읽기) 보기" on={s.show.reading} onChange={show('reading')} />
          <Toggle label="원문 보기" sub="끄면 받아쓰기처럼 연습해요." on={s.show.src} onChange={show('src')} />
          <Toggle label="엄격하게 채점" sub="문장부호와 띄어쓰기까지 맞아야 해요." on={s.strict} onChange={(strict) => set({ strict })} />
        </section>
        <section aria-label="듣기">
          <h2>듣기</h2>
          <Toggle label="줄 시작할 때 자동으로 듣기" on={s.autoListen} onChange={(autoListen) => set({ autoListen })} />
          <Choice
            label="목소리 (모든 언어)"
            value={s.voice.ja ?? 'female'}
            options={[['female', '여자 목소리'], ['male', '남자 목소리']]}
            onChange={(v) => set({ voice: Object.fromEntries(LANGS.map((l) => [l, v])) })}
          />
          <Choice label="빠르기" value={String(s.rate) as '1' | '0.75'} options={[['1', '보통'], ['0.75', '0.75배']]} onChange={(v) => set({ rate: v === '1' ? 1 : 0.75 })} />
        </section>
        <BackupSection />
        <section aria-label="친구">
          <h2>친구</h2>
          <a className="set-row set-link" href="#/friend">
            <FriendImage friend={s.friend} size={56} />
            <span className="set-text">
              함께하는 친구 <b>{FRIEND_INFO[s.friend].name}</b>
            </span>
            <span aria-hidden="true">›</span>
          </a>
          <Toggle label="캐릭터 움직임 줄이기" sub="말풍선이 꼭 필요할 때만 나와요." on={s.reduceMotion} onChange={(reduceMotion) => set({ reduceMotion })} />
        </section>
      </main>
    </div>
  )
}
