import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface GenerateFileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formato: "docx" | "pdf"
  nomeProposto: string
  onConfirm: (nomeFile: string) => void
}

export default function GenerateFileDialog({
  open,
  onOpenChange,
  formato,
  nomeProposto,
  onConfirm,
}: GenerateFileDialogProps) {
  const [nomeFile, setNomeFile] = useState(nomeProposto)

  function handleConfirm() {
    onConfirm(nomeFile.trim())
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Genera {formato.toUpperCase()}</DialogTitle>
          <DialogDescription>
            Verifica o modifica il nome del file prima di generarlo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="nome_file">Nome file</Label>
          <Input
            id="nome_file"
            value={nomeFile}
            onChange={(e) => setNomeFile(e.target.value)}
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button type="button" onClick={handleConfirm}>
            Genera
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
