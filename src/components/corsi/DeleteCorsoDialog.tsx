import { Loader2 } from "lucide-react"
import { useDeleteCorso } from "@/hooks/useCorsi"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import type { Corso } from "@/types/corso"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DeleteCorsoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  corso: Corso | null
}

export default function DeleteCorsoDialog({ open, onOpenChange, corso }: DeleteCorsoDialogProps) {
  const { toast } = useToast()
  const deleteCorso = useDeleteCorso()

  const handleDelete = async () => {
    if (!corso) return
    try {
      await deleteCorso.mutateAsync(corso.id)
      toast({ title: "Corso eliminato" })
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
          <DialogTitle>Elimina corso</DialogTitle>
          <DialogDescription>
            Sei sicuro di voler eliminare il corso "{corso?.tipo_corso?.descrizione ?? ""}" (anno{" "}
            {corso?.anno})? Questa azione non può essere annullata.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteCorso.isPending}
          >
            Annulla
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteCorso.isPending}
          >
            {deleteCorso.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Elimina
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
