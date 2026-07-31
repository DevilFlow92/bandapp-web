import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import type { Corso, PagedResponse, TipoCorso } from "@/types/corso"

export const CORSI_KEY = ["corsi"] as const

export interface CreateCorsoInput {
  banda_codice: number
  tipo_corso_codice: number
  anno: number
  coordinatore_persona_id: number | null
  insegnante_persona_id: number | null
  note: string | null
}

export type UpdateCorsoInput = Partial<CreateCorsoInput>

/**
 * Lists corsi with server-side pagination, scoped to the selected banda and
 * optionally filtered by year and/or tipo_corso.
 */
export function useCorsi(
  page: number,
  pageSize: number,
  bandaCodice: number,
  anno?: number,
  tipoCorsoCodec?: number,
  enabled = true,
) {
  return useQuery({
    queryKey: [...CORSI_KEY, bandaCodice, page, pageSize, anno ?? null, tipoCorsoCodec ?? null],
    queryFn: async () => {
      const params: Record<string, number> = {
        page,
        page_size: pageSize,
        banda_codice: bandaCodice,
      }
      if (anno !== undefined) params.anno = anno
      if (tipoCorsoCodec !== undefined) params.tipo_corso_codice = tipoCorsoCodec
      const { data } = await api.get<PagedResponse<Corso>>("/corsi/", {
        params,
      })
      return data
    },
    placeholderData: (previous) => previous,
    enabled,
  })
}

/** Loads every corso of a banda across all pages, for client-side operations. */
export function useAllCorsi(bandaCodice: number, enabled = true) {
  return useQuery({
    queryKey: [...CORSI_KEY, bandaCodice, "all"],
    queryFn: async () => {
      const pageSize = 100
      let items: Corso[] = []
      let totalPages = 1
      for (let page = 1; page <= totalPages; page += 1) {
        const { data } = await api.get<PagedResponse<Corso>>("/corsi/", {
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

/** Creates a new corso. */
export function useCreateCorso() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateCorsoInput) => {
      const { data } = await api.post<Corso>("/corsi/", input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CORSI_KEY })
    },
  })
}

/** Updates an existing corso. */
export function useUpdateCorso() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: UpdateCorsoInput }) => {
      const { data } = await api.patch<Corso>(`/corsi/${id}`, input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CORSI_KEY })
    },
  })
}

/** Deletes a corso. */
export function useDeleteCorso() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/corsi/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CORSI_KEY })
    },
  })
}

/** Loads the tipi-corso lookup for the tipo_corso_codice field. */
export function useLookupTipiCorso() {
  return useQuery({
    queryKey: ["lookup", "tipi-corso"],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<TipoCorso>>("/tipi-corso/", {
        params: { page_size: 100 },
      })
      return data.items
    },
    staleTime: 10 * 60 * 1000,
  })
}
