import { isAxiosError } from "axios"
import { Loader2 } from "lucide-react"
import { useDeleteDocumento } from "@/hooks/useDocumenti"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import type { Documento } from "@/types/documento"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DeleteDocumentoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  documento: Documento | null
}

export default function DeleteDocumentoDialog({
  open,
  onOpenChange,
  documento,
}: DeleteDocumentoDialogProps) {
  const { toast } = useToast()
  const deleteDocumento = useDeleteDocumento()

  const handleDelete = () => {
    if (!documento) return
    deleteDocumento.mutate(documento.id, {
      onSuccess: () => {
        toast({ title: "Documento eliminato" })
        onOpenChange(false)
      },
      onError: (err) => {
        const isConflict = isAxiosError(err) && err.response?.status === 409
        toast({
          variant: "destructive",
          title: "Errore",
          description: isConflict
            ? "Impossibile eliminare: il documento è utilizzato da altri elementi (spartiti, ricevute, iscrizioni)."
            : getErrorMessage(err),
        })
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Elimina documento</DialogTitle>
          <DialogDescription>
            {documento
              ? `Sei sicuro di voler eliminare il documento «${documento.nome}»? Il file verrà rimosso definitivamente.`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteDocumento.isPending}
          >
            Annulla
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteDocumento.isPending}
          >
            {deleteDocumento.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Elimina
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
