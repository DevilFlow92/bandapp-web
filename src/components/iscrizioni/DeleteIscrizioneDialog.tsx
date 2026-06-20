import { Loader2 } from "lucide-react"
import { useDeleteIscrizione } from "@/hooks/useIscrizioni"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import type { Iscrizione } from "@/types/iscrizione"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DeleteIscrizioneDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  iscrizione: Iscrizione | null
  /** Resolved "Nome Cognome" of the iscrizione's socio. */
  socioName?: string
}

export default function DeleteIscrizioneDialog({
  open,
  onOpenChange,
  iscrizione,
  socioName,
}: DeleteIscrizioneDialogProps) {
  const { toast } = useToast()
  const deleteIscrizione = useDeleteIscrizione()

  const handleDelete = () => {
    if (!iscrizione) return
    deleteIscrizione.mutate(iscrizione.id, {
      onSuccess: () => {
        toast({ title: "Iscrizione eliminata" })
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
          <DialogTitle>Elimina iscrizione</DialogTitle>
          <DialogDescription>
            {iscrizione
              ? `Sei sicuro di voler eliminare l'iscrizione ${iscrizione.anno} di ${socioName ?? "—"}?`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteIscrizione.isPending}
          >
            Annulla
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteIscrizione.isPending}
          >
            {deleteIscrizione.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Elimina
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
