import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import type { Lookup, PagedResponse } from "@/types/socio"
import type { Iscrizione } from "@/types/iscrizione"

export const ISCRIZIONI_KEY = ["iscrizioni"] as const

export interface CreateIscrizioneInput {
  socio_id: number
  anno: number
  quota_partecipazione: number
  stato_iscrizione_codice: number
  data_iscrizione: string
  documento_id?: number | null
  ricevuta_id?: number | null
  note?: string | null
}

export type UpdateIscrizioneInput = Partial<CreateIscrizioneInput>

/**
 * Lists iscrizioni with server-side pagination. Iscrizioni reference soci, which
 * are already scoped to the selected banda, so the endpoint is not filtered by
 * banda directly. Optionally narrowed by socio and/or year.
 */
export function useIscrizioni(
  page: number,
  pageSize: number,
  socioId?: number,
  anno?: number
) {
  return useQuery({
    queryKey: [...ISCRIZIONI_KEY, page, pageSize, socioId ?? null, anno ?? null],
    queryFn: async () => {
      const params: Record<string, number> = { page, page_size: pageSize }
      if (socioId !== undefined) params.socio_id = socioId
      if (anno !== undefined) params.anno = anno
      const { data } = await api.get<PagedResponse<Iscrizione>>("/iscrizioni/", {
        params,
      })
      return data
    },
    placeholderData: (previous) => previous,
  })
}

/** Creates a new iscrizione. */
export function useCreateIscrizione() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateIscrizioneInput) => {
      const { data } = await api.post<Iscrizione>("/iscrizioni/", input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ISCRIZIONI_KEY })
    },
  })
}

/** Updates an existing iscrizione. */
export function useUpdateIscrizione() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: number
      input: UpdateIscrizioneInput
    }) => {
      const { data } = await api.patch<Iscrizione>(`/iscrizioni/${id}`, input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ISCRIZIONI_KEY })
    },
  })
}

/** Deletes an iscrizione. */
export function useDeleteIscrizione() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/iscrizioni/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ISCRIZIONI_KEY })
    },
  })
}

/** Loads the stati-iscrizione lookup (up to 20 entries). */
export function useLookupStatiIscrizione() {
  return useQuery({
    queryKey: ["lookup", "stati-iscrizione"],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<Lookup>>(
        "/stati-iscrizione/",
        { params: { page_size: 20 } }
      )
      return data.items
    },
    staleTime: 10 * 60 * 1000,
  })
}
