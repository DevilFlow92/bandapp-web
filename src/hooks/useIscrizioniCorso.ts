import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"
import type { IscrizioneCorso, PagedResponse } from "@/types/iscrizione_corso"

export const ISCRIZIONI_CORSO_KEY = ["iscrizioni_corso"] as const

/**
 * Lists iscrizioni for a specific corso, with server-side pagination.
 */
export function useIscrizioniCorsoByCorso(
  corsoId: number,
  page: number = 1,
  pageSize: number = 100,
  enabled = true,
) {
  return useQuery({
    queryKey: [...ISCRIZIONI_CORSO_KEY, corsoId, page, pageSize],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<IscrizioneCorso>>("/iscrizioni-corso/", {
        params: { corso_id: corsoId, page, page_size: pageSize },
      })
      return data
    },
    enabled: enabled && corsoId > 0,
  })
}
