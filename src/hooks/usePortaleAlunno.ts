import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"
import type { IscrizioneCorso, PagedResponse } from "@/types/iscrizione_corso"

export const ME_ISCRIZIONI_CORSO_KEY = ["me", "iscrizioni-corso"] as const

/** Lists the current user's own iscrizioni corso (portale alunno, read-only). */
export function useMieIscrizioniCorso(page: number = 1, pageSize: number = 100) {
  return useQuery({
    queryKey: [...ME_ISCRIZIONI_CORSO_KEY, page, pageSize],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<IscrizioneCorso>>("/me/iscrizioni-corso", {
        params: { page, page_size: pageSize },
      })
      return data
    },
  })
}
