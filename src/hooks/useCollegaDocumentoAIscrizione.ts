import { useUpdateIscrizione } from "@/hooks/useIscrizioni"
import { useConfirm } from "@/hooks/useConfirm"
import { useToast } from "@/hooks/use-toast"
import { getErrorMessage } from "@/lib/api"

interface CollegaDocumentoParams {
  iscrizioneId: number
  documentoId: number
  documentoAttuale?: { id: number; nome: string } | null
}

/** Links a document to an iscrizione, confirming first if it replaces an existing one. */
export function useCollegaDocumentoAIscrizione() {
  const updateIscrizione = useUpdateIscrizione()
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
        description: `Il documento "${documentoAttuale.nome}" resterà in archivio ma verrà scollegato da questa iscrizione.`,
      })
      if (!ok) return false
    }

    try {
      await updateIscrizione.mutateAsync({
        id: iscrizioneId,
        input: { documento_id: documentoId },
      })
      toast({ title: "Documento collegato all'iscrizione." })
      return true
    } catch (err) {
      toast({ variant: "destructive", title: "Errore", description: getErrorMessage(err) })
      return false
    }
  }

  return { collega }
}
