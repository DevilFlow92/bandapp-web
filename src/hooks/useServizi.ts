import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import type { Indirizzo, PagedResponse, Servizio } from "@/types/servizio"

export const SERVIZI_KEY = ["servizi"] as const

export interface CreateServizioInput {
  banda_codice: number
  anno: number
  descrizione_servizio: string
  data_servizio: string
  indirizzo_id: number
  note?: string | null
}

export type UpdateServizioInput = Partial<CreateServizioInput>

/**
 * Lists servizi with server-side pagination, scoped to the selected banda and
 * optionally filtered by year.
 */
export function useServizi(
  page: number,
  pageSize: number,
  bandaCodice: number,
  anno?: number,
  enabled = true
) {
  return useQuery({
    queryKey: [...SERVIZI_KEY, bandaCodice, page, pageSize, anno ?? null],
    queryFn: async () => {
      const params: Record<string, number> = {
        page,
        page_size: pageSize,
        banda_codice: bandaCodice,
      }
      if (anno !== undefined) params.anno = anno
      const { data } = await api.get<PagedResponse<Servizio>>("/servizi/", {
        params,
      })
      return data
    },
    placeholderData: (previous) => previous,
    enabled,
  })
}

/** Creates a new servizio. */
export function useCreateServizio() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateServizioInput) => {
      const { data } = await api.post<Servizio>("/servizi/", input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SERVIZI_KEY })
    },
  })
}

/** Updates an existing servizio. */
export function useUpdateServizio() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: number
      input: UpdateServizioInput
    }) => {
      const { data } = await api.patch<Servizio>(`/servizi/${id}`, input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SERVIZI_KEY })
    },
  })
}

/** Deletes a servizio. Fails with 409 if it has associated receipts. */
export function useDeleteServizio() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/servizi/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SERVIZI_KEY })
    },
  })
}

/** Loads the indirizzi lookup (up to 100 entries) for the address picker. */
export function useLookupIndirizzi() {
  return useQuery({
    queryKey: ["lookup", "indirizzi"],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<Indirizzo>>("/indirizzi/", {
        params: { page_size: 100 },
      })
      return data.items
    },
    staleTime: 10 * 60 * 1000,
  })
}
