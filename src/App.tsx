import React, { Suspense, lazy } from "react";
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
import { TrialGate } from "./components/subscription/TrialGate";
import { HGLogo } from "./components/HGLogo";

// Lazy-loaded pages for code splitting
const Auth = lazy(() => import("./pages/Auth"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const PlatformAdmin = lazy(() => import("./pages/PlatformAdmin"));
const WorkView = lazy(() => import("./pages/WorkView"));
const MapView = lazy(() => import("./pages/MapView"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Assets = lazy(() => import("./pages/Assets"));
const AssetDetail = lazy(() => import("./pages/AssetDetail"));
const Documents = lazy(() => import("./pages/Documents"));
const Admin = lazy(() => import("./pages/Admin"));
const Inventory = lazy(() => import("./pages/Inventory"));
const PlantRegistry = lazy(() => import("./pages/PlantRegistry"));
const WorkerCheckin = lazy(() => import("./pages/WorkerCheckin"));
const Reports = lazy(() => import("./pages/Reports"));
const EstateManagement = lazy(() => import("./pages/EstateManagement"));
const LaborManagement = lazy(() => import("./pages/LaborManagement"));
const TopographyRisks = lazy(() => import("./pages/TopographyRisks"));
const Subscription = lazy(() => import("./pages/Subscription"));
const CompostManager = lazy(() => import("./pages/CompostManager"));
const CRM = lazy(() => import("./pages/CRM"));
const Features = lazy(() => import("./pages/Features"));
const SetupWizard = lazy(() => import("./pages/SetupWizard"));
const FeatureRequests = lazy(() => import("./pages/FeatureRequests"));
const JobBoard = lazy(() => import("./pages/JobBoard"));
const PostJob = lazy(() => import("./pages/PostJob"));
const MyJobPostings = lazy(() => import("./pages/MyJobPostings"));
const WorkerProfilePage = lazy(() => import("./pages/WorkerProfile"));
const MyWorkerProfile = lazy(() => import("./pages/MyWorkerProfile"));
const NotFound = lazy(() => import("./pages/NotFound"));
const JoinTeam = lazy(() => import("./pages/JoinTeam"));

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, roles, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <HGLogo size="lg" />
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Workers go to the job board, not estate management
  const isWorker = roles.includes('worker_marketplace' as any);
  if (isWorker) {
    return <Navigate to="/jobs" replace />;
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <HGLogo size="lg" />
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <HGLogo size="lg" />
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/features" element={<Features />} />
      <Route path="/auth" element={user ? <Navigate to={isPlatformAdmin ? "/platform" : "/map"} replace /> : <Auth />} />
      <Route path="/onboarding" element={user ? <Onboarding /> : <Navigate to="/auth" replace />} />
      <Route path="/join-team" element={user ? <JoinTeam /> : <Navigate to="/auth" replace />} />
      
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
      <Route path="/reports" element={<EstateRoute><TrialGate feature="reports"><Reports /></TrialGate></EstateRoute>} />
      <Route path="/estates" element={<EstateRoute><EstateManagement /></EstateRoute>} />
      <Route path="/labor" element={<EstateRoute><TrialGate feature="labor"><LaborManagement /></TrialGate></EstateRoute>} />
      <Route path="/topography" element={<EstateRoute><TrialGate feature="topography"><TopographyRisks /></TrialGate></EstateRoute>} />
      <Route path="/subscription" element={<EstateRoute><Subscription /></EstateRoute>} />
      <Route path="/compost" element={<EstateRoute><TrialGate feature="compost"><CompostManager /></TrialGate></EstateRoute>} />
      <Route path="/crm" element={<EstateRoute><TrialGate feature="crm"><CRM /></TrialGate></EstateRoute>} />
      <Route path="/setup-wizard" element={<EstateRoute><SetupWizard /></EstateRoute>} />
      <Route path="/requests" element={<EstateRoute><FeatureRequests /></EstateRoute>} />
      <Route path="/my-jobs" element={<EstateRoute><MyJobPostings /></EstateRoute>} />
      <Route path="/my-profile" element={<EstateRoute><MyWorkerProfile /></EstateRoute>} />

      {/* Public marketplace routes */}
      <Route path="/jobs" element={<JobBoard />} />
      <Route path="/worker/:id" element={<WorkerProfilePage />} />
      <Route path="/jobs/post" element={user ? <EstateRoute><PostJob /></EstateRoute> : <Navigate to="/auth" replace />} />

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
