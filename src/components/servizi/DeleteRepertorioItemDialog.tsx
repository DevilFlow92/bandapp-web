import { Loader2 } from "lucide-react"
import { useDeleteRepertorioItem } from "@/hooks/useRepertorio"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import type { RepertorioItem } from "@/types/repertorio"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DeleteRepertorioItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: RepertorioItem | null
}

export default function DeleteRepertorioItemDialog({
  open,
  onOpenChange,
  item,
}: DeleteRepertorioItemDialogProps) {
  const { toast } = useToast()
  const deleteRepertorioItem = useDeleteRepertorioItem()

  const handleDelete = () => {
    if (!item) return
    deleteRepertorioItem.mutate(item.id, {
      onSuccess: () => {
        toast({ title: "Brano rimosso dal repertorio" })
        onOpenChange(false)
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "Errore", description: getErrorMessage(err) })
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rimuovi dal repertorio</DialogTitle>
          <DialogDescription>
            {item
              ? `Sei sicuro di voler rimuovere "${item.nome_parte?.nome ?? "questo brano"}" dal repertorio di questo servizio?`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteRepertorioItem.isPending}
          >
            Annulla
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteRepertorioItem.isPending}
          >
            {deleteRepertorioItem.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Rimuovi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
