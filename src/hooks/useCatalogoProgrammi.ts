import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import type { Lookup, PagedResponse } from "@/types/socio"
import type { VoceProgrammaCatalogo } from "@/types/voce_programma_catalogo"

export const CATALOGO_PROGRAMMI_KEY = ["catalogo-programmi"] as const

const LOOKUP_STALE_TIME = 10 * 60 * 1000

export interface CreateVoceCatalogoInput {
  tipo_corso_codice: number
  categoria_codice: number
  testo: string
  livello: number
  attiva?: boolean
}

export type UpdateVoceCatalogoInput = Partial<Omit<CreateVoceCatalogoInput, "tipo_corso_codice">>

export interface CatalogoProgrammiFilters {
  tipoCorsoCodice?: number
  attiva?: boolean
}

/** Lists the catalogo voci programma with server-side pagination, for the management page. */
export function useCatalogoProgrammi(
  page: number,
  pageSize: number,
  filters: CatalogoProgrammiFilters,
  enabled = true,
) {
  return useQuery({
    queryKey: [
      ...CATALOGO_PROGRAMMI_KEY,
      page,
      pageSize,
      filters.tipoCorsoCodice ?? null,
      filters.attiva ?? null,
    ],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<VoceProgrammaCatalogo>>("/catalogo-programmi/", {
        params: {
          page,
          page_size: pageSize,
          tipo_corso_codice: filters.tipoCorsoCodice,
          attiva: filters.attiva,
        },
      })
      return data
    },
    placeholderData: (previous) => previous,
    enabled,
  })
}

/** Loads the active catalogo voci for a tipo corso, for the scheda alunno voci select. */
export function useCatalogoProgrammiAttivo(tipoCorsoCodice: number, enabled = true) {
  return useQuery({
    queryKey: [...CATALOGO_PROGRAMMI_KEY, "attivo", tipoCorsoCodice],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<VoceProgrammaCatalogo>>("/catalogo-programmi/", {
        params: { tipo_corso_codice: tipoCorsoCodice, attiva: true, page: 1, page_size: 100 },
      })
      return data.items
    },
    enabled: enabled && tipoCorsoCodice > 0,
  })
}

/** Creates a new voce di catalogo. Fails with 409 on a duplicate (tipo corso, testo). */
export function useCreateVoceCatalogo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateVoceCatalogoInput) => {
      const { data } = await api.post<VoceProgrammaCatalogo>("/catalogo-programmi/", input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATALOGO_PROGRAMMI_KEY })
    },
  })
}

/**
 * Updates an existing voce di catalogo (categoria/testo/livello/attiva). Il
 * "delete" esposto dal backend è un PATCH `{attiva: false}`: nessuna DELETE
 * fisica, per non invalidare i riferimenti storici da schede alunno.
 */
export function useUpdateVoceCatalogo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: UpdateVoceCatalogoInput }) => {
      const { data } = await api.patch<VoceProgrammaCatalogo>(`/catalogo-programmi/${id}`, input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATALOGO_PROGRAMMI_KEY })
    },
  })
}

/** Loads the categorie voce programma lookup. */
export function useLookupCategorieVoceProgramma() {
  return useQuery({
    queryKey: ["lookup", "categorie-voce-programma"],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<Lookup>>("/categorie-voce-programma/", {
        params: { page_size: 100 },
      })
      return data.items
    },
    staleTime: LOOKUP_STALE_TIME,
  })
}
