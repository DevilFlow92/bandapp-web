import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"
import type { IscrizioneCorso, PagedResponse } from "@/types/iscrizione_corso"
import type { Lezione } from "@/types/lezione"
import type { Presenza } from "@/types/presenza"

export const ME_ISCRIZIONI_CORSO_KEY = ["me", "iscrizioni-corso"] as const
export const ME_LEZIONI_KEY = ["me", "iscrizioni-corso", "lezioni"] as const
export const ME_PRESENZE_KEY = ["me", "iscrizioni-corso", "presenze"] as const

/** Lists the current user's own iscrizioni corso (portale alunno, read-only). */
export function useMieIscrizioniCorso(page: number = 1, pageSize: number = 100) {
  return useQuery({
    queryKey: [...ME_ISCRIZIONI_CORSO_KEY, page, pageSize],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<IscrizioneCorso>>("/me/iscrizioni-corso", {
        params: { page, page_size: pageSize },
      })
      return data
    },
  })
}

/**
 * Lists all lezioni programmate for the corso of a given iscrizione corso
 * (filtered by corso only, not by persona — portale alunno, read-only).
 */
export function useMieLezioni(iscrizioneCorsoId: number, page: number = 1, pageSize: number = 100) {
  return useQuery({
    queryKey: [...ME_LEZIONI_KEY, iscrizioneCorsoId, page, pageSize],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<Lezione>>(
        `/me/iscrizioni-corso/${iscrizioneCorsoId}/lezioni`,
        { params: { page, page_size: pageSize } },
      )
      return data
    },
    enabled: iscrizioneCorsoId > 0,
  })
}

/**
 * Lists the current user's own presenze for the corso of a given iscrizione
 * corso (row-level: filtered by corso e persona — portale alunno, read-only).
 */
export function useMiePresenze(
  iscrizioneCorsoId: number,
  page: number = 1,
  pageSize: number = 100,
) {
  return useQuery({
    queryKey: [...ME_PRESENZE_KEY, iscrizioneCorsoId, page, pageSize],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<Presenza>>(
        `/me/iscrizioni-corso/${iscrizioneCorsoId}/presenze`,
        { params: { page, page_size: pageSize } },
      )
      return data
    },
    enabled: iscrizioneCorsoId > 0,
  })
}
