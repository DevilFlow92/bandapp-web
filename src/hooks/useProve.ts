import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import type { PagedResponse, Prova } from "@/types/prova"

export const PROVE_KEY = ["prove"] as const

export interface CreateProvaInput {
  banda_codice: number
  data_prova: string
  indirizzo_id?: number | null
  servizio_id?: number | null
  note?: string | null
}

export type UpdateProvaInput = Partial<CreateProvaInput>

/**
 * Lists prove with server-side pagination, scoped to the selected banda and
 * optionally filtered by the servizio they are oriented to.
 */
export function useProve(
  page: number,
  pageSize: number,
  bandaCodice: number,
  servizioId?: number,
  enabled = true,
) {
  return useQuery({
    queryKey: [...PROVE_KEY, bandaCodice, page, pageSize, servizioId ?? null],
    queryFn: async () => {
      const params: Record<string, number> = {
        page,
        page_size: pageSize,
        banda_codice: bandaCodice,
      }
      if (servizioId !== undefined) params.servizio_id = servizioId
      const { data } = await api.get<PagedResponse<Prova>>("/prove/", { params })
      return data
    },
    placeholderData: (previous) => previous,
    enabled,
  })
}

/** Creates a new prova. */
export function useCreateProva() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateProvaInput) => {
      const { data } = await api.post<Prova>("/prove/", input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROVE_KEY })
    },
  })
}

/** Updates an existing prova. */
export function useUpdateProva() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: UpdateProvaInput }) => {
      const { data } = await api.patch<Prova>(`/prove/${id}`, input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROVE_KEY })
    },
  })
}

/** Deletes a prova. */
export function useDeleteProva() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/prove/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROVE_KEY })
    },
  })
}
