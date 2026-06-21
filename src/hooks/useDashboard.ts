import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"
import type { PagedResponse } from "@/types/socio"
import type { Iscrizione } from "@/types/iscrizione"

export interface DashboardKPI {
  sociTotali: number
  sociAttivi: number
  serviziAnno: number
  iscrizioniAnno: number
}

const ISCRITTO_NON_ATTIVO = 3

/** Fetches a single page and returns the server-reported total item count. */
async function fetchTotal(path: string, params: Record<string, number>): Promise<number> {
  const { data } = await api.get<PagedResponse<unknown>>(path, {
    params: { ...params, page_size: 1 },
  })
  return data.meta.total_items
}

/**
 * Loads the four dashboard KPIs in parallel for the given banda. The four
 * endpoints are independent, so they are fetched concurrently via Promise.all.
 */
export function useDashboardKPI(bandaCodice: number) {
  const currentYear = new Date().getFullYear()

  const query = useQuery({
    queryKey: ["dashboard", "kpi", bandaCodice, currentYear],
    queryFn: async (): Promise<DashboardKPI> => {
      const [sociTotali, sociAttivi, serviziAnno, iscrizioniAnno] = await Promise.all([
        fetchTotal("/soci/", { banda_codice: bandaCodice }),
        // Soci attivi: distinct soci with a non-cancelled iscrizione this year.
        api
          .get<PagedResponse<Iscrizione>>("/iscrizioni/", {
            params: { anno: currentYear, page_size: 100 },
          })
          .then(({ data }) => {
            const attivi = new Set(
              data.items
                .filter((i) => i.stato_iscrizione_codice !== ISCRITTO_NON_ATTIVO)
                .map((i) => i.socio_id),
            )
            return attivi.size
          }),
        fetchTotal("/servizi/", {
          banda_codice: bandaCodice,
          anno: currentYear,
        }),
        fetchTotal("/iscrizioni/", { anno: currentYear }),
      ])

      return { sociTotali, sociAttivi, serviziAnno, iscrizioniAnno }
    },
  })

  return {
    sociTotali: query.data?.sociTotali ?? 0,
    sociAttivi: query.data?.sociAttivi ?? 0,
    serviziAnno: query.data?.serviziAnno ?? 0,
    iscrizioniAnno: query.data?.iscrizioniAnno ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
  }
}
