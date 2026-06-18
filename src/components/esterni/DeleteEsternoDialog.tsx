import { Loader2 } from "lucide-react"
import { useDeleteEsterno } from "@/hooks/useEsterni"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import type { Esterno } from "@/types/esterno"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DeleteEsternoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  esterno: Esterno | null
}

export default function DeleteEsternoDialog({
  open,
  onOpenChange,
  esterno,
}: DeleteEsternoDialogProps) {
  const { toast } = useToast()
  const deleteEsterno = useDeleteEsterno()

  const handleDelete = () => {
    if (!esterno) return
    deleteEsterno.mutate(esterno.id, {
      onSuccess: () => {
        toast({ title: "Esterno rimosso" })
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
          <DialogTitle>Rimuovi esterno</DialogTitle>
          <DialogDescription>
            {esterno
              ? `Sei sicuro di voler rimuovere ${esterno.persona.nome} ${esterno.persona.cognome} dagli esterni?`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteEsterno.isPending}
          >
            Annulla
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteEsterno.isPending}
          >
            {deleteEsterno.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Rimuovi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
