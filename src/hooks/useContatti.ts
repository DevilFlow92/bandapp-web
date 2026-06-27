import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import type { Contatto, CreateContattoInput } from "@/types/contatto"
import type { Lookup, PagedResponse } from "@/types/socio"

export function usePersonaContatti(personaId: number, enabled = true) {
  return useQuery({
    queryKey: ["persone", personaId, "contatti"],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<Contatto>>(`/contatti/persona/${personaId}`, {
        params: { page_size: 50 },
      })
      return data.items
    },
    enabled: enabled && personaId > 0,
  })
}

export function useCreateContatto(personaId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateContattoInput) => {
      const { data } = await api.post<Contatto>("/contatti/", input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["persone", personaId, "contatti"] })
    },
  })
}

export function useDeleteContatto(personaId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (contattoId: number) => {
      await api.delete(`/contatti/${contattoId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["persone", personaId, "contatti"] })
    },
  })
}

export function useLookupRuoliContatto() {
  return useQuery({
    queryKey: ["lookup", "ruoli-contatto"],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<Lookup>>("/ruoli-contatto/", {
        params: { page_size: 20 },
      })
      return data.items
    },
    staleTime: 10 * 60 * 1000,
  })
}
