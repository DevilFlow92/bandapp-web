import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import type {
  Lookup,
  PagedResponse,
  Persona,
  Socio,
} from "@/types/socio"

export const SOCI_KEY = ["soci"] as const

export interface CreateSocioInput {
  codice_socio: string
  data_ingresso: string
  attivo: boolean
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

export interface Comune {
  codice: number
  nome: string
}

export interface PersonaSearchParams {
  nome?: string
  cognome?: string
  codice_fiscale?: string
}

/** Lists soci with server-side pagination, scoped to the selected banda. */
export function useSoci(
  page: number,
  pageSize: number,
  bandaCodice: number,
  enabled = true
) {
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
    mutationFn: async ({
      id,
      input,
    }: {
      id: number
      input: UpdateSocioInput
    }) => {
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

const COMUNI_PAGE_SIZE = 100

async function fetchComuniPage(page: number) {
  const { data } = await api.get<PagedResponse<Comune>>("/comuni/", {
    params: { page, page_size: COMUNI_PAGE_SIZE },
  })
  return data
}

/**
 * Loads the full comuni lookup. Comuni can exceed a single page, so we fetch
 * page 1, then fan out the remaining pages in parallel and merge all items.
 */
export function useLookupComuni() {
  return useQuery({
    queryKey: ["lookup", "comuni"],
    queryFn: async () => {
      const first = await fetchComuniPage(1)
      const totalPages = first.meta.total_pages
      if (totalPages <= 1) return first.items

      const rest = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, i) =>
          fetchComuniPage(i + 2)
        )
      )
      return rest.reduce((acc, page) => acc.concat(page.items), first.items)
    },
    staleTime: 10 * 60 * 1000,
  })
}
