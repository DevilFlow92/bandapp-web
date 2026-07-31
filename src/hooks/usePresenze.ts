import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import type { PagedResponse, Presenza, StatoPresenza } from "@/types/presenza"

export const PRESENZE_KEY = ["presenze"] as const

/**
 * Discriminates the organico's parent: a servizio o una prova, mutuamente
 * esclusivi. Resta a 2 rami perché è condiviso con RepertorioContainer e
 * LibrettoContainer (repertorio/libretto non esistono per le Lezioni).
 */
export type OrganicoContainer =
  { servizioId: number; provaId?: never } | { servizioId?: never; provaId: number }

/** Discriminante a 3 rami per le presenze: servizio, prova o lezione, mutuamente esclusivi. */
export type PresenzaContainer =
  | { servizioId: number; provaId?: never; lezioneId?: never }
  | { servizioId?: never; provaId: number; lezioneId?: never }
  | { servizioId?: never; provaId?: never; lezioneId: number }

export interface CreatePresenzaInput {
  servizio_id?: number | null
  prova_id?: number | null
  lezione_id?: number | null
  persona_id: number
  note?: string | null
}

export interface UpdatePresenzaInput {
  stato?: StatoPresenza | null
  note?: string | null
}

export interface BulkUpdatePresenzeItem {
  presenza_id: number
  stato?: StatoPresenza | null
  note?: string | null
}

/**
 * Lists the organico (presenze) of a single servizio or prova, persona
 * expanded. The endpoint caps page_size at 100; a servizio/prova's organico is
 * assumed to fit in a single page, mirroring the Ricevute/Iscrizioni panels
 * which also skip UI pagination for scoped child lists.
 */
export function useOrganico(container: PresenzaContainer) {
  const id = container.servizioId ?? container.provaId ?? container.lezioneId ?? 0
  const kind =
    container.servizioId != null ? "servizio" : container.provaId != null ? "prova" : "lezione"
  const path = `/presenze/${kind}/${id}`
  return useQuery({
    queryKey: [...PRESENZE_KEY, kind, id],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<Presenza>>(path, { params: { page_size: 100 } })
      return data
    },
    enabled: id > 0,
  })
}

/** Adds a persona to a servizio's or prova's organico. Stato starts unset (null). */
export function useCreatePresenza() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreatePresenzaInput) => {
      const { data } = await api.post<Presenza>("/presenze/", input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRESENZE_KEY })
    },
  })
}

/** Updates a presenza's stato and/or note. */
export function useUpdatePresenza() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: UpdatePresenzaInput }) => {
      const { data } = await api.patch<Presenza>(`/presenze/${id}`, input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRESENZE_KEY })
    },
  })
}

/**
 * Updates stato/note for several presenze in one request. All-or-nothing on
 * the backend: if any presenza_id is unknown or the presenze span more than
 * one servizio/prova, the whole batch is rejected (404/422) and nothing is
 * applied.
 */
export function useBulkUpdatePresenze() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (items: BulkUpdatePresenzeItem[]) => {
      const { data } = await api.patch<{ items: Presenza[] }>("/presenze/bulk", { items })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRESENZE_KEY })
    },
  })
}

/** Removes a persona from the organico. */
export function useDeletePresenza() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/presenze/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRESENZE_KEY })
    },
  })
}
