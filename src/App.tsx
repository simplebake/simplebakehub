import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthContext, useAuth, useAuthState } from "@/lib/supabase";
const LandingPage = lazy(() => import("@/components/LandingPage").then(m => ({ default: m.LandingPage })));
import { AdminRoute } from "@/components/AdminRoute";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppLayout } from "@/components/navigation/AppLayout";

// Lazy load all pages for better performance
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminSecurity = lazy(() => import("./pages/AdminSecurity"));
const AdminAuditLogs = lazy(() => import("./pages/AdminAuditLogs"));
const Premixes = lazy(() => import("./pages/Premixes"));
const GuidedBake = lazy(() => import("./pages/GuidedBake"));
const Tutorials = lazy(() => import("./pages/Tutorials"));
const TutorialsManagement = lazy(() => import("./pages/TutorialsManagement"));
const ShareBake = lazy(() => import("./pages/ShareBake"));
const Marketing = lazy(() => import("./pages/Marketing"));
const Settings = lazy(() => import("./pages/Settings"));
const MakeSetupGuide = lazy(() => import("./pages/MakeSetupGuide"));
const Contact = lazy(() => import("./pages/Contact"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Followers = lazy(() => import("./pages/Followers"));
const DiscoverBakers = lazy(() => import("./pages/DiscoverBakers"));
const Notifications = lazy(() => import("./pages/Notifications"));
const FeedingLog = lazy(() => import("./pages/FeedingLog"));
const StarterChecker = lazy(() => import("./pages/StarterChecker"));
const DoughAssistant = lazy(() => import("./pages/DoughAssistant"));
const StarterAI = lazy(() => import("./pages/StarterAI"));
const BakePhotoAnalysis = lazy(() => import("./pages/BakePhotoAnalysis"));
const RecipeGenerator = lazy(() => import("./pages/RecipeGenerator"));
const StarterTroubleshooting = lazy(() => import("./pages/StarterTroubleshooting"));

const queryClient = new QueryClient();

// Simple loading fallback that doesn't affect layout
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

// Home route that shows landing page immediately for guests, lazy-loads dashboard for users
const HomeRoute = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <PageLoader />;
  }
  
  if (!user) {
    return <LandingPage />;
  }
  
  return (
    <Suspense fallback={<PageLoader />}>
      <Index />
    </Suspense>
  );
};

const AppRoutes = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/profile" element={<Profile />} />
      {/* All /admin/* routes are gated behind AdminRoute. Add new admin
          sub-pages inside this nested <Routes> block — they automatically
          inherit the admin role check. */}
      <Route
        path="/admin/*"
        element={
          <AdminRoute>
            <Routes>
              <Route index element={<Admin />} />
              <Route path="security" element={<AdminSecurity />} />
              <Route path="audit-logs" element={<AdminAuditLogs />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AdminRoute>
        }
      />
      <Route path="/premixes" element={<Premixes />} />
      <Route path="/premixes/:id/bake" element={<GuidedBake />} />
      <Route path="/tutorials" element={<Tutorials />} />
      <Route path="/tutorials/manage" element={<TutorialsManagement />} />
      <Route path="/share" element={<ShareBake />} />
      <Route path="/marketing" element={<Marketing />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/settings/make-setup" element={<MakeSetupGuide />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/baker/:userId" element={<PublicProfile />} />
      <Route path="/followers" element={<Followers />} />
      <Route path="/discover" element={<DiscoverBakers />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/feeding-log" element={<FeedingLog />} />
      <Route path="/starter-checker" element={<StarterChecker />} />
      <Route path="/starter" element={<StarterChecker />} />
      <Route path="/dough-assistant" element={<DoughAssistant />} />
      <Route path="/dough" element={<DoughAssistant />} />
      <Route path="/starter-ai" element={<StarterAI />} />
      <Route path="/starter-guide" element={<StarterAI />} />
      <Route path="/bake-analysis" element={<BakePhotoAnalysis />} />
      <Route path="/recipe-generator" element={<RecipeGenerator />} />
      <Route path="/starter-troubleshooting" element={<StarterTroubleshooting />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>
);

const App = () => {
  const authState = useAuthState();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authState}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <SidebarProvider defaultOpen={true}>
              <AppLayout>
                <AppRoutes />
              </AppLayout>
            </SidebarProvider>
          </BrowserRouter>
        </TooltipProvider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
};

export default App;
