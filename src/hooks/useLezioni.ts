import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"
import type { Lezione, PagedResponse } from "@/types/lezione"

export const LEZIONI_KEY = ["lezioni"] as const

/**
 * Lists lezioni for a specific corso, with server-side pagination.
 */
export function useLezioniByCorso(
  corsoId: number,
  page: number = 1,
  pageSize: number = 100,
  enabled = true,
) {
  return useQuery({
    queryKey: [...LEZIONI_KEY, corsoId, page, pageSize],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<Lezione>>("/lezioni/", {
        params: { corso_id: corsoId, page, page_size: pageSize },
      })
      return data
    },
    enabled: enabled && corsoId > 0,
  })
}
