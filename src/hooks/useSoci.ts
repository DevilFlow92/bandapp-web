import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import type { Lookup, PagedResponse, Persona, Socio } from "@/types/socio"

export const SOCI_KEY = ["soci"] as const

export interface CreateSocioInput {
  codice_socio: string
  data_ingresso: string
  strumento_codice?: number | null
  ruolo_banda_codice?: number | null
  persona_id: number
}

export type UpdateSocioInput = Partial<Omit<CreateSocioInput, "persona_id">>

export interface CreatePersonaInput {
  nome: string
  cognome: string
  codice_fiscale?: string | null
  data_nascita?: string | null
  comune_nascita_codice?: number | null
  banda_codice: number
}

export interface PersonaSearchParams {
  nome?: string
  cognome?: string
  codice_fiscale?: string
}

/** Lists soci with server-side pagination, scoped to the selected banda. */
export function useSoci(page: number, pageSize: number, bandaCodice: number, enabled = true) {
  return useQuery({
    queryKey: [...SOCI_KEY, bandaCodice, page, pageSize],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<Socio>>("/soci/", {
        params: { page, page_size: pageSize, banda_codice: bandaCodice },
      })
      return data
    },
    placeholderData: (previous) => previous,
    enabled,
  })
}

/** Loads every socio of a banda across all pages, for client-side derivations (e.g. codice_socio suggestion). */
export function useAllSoci(bandaCodice: number, enabled = true) {
  return useQuery({
    queryKey: [...SOCI_KEY, bandaCodice, "all"],
    queryFn: async () => {
      const pageSize = 100
      let items: Socio[] = []
      let totalPages = 1
      for (let page = 1; page <= totalPages; page += 1) {
        const { data } = await api.get<PagedResponse<Socio>>("/soci/", {
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

/** Loads a single socio by id, with nested persona, ruolo_banda and strumento. */
export function useSocio(id: number) {
  return useQuery({
    queryKey: [...SOCI_KEY, id],
    queryFn: async () => {
      const { data } = await api.get<Socio>(`/soci/${id}`)
      return data
    },
    enabled: id > 0,
  })
}

/** Creates a new socio. */
export function useCreateSocio() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateSocioInput) => {
      const { data } = await api.post<Socio>("/soci/", input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SOCI_KEY })
    },
  })
}

/** Updates an existing socio. */
export function useUpdateSocio() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: UpdateSocioInput }) => {
      const { data } = await api.patch<Socio>(`/soci/${id}`, input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SOCI_KEY })
    },
  })
}

/** Deletes a socio. */
export function useDeleteSocio() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/soci/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SOCI_KEY })
    },
  })
}

/**
 * Searches persone by a free-text query. The query is matched against both
 * nome and cognome. Only enabled once the query has at least 2 characters.
 */
export function useSearchPersone(query: string) {
  const trimmed = query.trim()
  return useQuery({
    queryKey: ["persone", "search", trimmed],
    queryFn: async () => {
      // The backend filters combine with AND, so we search the single query
      // term against `nome` only. Searching nome+cognome simultaneously would
      // require both fields to match the same term and return nothing.
      const params: PersonaSearchParams = { nome: trimmed }
      const { data } = await api.get<PagedResponse<Persona>>("/persone/", {
        params,
      })
      return data.items
    },
    enabled: trimmed.length >= 2,
  })
}

/** Creates a new persona. */
export function useCreatePersona() {
  return useMutation({
    mutationFn: async (input: CreatePersonaInput) => {
      const { data } = await api.post<Persona>("/persone/", input)
      return data
    },
  })
}

/** Loads the strumenti lookup (up to 100 entries). */
export function useLookupStrumenti() {
  return useQuery({
    queryKey: ["lookup", "strumenti"],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<Lookup>>("/strumenti/", {
        params: { page_size: 100 },
      })
      return data.items
    },
    staleTime: 10 * 60 * 1000,
  })
}

/** Loads the ruoli-banda lookup (up to 100 entries). */
export function useLookupRuoliBanda() {
  return useQuery({
    queryKey: ["lookup", "ruoli-banda"],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<Lookup>>("/ruoli-banda/", {
        params: { page_size: 100 },
      })
      return data.items
    },
    staleTime: 10 * 60 * 1000,
  })
}
