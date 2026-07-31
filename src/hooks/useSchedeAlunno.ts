import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import type { PagedResponse, SchedaAlunno } from "@/types/scheda_alunno"

export const SCHEDE_ALUNNO_KEY = ["schede_alunno"] as const

export interface CreateSchedaAlunnoInput {
  iscrizione_corso_id: number
  programma?: string | null
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

/** Aggiorna programma/note della scheda alunno. */
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
