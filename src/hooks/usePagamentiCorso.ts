import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import type { PagamentoCorso, PagedResponse } from "@/types/pagamento_corso"

export const PAGAMENTI_CORSO_KEY = ["pagamenti_corso"] as const

export interface CreatePagamentoCorsoInput {
  iscrizione_corso_id: number
  data_pagamento: string // ISO date
  importo: number
  note?: string | null
}

/**
 * Lists pagamenti for a specific iscrizione corso, with server-side pagination.
 */
export function usePagamentiCorsoByIscrizione(
  iscrizioneCorsoId: number,
  page: number = 1,
  pageSize: number = 100,
  enabled = true,
) {
  return useQuery({
    queryKey: [...PAGAMENTI_CORSO_KEY, iscrizioneCorsoId, page, pageSize],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<PagamentoCorso>>("/pagamenti-corso/", {
        params: { iscrizione_corso_id: iscrizioneCorsoId, page, page_size: pageSize },
      })
      return data
    },
    enabled: enabled && iscrizioneCorsoId > 0,
  })
}

/**
 * Registers a new pagamento corso. Il backend genera automaticamente, nella
 * stessa transazione, una Ricevuta (RISCOSSIONE) e un movimento di
 * FlussoCassa (AUTO_PAGAMENTO_CORSO): la response include la ricevuta creata.
 */
export function useCreatePagamentoCorso() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreatePagamentoCorsoInput) => {
      const { data } = await api.post<PagamentoCorso>("/pagamenti-corso/", input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAGAMENTI_CORSO_KEY })
    },
  })
}

/** Deletes a pagamento corso (elimina in cascata la ricevuta e il flusso cassa collegati). */
export function useDeletePagamentoCorso() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/pagamenti-corso/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAGAMENTI_CORSO_KEY })
    },
  })
}
