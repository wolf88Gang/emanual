import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "./contexts/LanguageContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { EstateProvider } from "./contexts/EstateContext";

import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import WorkView from "./pages/WorkView";
import MapView from "./pages/MapView";
import Tasks from "./pages/Tasks";
import Assets from "./pages/Assets";
import AssetDetail from "./pages/AssetDetail";
import Documents from "./pages/Documents";
import Admin from "./pages/Admin";
import Inventory from "./pages/Inventory";
import PlantRegistry from "./pages/PlantRegistry";
import WorkerCheckin from "./pages/WorkerCheckin";
import Reports from "./pages/Reports";
import EstateManagement from "./pages/EstateManagement";
import LaborManagement from "./pages/LaborManagement";
import TopographyRisks from "./pages/TopographyRisks";
import Subscription from "./pages/Subscription";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, roles, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Redirect new users without org to onboarding
  if (profile && !profile.org_id && roles.length === 0) {
    return <Navigate to="/onboarding" replace />;
  }
  
  return <EstateProvider>{children}</EstateProvider>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <Auth />} />
      <Route path="/onboarding" element={user ? <Onboarding /> : <Navigate to="/auth" replace />} />
      <Route path="/" element={<ProtectedRoute><WorkView /></ProtectedRoute>} />
      <Route path="/map" element={<ProtectedRoute><MapView /></ProtectedRoute>} />
      <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
      <Route path="/assets" element={<ProtectedRoute><Assets /></ProtectedRoute>} />
      <Route path="/assets/:id" element={<ProtectedRoute><AssetDetail /></ProtectedRoute>} />
      <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
      <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
      <Route path="/plants" element={<ProtectedRoute><PlantRegistry /></ProtectedRoute>} />
      <Route path="/checkin" element={<ProtectedRoute><WorkerCheckin /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/estates" element={<ProtectedRoute><EstateManagement /></ProtectedRoute>} />
      <Route path="/labor" element={<ProtectedRoute><LaborManagement /></ProtectedRoute>} />
      <Route path="/topography" element={<ProtectedRoute><TopographyRisks /></ProtectedRoute>} />
      <Route path="/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
