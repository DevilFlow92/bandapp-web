import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"
import type { Banda } from "@/types/banda"

const STORAGE_KEY = "bandapp_banda"

interface BandaContextValue {
  banda: Banda | null
  setBanda: (b: Banda) => void
  clearBanda: () => void
}

const BandaContext = createContext<BandaContextValue | null>(null)

function readStoredBanda(): Banda | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Banda
    if (typeof parsed?.codice === "number") return parsed
    return null
  } catch {
    return null
  }
}

export function BandaProvider({ children }: { children: ReactNode }) {
  const [banda, setBandaState] = useState<Banda | null>(readStoredBanda)

  const setBanda = useCallback((b: Banda) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(b))
    setBandaState(b)
  }, [])

  const clearBanda = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY)
    setBandaState(null)
  }, [])

  const value = useMemo(() => ({ banda, setBanda, clearBanda }), [banda, setBanda, clearBanda])

  return <BandaContext.Provider value={value}>{children}</BandaContext.Provider>
}

/** Access the selected banda. Throws if used outside a BandaProvider. */
export function useBanda(): BandaContextValue {
  const ctx = useContext(BandaContext)
  if (!ctx) {
    throw new Error("useBanda must be used within a BandaProvider")
  }
  return ctx
}
