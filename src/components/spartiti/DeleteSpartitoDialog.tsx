import { Loader2 } from "lucide-react"
import { useDeleteSpartito } from "@/hooks/useSpartiti"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import type { Spartito } from "@/types/spartito"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DeleteSpartitoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  spartito: Spartito | null
}

export default function DeleteSpartitoDialog({
  open,
  onOpenChange,
  spartito,
}: DeleteSpartitoDialogProps) {
  const { toast } = useToast()
  const deleteSpartito = useDeleteSpartito()

  const handleDelete = () => {
    if (!spartito) return
    deleteSpartito.mutate(spartito.id, {
      onSuccess: () => {
        toast({ title: "Spartito eliminato" })
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
          <DialogTitle>Elimina spartito</DialogTitle>
          <DialogDescription>
            Sei sicuro di voler eliminare questo spartito?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteSpartito.isPending}
          >
            Annulla
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteSpartito.isPending}
          >
            {deleteSpartito.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Elimina
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
