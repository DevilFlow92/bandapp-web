import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import type { PagedResponse, Permesso, Ruolo, Utente } from "@/types/admin"

export const UTENTI_KEY = ["utenti"] as const
export const RUOLI_KEY = ["ruoli"] as const
export const PERMESSI_KEY = ["permessi"] as const

export interface CreateUtenteInput {
  email: string
  nome_completo?: string | null
  tipo: "umano" | "servizio"
  password?: string
  superuser: boolean
  ruoli: number[]
}

export interface UpdateUtenteInput {
  nome_completo?: string | null
  attivo?: boolean
  superuser?: boolean
  ruoli?: number[]
}

export interface CreateRuoloInput {
  nome: string
  descrizione?: string | null
  banda_codice?: number | null
  permessi: string[]
}

export interface UpdateRuoloInput {
  nome?: string
  descrizione?: string | null
  permessi?: string[]
}

/** Lists utenti with pagination. */
export function useUtenti(page: number, pageSize: number) {
  return useQuery({
    queryKey: [...UTENTI_KEY, page, pageSize],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<Utente>>("/utenti/", {
        params: { page, page_size: pageSize },
      })
      return data
    },
    placeholderData: (previous) => previous,
  })
}

/** Creates a new utente. */
export function useCreateUtente() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateUtenteInput) => {
      const { data } = await api.post<Utente>("/utenti/", input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: UTENTI_KEY })
    },
  })
}

/** Updates an existing utente. */
export function useUpdateUtente() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: UpdateUtenteInput }) => {
      const { data } = await api.patch<Utente>(`/utenti/${id}`, input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: UTENTI_KEY })
    },
  })
}

/** Sets a new password for an utente. Does not invalidate any query. */
export function useSetPassword() {
  return useMutation({
    mutationFn: async ({ id, password }: { id: number; password: string }) => {
      await api.put(`/utenti/${id}/password`, { password })
    },
  })
}

/** Deletes an utente. */
export function useDeleteUtente() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/utenti/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: UTENTI_KEY })
    },
  })
}

/** Lists ruoli with pagination. */
export function useRuoli(page: number, pageSize: number) {
  return useQuery({
    queryKey: [...RUOLI_KEY, page, pageSize],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<Ruolo>>("/ruoli/", {
        params: { page, page_size: pageSize },
      })
      return data
    },
    placeholderData: (previous) => previous,
  })
}

/** Creates a new ruolo. */
export function useCreateRuolo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateRuoloInput) => {
      const { data } = await api.post<Ruolo>("/ruoli/", input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RUOLI_KEY })
    },
  })
}

/** Updates an existing ruolo. */
export function useUpdateRuolo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: UpdateRuoloInput }) => {
      const { data } = await api.patch<Ruolo>(`/ruoli/${id}`, input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RUOLI_KEY })
    },
  })
}

/** Deletes a ruolo. */
export function useDeleteRuolo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/ruoli/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RUOLI_KEY })
    },
  })
}

/** Loads the available permessi. Long-lived: the catalogue rarely changes. */
export function usePermessi() {
  return useQuery({
    queryKey: PERMESSI_KEY,
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<Permesso>>("/permessi/", {
        params: { page_size: 20 },
      })
      return data.items
    },
    staleTime: 10 * 60 * 1000,
  })
}
