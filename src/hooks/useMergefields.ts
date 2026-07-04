import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"
import type { MergeFieldsResponse } from "@/types/modulistica"

const MERGEFIELDS_KEY = ["mergefields"] as const

export function useMergefields() {
  return useQuery({
    queryKey: MERGEFIELDS_KEY,
    queryFn: async () => {
      const { data } = await api.get<MergeFieldsResponse>("/mergefields/")
      return data.entita
    },
    staleTime: 5 * 60 * 1000,
  })
}
