import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import type { Allievo, PagedResponse } from "@/types/allievo"

export const ALLIEVI_KEY = ["allievi"] as const

export interface CreateAllievoInput {
  persona_id: number
  indirizzo_id: number | null
}

export type UpdateAllievoInput = Partial<Omit<CreateAllievoInput, "persona_id">> & {
  codice_allievo?: string
}

/** Lists allievi with server-side pagination, scoped to the selected banda. */
export function useAllievi(page: number, pageSize: number, bandaCodice: number, enabled = true) {
  return useQuery({
    queryKey: [...ALLIEVI_KEY, bandaCodice, page, pageSize],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<Allievo>>("/allievi/", {
        params: { page, page_size: pageSize, banda_codice: bandaCodice },
      })
      return data
    },
    placeholderData: (previous) => previous,
    enabled,
  })
}

/** Loads every allievo of a banda across all pages, for client-side derivations (e.g. codice_allievo suggestion). */
export function useAllAllievi(bandaCodice: number, enabled = true) {
  return useQuery({
    queryKey: [...ALLIEVI_KEY, bandaCodice, "all"],
    queryFn: async () => {
      const pageSize = 100
      let items: Allievo[] = []
      let totalPages = 1
      for (let page = 1; page <= totalPages; page += 1) {
        const { data } = await api.get<PagedResponse<Allievo>>("/allievi/", {
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

/** Loads a single allievo by id, with nested persona and indirizzo. */
export function useAllievo(id: number) {
  return useQuery({
    queryKey: [...ALLIEVI_KEY, id],
    queryFn: async () => {
      const { data } = await api.get<Allievo>(`/allievi/${id}`)
      return data
    },
    enabled: id > 0,
  })
}

/** Creates a new allievo. */
export function useCreateAllievo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateAllievoInput) => {
      const { data } = await api.post<Allievo>("/allievi/", input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ALLIEVI_KEY })
    },
  })
}

/** Updates an existing allievo. */
export function useUpdateAllievo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: UpdateAllievoInput }) => {
      const { data } = await api.patch<Allievo>(`/allievi/${id}`, input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ALLIEVI_KEY })
    },
  })
}

/** Deletes an allievo. */
export function useDeleteAllievo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/allievi/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ALLIEVI_KEY })
    },
  })
}
