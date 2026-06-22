import { Loader2 } from "lucide-react"
import { useDeleteVoceContabilita } from "@/hooks/useVociContabilita"
import { useToast } from "@/hooks/use-toast"
import type { VoceContabilita } from "@/types/voce-contabilita"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DeleteVoceContabilitaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  voce: VoceContabilita | null
}

export default function DeleteVoceContabilitaDialog({
  open,
  onOpenChange,
  voce,
}: DeleteVoceContabilitaDialogProps) {
  const { toast } = useToast()
  const deleteVoce = useDeleteVoceContabilita()

  const handleDelete = () => {
    if (!voce) return
    // The hook surfaces the 409 / generic error toast on failure.
    deleteVoce.mutate(voce.id, {
      onSuccess: () => {
        toast({ title: "Voce eliminata" })
        onOpenChange(false)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Elimina voce</DialogTitle>
          <DialogDescription>
            Sei sicuro di voler eliminare la voce «{voce?.voce_contabilita}»?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteVoce.isPending}
          >
            Annulla
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteVoce.isPending}
          >
            {deleteVoce.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Elimina
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
