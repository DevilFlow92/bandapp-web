import { Loader2 } from "lucide-react"
import { isAxiosError } from "axios"
import { useDeleteConfigurazioneAnno } from "@/hooks/useConfigurazioneAnno"
import { getErrorMessage } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import type { ConfigurazioneBandaAnno } from "@/types/configurazione-anno"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DeleteConfigurazioneAnnoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  configurazione: ConfigurazioneBandaAnno | null
}

export default function DeleteConfigurazioneAnnoDialog({
  open,
  onOpenChange,
  configurazione,
}: DeleteConfigurazioneAnnoDialogProps) {
  const { toast } = useToast()
  const deleteConfig = useDeleteConfigurazioneAnno()

  const handleDelete = () => {
    if (!configurazione) return
    deleteConfig.mutate(configurazione.id, {
      onSuccess: () => {
        toast({ title: "Configurazione eliminata" })
        onOpenChange(false)
      },
      onError: (err) => {
        const description =
          isAxiosError(err) && err.response?.status === 409
            ? "Impossibile eliminare un anno chiuso."
            : getErrorMessage(err)
        toast({ variant: "destructive", title: "Errore", description })
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Elimina configurazione</DialogTitle>
          <DialogDescription>
            Sei sicuro di voler eliminare la configurazione dell'anno{" "}
            {configurazione?.anno}?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteConfig.isPending}
          >
            Annulla
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteConfig.isPending}
          >
            {deleteConfig.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Elimina
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
