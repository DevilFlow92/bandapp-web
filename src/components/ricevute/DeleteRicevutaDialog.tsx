import { Loader2 } from "lucide-react"
import { useDeleteRicevuta } from "@/hooks/useRicevute"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import type { Ricevuta } from "@/types/ricevuta"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DeleteRicevutaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ricevuta: Ricevuta | null
}

export default function DeleteRicevutaDialog({
  open,
  onOpenChange,
  ricevuta,
}: DeleteRicevutaDialogProps) {
  const { toast } = useToast()
  const deleteRicevuta = useDeleteRicevuta()

  const handleDelete = () => {
    if (!ricevuta) return
    deleteRicevuta.mutate(ricevuta.id, {
      onSuccess: () => {
        toast({ title: "Ricevuta eliminata" })
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
          <DialogTitle>Elimina ricevuta</DialogTitle>
          <DialogDescription>
            {ricevuta
              ? `Sei sicuro di voler eliminare questa ricevuta di € ${ricevuta.importo.toFixed(
                  2
                )}?`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteRicevuta.isPending}
          >
            Annulla
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteRicevuta.isPending}
          >
            {deleteRicevuta.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Elimina
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
