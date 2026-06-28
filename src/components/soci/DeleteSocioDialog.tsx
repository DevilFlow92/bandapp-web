import { Loader2 } from "lucide-react"
import { useDeleteSocio } from "@/hooks/useSoci"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import type { Socio } from "@/types/socio"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DeleteSocioDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  socio: Socio | null
}

export default function DeleteSocioDialog({ open, onOpenChange, socio }: DeleteSocioDialogProps) {
  const { toast } = useToast()
  const deleteSocio = useDeleteSocio()

  const handleDelete = () => {
    if (!socio) return
    deleteSocio.mutate(socio.id, {
      onSuccess: () => {
        toast({ title: "Socio rimosso" })
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
          <DialogTitle>Rimuovi socio</DialogTitle>
          <DialogDescription>
            {socio
              ? `Sei sicuro di voler rimuovere ${socio.persona?.nome ?? "—"} ${socio.persona?.cognome ?? ""} dai soci?`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteSocio.isPending}
          >
            Annulla
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteSocio.isPending}
          >
            {deleteSocio.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Rimuovi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
