import { Loader2 } from "lucide-react"
import { useDeleteIscrizioneCorso } from "@/hooks/useIscrizioniCorso"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import type { IscrizioneCorso } from "@/types/iscrizione_corso"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DeleteIscrizioneCorsoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  iscrizione: IscrizioneCorso | null
}

function personaFullName(iscrizione: IscrizioneCorso | null): string {
  if (!iscrizione?.persona) return "questo alunno"
  const { nome, cognome } = iscrizione.persona
  return `${nome ?? ""} ${cognome ?? ""}`.trim() || "questo alunno"
}

export default function DeleteIscrizioneCorsoDialog({
  open,
  onOpenChange,
  iscrizione,
}: DeleteIscrizioneCorsoDialogProps) {
  const { toast } = useToast()
  const deleteIscrizioneCorso = useDeleteIscrizioneCorso()

  const handleDelete = async () => {
    if (!iscrizione) return
    try {
      await deleteIscrizioneCorso.mutateAsync(iscrizione.id)
      toast({ title: "Iscrizione eliminata" })
      onOpenChange(false)
    } catch (err) {
      toast({
        title: "Errore",
        description: getErrorMessage(err),
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Elimina iscrizione</DialogTitle>
          <DialogDescription>
            Sei sicuro di voler eliminare l'iscrizione di {personaFullName(iscrizione)} al corso?
            Questa azione non può essere annullata. Se sono già stati registrati pagamenti, elimina
            prima quelli.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteIscrizioneCorso.isPending}
          >
            Annulla
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteIscrizioneCorso.isPending}
          >
            {deleteIscrizioneCorso.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Elimina
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
