import { Loader2 } from "lucide-react"
import { useDeleteFlussoCassa } from "@/hooks/useFlussiCassa"
import { useToast } from "@/hooks/use-toast"
import type { FlussoCassa } from "@/types/flusso-cassa"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DeleteFlussoCassaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  flusso: FlussoCassa | null
}

export default function DeleteFlussoCassaDialog({
  open,
  onOpenChange,
  flusso,
}: DeleteFlussoCassaDialogProps) {
  const { toast } = useToast()
  const deleteFlusso = useDeleteFlussoCassa()
  const isTrasferimento = Boolean(flusso?.trasferimento_id)

  const handleDelete = () => {
    if (!flusso) return
    deleteFlusso.mutate(flusso.id, {
      onSuccess: () => {
        toast({ title: isTrasferimento ? "Trasferimento eliminato" : "Movimento eliminato" })
        onOpenChange(false)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isTrasferimento ? "Elimina trasferimento" : "Elimina movimento"}
          </DialogTitle>
          <DialogDescription>
            {isTrasferimento
              ? "Sei sicuro di voler eliminare questo trasferimento? Verranno eliminati entrambi i movimenti correlati."
              : "Sei sicuro di voler eliminare questo movimento?"}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteFlusso.isPending}
          >
            Annulla
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteFlusso.isPending}
          >
            {deleteFlusso.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Elimina
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
