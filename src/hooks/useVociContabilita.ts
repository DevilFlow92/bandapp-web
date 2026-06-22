import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { isAxiosError } from "axios"
import api, { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import type { Lookup, PagedResponse } from "@/types/socio"
import type { VoceContabilita } from "@/types/voce-contabilita"

export const VOCI_CONTABILITA_KEY = ["voci-contabilita"] as const

const LOOKUP_STALE_TIME = 10 * 60 * 1000

export interface CreateVoceContabilitaInput {
  banda_codice: number
  voce_contabilita: string
  sezione_rendiconto_codice: number
  voce_rendiconto_codice: number
  sottovoce_rendiconto_codice: number
}

export type UpdateVoceContabilitaInput = Partial<Omit<CreateVoceContabilitaInput, "banda_codice">>

/** Lists the voci contabilità of a banda with server-side pagination. */
export function useVociContabilita(
  bandaCodice: number,
  page: number,
  pageSize: number,
  enabled = true,
) {
  return useQuery({
    queryKey: [...VOCI_CONTABILITA_KEY, bandaCodice, page, pageSize],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<VoceContabilita>>("/voci-contabilita/", {
        params: { banda_codice: bandaCodice, page, page_size: pageSize },
      })
      return data
    },
    placeholderData: (previous) => previous,
    enabled,
  })
}

/** Creates a new voce contabilità. Fails with 409 on a duplicate (banda, nome). */
export function useCreateVoceContabilita() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateVoceContabilitaInput) => {
      const { data } = await api.post<VoceContabilita>("/voci-contabilita/", input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VOCI_CONTABILITA_KEY })
    },
  })
}

/** Updates an existing voce contabilità. Fails with 409 on a duplicate (banda, nome). */
export function useUpdateVoceContabilita() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: UpdateVoceContabilitaInput }) => {
      const { data } = await api.patch<VoceContabilita>(`/voci-contabilita/${id}`, input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VOCI_CONTABILITA_KEY })
    },
  })
}

/**
 * Deletes a voce contabilità. Fails with 409 if it is referenced by a flusso
 * cassa or a year configuration; that surfaces a dedicated toast.
 */
export function useDeleteVoceContabilita() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/voci-contabilita/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VOCI_CONTABILITA_KEY })
    },
    onError: (error) => {
      const description =
        isAxiosError(error) && error.response?.status === 409
          ? "Impossibile eliminare: la voce è utilizzata da movimenti o configurazioni esistenti."
          : getErrorMessage(error)
      toast({ variant: "destructive", title: "Errore", description })
    },
  })
}

/** Loads the sezioni rendiconto lookup. */
export function useLookupSezioniRendiconto() {
  return useQuery({
    queryKey: ["lookup", "sezioni-rendiconto"],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<Lookup>>("/sezioni-rendiconto/", {
        params: { page_size: 100 },
      })
      return data.items
    },
    staleTime: LOOKUP_STALE_TIME,
  })
}

/** Loads the voci rendiconto for a sezione. Disabled until a sezione is selected. */
export function useLookupVociRendiconto(sezioneCodice?: number) {
  return useQuery({
    queryKey: ["lookup", "voci-rendiconto", sezioneCodice],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<Lookup>>("/voci-rendiconto/", {
        params: { page_size: 100, sezione_codice: sezioneCodice },
      })
      return data.items
    },
    enabled: sezioneCodice != null,
    staleTime: LOOKUP_STALE_TIME,
  })
}

/** Loads the sottovoci rendiconto for a voce. Disabled until a voce is selected. */
export function useLookupSottovociRendiconto(voceCodice?: number) {
  return useQuery({
    queryKey: ["lookup", "sottovoci-rendiconto", voceCodice],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<Lookup>>("/sottovoci-rendiconto/", {
        params: { page_size: 100, voce_codice: voceCodice },
      })
      return data.items
    },
    enabled: voceCodice != null,
    staleTime: LOOKUP_STALE_TIME,
  })
}
