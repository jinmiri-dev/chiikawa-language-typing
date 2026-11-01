import { AppHeader } from '../../components/components'
import '../pages.css'

const FAQ: [string, string][] = [
  ['일본어 입력기는 어떻게 켜나요?', 'Windows는 설정 › 시간 및 언어 › 언어에서 일본어를 추가하고 Alt+`로 바꿔요. Mac은 시스템 설정 › 키보드 › 입력 소스에서 일본어를 추가하고 Ctrl+Space로 바꿔요.'],
  ['휴대폰에서는요?', 'iPhone은 설정 › 일반 › 키보드 › 새로운 키보드 추가 › 일본어(가나 또는 로마자), Android는 Gboard 설정 › 언어 › 일본어를 추가해요. 연습 화면의 키보드 버튼에서 같은 배열을 고르면 안내가 맞아요.'],
  ['기록은 어디에 저장되나요?', '로그인 없이 이 브라우저에만 저장돼요. 다른 기기나 다른 브라우저에서는 보이지 않아요. 사생활 보호 모드에서는 창을 닫으면 사라져요.'],
  ['휴대폰 키 안내가 "준비 중"이에요.', '휴대폰 자판은 기기마다 조금씩 달라서, 실제 기기에서 확인한 배열부터 안내를 열어요. 그동안에도 타자와 채점은 그대로 돼요.'],
  ['넷플릭스 이중 자막 대본은 언제 쓸 수 있나요?', '대본 넣기는 다음 단계에서 열려요. 넷플릭스에서 자막 두 개를 켜 두고 대본을 받아 붙여 넣으면 한 줄씩 칠 수 있게 될 거예요.'],
]

export default function Guide() {
  return (
    <div className="page">
      <AppHeader back="#/" />
      <main className="guide-page">
        <h1>이용 안내</h1>
        <ol className="guide-steps">
          <li>
            <b>언어를 골라요.</b> 시작 화면의 언어 카드를 누르면 바로 시작해요.
          </li>
          <li>
            <b>한 줄씩 따라 쳐요.</b> 지금 칠 글자와 누를 키를 노란색으로 알려 줘요.
          </li>
          <li>
            <b>끝까지 치면 1급 카드!</b> 친구가 함께 축하해 줘요.
          </li>
        </ol>
        <h2>자주 묻는 질문</h2>
        {FAQ.map(([q, a]) => (
          <details key={q} className="faq">
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </main>
      <footer className="guide-footer">개발자: 진미리 · 개인 공부와 수업용으로 만든 비공식 팬 사이트예요.</footer>
    </div>
  )
}
