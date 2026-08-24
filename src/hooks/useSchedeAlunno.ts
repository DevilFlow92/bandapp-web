import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import type { PagedResponse, SchedaAlunno } from "@/types/scheda_alunno"
import type { SchedaAlunnoVoce, StatoVoceProgramma } from "@/types/scheda_alunno_voce"

export const SCHEDE_ALUNNO_KEY = ["schede_alunno"] as const

export interface CreateSchedaAlunnoInput {
  iscrizione_corso_id: number
  note?: string | null
}

export type UpdateSchedaAlunnoInput = Partial<Omit<CreateSchedaAlunnoInput, "iscrizione_corso_id">>

/**
 * Fetches the scheda alunno di una iscrizione corso (relazione 1:1). Ritorna
 * l'item singolo se esiste, altrimenti null: il chiamante non deve
 * reimplementare la logica "items[0] se presente".
 */
export function useSchedaAlunno(iscrizioneCorsoId: number, enabled = true) {
  return useQuery({
    queryKey: [...SCHEDE_ALUNNO_KEY, iscrizioneCorsoId],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<SchedaAlunno>>("/schede-alunno/", {
        params: { iscrizione_corso_id: iscrizioneCorsoId, page: 1, page_size: 1 },
      })
      return data.items[0] ?? null
    },
    enabled: enabled && iscrizioneCorsoId > 0,
  })
}

/** Crea la scheda alunno di una iscrizione corso. 409 se ne esiste già una. */
export function useCreateSchedaAlunno() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateSchedaAlunnoInput) => {
      const { data } = await api.post<SchedaAlunno>("/schede-alunno/", input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHEDE_ALUNNO_KEY })
    },
  })
}

/** Aggiorna le note della scheda alunno. */
export function useUpdateSchedaAlunno() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: UpdateSchedaAlunnoInput }) => {
      const { data } = await api.patch<SchedaAlunno>(`/schede-alunno/${id}`, input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHEDE_ALUNNO_KEY })
    },
  })
}

export interface CreateSchedaAlunnoVoceInput {
  voce_catalogo_id: number
  stato: StatoVoceProgramma
  dettaglio?: string | null
  ordine: number
}

export type UpdateSchedaAlunnoVoceInput = Partial<
  Omit<CreateSchedaAlunnoVoceInput, "voce_catalogo_id">
>

/**
 * Crea una voce di programma sulla scheda alunno. Le voci arrivano annidate
 * nella `SchedaAlunnoResponse` (campo `voci`), quindi l'invalidazione è
 * sulla stessa `SCHEDE_ALUNNO_KEY` della scheda: non serve una query key
 * dedicata alle voci.
 */
export function useCreateSchedaAlunnoVoce() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      schedaAlunnoId,
      input,
    }: {
      schedaAlunnoId: number
      input: CreateSchedaAlunnoVoceInput
    }) => {
      const { data } = await api.post<SchedaAlunnoVoce>(
        `/schede-alunno/${schedaAlunnoId}/voci`,
        input,
      )
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHEDE_ALUNNO_KEY })
    },
  })
}

/** Aggiorna stato/dettaglio/ordine di una voce. `voce_catalogo_id` non è modificabile. */
export function useUpdateSchedaAlunnoVoce() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      schedaAlunnoId,
      voceId,
      input,
    }: {
      schedaAlunnoId: number
      voceId: number
      input: UpdateSchedaAlunnoVoceInput
    }) => {
      const { data } = await api.patch<SchedaAlunnoVoce>(
        `/schede-alunno/${schedaAlunnoId}/voci/${voceId}`,
        input,
      )
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHEDE_ALUNNO_KEY })
    },
  })
}

/** Rimuove una voce dalla scheda alunno. */
export function useDeleteSchedaAlunnoVoce() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ schedaAlunnoId, voceId }: { schedaAlunnoId: number; voceId: number }) => {
      await api.delete(`/schede-alunno/${schedaAlunnoId}/voci/${voceId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHEDE_ALUNNO_KEY })
    },
  })
}
