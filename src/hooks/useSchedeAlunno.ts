import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import type { PagedResponse, SchedaAlunno } from "@/types/scheda_alunno"
import type { SchedaAlunnoMateriale } from "@/types/scheda_alunno_materiale"
import type { SchedaAlunnoVoce, StatoVoceProgramma } from "@/types/scheda_alunno_voce"
import type { SchedaAlunnoVoceStoricoResponse } from "@/types/scheda_alunno_voce_storico"

export const SCHEDE_ALUNNO_KEY = ["schede_alunno"] as const
export const SCHEDA_ALUNNO_STORICO_VOCI_KEY = ["schede_alunno", "storico-voci"] as const

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

/**
 * Storico dei cambi di stato delle voci di programma di una scheda alunno
 * (sola lettura, card #207 — dati raccolti da #214, mai esposti prima di
 * #219). Query key indipendente da ``SCHEDE_ALUNNO_KEY`` perché lo storico è
 * append-only e non è annidato nella ``SchedaAlunnoResponse``.
 */
export function useSchedaAlunnoStoricoVoci(
  schedaAlunnoId: number | null,
  page: number = 1,
  pageSize: number = 20,
) {
  return useQuery({
    queryKey: [...SCHEDA_ALUNNO_STORICO_VOCI_KEY, schedaAlunnoId, page, pageSize],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<SchedaAlunnoVoceStoricoResponse>>(
        `/schede-alunno/${schedaAlunnoId}/storico-voci`,
        { params: { page, page_size: pageSize } },
      )
      return data
    },
    enabled: schedaAlunnoId != null,
  })
}

export interface UploadSchedaAlunnoMaterialeFileInput {
  schedaAlunnoId: number
  titolo: string
  file: File
}

/**
 * Carica un materiale di tipo file sulla scheda alunno via multipart
 * form-data (stesso pattern di `useUploadDocumento`): il titolo viaggia come
 * campo form insieme al file, non come query param, perché il backend lo
 * legge con `Form(...)`.
 */
export function useUploadMaterialeFile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ schedaAlunnoId, titolo, file }: UploadSchedaAlunnoMaterialeFileInput) => {
      const formData = new FormData()
      formData.append("titolo", titolo)
      formData.append("file", file)
      const { data } = await api.post<SchedaAlunnoMateriale>(
        `/schede-alunno/${schedaAlunnoId}/materiali/file`,
        formData,
      )
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHEDE_ALUNNO_KEY })
    },
  })
}

export interface CreateSchedaAlunnoMaterialeLinkInput {
  schedaAlunnoId: number
  titolo: string
  url: string
}

/** Aggiunge un materiale di tipo link (nessun upload, solo titolo + url). */
export function useCreateMaterialeLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ schedaAlunnoId, titolo, url }: CreateSchedaAlunnoMaterialeLinkInput) => {
      const { data } = await api.post<SchedaAlunnoMateriale>(
        `/schede-alunno/${schedaAlunnoId}/materiali/link`,
        { titolo, url },
      )
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHEDE_ALUNNO_KEY })
    },
  })
}

/** Rimuove un materiale (file o link) dalla scheda alunno. */
export function useDeleteMateriale() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      schedaAlunnoId,
      materialeId,
    }: {
      schedaAlunnoId: number
      materialeId: number
    }) => {
      await api.delete(`/schede-alunno/${schedaAlunnoId}/materiali/${materialeId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHEDE_ALUNNO_KEY })
    },
  })
}

/**
 * Scarica un materiale di tipo file via richiesta autenticata (cookie di
 * sessione, stesso pattern di `downloadDocumento`): un link diretto
 * all'endpoint non porterebbe i cookie di sessione nella navigazione, quindi
 * il download passa da una richiesta blob esplicita.
 */
export async function downloadMateriale(
  schedaAlunnoId: number,
  materialeId: number,
  nomeFile: string,
): Promise<void> {
  const { data } = await api.get<Blob>(
    `/schede-alunno/${schedaAlunnoId}/materiali/${materialeId}/download`,
    { responseType: "blob" },
  )
  const url = URL.createObjectURL(data)
  const link = document.createElement("a")
  link.href = url
  link.download = nomeFile
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
