import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import type {
  IscrizioneCorso,
  PagedResponse,
  StatoIscrizioneCorsoNested,
} from "@/types/iscrizione_corso"

export const ISCRIZIONI_CORSO_KEY = ["iscrizioni_corso"] as const

export interface CreateIscrizioneCorsoInput {
  corso_id: number
  persona_id: number
  stato_iscrizione_corso_codice: number
  documento_id?: number | null
  data_iscrizione: string // ISO date
  note?: string | null
}

export type UpdateIscrizioneCorsoInput = Partial<CreateIscrizioneCorsoInput>

/**
 * Lists iscrizioni for a specific corso, with server-side pagination.
 */
export function useIscrizioniCorsoByCorso(
  corsoId: number,
  page: number = 1,
  pageSize: number = 100,
  enabled = true,
) {
  return useQuery({
    queryKey: [...ISCRIZIONI_CORSO_KEY, corsoId, page, pageSize],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<IscrizioneCorso>>("/iscrizioni-corso/", {
        params: { corso_id: corsoId, page, page_size: pageSize },
      })
      return data
    },
    enabled: enabled && corsoId > 0,
  })
}

/** Creates a new iscrizione corso. */
export function useCreateIscrizioneCorso() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateIscrizioneCorsoInput) => {
      const { data } = await api.post<IscrizioneCorso>("/iscrizioni-corso/", input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ISCRIZIONI_CORSO_KEY })
    },
  })
}

/** Updates an existing iscrizione corso. */
export function useUpdateIscrizioneCorso() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: UpdateIscrizioneCorsoInput }) => {
      const { data } = await api.patch<IscrizioneCorso>(`/iscrizioni-corso/${id}`, input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ISCRIZIONI_CORSO_KEY })
    },
  })
}

/** Deletes an iscrizione corso. */
export function useDeleteIscrizioneCorso() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/iscrizioni-corso/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ISCRIZIONI_CORSO_KEY })
    },
  })
}

/** Loads the stati-iscrizione-corso lookup (Richiesta/Confermata/Annullata/Completata). */
export function useLookupStatiIscrizioneCorso() {
  return useQuery({
    queryKey: ["lookup", "stati-iscrizione-corso"],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<StatoIscrizioneCorsoNested>>(
        "/stati-iscrizione-corso/",
        { params: { page_size: 100 } },
      )
      return data.items
    },
    staleTime: 10 * 60 * 1000,
  })
}
