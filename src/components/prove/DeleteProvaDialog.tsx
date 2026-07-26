import { isAxiosError } from "axios"
import { Loader2 } from "lucide-react"
import { useDeleteProva } from "@/hooks/useProve"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import type { Prova } from "@/types/prova"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DeleteProvaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prova: Prova | null
}

/** Formats an ISO datetime string as "DD/MM/YYYY HH:MM". */
function formatDataProva(iso: string): string {
  const [datePart, timePart = ""] = iso.split("T")
  const [year, month, day] = datePart.split("-")
  if (!year || !month || !day) return iso
  const time = timePart.slice(0, 5)
  return time ? `${day}/${month}/${year} ${time}` : `${day}/${month}/${year}`
}

export default function DeleteProvaDialog({ open, onOpenChange, prova }: DeleteProvaDialogProps) {
  const { toast } = useToast()
  const deleteProva = useDeleteProva()

  const handleDelete = () => {
    if (!prova) return
    deleteProva.mutate(prova.id, {
      onSuccess: () => {
        toast({ title: "Prova eliminata" })
        onOpenChange(false)
      },
      onError: (err) => {
        const isConflict = isAxiosError(err) && err.response?.status === 409
        toast({
          variant: "destructive",
          title: "Errore",
          description: isConflict
            ? "Impossibile eliminare: la prova ha organico o repertorio associato."
            : getErrorMessage(err),
        })
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Elimina prova</DialogTitle>
          <DialogDescription>
            {prova
              ? `Sei sicuro di voler eliminare la prova del ${formatDataProva(prova.data_prova)}?`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          L'operazione non è possibile se la prova ha organico o repertorio associato.
        </p>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteProva.isPending}
          >
            Annulla
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteProva.isPending}
          >
            {deleteProva.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Elimina
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
