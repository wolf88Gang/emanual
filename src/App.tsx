import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "./contexts/LanguageContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { EstateProvider } from "./contexts/EstateContext";
import { SubscriptionProvider } from "./contexts/SubscriptionContext";
import { SidebarLayout } from "./components/layout/SidebarLayout";

import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import PlatformAdmin from "./pages/PlatformAdmin";
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
import CompostManager from "./pages/CompostManager";
import CRM from "./pages/CRM";
import Features from "./pages/Features";
import SetupWizard from "./pages/SetupWizard";
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
  
  return <EstateProvider><SubscriptionProvider>{children}</SubscriptionProvider></EstateProvider>;
}

function EstateRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <SidebarLayout>{children}</SidebarLayout>
    </ProtectedRoute>
  );
}

function PlatformRoute({ children }: { children: React.ReactNode }) {
  const { user, isPlatformAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isPlatformAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
}

function AppRoutes() {
  const { user, isPlatformAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/features" element={<Features />} />
      <Route path="/auth" element={user ? <Navigate to={isPlatformAdmin ? "/platform" : "/map"} replace /> : <Auth />} />
      <Route path="/onboarding" element={user ? <Onboarding /> : <Navigate to="/auth" replace />} />
      
      {/* Platform Admin routes */}
      <Route path="/platform" element={<PlatformRoute><PlatformAdmin /></PlatformRoute>} />
      <Route path="/platform/clients" element={<PlatformRoute><PlatformAdmin /></PlatformRoute>} />
      <Route path="/platform/subscriptions" element={<PlatformRoute><PlatformAdmin /></PlatformRoute>} />
      <Route path="/platform/payments" element={<PlatformRoute><PlatformAdmin /></PlatformRoute>} />
      <Route path="/platform/metrics" element={<PlatformRoute><PlatformAdmin /></PlatformRoute>} />
      <Route path="/platform/system" element={<PlatformRoute><PlatformAdmin /></PlatformRoute>} />

      {/* Public landing for unauthenticated, dashboard for authenticated */}
      <Route path="/" element={user ? <EstateRoute><WorkView /></EstateRoute> : <Features />} />

      <Route path="/map" element={<EstateRoute><MapView /></EstateRoute>} />
      <Route path="/tasks" element={<EstateRoute><Tasks /></EstateRoute>} />
      <Route path="/assets" element={<EstateRoute><Assets /></EstateRoute>} />
      <Route path="/assets/:id" element={<EstateRoute><AssetDetail /></EstateRoute>} />
      <Route path="/documents" element={<EstateRoute><Documents /></EstateRoute>} />
      <Route path="/admin" element={<EstateRoute><Admin /></EstateRoute>} />
      <Route path="/inventory" element={<EstateRoute><Inventory /></EstateRoute>} />
      <Route path="/plants" element={<EstateRoute><PlantRegistry /></EstateRoute>} />
      <Route path="/checkin" element={<EstateRoute><WorkerCheckin /></EstateRoute>} />
      <Route path="/reports" element={<EstateRoute><Reports /></EstateRoute>} />
      <Route path="/estates" element={<EstateRoute><EstateManagement /></EstateRoute>} />
      <Route path="/labor" element={<EstateRoute><LaborManagement /></EstateRoute>} />
      <Route path="/topography" element={<EstateRoute><TopographyRisks /></EstateRoute>} />
      <Route path="/subscription" element={<EstateRoute><Subscription /></EstateRoute>} />
      <Route path="/compost" element={<EstateRoute><CompostManager /></EstateRoute>} />
      <Route path="/crm" element={<EstateRoute><CRM /></EstateRoute>} />
      <Route path="/setup-wizard" element={<EstateRoute><SetupWizard /></EstateRoute>} />
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
