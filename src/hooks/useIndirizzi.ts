import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import type { Indirizzo, CreateIndirizzoInput } from "@/types/indirizzo"
import type { Lookup, PagedResponse } from "@/types/socio"

export function usePersonaIndirizzi(personaId: number, enabled = true) {
  return useQuery({
    queryKey: ["persone", personaId, "indirizzi"],
    queryFn: async () => {
      const { data } = await api.get<Indirizzo[]>(`/persone/${personaId}/indirizzi`)
      return data
    },
    enabled: enabled && personaId > 0,
  })
}

export function useAddPersonaIndirizzo(personaId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateIndirizzoInput) => {
      const { data: created } = await api.post<Indirizzo>("/indirizzi/", input)
      const { data: linked } = await api.put<Indirizzo[]>(
        `/persone/${personaId}/indirizzi/${created.id}`,
      )
      return linked
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["persone", personaId, "indirizzi"] })
    },
  })
}

export function useRemovePersonaIndirizzo(personaId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (indirizzoId: number) => {
      await api.delete(`/persone/${personaId}/indirizzi/${indirizzoId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["persone", personaId, "indirizzi"] })
    },
  })
}

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
