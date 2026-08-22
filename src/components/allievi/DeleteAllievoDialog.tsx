import { Loader2 } from "lucide-react"
import { useDeleteAllievo } from "@/hooks/useAllievi"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import type { Allievo } from "@/types/allievo"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DeleteAllievoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  allievo: Allievo | null
}

export default function DeleteAllievoDialog({
  open,
  onOpenChange,
  allievo,
}: DeleteAllievoDialogProps) {
  const { toast } = useToast()
  const deleteAllievo = useDeleteAllievo()

  const handleDelete = () => {
    if (!allievo) return
    deleteAllievo.mutate(allievo.id, {
      onSuccess: () => {
        toast({ title: "Allievo rimosso" })
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
      <DialogContent className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rimuovi allievo</DialogTitle>
          <DialogDescription>
            {allievo
              ? `Sei sicuro di voler rimuovere ${allievo.persona?.nome ?? "—"} ${allievo.persona?.cognome ?? ""} dagli allievi?`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteAllievo.isPending}
          >
            Annulla
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteAllievo.isPending}
          >
            {deleteAllievo.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Rimuovi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
