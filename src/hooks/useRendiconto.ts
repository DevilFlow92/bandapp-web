import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"
import type { RendicontoResponse, RendicontoMensileResponse } from "@/types/rendiconto"

export function useRendiconto(bandaCodice: number, anno: number, enabled = true) {
  return useQuery({
    queryKey: ["rendiconto", bandaCodice, anno],
    queryFn: async () => {
      const { data } = await api.get<RendicontoResponse>("/contabilita/rendiconto/", {
        params: { banda_codice: bandaCodice, anno },
      })
      return data
    },
    enabled,
  })
}

export function useRendicontoMensile(bandaCodice: number, anno: number, enabled = true) {
  return useQuery({
    queryKey: ["rendiconto-mensile", bandaCodice, anno],
    queryFn: async () => {
      const { data } = await api.get<RendicontoMensileResponse>("/contabilita/rendiconto/mensile", {
        params: { banda_codice: bandaCodice, anno },
      })
      return data
    },
    enabled,
  })
}

export async function downloadRendicontoPdf(bandaCodice: number, anno: number): Promise<void> {
  const { data } = await api.get<Blob>("/contabilita/rendiconto/export/pdf", {
    params: { banda_codice: bandaCodice, anno },
    responseType: "blob",
  })
  const url = URL.createObjectURL(data)
  const link = document.createElement("a")
  link.href = url
  link.download = `rendiconto_${anno}.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function downloadRendicontoXlsx(bandaCodice: number, anno: number): Promise<void> {
  const { data } = await api.get<Blob>("/contabilita/rendiconto/export/xlsx", {
    params: { banda_codice: bandaCodice, anno },
    responseType: "blob",
  })
  const url = URL.createObjectURL(data)
  const link = document.createElement("a")
  link.href = url
  link.download = `rendiconto_${anno}.xlsx`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
