import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"
import type { Lookup, PagedResponse } from "@/types/socio"

const LOOKUP_STALE_TIME = 10 * 60 * 1000

/**
 * Loads the full stati lookup. There are ~243 stati spread over 3 pages, so we
 * fetch all three pages in parallel and merge them. Stati never change, so this
 * one-time cost is cached for the session.
 */
export function useStati() {
  return useQuery({
    queryKey: ["lookup", "stati"],
    queryFn: async () => {
      const pages = await Promise.all(
        [1, 2, 3].map((page) =>
          api.get<PagedResponse<Lookup>>("/stati/", {
            params: { page, page_size: 100 },
          }),
        ),
      )
      return pages.flatMap((res) => res.data.items)
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

/**
 * Loads the comuni for a given provincia. Disabled until a provincia is
 * selected. The backend caps page_size at 100 but some province have 300+
 * comuni, so we fetch page 1, then fan out the remaining pages in parallel and
 * merge them all. The result is cached per provincia.
 */
export function useComuni(provinciaCodice?: number) {
  return useQuery({
    queryKey: ["lookup", "comuni", provinciaCodice],
    queryFn: async () => {
      const fetchPage = async (page: number) => {
        const { data } = await api.get<PagedResponse<Lookup>>("/comuni/", {
          params: { page, page_size: 100, provincia_codice: provinciaCodice },
        })
        return data
      }

      const first = await fetchPage(1)
      const totalPages = first.meta.total_pages
      if (totalPages <= 1) return first.items

      const rest = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, i) => fetchPage(i + 2)),
      )
      return rest.reduce((acc, page) => acc.concat(page.items), first.items)
    },
    enabled: provinciaCodice != null,
    staleTime: LOOKUP_STALE_TIME,
  })
}
