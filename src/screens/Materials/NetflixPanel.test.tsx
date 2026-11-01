import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import * as api from '../../services/api'
import NetflixPanel from './NetflixPanel'

vi.mock('../../services/api', async (orig) => ({ ...(await orig<typeof import('../../services/api')>()), getNetflix: vi.fn(), workerOrigin: vi.fn() }))
afterEach(cleanup)

test('중계 서버가 있으면 TMDB 작품과 출처 문구', async () => {
  vi.mocked(api.workerOrigin).mockReturnValue('https://w.test')
  vi.mocked(api.getNetflix).mockResolvedValue({
    region: 'KR',
    items: [{ tmdbId: 1, type: 'tv', title: '새 작품', originalTitle: '新作', year: 2025, poster: 'https://image.tmdb.org/t/p/w185/p.jpg', pick: null }],
    attribution: 'This product uses the TMDB API but is not endorsed or certified by TMDB.',
  })
  render(<NetflixPanel lang="tw" />)
  expect(await screen.findByText('새 작품')).toBeTruthy()
  expect(screen.getByText(/This product uses the TMDB API/)).toBeTruthy()
  expect(screen.getByText('상견니')).toBeTruthy() // 직접 고른 작품도 함께
})

test('중계 서버가 없으면 직접 고른 작품만', async () => {
  vi.mocked(api.workerOrigin).mockReturnValue(null)
  render(<NetflixPanel lang="ja" />)
  expect(await screen.findByText('마이코네 행복한 밥상')).toBeTruthy()
  expect(api.getNetflix).not.toHaveBeenCalled()
})
