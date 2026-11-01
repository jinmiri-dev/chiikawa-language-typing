import { useState } from 'react'
import { useApp } from '../../app/AppState'
import { AppHeader, FriendImage } from '../../components/components'
import { FRIEND_INFO, STAGE_LINES } from '../../content/friendLines'
import { ro } from '../../engine/josa'
import { FRIENDS, type FriendId } from '../../engine/types'
import '../pages.css'

function back() {
  if (history.length > 1) history.back()
  else location.hash = '#/'
}

export default function Friend() {
  const { settings, setSettings } = useApp()
  const [picked, setPicked] = useState<FriendId>(settings.friend)
  const info = FRIEND_INFO[picked]
  const choose = (
    <button
      type="button"
      className="btn btn-primary"
      onClick={() => {
        setSettings({ friend: picked })
        back()
      }}
    >
      {info.name}
      {ro(info.name)} 바꾸기
    </button>
  )
  return (
    <div className="page">
      <AppHeader back="#/" right={<span className="logo-sub">지금은 {FRIEND_INFO[settings.friend].name}와 함께해요</span>} />
      <main className="friend-page">
        <section>
          <h1>함께할 친구 바꾸기</h1>
          <p className="page-lead">바꿔도 진도와 연습 시간은 그대로예요. 5분마다 자세가 바뀌고, 끝까지 치면 1급 카드를 함께 받아요.</p>
          <div role="radiogroup" aria-label="친구" className="friend-grid">
            {FRIENDS.map((f) => (
              <button key={f} type="button" role="radio" aria-checked={picked === f} className="friend-card" onClick={() => setPicked(f)}>
                <FriendImage friend={f} size={96} />
                <b>{FRIEND_INFO[f].name}</b>
              </button>
            ))}
          </div>
        </section>
        <aside className="friend-preview" aria-label={`${info.name} 미리보기`}>
          <p className="bubble">
            <b>{info.preview}</b>
          </p>
          <FriendImage friend={picked} size={168} />
          <h2>{info.name}</h2>
          <p className="page-lead">{info.intro}</p>
          <dl className="friend-poses">
            {[1, 6, 12].map((s) => (
              <div key={s}>
                <dt>{s * 5}분</dt>
                <dd>{STAGE_LINES[picked][s].pose}</dd>
              </div>
            ))}
          </dl>
          {choose}
        </aside>
      </main>
      {/* 좁은 화면에서는 고른 뒤 스크롤하지 않아도 바로 누를 수 있게 아래에 붙인다 */}
      <div className="friend-sticky">{choose}</div>
    </div>
  )
}
