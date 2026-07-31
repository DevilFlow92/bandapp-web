import { Loader2 } from "lucide-react"
import { useDeleteLezione } from "@/hooks/useLezioni"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import type { Lezione } from "@/types/lezione"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DeleteLezioneDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lezione: Lezione | null
}

function formatDataLezione(iso: string | undefined): string {
  if (!iso) return ""
  const [datePart, timePart = ""] = iso.split("T")
  const [year, month, day] = datePart.split("-")
  if (!year || !month || !day) return iso
  const time = timePart.slice(0, 5)
  return time ? `${day}/${month}/${year} ${time}` : `${day}/${month}/${year}`
}

export default function DeleteLezioneDialog({
  open,
  onOpenChange,
  lezione,
}: DeleteLezioneDialogProps) {
  const { toast } = useToast()
  const deleteLezione = useDeleteLezione()

  const handleDelete = async () => {
    if (!lezione) return
    try {
      await deleteLezione.mutateAsync(lezione.id)
      toast({ title: "Lezione eliminata" })
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
          <DialogTitle>Elimina lezione</DialogTitle>
          <DialogDescription>
            Sei sicuro di voler eliminare la lezione del {formatDataLezione(lezione?.data_lezione)}?
            Questa azione non può essere annullata. Se il registro presenze è già stato compilato,
            prova prima a svuotarlo.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteLezione.isPending}
          >
            Annulla
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteLezione.isPending}
          >
            {deleteLezione.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Elimina
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
