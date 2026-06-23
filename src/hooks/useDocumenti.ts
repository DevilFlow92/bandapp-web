import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api, { API_URL } from "@/lib/api"
import type { PagedResponse } from "@/types/socio"
import type { Documento, TipoDocumento } from "@/types/documento"

export const DOCUMENTI_KEY = ["documenti"] as const

/**
 * Lists documenti with pagination, optionally filtered by tipo documento.
 */
export function useDocumenti(page: number, pageSize: number, tipoDocumentoCodice?: number) {
  return useQuery({
    queryKey: [...DOCUMENTI_KEY, page, pageSize, tipoDocumentoCodice ?? null],
    queryFn: async () => {
      const params: Record<string, number> = { page, page_size: pageSize }
      if (tipoDocumentoCodice !== undefined) params.tipo_documento_codice = tipoDocumentoCodice
      const { data } = await api.get<PagedResponse<Documento>>("/documenti/", {
        params,
      })
      return data
    },
    placeholderData: (previous) => previous,
  })
}

export interface UploadDocumentoInput {
  file: File
  tipo_documento_codice?: number
  note?: string
}

/**
 * Uploads a documento via POST /documenti/ as multipart form-data. The tipo and
 * note travel as query params, the file as the single `file` form field.
 */
export function useUploadDocumento() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ file, tipo_documento_codice, note }: UploadDocumentoInput) => {
      const formData = new FormData()
      formData.append("file", file)
      const params: Record<string, string | number> = {}
      if (tipo_documento_codice !== undefined) params.tipo_documento_codice = tipo_documento_codice
      if (note && note.trim()) params.note = note.trim()
      const { data } = await api.post<Documento>("/documenti/", formData, {
        params,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENTI_KEY })
    },
  })
}

/** Deletes a documento. */
export function useDeleteDocumento() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/documenti/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENTI_KEY })
    },
  })
}

/** Opens a documento PDF inline in a new tab via the backend preview endpoint. */
export function previewDocumento(id: number): void {
  window.open(`${API_URL}/documenti/${id}/preview`, "_blank", "noopener,noreferrer")
}

/** Downloads a documento via an authenticated (cookie) request and saves it. */
export async function downloadDocumento(id: number, nome: string): Promise<void> {
  const { data } = await api.get<Blob>(`/documenti/${id}/download`, {
    responseType: "blob",
  })
  const url = URL.createObjectURL(data)
  const link = document.createElement("a")
  link.href = url
  link.download = nome
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/** Loads the tipi-documento lookup. */
export function useLookupTipiDocumento() {
  return useQuery({
    queryKey: ["lookup", "tipi-documento"],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<TipoDocumento>>("/tipi-documento/", {
        params: { page_size: 20 },
      })
      return data.items
    },
    staleTime: 10 * 60 * 1000,
  })
}
