import { useNavigate } from "react-router-dom"
import { useCurrentUser, isAlunnoPuro } from "@/hooks/useAuth"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import DashboardPage from "@/pages/DashboardPage"

/**
 * Guards the "/" index route only: a pure student (no superuser, no permessi)
 * has no gestionale access, so instead of the dashboard they see an explanatory
 * modal and get redirected to /portale on close.
 */
export default function IndexRouteGuard() {
  const { data: user } = useCurrentUser()
  const navigate = useNavigate()

  if (isAlunnoPuro(user)) {
    const handleClose = () => navigate("/portale", { replace: true })
    return (
      <Dialog open onOpenChange={(open) => !open && handleClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accesso non disponibile</DialogTitle>
            <DialogDescription>
              Non sei abilitato ad accedere al gestionale. Contatta l'amministrazione.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleClose}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return <DashboardPage />
}
