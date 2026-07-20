import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import type { Committente, PagedResponse } from "@/types/committente"

export const COMMITTENTI_KEY = ["committenti"] as const

export interface CreateCommittenteInput {
  banda_codice: number
  denominazione: string
  indirizzo_id?: number | null
  codice_fiscale_piva?: string | null
  note?: string | null
}

export type UpdateCommittenteInput = Partial<Omit<CreateCommittenteInput, "banda_codice">>

/** Lists committenti with server-side pagination, scoped to the selected banda. */
export function useCommittenti(
  page: number,
  pageSize: number,
  bandaCodice: number,
  enabled = true,
) {
  return useQuery({
    queryKey: [...COMMITTENTI_KEY, bandaCodice, page, pageSize],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<Committente>>("/committenti/", {
        params: { page, page_size: pageSize, banda_codice: bandaCodice },
      })
      return data
    },
    placeholderData: (previous) => previous,
    enabled,
  })
}

/**
 * Loads every committente of a banda across all pages, for client-side
 * search (e.g. the CommittentePicker used from the Servizio form).
 */
export function useAllCommittenti(bandaCodice: number, enabled = true) {
  return useQuery({
    queryKey: [...COMMITTENTI_KEY, bandaCodice, "all"],
    queryFn: async () => {
      const pageSize = 100
      let items: Committente[] = []
      let totalPages = 1
      for (let page = 1; page <= totalPages; page += 1) {
        const { data } = await api.get<PagedResponse<Committente>>("/committenti/", {
          params: { page, page_size: pageSize, banda_codice: bandaCodice },
        })
        items = items.concat(data.items)
        totalPages = data.meta.total_pages
      }
      return items
    },
    enabled: enabled && bandaCodice > 0,
  })
}

/** Creates a new committente. */
export function useCreateCommittente() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateCommittenteInput) => {
      const { data } = await api.post<Committente>("/committenti/", input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMMITTENTI_KEY })
    },
  })
}

/** Updates an existing committente. */
export function useUpdateCommittente() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: UpdateCommittenteInput }) => {
      const { data } = await api.patch<Committente>(`/committenti/${id}`, input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMMITTENTI_KEY })
    },
  })
}

/** Deletes a committente. Fails with 409 if it has associated servizi. */
export function useDeleteCommittente() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/committenti/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMMITTENTI_KEY })
    },
  })
}
