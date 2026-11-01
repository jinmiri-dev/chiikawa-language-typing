import { useState } from 'react'
import { Sheet } from '../../components/components'
import { LAYOUT_LABEL, type Layout } from '../../engine/layouts'
import type { LayoutId } from '../../engine/types'

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
