import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import type { PagedResponse, Presenza, StatoPresenza } from "@/types/presenza"

export const PRESENZE_KEY = ["presenze"] as const

export interface CreatePresenzaInput {
  servizio_id: number
  persona_id: number
  note?: string | null
}

export interface UpdatePresenzaInput {
  stato?: StatoPresenza | null
  note?: string | null
}

/**
 * Lists the organico (presenze) of a single servizio, persona expanded. The
 * endpoint caps page_size at 100; a servizio's organico is assumed to fit in
 * a single page, mirroring the Ricevute/Iscrizioni panels which also skip UI
 * pagination for scoped child lists.
 */
export function useOrganicoServizio(servizioId: number) {
  return useQuery({
    queryKey: [...PRESENZE_KEY, servizioId],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<Presenza>>(`/presenze/servizio/${servizioId}`, {
        params: { page_size: 100 },
      })
      return data
    },
    enabled: servizioId > 0,
  })
}

/** Adds a persona to a servizio's organico. Stato starts unset (null). */
export function useCreatePresenza() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreatePresenzaInput) => {
      const { data } = await api.post<Presenza>("/presenze/", input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRESENZE_KEY })
    },
  })
}

/** Updates a presenza's stato and/or note. */
export function useUpdatePresenza() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: UpdatePresenzaInput }) => {
      const { data } = await api.patch<Presenza>(`/presenze/${id}`, input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRESENZE_KEY })
    },
  })
}

/** Removes a persona from the organico. */
export function useDeletePresenza() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/presenze/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRESENZE_KEY })
    },
  })
}
