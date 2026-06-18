import { isAxiosError } from "axios"
import { Loader2 } from "lucide-react"
import { useDeleteServizio } from "@/hooks/useServizi"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import type { Servizio } from "@/types/servizio"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DeleteServizioDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  servizio: Servizio | null
}

export default function DeleteServizioDialog({
  open,
  onOpenChange,
  servizio,
}: DeleteServizioDialogProps) {
  const { toast } = useToast()
  const deleteServizio = useDeleteServizio()

  const handleDelete = () => {
    if (!servizio) return
    deleteServizio.mutate(servizio.id, {
      onSuccess: () => {
        toast({ title: "Servizio eliminato" })
        onOpenChange(false)
      },
      onError: (err) => {
        const isConflict = isAxiosError(err) && err.response?.status === 409
        toast({
          variant: "destructive",
          title: "Errore",
          description: isConflict
            ? "Impossibile eliminare: il servizio ha ricevute associate."
            : getErrorMessage(err),
        })
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Elimina servizio</DialogTitle>
          <DialogDescription>
            {servizio
              ? `Sei sicuro di voler eliminare il servizio «${servizio.titolo}»?`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          L'operazione non è possibile se il servizio ha ricevute associate.
        </p>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteServizio.isPending}
          >
            Annulla
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteServizio.isPending}
          >
            {deleteServizio.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Elimina
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
