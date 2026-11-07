import { expect, test } from 'vitest'
import { safeLink } from './url'

test('http·https 주소만 링크로', () => {
  expect(safeLink('https://www3.nhk.or.jp/a1')).toBe('https://www3.nhk.or.jp/a1')
  expect(safeLink('http://example.com/x')).toBe('http://example.com/x')
  expect(safeLink('javascript:alert(1)')).toBeUndefined()
  expect(safeLink(' JavaScript:alert(1)')).toBeUndefined()
  expect(safeLink('data:text/html,<script>alert(1)</script>')).toBeUndefined()
  expect(safeLink('/relative')).toBeUndefined()
  expect(safeLink(42)).toBeUndefined()
})
