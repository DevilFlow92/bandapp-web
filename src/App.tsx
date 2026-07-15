import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { Toaster } from "@/components/ui/toaster"
import { BandaProvider } from "@/context/BandaContext"
import ErrorBoundary from "@/components/ErrorBoundary"
import AuthGuard from "@/components/layout/AuthGuard"
import PermissionGuard from "@/components/layout/PermissionGuard"
import AppLayout from "@/components/layout/AppLayout"
import LoginPage from "@/pages/LoginPage"
import ResetPasswordPage from "@/pages/ResetPasswordPage"
import BandaSelectPage from "@/pages/BandaSelectPage"
import DashboardPage from "@/pages/DashboardPage"
import SociPage from "@/pages/SociPage"
import SocioWizardPage from "@/pages/SocioWizardPage"
import SocioDetailPage from "@/pages/SocioDetailPage"
import EsterniPage from "@/pages/EsterniPage"
import ServiziPage from "@/pages/ServiziPage"
import SpartitiPage from "@/pages/SpartitiPage"
import IscrizioniPage from "@/pages/IscrizioniPage"
import DocumentiPage from "@/pages/DocumentiPage"
import ModulisticaPage from "@/pages/ModulisticaPage"
import TemplateEditorPage from "@/pages/TemplateEditorPage"
import ContabilitaConfigurazionePage from "@/pages/ContabilitaConfigurazionePage"
import ContabilitaVociPage from "@/pages/ContabilitaVociPage"
import ContabilitaMovimentiPage from "@/pages/ContabilitaMovimentiPage"
import ContabilitaRendicontoPage from "@/pages/ContabilitaRendicontoPage"
import ContabilitaCheckQuotePage from "@/pages/ContabilitaCheckQuotePage"
import AdminUtentiPage from "@/pages/AdminUtentiPage"
import AdminRuoliPage from "@/pages/AdminRuoliPage"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BandaProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              <Route element={<AuthGuard />}>
                {/* Banda selection lives inside auth but outside the app shell. */}
                <Route path="/banda" element={<BandaSelectPage />} />

                <Route path="/" element={<AppLayout />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="soci" element={<SociPage />} />
                  <Route element={<PermissionGuard permission="anagrafica:write" />}>
                    <Route path="soci/nuovo" element={<SocioWizardPage />} />
                  </Route>
                  <Route path="soci/:id" element={<SocioDetailPage />} />
                  <Route path="esterni" element={<EsterniPage />} />
                  <Route path="servizi" element={<ServiziPage />} />
                  <Route element={<PermissionGuard permission="iscrizioni:read" />}>
                    <Route path="iscrizioni" element={<IscrizioniPage />} />
                  </Route>
                  <Route path="spartiti" element={<SpartitiPage />} />
                  <Route path="documenti" element={<DocumentiPage />} />
                  <Route path="modulistica" element={<ModulisticaPage />} />
                  <Route path="modulistica/:id" element={<TemplateEditorPage />} />
                  <Route element={<PermissionGuard permission="contabilita:read" />}>
                    <Route
                      path="contabilita/configurazione"
                      element={<ContabilitaConfigurazionePage />}
                    />
                    <Route path="contabilita/voci" element={<ContabilitaVociPage />} />
                    <Route path="contabilita/movimenti" element={<ContabilitaMovimentiPage />} />
                    <Route path="contabilita/rendiconto" element={<ContabilitaRendicontoPage />} />
                    <Route path="contabilita/check-quote" element={<ContabilitaCheckQuotePage />} />
                  </Route>
                  <Route element={<PermissionGuard permission="utenti:read" />}>
                    <Route path="admin/utenti" element={<AdminUtentiPage />} />
                  </Route>
                  <Route element={<PermissionGuard permission="ruoli:read" />}>
                    <Route path="admin/ruoli" element={<AdminRuoliPage />} />
                  </Route>
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
          <Toaster />
        </BandaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
