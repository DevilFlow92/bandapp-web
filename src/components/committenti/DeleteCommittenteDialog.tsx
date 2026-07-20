import { isAxiosError } from "axios"
import { Loader2 } from "lucide-react"
import { useDeleteCommittente } from "@/hooks/useCommittenti"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import type { Committente } from "@/types/committente"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DeleteCommittenteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  committente: Committente | null
}

export default function DeleteCommittenteDialog({
  open,
  onOpenChange,
  committente,
}: DeleteCommittenteDialogProps) {
  const { toast } = useToast()
  const deleteCommittente = useDeleteCommittente()

  const handleDelete = () => {
    if (!committente) return
    deleteCommittente.mutate(committente.id, {
      onSuccess: () => {
        toast({ title: "Committente eliminato" })
        onOpenChange(false)
      },
      onError: (err) => {
        const isConflict = isAxiosError(err) && err.response?.status === 409
        toast({
          variant: "destructive",
          title: "Errore",
          description: isConflict
            ? "Impossibile eliminare: il committente ha servizi associati."
            : getErrorMessage(err),
        })
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Elimina committente</DialogTitle>
          <DialogDescription>
            {committente
              ? `Sei sicuro di voler eliminare il committente «${committente.denominazione}»?`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          L'operazione non è possibile se il committente ha servizi associati.
        </p>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteCommittente.isPending}
          >
            Annulla
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteCommittente.isPending}
          >
            {deleteCommittente.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Elimina
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
