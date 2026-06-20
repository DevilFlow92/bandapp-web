import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"
import type { Lookup, PagedResponse } from "@/types/socio"

const LOOKUP_STALE_TIME = 10 * 60 * 1000

/** Loads the stati lookup (up to 100 entries). */
export function useStati() {
  return useQuery({
    queryKey: ["lookup", "stati"],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<Lookup>>("/stati/", {
        params: { page_size: 100 },
      })
      return data.items
    },
    staleTime: LOOKUP_STALE_TIME,
  })
}

/** Loads the regioni for a given stato. Disabled until a stato is selected. */
export function useRegioni(statoCodice?: number) {
  return useQuery({
    queryKey: ["lookup", "regioni", statoCodice],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<Lookup>>("/regioni/", {
        params: { page_size: 100, stato_codice: statoCodice },
      })
      return data.items
    },
    enabled: statoCodice != null,
    staleTime: LOOKUP_STALE_TIME,
  })
}

/** Loads the province for a given regione. Disabled until a regione is selected. */
export function useProvince(regioneCodice?: number) {
  return useQuery({
    queryKey: ["lookup", "province", regioneCodice],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<Lookup>>("/province/", {
        params: { page_size: 100, regione_codice: regioneCodice },
      })
      return data.items
    },
    enabled: regioneCodice != null,
    staleTime: LOOKUP_STALE_TIME,
  })
}

/** Loads the comuni for a given provincia. Disabled until a provincia is selected. */
export function useComuni(provinciaCodice?: number) {
  return useQuery({
    queryKey: ["lookup", "comuni", provinciaCodice],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<Lookup>>("/comuni/", {
        params: { page_size: 200, provincia_codice: provinciaCodice },
      })
      return data.items
    },
    enabled: provinciaCodice != null,
    staleTime: LOOKUP_STALE_TIME,
  })
}
