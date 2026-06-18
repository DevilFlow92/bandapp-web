import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import type { Lookup, PagedResponse, Spartito } from "@/types/spartito"

export const SPARTITI_KEY = ["spartiti"] as const

export interface CreateSpartitoInput {
  titolo: string
  autore?: string | null
  anno?: number | null
  note?: string | null
  tipo_spartito_codice: number
  strumento_codice?: number | null
  scaffale?: string | null
  ripiano?: string | null
  cartella?: string | null
  documento_id?: number | null
}

export type UpdateSpartitoInput = Partial<CreateSpartitoInput>

/**
 * Lists spartiti with pagination, scoped to the selected banda and optionally
 * filtered by tipo and strumento.
 */
export function useSpartiti(
  page: number,
  pageSize: number,
  bandaCodice: number,
  tipoSpartitoCode?: number,
  strumentoCode?: number,
  enabled = true
) {
  return useQuery({
    queryKey: [
      ...SPARTITI_KEY,
      bandaCodice,
      page,
      pageSize,
      tipoSpartitoCode ?? null,
      strumentoCode ?? null,
    ],
    queryFn: async () => {
      const params: Record<string, number> = {
        page,
        page_size: pageSize,
        banda_codice: bandaCodice,
      }
      if (tipoSpartitoCode !== undefined)
        params.tipo_spartito_codice = tipoSpartitoCode
      if (strumentoCode !== undefined) params.strumento_codice = strumentoCode
      const { data } = await api.get<PagedResponse<Spartito>>("/spartiti/", {
        params,
      })
      return data
    },
    placeholderData: (previous) => previous,
    enabled,
  })
}

/** Creates a new spartito. */
export function useCreateSpartito() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateSpartitoInput) => {
      const { data } = await api.post<Spartito>("/spartiti/", input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SPARTITI_KEY })
    },
  })
}

/** Updates an existing spartito. */
export function useUpdateSpartito() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: number
      input: UpdateSpartitoInput
    }) => {
      const { data } = await api.patch<Spartito>(`/spartiti/${id}`, input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SPARTITI_KEY })
    },
  })
}

/** Deletes a spartito. */
export function useDeleteSpartito() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/spartiti/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SPARTITI_KEY })
    },
  })
}

/** Loads the tipi-spartito lookup (up to 100 entries). */
export function useLookupTipiSpartito() {
  return useQuery({
    queryKey: ["lookup", "tipi-spartito"],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<Lookup>>("/tipi-spartito/", {
        params: { page_size: 100 },
      })
      return data.items
    },
    staleTime: 10 * 60 * 1000,
  })
}
