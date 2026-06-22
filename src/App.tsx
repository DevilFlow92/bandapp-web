import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { Toaster } from "@/components/ui/toaster"
import { BandaProvider } from "@/context/BandaContext"
import ErrorBoundary from "@/components/ErrorBoundary"
import AuthGuard from "@/components/layout/AuthGuard"
import SuperuserGuard from "@/components/layout/SuperuserGuard"
import AppLayout from "@/components/layout/AppLayout"
import LoginPage from "@/pages/LoginPage"
import BandaSelectPage from "@/pages/BandaSelectPage"
import DashboardPage from "@/pages/DashboardPage"
import SociPage from "@/pages/SociPage"
import SocioDetailPage from "@/pages/SocioDetailPage"
import EsterniPage from "@/pages/EsterniPage"
import ServiziPage from "@/pages/ServiziPage"
import SpartitiPage from "@/pages/SpartitiPage"
import IscrizioniPage from "@/pages/IscrizioniPage"
import DocumentiPage from "@/pages/DocumentiPage"
import ContabilitaConfigurazionePage from "@/pages/ContabilitaConfigurazionePage"
import ContabilitaVociPage from "@/pages/ContabilitaVociPage"
import ContabilitaMovimentiPage from "@/pages/ContabilitaMovimentiPage"
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

              <Route element={<AuthGuard />}>
                {/* Banda selection lives inside auth but outside the app shell. */}
                <Route path="/banda" element={<BandaSelectPage />} />

                <Route path="/" element={<AppLayout />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="soci" element={<SociPage />} />
                  <Route path="soci/:id" element={<SocioDetailPage />} />
                  <Route path="esterni" element={<EsterniPage />} />
                  <Route path="servizi" element={<ServiziPage />} />
                  <Route path="iscrizioni" element={<IscrizioniPage />} />
                  <Route path="spartiti" element={<SpartitiPage />} />
                  <Route path="documenti" element={<DocumentiPage />} />
                  <Route
                    path="contabilita/configurazione"
                    element={<ContabilitaConfigurazionePage />}
                  />
                  <Route path="contabilita/voci" element={<ContabilitaVociPage />} />
                  <Route path="contabilita/movimenti" element={<ContabilitaMovimentiPage />} />
                  <Route element={<SuperuserGuard />}>
                    <Route path="admin/utenti" element={<AdminUtentiPage />} />
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
