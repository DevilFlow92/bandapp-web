import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import type { IndirizzoInServizio, PagedResponse, Servizio } from "@/types/servizio"
import type { Lookup } from "@/types/socio"

export const SERVIZI_KEY = ["servizi"] as const

export interface CreateServizioInput {
  banda_codice: number
  anno: number
  descrizione_servizio: string
  data_servizio: string
  indirizzo_id?: number | null
  note?: string | null
  committente_id?: number | null
  referente?: string | null
  compenso_pattuito?: number | null
}

export type UpdateServizioInput = Partial<CreateServizioInput>

export interface CreateIndirizzoInput {
  tipo_indirizzo_codice: number
  prima_riga: string
  numero_civico?: string | null
  cap?: string | null
  comune_codice?: number | null
}

/**
 * Lists servizi with server-side pagination, scoped to the selected banda and
 * optionally filtered by year.
 */
export function useServizi(
  page: number,
  pageSize: number,
  bandaCodice: number,
  anno?: number,
  enabled = true,
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
    mutationFn: async ({ id, input }: { id: number; input: UpdateServizioInput }) => {
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

/** Loads the tipi-indirizzo lookup (up to 20 entries) for the address form. */
export function useLookupTipiIndirizzo() {
  return useQuery({
    queryKey: ["lookup", "tipi-indirizzo"],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<Lookup>>("/tipi-indirizzo/", {
        params: { page_size: 20 },
      })
      return data.items
    },
    staleTime: 10 * 60 * 1000,
  })
}

/**
 * Creates a new indirizzo and returns it. Indirizzi are created inline as part
 * of the servizio flow, so there is no list to invalidate.
 */
export function useCreateIndirizzo() {
  return useMutation({
    mutationFn: async (input: CreateIndirizzoInput) => {
      const { data } = await api.post<IndirizzoInServizio>("/indirizzi/", input)
      return data
    },
  })
}
