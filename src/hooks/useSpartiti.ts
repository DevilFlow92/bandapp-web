import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import type {
  DocumentoResponse,
  Lookup,
  NomeParte,
  PagedResponse,
  Spartito,
} from "@/types/spartito"

export const NOME_PARTI_KEY = ["nome-parti"] as const
export const SPARTITI_KEY = ["spartiti"] as const

export interface CreateNomeParteInput {
  nome: string
  tipo_spartito_codice: number
  banda_codice: number
  url_riferimento?: string | null
  note?: string | null
}

export interface UpdateNomeParteInput {
  nome?: string
  tipo_spartito_codice?: number
  url_riferimento?: string | null
  note?: string | null
}

export function useNomeParti(
  bandaCodice: number,
  page: number,
  pageSize: number,
  tipoSpartitoCode?: number,
) {
  return useQuery({
    queryKey: [...NOME_PARTI_KEY, bandaCodice, page, pageSize, tipoSpartitoCode ?? null],
    queryFn: async () => {
      const params: Record<string, number> = {
        banda_codice: bandaCodice,
        page,
        page_size: pageSize,
      }
      if (tipoSpartitoCode !== undefined) params.tipo_spartito_codice = tipoSpartitoCode
      const { data } = await api.get<PagedResponse<NomeParte>>("/nome-parti/", { params })
      return data
    },
    enabled: !!bandaCodice,
    placeholderData: (previous) => previous,
  })
}

export function useNomeParte(id: number | null) {
  return useQuery({
    queryKey: [...NOME_PARTI_KEY, id],
    queryFn: async () => {
      const { data } = await api.get<NomeParte>(`/nome-parti/${id}`)
      return data
    },
    enabled: id !== null,
  })
}

export function useCreateNomeParte() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateNomeParteInput) => {
      const { data } = await api.post<NomeParte>("/nome-parti/", input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOME_PARTI_KEY })
    },
  })
}

export function useUpdateNomeParte() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: UpdateNomeParteInput }) => {
      const { data } = await api.patch<NomeParte>(`/nome-parti/${id}`, input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOME_PARTI_KEY })
    },
  })
}

export function useDeleteNomeParte() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/nome-parti/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOME_PARTI_KEY })
    },
  })
}

/** Tipo documento "Spartito" — used when uploading a spartito's file. */
const TIPO_DOCUMENTO_SPARTITO = 3

/**
 * Uploads a file to POST /documenti/ as multipart form-data. The tipo and note
 * travel as query params, the file as the single `file` form field.
 */
async function uploadDocumento(
  file: File,
  tipoCodice: number,
  note?: string | null,
): Promise<DocumentoResponse> {
  const formData = new FormData()
  formData.append("file", file)
  const params: Record<string, string | number> = {
    tipo_documento_codice: tipoCodice,
  }
  if (note && note.trim()) params.note = note.trim()
  const { data } = await api.post<DocumentoResponse>("/documenti/", formData, {
    params,
  })
  return data
}

/** Downloads a documento via an authenticated (cookie) request and saves it. */
export async function downloadDocumento(documentoId: number, nome?: string | null): Promise<void> {
  const { data } = await api.get<Blob>(`/documenti/${documentoId}/download`, {
    responseType: "blob",
  })
  const url = URL.createObjectURL(data)
  const link = document.createElement("a")
  link.href = url
  link.download = nome ?? `documento-${documentoId}`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export interface CreateSpartitoInput {
  file?: File | null
  note?: string | null
  nome_parte_id: number
  banda_codice: number
  tipo_spartito_codice: number
  strumento_codice?: number | null
  scaffale?: string | null
  ripiano?: string | null
  cartella?: string | null
}

export interface UpdateSpartitoInput {
  nome_parte_id?: number
  tipo_spartito_codice?: number
  strumento_codice?: number | null
  scaffale?: string | null
  ripiano?: string | null
  cartella?: string | null
}

/**
 * Lists spartiti with pagination, scoped to the selected banda and optionally
 * filtered by tipo and strumento. Disabled until a banda is selected.
 */
export function useSpartiti(
  page: number,
  pageSize: number,
  bandaCodice: number,
  tipoSpartitoCode?: number,
  strumentoCode?: number,
  nomeParteId?: number,
) {
  return useQuery({
    queryKey: [
      ...SPARTITI_KEY,
      bandaCodice,
      page,
      pageSize,
      tipoSpartitoCode ?? null,
      strumentoCode ?? null,
      nomeParteId ?? null,
    ],
    queryFn: async () => {
      const params: Record<string, number> = {
        page,
        page_size: pageSize,
        banda_codice: bandaCodice,
      }
      if (tipoSpartitoCode !== undefined) params.tipo_spartito_codice = tipoSpartitoCode
      if (strumentoCode !== undefined) params.strumento_codice = strumentoCode
      if (nomeParteId !== undefined) params.nome_parte_id = nomeParteId
      const { data } = await api.get<PagedResponse<Spartito>>("/spartiti/", {
        params,
      })
      return data
    },
    placeholderData: (previous) => previous,
    enabled: !!bandaCodice,
  })
}

/**
 * Creates a spartito. It first uploads the document (POST /documenti/) and then
 * creates the spartito referencing the returned documento_id.
 */
export function useCreateSpartito() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ file, note, ...spartito }: CreateSpartitoInput) => {
      let documento_id: number | undefined
      if (file) {
        const documento = await uploadDocumento(file, TIPO_DOCUMENTO_SPARTITO, note)
        documento_id = documento.id
      }
      const { data } = await api.post<Spartito>("/spartiti/", {
        ...spartito,
        ...(documento_id !== undefined ? { documento_id } : {}),
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SPARTITI_KEY })
      queryClient.invalidateQueries({ queryKey: NOME_PARTI_KEY })
    },
  })
}

/** Updates an existing spartito (the linked documento is not changed). */
export function useUpdateSpartito() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: UpdateSpartitoInput }) => {
      const { data } = await api.patch<Spartito>(`/spartiti/${id}`, input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SPARTITI_KEY })
    },
  })
}

/** Deletes a spartito. */
export function useDeleteSpartito() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/spartiti/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SPARTITI_KEY })
      queryClient.invalidateQueries({ queryKey: NOME_PARTI_KEY })
    },
  })
}

/** Loads the tipi-spartito lookup. */
export function useLookupTipiSpartito() {
  return useQuery({
    queryKey: ["lookup", "tipi-spartito"],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<Lookup>>("/tipi-spartito/", {
        params: { page_size: 20 },
      })
      return data.items
    },
    staleTime: 10 * 60 * 1000,
  })
}

/** Uploads a documento of the given tipo. Reusable across document features. */
export function useUploadDocumento(tipoCodice: number) {
  return useMutation({
    mutationFn: ({ file, note }: { file: File; note?: string | null }) =>
      uploadDocumento(file, tipoCodice, note),
  })
}
