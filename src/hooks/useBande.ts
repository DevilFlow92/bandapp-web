import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"
import type { Banda } from "@/types/banda"
import type { PagedResponse } from "@/types/socio"

/** Loads the bande lookup (up to 100 entries). No auth required. */
export function useBande() {
  return useQuery({
    queryKey: ["bande"],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<Banda>>("/bande", {
        params: { page_size: 100 },
      })
      return data.items
    },
    staleTime: 10 * 60 * 1000,
  })
}

export function useBandePublic() {
  return useQuery({
    queryKey: ["bande", "public"],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<{ codice: number; descrizione: string }>>(
        "/bande/public",
        { params: { page_size: 50 } },
      )
      return data.items
    },
    staleTime: 10 * 60 * 1000,
  })
}
