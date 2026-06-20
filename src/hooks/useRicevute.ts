import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import type { PagedResponse, Ricevuta } from "@/types/ricevuta"

export const RICEVUTE_KEY = ["ricevute"] as const

export interface CreateRicevutaInput {
  servizio_id: number
  esterno_id?: number | null
  importo: number
  data_ricevuta: string // ISO datetime
  note_in_stampa?: string | null
  note_fuori_stampa?: string | null
}

/** Lists the ricevute for a single servizio. Enabled once a real id is known. */
export function useRicevute(servizioId: number) {
  return useQuery({
    queryKey: [...RICEVUTE_KEY, servizioId],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<Ricevuta>>("/ricevute/", {
        params: { servizio_id: servizioId, page_size: 50 },
      })
      return data
    },
    enabled: servizioId > 0,
  })
}

/** Creates a new ricevuta. */
export function useCreateRicevuta() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateRicevutaInput) => {
      const { data } = await api.post<Ricevuta>("/ricevute/", input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RICEVUTE_KEY })
    },
  })
}

/** Deletes a ricevuta. */
export function useDeleteRicevuta() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/ricevute/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RICEVUTE_KEY })
    },
  })
}
