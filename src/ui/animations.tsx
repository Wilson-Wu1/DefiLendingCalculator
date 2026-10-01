import { createContext, useCallback, useContext, useLayoutEffect, useState, type ReactNode } from 'react'

const STORAGE_KEY = 'animations'

type AnimationsValue = {
  enabled: boolean
  setEnabled: (enabled: boolean) => void
}

const AnimationsContext = createContext<AnimationsValue | null>(null)

export function readAnimationsEnabled(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'on') return true
    if (stored === 'off') return false
  } catch {
    // Storage can be blocked. Fall through to the system preference.
  }
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function applyStoredAnimations() {
  document.documentElement.dataset.animations = readAnimationsEnabled() ? 'on' : 'off'
}

export function AnimationsProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(readAnimationsEnabled)

  useLayoutEffect(() => {
    document.documentElement.dataset.animations = enabled ? 'on' : 'off'
  }, [enabled])

  const setEnabled = useCallback((next: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, next ? 'on' : 'off')
    } catch {
      // Ignore storage failures and still apply the choice for this visit.
    }
    document.documentElement.dataset.animations = next ? 'on' : 'off'
    setEnabledState(next)
  }, [])

  return <AnimationsContext.Provider value={{ enabled, setEnabled }}>{children}</AnimationsContext.Provider>
}

export function useAnimations(): AnimationsValue {
  const value = useContext(AnimationsContext)
  if (!value) throw new Error('useAnimations must be used within AnimationsProvider')
  return value
}
