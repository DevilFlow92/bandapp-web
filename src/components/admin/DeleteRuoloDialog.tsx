import { Loader2 } from "lucide-react"
import { useDeleteRuolo } from "@/hooks/useAdmin"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import type { Ruolo } from "@/types/admin"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DeleteRuoloDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ruolo: Ruolo | null
}

export default function DeleteRuoloDialog({ open, onOpenChange, ruolo }: DeleteRuoloDialogProps) {
  const { toast } = useToast()
  const deleteRuolo = useDeleteRuolo()

  const handleDelete = () => {
    if (!ruolo) return
    deleteRuolo.mutate(ruolo.id, {
      onSuccess: () => {
        toast({ title: "Ruolo eliminato" })
        onOpenChange(false)
      },
      onError: (err) => {
        toast({
          variant: "destructive",
          title: "Errore",
          description: getErrorMessage(err),
        })
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Elimina ruolo</DialogTitle>
          <DialogDescription>
            Sei sicuro di voler eliminare il ruolo «{ruolo?.nome}»?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteRuolo.isPending}
          >
            Annulla
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteRuolo.isPending}
          >
            {deleteRuolo.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Elimina
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
