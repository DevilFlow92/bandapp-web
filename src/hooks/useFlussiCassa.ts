import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { isAxiosError } from "axios"
import api, { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import type {
  FlussoCassa,
  FlussoCassaCreate,
  FlussoCassaUpdate,
  NaturaFlusso,
  TrasferimentoCreate,
} from "@/types/flusso-cassa"
import type { PagedResponse } from "@/types/socio"

export const FLUSSI_CASSA_KEY = ["flussi-cassa"] as const

export function useFlussiCassa(
  bandaCodice: number,
  anno: number,
  page: number,
  pageSize: number,
  enabled = true,
) {
  return useQuery({
    queryKey: [...FLUSSI_CASSA_KEY, bandaCodice, anno, page, pageSize],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<FlussoCassa>>("/flussi-cassa/", {
        params: { banda_codice: bandaCodice, anno, page, page_size: pageSize },
      })
      return data
    },
    placeholderData: (previous) => previous,
    enabled,
  })
}

export function useCreateFlussoCassa() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: FlussoCassaCreate) => {
      const { data } = await api.post<FlussoCassa>("/flussi-cassa/", input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FLUSSI_CASSA_KEY })
    },
  })
}

export function useUpdateFlussoCassa() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: FlussoCassaUpdate }) => {
      const { data } = await api.patch<FlussoCassa>(`/flussi-cassa/${id}`, input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FLUSSI_CASSA_KEY })
    },
    onError: (error) => {
      if (isAxiosError(error) && error.response?.status === 409) {
        toast({
          variant: "destructive",
          title: "Errore",
          description: "Impossibile modificare un trasferimento: eliminarlo e ricrearlo.",
        })
        return
      }
      toast({
        variant: "destructive",
        title: "Errore",
        description: getErrorMessage(error),
      })
    },
  })
}

export function useDeleteFlussoCassa() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/flussi-cassa/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FLUSSI_CASSA_KEY })
    },
    onError: (error) => {
      if (isAxiosError(error) && error.response?.status === 409) {
        toast({
          variant: "destructive",
          title: "Errore",
          description: "Impossibile eliminare: l'anno è chiuso.",
        })
        return
      }
      toast({
        variant: "destructive",
        title: "Errore",
        description: getErrorMessage(error),
      })
    },
  })
}

export function useCreateTrasferimento() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: TrasferimentoCreate) => {
      const { data } = await api.post("/flussi-cassa/trasferimenti/", input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FLUSSI_CASSA_KEY })
    },
  })
}

export function useLookupNatureFlusso() {
  return useQuery({
    queryKey: ["lookup", "nature-flusso"],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<NaturaFlusso>>("/nature-flusso/", {
        params: { page_size: 20 },
      })
      return data.items
    },
    staleTime: 10 * 60 * 1000,
  })
}
