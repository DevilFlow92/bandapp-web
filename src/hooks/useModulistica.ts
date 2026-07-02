import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import type { PagedResponse } from "@/types/socio"
import type { Template } from "@/types/modulistica"

const TEMPLATES_KEY = ["templates"] as const

export interface CreateTemplateInput {
  nome: string
  descrizione?: string | null
}

export interface UpdateTemplateInput {
  nome?: string
  descrizione?: string | null
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
    mutationFn: async ({
      file,
      nome,
      descrizione,
    }: {
      file: File
      nome: string
      descrizione?: string | null
    }) => {
      const formData = new FormData()
      formData.append("file", file)
      const { data: doc } = await api.post<{ id: number }>("/documenti/", formData)
      const { data } = await api.post<Template>("/templates/", {
        documento_id: doc.id,
        nome,
        descrizione: descrizione ?? null,
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

export async function downloadTemplate(templateId: number, nome?: string | null): Promise<void> {
  const { data } = await api.get<Blob>(`/templates/${templateId}/download`, {
    responseType: "blob",
  })
  const url = URL.createObjectURL(data)
  const link = document.createElement("a")
  link.href = url
  link.download = nome ?? `template-${templateId}`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
