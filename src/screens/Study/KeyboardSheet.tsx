import { useRef, useState } from 'react'
import { Sheet } from '../../components/components'
import { recommendLayout } from '../../engine/ja/detect'
import { ro } from '../../engine/josa'
import { LAYOUT_LABEL, type Layout } from '../../engine/layouts'
import type { LayoutId } from '../../engine/types'

/** 휴대폰 10초 확인: か 를 한 번 치게 하고 조합 모양으로 배열을 추천한다 */
function QuickCheck({ onResult }: { onResult: (id: LayoutId | null) => void }) {
  const samples = useRef<string[]>([])
  const [msg, setMsg] = useState('')
  const finish = (value: string) => {
    const id = recommendLayout('ja', { compositionSamples: samples.current, keydownKeys: [], finalValue: value })
    setMsg(id ? `✓ ${LAYOUT_LABEL[id].name}${ro(LAYOUT_LABEL[id].name)} 보여요` : '잘 모르겠어요. 아래에서 직접 골라 주세요.')
    onResult(id)
  }
  return (
    <div className="quick-check">
      <label htmlFor="quick-check-input">
        <b>10초 확인</b> <span lang="ja">か</span>를 한 번 쳐 보세요
      </label>
      <input
        id="quick-check-input"
        className="type-input"
        lang="ja"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        onCompositionUpdate={(e) => samples.current.push(e.data)}
        onCompositionEnd={(e) => finish(e.currentTarget.value)}
        onChange={(e) => {
          if (!(e.nativeEvent as InputEvent).isComposing && e.target.value) finish(e.target.value)
        }}
      />
      {msg && (
        <p className="quick-check-msg" aria-live="polite">
          {msg}
        </p>
      )}
    </div>
  )
}

/** 키보드 고르기 (기획안 11.5) */
export default function KeyboardSheet(props: {
  open: boolean
  device: 'pc' | 'mobile'
  current: LayoutId
  layouts: Layout[]
  onClose: () => void
  onPick: (id: LayoutId) => void
}) {
  const [picked, setPicked] = useState<LayoutId>(props.current)
  return (
    <Sheet open={props.open} onClose={props.onClose} title="일본어 키보드 고르기">
      <p className="sheet-desc">지금 쓰는 {props.device === 'mobile' ? '휴대폰' : 'PC'} 키보드와 같아야 안내가 맞아요.</p>
      {props.device === 'mobile' && <QuickCheck onResult={(id) => id && setPicked(id)} />}
      <div role="radiogroup" aria-label="키보드" className="layout-list">
        {props.layouts.map((l) => (
          <button key={l.id} type="button" role="radio" aria-checked={picked === l.id} className="layout-item" onClick={() => setPicked(l.id)}>
            <b>{LAYOUT_LABEL[l.id].name}</b>
            <span>{LAYOUT_LABEL[l.id].desc}</span>
            {!l.verified && <span className="chip">안내 준비 중</span>}
          </button>
        ))}
      </div>
      <button type="button" className="btn btn-primary sheet-go" onClick={() => props.onPick(picked)}>
        이 키보드로 연습
      </button>
    </Sheet>
  )
}
