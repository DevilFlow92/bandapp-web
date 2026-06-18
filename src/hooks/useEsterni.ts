import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import type { Esterno, PagedResponse } from "@/types/esterno"

export const ESTERNI_KEY = ["esterni"] as const

export interface CreateEsternoInput {
  codice_esterno: string
  specializzazione?: string | null
  tariffa_oraria?: number | null
  strumento_codice: number
  attivo: boolean
  persona_id: number
  banda_codice: number
}

export type UpdateEsternoInput = Partial<
  Omit<CreateEsternoInput, "persona_id">
>

/** Lists esterni with server-side pagination, scoped to the selected banda. */
export function useEsterni(
  page: number,
  pageSize: number,
  bandaCodice: number,
  enabled = true
) {
  return useQuery({
    queryKey: [...ESTERNI_KEY, bandaCodice, page, pageSize],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<Esterno>>("/esterni/", {
        params: { page, page_size: pageSize, banda_codice: bandaCodice },
      })
      return data
    },
    placeholderData: (previous) => previous,
    enabled,
  })
}

/** Creates a new esterno. */
export function useCreateEsterno() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateEsternoInput) => {
      const { data } = await api.post<Esterno>("/esterni/", input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ESTERNI_KEY })
    },
  })
}

/** Updates an existing esterno. */
export function useUpdateEsterno() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: number
      input: UpdateEsternoInput
    }) => {
      const { data } = await api.patch<Esterno>(`/esterni/${id}`, input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ESTERNI_KEY })
    },
  })
}

/** Deletes an esterno. */
export function useDeleteEsterno() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/esterni/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ESTERNI_KEY })
    },
  })
}
