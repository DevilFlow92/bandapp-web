import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import type { Lezione, PagedResponse } from "@/types/lezione"

export const LEZIONI_KEY = ["lezioni"] as const

export interface CreateLezioneInput {
  corso_id: number
  data_lezione: string
  indirizzo_id?: number | null
  note?: string | null
}

export type UpdateLezioneInput = Partial<CreateLezioneInput>

/**
 * Lists lezioni for a specific corso, with server-side pagination.
 */
export function useLezioniByCorso(
  corsoId: number,
  page: number = 1,
  pageSize: number = 100,
  enabled = true,
) {
  return useQuery({
    queryKey: [...LEZIONI_KEY, corsoId, page, pageSize],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<Lezione>>("/lezioni/", {
        params: { corso_id: corsoId, page, page_size: pageSize },
      })
      return data
    },
    enabled: enabled && corsoId > 0,
  })
}

/** Creates a new lezione. */
export function useCreateLezione() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateLezioneInput) => {
      const { data } = await api.post<Lezione>("/lezioni/", input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEZIONI_KEY })
    },
  })
}

/** Updates an existing lezione. */
export function useUpdateLezione() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: UpdateLezioneInput }) => {
      const { data } = await api.patch<Lezione>(`/lezioni/${id}`, input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEZIONI_KEY })
    },
  })
}

/** Deletes a lezione. */
export function useDeleteLezione() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/lezioni/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEZIONI_KEY })
    },
  })
}
