import { Loader2 } from "lucide-react"
import { useDeleteUtente } from "@/hooks/useAdmin"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import type { Utente } from "@/types/admin"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DeleteUtenteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  utente: Utente | null
}

export default function DeleteUtenteDialog({
  open,
  onOpenChange,
  utente,
}: DeleteUtenteDialogProps) {
  const { toast } = useToast()
  const deleteUtente = useDeleteUtente()

  const handleDelete = () => {
    if (!utente) return
    deleteUtente.mutate(utente.id, {
      onSuccess: () => {
        toast({ title: "Utente eliminato" })
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
          <DialogTitle>Elimina utente</DialogTitle>
          <DialogDescription>
            Sei sicuro di voler eliminare l'utente {utente?.email}?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteUtente.isPending}
          >
            Annulla
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteUtente.isPending}
          >
            {deleteUtente.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Elimina
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
