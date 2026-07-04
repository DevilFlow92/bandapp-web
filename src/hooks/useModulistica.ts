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
}

export interface UpdateTemplateInput {
  nome?: string
  descrizione?: string | null
  contenuto_json?: object
  entita_richieste?: string[]
}

export interface GenerateTemplateInput {
  id: number
  entities: Record<string, number>
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

export function useCreateTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateTemplateInput) => {
      const { data } = await api.post<Template>("/templates/", {
        nome: input.nome,
        descrizione: input.descrizione ?? null,
        contenuto_json: input.contenuto_json,
        entita_richieste: input.entita_richieste,
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
    mutationFn: async ({ id, entities }: GenerateTemplateInput) => {
      const { data } = await api.post<Documento>(`/templates/${id}/generate/docx`, { entities })
      return data
    },
  })
}

export function useGeneratePdf() {
  return useMutation({
    mutationFn: async ({ id, entities }: GenerateTemplateInput) => {
      const { data } = await api.post<Documento>(`/templates/${id}/generate/pdf`, { entities })
      return data
    },
  })
}
