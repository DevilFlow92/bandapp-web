import { Loader2 } from "lucide-react"
import { useChiudiAnno } from "@/hooks/useConfigurazioneAnno"
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

interface ChiudiAnnoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  configurazione: ConfigurazioneBandaAnno | null
}

export default function ChiudiAnnoDialog({
  open,
  onOpenChange,
  configurazione,
}: ChiudiAnnoDialogProps) {
  const { toast } = useToast()
  const chiudiAnno = useChiudiAnno()

  const handleChiudi = () => {
    if (!configurazione) return
    chiudiAnno.mutate(configurazione.id, {
      onSuccess: () => {
        toast({ title: "Anno chiuso" })
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
          <DialogTitle>Chiudi anno {configurazione?.anno}</DialogTitle>
          <DialogDescription>
            Sei sicuro di voler chiudere l'anno {configurazione?.anno}? Una volta chiuso, non sarà
            più possibile modificare i movimenti di cassa per quest'anno. Solo un superuser potrà
            riaprirlo.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={chiudiAnno.isPending}
          >
            Annulla
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleChiudi}
            disabled={chiudiAnno.isPending}
          >
            {chiudiAnno.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Chiudi anno
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
