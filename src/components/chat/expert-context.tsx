"use client"

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react"

interface ExpertState {
  expertId: string | null
  expertName: string | null
  expertIcon: string | null
}

interface ExpertContextValue extends ExpertState {
  setExpert: (id: string | null, name: string | null, icon: string | null) => void
}

const ExpertContext = createContext<ExpertContextValue>({
  expertId: null,
  expertName: null,
  expertIcon: null,
  setExpert: () => {},
})

export function ExpertProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ExpertState>({
    expertId: null,
    expertName: null,
    expertIcon: null,
  })

  const setExpert = useCallback((id: string | null, name: string | null, icon: string | null) => {
    setState({ expertId: id, expertName: name, expertIcon: icon })
  }, [])

  const value = useMemo(
    () => ({ ...state, setExpert }),
    [state, setExpert]
  )

  return (
    <ExpertContext.Provider value={value}>
      {children}
    </ExpertContext.Provider>
  )
}

export function useExpert() {
  return useContext(ExpertContext)
}
