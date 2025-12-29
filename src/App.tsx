import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UnitProvider } from "./contexts/UnitContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Config from "./pages/Config";
import Roteirista from "./pages/Roteirista";
import TV from "./pages/TV";
import Historico from "./pages/Historico";
import MeuLugar from "./pages/MeuLugar";
import NotFound from "./pages/NotFound";
import SuperAdmin from "./pages/SuperAdmin";
import FilaPagamento from "./pages/FilaPagamento";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000,
      refetchOnWindowFocus: true,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <UnitProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner position="top-right" theme="dark" />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route
                path="/config"
                element={
                  <ProtectedRoute>
                    <Config />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/roteirista"
                element={
                  <ProtectedRoute>
                    <Roteirista />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tv"
                element={
                  <ProtectedRoute>
                    <TV />
                  </ProtectedRoute>
                }
              />
              <Route path="/historico" element={<Historico />} />
              <Route path="/meu-lugar" element={<MeuLugar />} />
              <Route
                path="/fila-pagamento"
                element={
                  <ProtectedRoute>
                    <FilaPagamento />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <SuperAdmin />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </UnitProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
