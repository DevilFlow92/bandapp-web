import { Loader2 } from "lucide-react"
import { useDeletePresenza } from "@/hooks/usePresenze"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import type { Presenza } from "@/types/presenza"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DeletePresenzaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  presenza: Presenza | null
}

function presenzaPersonaLabel(presenza: Presenza | null): string {
  if (!presenza?.persona) return "questa persona"
  const { nome, cognome, ragione_sociale } = presenza.persona
  return ragione_sociale ?? `${nome ?? ""} ${cognome ?? ""}`.trim() ?? "questa persona"
}

export default function DeletePresenzaDialog({
  open,
  onOpenChange,
  presenza,
}: DeletePresenzaDialogProps) {
  const { toast } = useToast()
  const deletePresenza = useDeletePresenza()

  const handleDelete = () => {
    if (!presenza) return
    deletePresenza.mutate(presenza.id, {
      onSuccess: () => {
        toast({ title: "Persona rimossa dall'organico" })
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
          <DialogTitle>Rimuovi dall'organico</DialogTitle>
          <DialogDescription>
            {presenza
              ? `Sei sicuro di voler rimuovere ${presenzaPersonaLabel(presenza)} dall'organico di questo servizio?`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deletePresenza.isPending}
          >
            Annulla
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deletePresenza.isPending}
          >
            {deletePresenza.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Rimuovi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
