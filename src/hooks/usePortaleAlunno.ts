import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { isAxiosError } from "axios"
import api from "@/lib/api"
import type { IscrizioneCorso, PagedResponse } from "@/types/iscrizione_corso"
import type { Lezione } from "@/types/lezione"
import type { Presenza } from "@/types/presenza"
import type { SchedaAlunno } from "@/types/scheda_alunno"
import type { SchedaAlunnoAutovalutazione } from "@/types/scheda_alunno_autovalutazione"
import type { SchedaAlunnoVoceStoricoResponse } from "@/types/scheda_alunno_voce_storico"
import type { PagamentoCorso } from "@/types/pagamento_corso"

export const ME_ISCRIZIONI_CORSO_KEY = ["me", "iscrizioni-corso"] as const
export const ME_LEZIONI_KEY = ["me", "iscrizioni-corso", "lezioni"] as const
export const ME_PRESENZE_KEY = ["me", "iscrizioni-corso", "presenze"] as const
export const ME_SCHEDA_KEY = ["me", "iscrizioni-corso", "scheda"] as const
export const ME_STORICO_VOCI_KEY = ["me", "iscrizioni-corso", "storico-voci"] as const
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
 * Storico dei cambi di stato delle voci di programma della propria scheda
 * alunno (sola lettura, card #207, row-level come ``useMiaScheda`` — stessa
 * guardia lato backend, ``assert_puo_leggere_scheda``).
 */
export function useMioStoricoVoci(
  iscrizioneCorsoId: number,
  page: number = 1,
  pageSize: number = 20,
) {
  return useQuery({
    queryKey: [...ME_STORICO_VOCI_KEY, iscrizioneCorsoId, page, pageSize],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<SchedaAlunnoVoceStoricoResponse>>(
        `/schede-alunno/me/${iscrizioneCorsoId}/storico-voci`,
        { params: { page, page_size: pageSize } },
      )
      return data
    },
    enabled: iscrizioneCorsoId > 0,
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
 * Crea una nuova autovalutazione sulla propria scheda alunno (PRIMA
 * scrittura del portale alunno — vedi card #204: finora il portale è
 * sempre stato sola lettura). Indicizzata per `iscrizioneCorsoId`, come
 * `useMiaScheda`, non per `schedaAlunnoId` che l'alunno non ha mai visto.
 */
export function useCreateAutovalutazione() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      iscrizioneCorsoId,
      testo,
    }: {
      iscrizioneCorsoId: number
      testo: string
    }) => {
      const { data } = await api.post<SchedaAlunnoAutovalutazione>(
        `/schede-alunno/me/${iscrizioneCorsoId}/autovalutazioni`,
        { testo },
      )
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ME_SCHEDA_KEY })
    },
  })
}

/** Aggiorna il testo di una propria autovalutazione esistente. */
export function useUpdateAutovalutazione() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      iscrizioneCorsoId,
      autovalutazioneId,
      testo,
    }: {
      iscrizioneCorsoId: number
      autovalutazioneId: number
      testo: string
    }) => {
      const { data } = await api.patch<SchedaAlunnoAutovalutazione>(
        `/schede-alunno/me/${iscrizioneCorsoId}/autovalutazioni/${autovalutazioneId}`,
        { testo },
      )
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ME_SCHEDA_KEY })
    },
  })
}

/** Elimina una propria autovalutazione. */
export function useDeleteAutovalutazione() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      iscrizioneCorsoId,
      autovalutazioneId,
    }: {
      iscrizioneCorsoId: number
      autovalutazioneId: number
    }) => {
      await api.delete(
        `/schede-alunno/me/${iscrizioneCorsoId}/autovalutazioni/${autovalutazioneId}`,
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ME_SCHEDA_KEY })
    },
  })
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
