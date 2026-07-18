import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export interface ConfirmOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: "default" | "destructive"
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ConfirmOptions | null>(null)
  const resolverRef = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
      setRequest(options)
    })
  }, [])

  const handleResult = useCallback((result: boolean) => {
    resolverRef.current?.(result)
    resolverRef.current = null
    setRequest(null)
  }, [])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog
        open={request !== null}
        onOpenChange={(open) => {
          if (!open) handleResult(false)
        }}
      >
        <DialogContent className="w-full sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{request?.title}</DialogTitle>
            {request?.description && <DialogDescription>{request.description}</DialogDescription>}
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleResult(false)}>
              {request?.cancelLabel ?? "Annulla"}
            </Button>
            <Button
              type="button"
              variant={request?.variant === "destructive" ? "destructive" : "default"}
              onClick={() => handleResult(true)}
            >
              {request?.confirmLabel ?? "Conferma"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  )
}

/** Ask the user to confirm an action. Throws if used outside a ConfirmProvider. */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  if (!ctx) {
    throw new Error("useConfirm must be used within a ConfirmProvider")
  }
  return ctx
}
