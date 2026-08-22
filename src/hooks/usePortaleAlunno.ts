import { useQuery } from "@tanstack/react-query"
import { isAxiosError } from "axios"
import api from "@/lib/api"
import type { IscrizioneCorso, PagedResponse } from "@/types/iscrizione_corso"
import type { Lezione } from "@/types/lezione"
import type { Presenza } from "@/types/presenza"
import type { SchedaAlunno } from "@/types/scheda_alunno"
import type { PagamentoCorso } from "@/types/pagamento_corso"

export const ME_ISCRIZIONI_CORSO_KEY = ["me", "iscrizioni-corso"] as const
export const ME_LEZIONI_KEY = ["me", "iscrizioni-corso", "lezioni"] as const
export const ME_PRESENZE_KEY = ["me", "iscrizioni-corso", "presenze"] as const
export const ME_SCHEDA_KEY = ["me", "iscrizioni-corso", "scheda"] as const
export const ME_PAGAMENTI_KEY = ["me", "iscrizioni-corso", "pagamenti"] as const

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

/**
 * Fetches the current user's own scheda alunno (programma/note) for a given
 * iscrizione corso (row-level, portale alunno, read-only). Un 404 significa
 * "l'insegnante non ha ancora condiviso il programma" — non è un errore di
 * query: viene intercettato in queryFn e risolto a `data: null`, cosicché
 * `notFound` (data === null a query riuscita) resti distinto da `isError`
 * (veri errori HTTP, es. 403).
 */
export function useMiaScheda(iscrizioneCorsoId: number) {
  const query = useQuery({
    queryKey: [...ME_SCHEDA_KEY, iscrizioneCorsoId],
    queryFn: async () => {
      try {
        const { data } = await api.get<SchedaAlunno>(`/schede-alunno/me/${iscrizioneCorsoId}`)
        return data
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 404) {
          return null
        }
        throw error
      }
    },
    enabled: iscrizioneCorsoId > 0,
  })
  return { ...query, notFound: query.isSuccess && query.data === null }
}

/**
 * Lists the current user's own pagamenti for a given iscrizione corso
 * (row-level, portale alunno, read-only).
 */
export function useMieiPagamenti(
  iscrizioneCorsoId: number,
  page: number = 1,
  pageSize: number = 100,
) {
  return useQuery({
    queryKey: [...ME_PAGAMENTI_KEY, iscrizioneCorsoId, page, pageSize],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<PagamentoCorso>>(
        `/me/iscrizioni-corso/${iscrizioneCorsoId}/pagamenti`,
        { params: { page, page_size: pageSize } },
      )
      return data
    },
    enabled: iscrizioneCorsoId > 0,
  })
}
