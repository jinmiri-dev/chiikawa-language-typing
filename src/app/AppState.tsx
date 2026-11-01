/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { DEFAULT_SETTINGS, type Settings } from '../engine/types'
import { openStore, requestPersist, type Store } from '../services/storage'

interface AppState {
  store: Store
  settings: Settings
  setSettings(patch: Partial<Settings>): void
}

const Ctx = createContext<AppState | null>(null)

/** 저장소와 설정을 화면 전체에 준다. 테스트는 store 를 넘긴다. */
export function AppProvider({ store: given, children }: { store?: Store; children: ReactNode }) {
  const [store, setStore] = useState<Store | null>(given ?? null)
  const [settings, setLocal] = useState<Settings>(DEFAULT_SETTINGS)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const s = given ?? (await openStore())
      const loaded = await s.getSettings()
      if (!alive) return
      setStore(s)
      setLocal(loaded)
      setReady(true)
      if (!given) void requestPersist()
    })()
    return () => {
      alive = false
    }
  }, [given])

  const setSettings = useCallback(
    (patch: Partial<Settings>) =>
      setLocal((prev) => {
        const next = { ...prev, ...patch }
        void store?.saveSettings(next)
        return next
      }),
    [store],
  )

  if (!ready || !store) return null
  return <Ctx.Provider value={{ store, settings, setSettings }}>{children}</Ctx.Provider>
}

export function useApp(): AppState {
  const v = useContext(Ctx)
  if (!v) throw new Error('AppProvider 안에서만 쓴다')
  return v
}
