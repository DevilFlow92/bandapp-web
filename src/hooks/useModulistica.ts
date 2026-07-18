import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import type { PagedResponse } from "@/types/socio"
import type { Documento } from "@/types/documento"
import type { Template } from "@/types/modulistica"

export { downloadDocumento } from "@/hooks/useDocumenti"

const TEMPLATES_KEY = ["templates"] as const

export interface CreateTemplateInput {
  nome: string
  descrizione?: string | null
  contenuto_json: object
  entita_richieste: string[]
  sotto_cartella_id?: number | null
}

export interface UpdateTemplateInput {
  nome?: string
  descrizione?: string | null
  contenuto_json?: object
  entita_richieste?: string[]
  sotto_cartella_id?: number | null
}

export interface GenerateTemplateInput {
  id: number
  contenuto_json: object
  entities: Record<string, number>
  nome_file?: string
}

export interface PreviewTemplateInput {
  id: number
  contenuto_json: object
  entities: Record<string, number>
}

export interface TemplatePreviewResponse {
  html: string
}

export function useTemplates(page: number, pageSize: number) {
  return useQuery({
    queryKey: [...TEMPLATES_KEY, page, pageSize],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<Template>>("/templates/", {
        params: { page, page_size: pageSize },
      })
      return data
    },
    placeholderData: (prev) => prev,
  })
}

export function useTemplate(id: number) {
  return useQuery({
    queryKey: [...TEMPLATES_KEY, id],
    queryFn: async () => {
      const { data } = await api.get<Template>(`/templates/${id}`)
      return data
    },
    enabled: Number.isFinite(id),
  })
}

export function useCreateTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateTemplateInput) => {
      const { data } = await api.post<Template>("/templates/", {
        nome: input.nome,
        descrizione: input.descrizione ?? null,
        contenuto_json: input.contenuto_json,
        entita_richieste: input.entita_richieste,
        sotto_cartella_id: input.sotto_cartella_id ?? null,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY })
    },
  })
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: UpdateTemplateInput }) => {
      const { data } = await api.patch<Template>(`/templates/${id}`, input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY })
    },
  })
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/templates/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY })
    },
  })
}

export function useGenerateDocx() {
  return useMutation({
    mutationFn: async ({ id, contenuto_json, entities, nome_file }: GenerateTemplateInput) => {
      const { data } = await api.post<Documento>(`/templates/${id}/generate/docx`, {
        contenuto_json,
        entities,
        ...(nome_file ? { nome_file } : {}),
      })
      return data
    },
  })
}

export function useGeneratePdf() {
  return useMutation({
    mutationFn: async ({ id, contenuto_json, entities, nome_file }: GenerateTemplateInput) => {
      const { data } = await api.post<Documento>(`/templates/${id}/generate/pdf`, {
        contenuto_json,
        entities,
        ...(nome_file ? { nome_file } : {}),
      })
      return data
    },
  })
}

/** Renders a template preview with mergefields resolved against real entity data. */
export function usePreviewTemplate() {
  return useMutation({
    mutationFn: async ({ id, contenuto_json, entities }: PreviewTemplateInput) => {
      const { data } = await api.post<TemplatePreviewResponse>(`/templates/${id}/preview`, {
        contenuto_json,
        entities,
      })
      return data
    },
  })
}
