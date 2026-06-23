import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"
import type { CheckQuoteResponse } from "@/types/check-quote"

export function useCheckQuote(bandaCodice: number, anno: number, enabled = true) {
  return useQuery({
    queryKey: ["check-quote", bandaCodice, anno],
    queryFn: async () => {
      const { data } = await api.get<CheckQuoteResponse>("/contabilita/check-quote/", {
        params: { banda_codice: bandaCodice, anno },
      })
      return data
    },
    placeholderData: (previous) => previous,
    enabled,
  })
}
