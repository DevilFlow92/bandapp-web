import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { isAxiosError } from "axios"
import api, { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import type {
  ConfigurazioneBandaAnno,
  PagedResponse,
  VoceContabilitaInConfig,
} from "@/types/configurazione-anno"

export const CONFIGURAZIONI_ANNO_KEY = ["configurazioni-banda-anno"] as const

const VOCI_PAGE_SIZE = 100
const LOOKUP_STALE_TIME = 5 * 60 * 1000

export interface CreateConfigurazioneAnnoInput {
  banda_codice: number
  anno: number
  quota_annuale_attesa: string
  saldo_iniziale_cassa: string
  saldo_iniziale_banca: string
  voce_contabilita_quote_id?: number | null
}

export type UpdateConfigurazioneAnnoInput = Partial<
  Omit<CreateConfigurazioneAnnoInput, "banda_codice" | "anno">
>

/** Lists the year configurations for a banda. Disabled until a banda is set. */
export function useConfigurazioniBandaAnno(
  bandaCodice: number,
  page: number,
  pageSize: number,
  enabled = true,
) {
  return useQuery({
    queryKey: [...CONFIGURAZIONI_ANNO_KEY, bandaCodice, page, pageSize],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<ConfigurazioneBandaAnno>>(
        "/configurazioni-banda-anno/",
        { params: { banda_codice: bandaCodice, page, page_size: pageSize } },
      )
      return data
    },
    placeholderData: (previous) => previous,
    enabled,
  })
}

/** Creates a new year configuration. Fails with 409 on a duplicate year. */
export function useCreateConfigurazioneAnno() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateConfigurazioneAnnoInput) => {
      const { data } = await api.post<ConfigurazioneBandaAnno>("/configurazioni-banda-anno/", input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONFIGURAZIONI_ANNO_KEY })
    },
  })
}

/** Updates a year configuration. Fails with 409 if the year is closed. */
export function useUpdateConfigurazioneAnno() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: UpdateConfigurazioneAnnoInput }) => {
      const { data } = await api.patch<ConfigurazioneBandaAnno>(
        `/configurazioni-banda-anno/${id}`,
        input,
      )
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONFIGURAZIONI_ANNO_KEY })
    },
  })
}

/** Closes a year. Fails with 409 if it is already closed. */
export function useChiudiAnno() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<ConfigurazioneBandaAnno>(
        `/configurazioni-banda-anno/${id}/chiudi`,
      )
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONFIGURAZIONI_ANNO_KEY })
    },
  })
}

/**
 * Reopens a closed year. Superuser only: a 403 surfaces a dedicated toast.
 * Fails with 409 if the year is already open.
 */
export function useRiapriAnno() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<ConfigurazioneBandaAnno>(
        `/configurazioni-banda-anno/${id}/riapri`,
      )
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONFIGURAZIONI_ANNO_KEY })
      toast({ title: "Anno riaperto" })
    },
    onError: (error) => {
      if (isAxiosError(error) && error.response?.status === 403) {
        toast({
          variant: "destructive",
          title: "Errore",
          description: "Solo un superuser può riaprire un anno chiuso.",
        })
        return
      }
      toast({
        variant: "destructive",
        title: "Errore",
        description: getErrorMessage(error),
      })
    },
  })
}

/** Deletes a year configuration. Fails with 409 if the year is closed. */
export function useDeleteConfigurazioneAnno() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/configurazioni-banda-anno/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONFIGURAZIONI_ANNO_KEY })
    },
  })
}

/** Loads the voci contabilità of a banda for the "voce quote" select. */
export function useLookupVociContabilita(bandaCodice: number, enabled = true) {
  return useQuery({
    queryKey: ["lookup", "voci-contabilita", bandaCodice],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<VoceContabilitaInConfig>>("/voci-contabilita/", {
        params: { banda_codice: bandaCodice, page_size: VOCI_PAGE_SIZE },
      })
      return data.items
    },
    enabled,
    staleTime: LOOKUP_STALE_TIME,
  })
}
