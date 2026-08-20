import React, { Suspense } from "react";
import { lazyWithRetry as lazy } from "./lib/lazyWithRetry";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useModules } from "@/hooks/useModules";
import { LanguageProvider } from "./contexts/LanguageContext";
import { CurrencyProvider } from "./contexts/CurrencyContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { EstateProvider } from "./contexts/EstateContext";
import { SubscriptionProvider } from "./contexts/SubscriptionContext";
import { SidebarLayout } from "./components/layout/SidebarLayout";
import { TrialGate } from "./components/subscription/TrialGate";
import { HGLogo } from "./components/HGLogo";
import { getPostAuthRoute } from "./lib/authRouting";
import { PlatformLayout } from "./components/layout/PlatformLayout";

// Lazy-loaded pages for code splitting
const Auth = lazy(() => import("./pages/Auth"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const PlatformAdmin = lazy(() => import("./pages/PlatformAdmin"));
const PlatformClients = lazy(() => import("./pages/PlatformClients"));
const WorkView = lazy(() => import("./pages/WorkView"));
const BusinessHome = lazy(() => import("./pages/BusinessHome"));
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
const Financials = lazy(() => import("./pages/Financials"));
const PlantOps = lazy(() => import("./pages/PlantOps"));
const PlantOpsContracts = lazy(() => import("./pages/PlantOpsContracts"));
const PlantOpsVisit = lazy(() => import("./pages/PlantOpsVisit"));
const PlantOpsCareEditor = lazy(() => import("./pages/PlantOpsCareEditor"));
const PlantOpsCare = lazy(() => import("./pages/PlantOpsCare"));
const PlantOpsPortal = lazy(() => import("./pages/PlantOpsPortal"));
const ClientPortal = lazy(() => import("./pages/ClientPortal"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const PlantOpsNewClient = lazy(() => import("./pages/PlantOpsNewClient"));
const PlantOpsProperty = lazy(() => import("./pages/PlantOpsProperty"));
const PlantOpsSettings = lazy(() => import("./pages/PlantOpsSettings"));
const PlantOpsClients = lazy(() => import("./pages/PlantOpsClients"));
const PlantOpsSites = lazy(() => import("./pages/PlantOpsSites"));
const PlantOpsReminders = lazy(() => import("./pages/PlantOpsReminders"));

const PlantOpsClientDetail = lazy(() => import("./pages/PlantOpsClientDetail"));
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
const JoinClient = lazy(() => import("./pages/JoinClient"));

const PageLoader = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
    <HGLogo size="lg" />
    <div className="animate-pulse text-muted-foreground">Loading...</div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min
      gcTime: 10 * 60 * 1000, // 10 min
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

/**
 * Single tenant guard. Platform admins never mount EstateProvider,
 * SubscriptionProvider, NoEstateGuide or TrialGate — there is no impersonation
 * mode, so the only correct destination for them is the platform console.
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, roles, loading, isPlatformAdmin, platformAdminStatus } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Admin status unknown (still loading or lookup failed): hold instead of
  // routing the user into tenant onboarding / property setup.
  if (platformAdminStatus === 'loading' || platformAdminStatus === 'error') {
    return <PageLoader />;
  }

  // Platform admins never enter tenant context (no org, estate or subscription).
  if (isPlatformAdmin) {
    return <Navigate to="/platform" replace />;
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

/**
 * Module route guard. The module registry owns routes, so a module that is off
 * cannot be reached by URL either. Routes without an owning module stay open.
 */
function ModuleGate({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { loading, isRouteAllowed, routeRedirect, homeRoute } = useModules();

  if (loading) return <PageLoader />;

  const deprecated = routeRedirect(location.pathname);
  if (deprecated) return <Navigate to={deprecated} replace />;

  if (!isRouteAllowed(location.pathname)) {
    const fallback = isRouteAllowed(homeRoute) ? homeRoute : '/';
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}

function EstateRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <SidebarLayout>
        <ModuleGate>{children}</ModuleGate>
      </SidebarLayout>
    </ProtectedRoute>
  );
}

/** Tenant landing screen: client-first for businesses, work view for individuals. */
function TenantHome() {
  const { isBusiness, loading } = useModules();
  if (loading) return <PageLoader />;
  return isBusiness ? <BusinessHome /> : <WorkView />;
}


/**
 * Administrative modules (client onboarding, contracts, property files, settings).
 * Crew and vendors are field roles and must never reach them, even by URL.
 */
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { roles, isPlatformAdmin, loading } = useAuth();

  if (loading) return <PageLoader />;

  const isAdmin = isPlatformAdmin || roles.some((r) => r === 'owner' || r === 'manager');
  if (!isAdmin) return <Navigate to="/plantops" replace />;

  return <>{children}</>;
}

function PlatformRoute({ children }: { children: React.ReactNode }) {
  const { user, isPlatformAdmin, loading, platformAdminStatus } = useAuth();

  if (loading || platformAdminStatus === 'loading' || platformAdminStatus === 'error') {
    return <PageLoader />;
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isPlatformAdmin) return <Navigate to="/" replace />;

  return <PlatformLayout>{children}</PlatformLayout>;
}

/** Landing route: public site, platform console, or the tenant home screen. */
function RootRoute() {
  const { user, profile, roles, isPlatformAdmin, orgType, loading, platformAdminStatus } = useAuth();

  if (loading) return <PageLoader />;
  if (!user) return <Features />;
  if (platformAdminStatus === 'loading' || platformAdminStatus === 'error') return <PageLoader />;

  const target = getPostAuthRoute({ isPlatformAdmin, orgId: profile?.org_id, orgType, roles });
  if (target !== "/") return <Navigate to={target} replace />;

  return <EstateRoute><TenantHome /></EstateRoute>;
}

function AppRoutes() {
  const { user, profile, roles, isPlatformAdmin, orgType, loading, platformAdminStatus } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  const postAuthRoute = getPostAuthRoute({
    isPlatformAdmin,
    orgId: profile?.org_id,
    orgType,
    roles,
  });

  return (
    <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route path="/features" element={<Navigate to="/" replace />} />
      <Route path="/auth" element={user ? (platformAdminStatus === 'not_admin' || platformAdminStatus === 'admin' ? <Navigate to={postAuthRoute} replace /> : <PageLoader />) : <Auth />} />
      {/* Recovery link target — must stay reachable even with a recovery session active. */}
      <Route path="/auth/reset-password" element={<ResetPassword />} />
      <Route path="/onboarding" element={!user ? <Navigate to="/auth" replace /> : (platformAdminStatus === 'loading' || platformAdminStatus === 'error') ? <PageLoader /> : isPlatformAdmin ? <Navigate to="/platform" replace /> : <Onboarding />} />
      <Route path="/join-team" element={user ? <JoinTeam /> : <Navigate to="/auth" replace />} />
      <Route path="/join-client" element={user ? <JoinClient /> : <Navigate to="/auth" replace />} />
      
      {/* Platform Admin routes */}
      <Route path="/platform" element={<PlatformRoute><PlatformAdmin /></PlatformRoute>} />
      <Route path="/platform/clients" element={<PlatformRoute><PlatformClients /></PlatformRoute>} />
      <Route path="/platform/subscriptions" element={<PlatformRoute><PlatformAdmin /></PlatformRoute>} />
      <Route path="/platform/payments" element={<PlatformRoute><PlatformAdmin /></PlatformRoute>} />
      <Route path="/platform/metrics" element={<PlatformRoute><PlatformAdmin /></PlatformRoute>} />
      <Route path="/platform/system" element={<PlatformRoute><PlatformAdmin /></PlatformRoute>} />

      {/* Public landing for unauthenticated, dashboard for authenticated */}
      <Route path="/" element={<RootRoute />} />

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
      <Route path="/financials" element={<EstateRoute><Financials /></EstateRoute>} />
      <Route path="/plantops" element={<EstateRoute><PlantOps /></EstateRoute>} />
      <Route path="/plantops/contracts" element={<EstateRoute><AdminRoute><PlantOpsContracts /></AdminRoute></EstateRoute>} />
      <Route path="/plantops/visita" element={<EstateRoute><PlantOpsVisit /></EstateRoute>} />
      <Route path="/plantops/care" element={<EstateRoute><PlantOpsCare /></EstateRoute>} />
      <Route path="/plantops/cuidados" element={<EstateRoute><PlantOpsCare /></EstateRoute>} />
      <Route path="/plantops/cuidados/:placementId" element={<EstateRoute><PlantOpsCareEditor /></EstateRoute>} />
      <Route path="/plantops/nuevo-cliente" element={<EstateRoute><AdminRoute><PlantOpsNewClient /></AdminRoute></EstateRoute>} />
      <Route path="/plantops/propiedad/:estateId" element={<EstateRoute><AdminRoute><PlantOpsProperty /></AdminRoute></EstateRoute>} />
      <Route path="/sites" element={<EstateRoute><AdminRoute><PlantOpsSites /></AdminRoute></EstateRoute>} />
      <Route path="/clients" element={<EstateRoute><AdminRoute><PlantOpsClients /></AdminRoute></EstateRoute>} />
      <Route path="/clients/:clientId" element={<EstateRoute><AdminRoute><PlantOpsClientDetail /></AdminRoute></EstateRoute>} />
      <Route path="/plantops/clientes" element={<EstateRoute><AdminRoute><PlantOpsClients /></AdminRoute></EstateRoute>} />
      <Route path="/plantops/clientes/:clientId" element={<EstateRoute><AdminRoute><PlantOpsClientDetail /></AdminRoute></EstateRoute>} />
      <Route path="/plantops/settings" element={<EstateRoute><AdminRoute><PlantOpsSettings /></AdminRoute></EstateRoute>} />
      <Route path="/plantops/reminders" element={<EstateRoute><AdminRoute><PlantOpsReminders /></AdminRoute></EstateRoute>} />

      <Route path="/setup-wizard" element={<EstateRoute><SetupWizard /></EstateRoute>} />
      <Route path="/requests" element={<EstateRoute><FeatureRequests /></EstateRoute>} />
      <Route path="/my-jobs" element={<EstateRoute><MyJobPostings /></EstateRoute>} />
      <Route path="/my-profile" element={<EstateRoute><MyWorkerProfile /></EstateRoute>} />

      {/* Public marketplace routes */}
      <Route path="/jobs" element={<JobBoard />} />
      <Route path="/worker/:id" element={<WorkerProfilePage />} />
      <Route path="/jobs/post" element={user ? <EstateRoute><PostJob /></EstateRoute> : <Navigate to="/auth" replace />} />

      {/* Public client portal (token link, no login) */}
      <Route path="/c/:token" element={<PlantOpsPortal />} />
      <Route path="/cliente/:token" element={<ClientPortal />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <CurrencyProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </CurrencyProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
