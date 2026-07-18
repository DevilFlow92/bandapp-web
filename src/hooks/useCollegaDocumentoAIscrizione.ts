import { useUpdateIscrizione } from "@/hooks/useIscrizioni"
import { useDeleteDocumento } from "@/hooks/useDocumenti"
import { useConfirm } from "@/hooks/useConfirm"
import { useToast } from "@/hooks/use-toast"
import { getErrorMessage } from "@/lib/api"

interface CollegaDocumentoParams {
  iscrizioneId: number
  documentoId: number
  documentoAttuale?: { id: number; nome: string } | null
}

/**
 * Links a document to an iscrizione, confirming first if it replaces an
 * existing one (whose file is then permanently deleted).
 */
export function useCollegaDocumentoAIscrizione() {
  const updateIscrizione = useUpdateIscrizione()
  const deleteDocumento = useDeleteDocumento()
  const confirm = useConfirm()
  const { toast } = useToast()

  const collega = async ({
    iscrizioneId,
    documentoId,
    documentoAttuale,
  }: CollegaDocumentoParams): Promise<boolean> => {
    if (documentoAttuale) {
      const ok = await confirm({
        title: "Collegare il nuovo documento?",
        description: `Il documento "${documentoAttuale.nome}" verrà eliminato definitivamente. L'operazione non è reversibile.`,
        variant: "destructive",
      })
      if (!ok) return false
    }

    try {
      await updateIscrizione.mutateAsync({
        id: iscrizioneId,
        input: { documento_id: documentoId },
      })
      toast({ title: "Documento collegato all'iscrizione." })
    } catch (err) {
      toast({ variant: "destructive", title: "Errore", description: getErrorMessage(err) })
      return false
    }

    if (documentoAttuale) {
      try {
        await deleteDocumento.mutateAsync(documentoAttuale.id)
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Documento collegato, ma non è stato possibile eliminare il vecchio file",
          description: getErrorMessage(err),
        })
      }
    }

    return true
  }

  return { collega }
}
