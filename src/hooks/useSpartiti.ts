import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import type {
  DocumentoResponse,
  Lookup,
  PagedResponse,
  Spartito,
} from "@/types/spartito"

export const SPARTITI_KEY = ["spartiti"] as const

/** Tipo documento "Spartito" — used when uploading a spartito's file. */
const TIPO_DOCUMENTO_SPARTITO = 3

/**
 * Uploads a file to POST /documenti/ as multipart form-data. The tipo and note
 * travel as query params, the file as the single `file` form field.
 */
async function uploadDocumento(
  file: File,
  tipoCodice: number,
  note?: string | null
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
export async function downloadDocumento(
  documentoId: number,
  nome?: string | null
): Promise<void> {
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
  file: File
  note?: string | null
  tipo_spartito_codice: number
  strumento_codice?: number | null
  scaffale?: string | null
  ripiano?: string | null
  cartella?: string | null
}

export interface UpdateSpartitoInput {
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
  strumentoCode?: number
) {
  return useQuery({
    queryKey: [
      ...SPARTITI_KEY,
      bandaCodice,
      page,
      pageSize,
      tipoSpartitoCode ?? null,
      strumentoCode ?? null,
    ],
    queryFn: async () => {
      const params: Record<string, number> = {
        page,
        page_size: pageSize,
        banda_codice: bandaCodice,
      }
      if (tipoSpartitoCode !== undefined)
        params.tipo_spartito_codice = tipoSpartitoCode
      if (strumentoCode !== undefined) params.strumento_codice = strumentoCode
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
      const documento = await uploadDocumento(
        file,
        TIPO_DOCUMENTO_SPARTITO,
        note
      )
      const { data } = await api.post<Spartito>("/spartiti/", {
        ...spartito,
        documento_id: documento.id,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SPARTITI_KEY })
    },
  })
}

/** Updates an existing spartito (the linked documento is not changed). */
export function useUpdateSpartito() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: number
      input: UpdateSpartitoInput
    }) => {
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
