import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { FriendImage } from './components'

afterEach(cleanup)

test('그림 파일이 없으면 이름 배지로, 같은 그림은 다시 받지 않는다(하루 종일 써도 404 가 쌓이지 않게)', () => {
  const first = render(<FriendImage friend="usagi" stage={3} size={40} />)
  const img = first.container.querySelector('img')!
  fireEvent.error(img)
  expect(first.container.querySelector('[role="img"]')).toBeTruthy()
  first.unmount()
  const again = render(<FriendImage friend="usagi" stage={3} size={40} />)
  expect(again.container.querySelector('img')).toBeNull()
  expect(again.container.querySelector('[role="img"]')).toBeTruthy()
})
