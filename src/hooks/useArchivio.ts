import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { UseQueryOptions } from "@tanstack/react-query"
import api from "@/lib/api"
import type { MacroSezione, SottoCartella } from "@/types/archivio"

export const MACRO_SEZIONI_KEY = ["macro-sezioni"] as const
export const SOTTO_CARTELLE_KEY = ["sotto-cartelle"] as const

/** Loads the macro-sezioni lookup. These are static and never change at runtime. */
export function useMacroSezioni() {
  return useQuery({
    queryKey: MACRO_SEZIONI_KEY,
    queryFn: async () => {
      const { data } = await api.get<MacroSezione[]>("/macro-sezioni/", {
        params: { page_size: 20 },
      })
      return data
    },
    staleTime: 10 * 60 * 1000,
  })
}

/** Query options for the sotto-cartelle of a macro-sezione, reusable with useQuery or useQueries. */
export function sottoCartelleQueryOptions(
  macroSezioneCodice: number,
): UseQueryOptions<SottoCartella[]> {
  return {
    queryKey: [...SOTTO_CARTELLE_KEY, macroSezioneCodice],
    queryFn: async () => {
      const { data } = await api.get<SottoCartella[]>("/sotto-cartelle/", {
        params: { macro_sezione_codice: macroSezioneCodice },
      })
      return data
    },
  }
}

/** Lists sotto-cartelle for a macro-sezione. Disabled until a macro-sezione is selected. */
export function useSottoCartelle(macroSezioneCodice: number | null) {
  return useQuery({
    ...sottoCartelleQueryOptions(macroSezioneCodice ?? 0),
    enabled: macroSezioneCodice !== null,
  })
}

export interface CreateSottoCartellaInput {
  nome: string
  macro_sezione_codice: number
}

/** Creates a sotto-cartella. */
export function useCreateSottoCartella() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateSottoCartellaInput) => {
      const { data } = await api.post<SottoCartella>("/sotto-cartelle/", input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SOTTO_CARTELLE_KEY, exact: false })
    },
  })
}

/** Deletes a sotto-cartella. */
export function useDeleteSottoCartella() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/sotto-cartelle/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SOTTO_CARTELLE_KEY, exact: false })
    },
  })
}
