import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { Toaster } from "@/components/ui/toaster"
import { BandaProvider } from "@/context/BandaContext"
import AuthGuard from "@/components/layout/AuthGuard"
import AppLayout from "@/components/layout/AppLayout"
import LoginPage from "@/pages/LoginPage"
import BandaSelectPage from "@/pages/BandaSelectPage"
import DashboardPage from "@/pages/DashboardPage"
import SociPage from "@/pages/SociPage"
import EsterniPage from "@/pages/EsterniPage"
import ServiziPage from "@/pages/ServiziPage"
import SpartitiPage from "@/pages/SpartitiPage"
import ContabilitaPage from "@/pages/ContabilitaPage"

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
                <Route path="esterni" element={<EsterniPage />} />
                <Route path="servizi" element={<ServiziPage />} />
                <Route path="spartiti" element={<SpartitiPage />} />
                <Route path="contabilita" element={<ContabilitaPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </BandaProvider>
    </QueryClientProvider>
  )
}
