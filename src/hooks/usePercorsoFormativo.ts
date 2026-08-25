import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"
import type { TappaPercorsoFormativo } from "@/types/percorso_formativo"

export const PERCORSO_FORMATIVO_KEY = ["percorso-formativo"] as const

/**
 * Percorso formativo pluriennale di una persona (card #209/#220): le sue
 * iscrizioni a corso nel tempo con il riepilogo delle voci di ciascuna
 * scheda alunno. Sola lettura, non paginato, già ordinato per anno
 * decrescente dal backend.
 */
export function usePercorsoFormativo(personaId: number, enabled = true) {
  return useQuery({
    queryKey: [...PERCORSO_FORMATIVO_KEY, personaId],
    queryFn: async () => {
      const { data } = await api.get<TappaPercorsoFormativo[]>(
        `/persone/${personaId}/percorso-formativo`,
      )
      return data
    },
    enabled: enabled && personaId > 0,
  })
}
