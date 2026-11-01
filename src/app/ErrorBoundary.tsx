import { Component, type ReactNode } from 'react'

/** 화면 하나가 멈춰도 흰 화면 대신 "다시 시도 / 처음으로"를 보여 준다 (프론트-설계 12장). 기록은 줄마다 저장돼 있어 잃지 않는다. */
export default class ErrorBoundary extends Component<{ children: ReactNode; resetKey: string }, { failed: boolean; key: string }> {
  state = { failed: false, key: this.props.resetKey }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  static getDerivedStateFromProps(props: { resetKey: string }, state: { failed: boolean; key: string }) {
    // 다른 화면으로 가면 다시 그려 본다
    return props.resetKey !== state.key ? { failed: false, key: props.resetKey } : null
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="app">
        <section className="center" role="alert">
          <h1>화면을 그리지 못했어요</h1>
          <p>지금까지 친 기록은 저장돼 있어요.</p>
          <button type="button" className="btn btn-sub" onClick={() => this.setState({ failed: false })}>
            다시 시도
          </button>{' '}
          <a className="btn btn-sub" href="#/">
            처음으로
          </a>
        </section>
      </main>
    )
  }
}
