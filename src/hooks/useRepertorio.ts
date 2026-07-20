import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import type { PagedResponse, RepertorioItem } from "@/types/repertorio"

export const REPERTORIO_KEY = ["repertorio"] as const

export interface CreateRepertorioItemInput {
  servizio_id: number
  ordine: number
  nome_parte_id: number
  note?: string | null
}

export interface UpdateRepertorioItemInput {
  ordine?: number
  note?: string | null
}

export function useRepertorioServizio(servizioId: number) {
  return useQuery({
    queryKey: [...REPERTORIO_KEY, servizioId],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<RepertorioItem>>(
        `/repertorio/servizio/${servizioId}`,
        { params: { page_size: 100 } },
      )
      return data
    },
    enabled: servizioId > 0,
  })
}

export function useCreateRepertorioItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateRepertorioItemInput) => {
      const { data } = await api.post<RepertorioItem>("/repertorio/", input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REPERTORIO_KEY })
    },
  })
}

export function useUpdateRepertorioItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: UpdateRepertorioItemInput }) => {
      const { data } = await api.patch<RepertorioItem>(`/repertorio/${id}`, input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REPERTORIO_KEY })
    },
  })
}

export function useDeleteRepertorioItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/repertorio/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REPERTORIO_KEY })
    },
  })
}
