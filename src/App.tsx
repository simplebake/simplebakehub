import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthContext, useAuthState } from "@/lib/supabase";
import { AdminRoute } from "@/components/AdminRoute";

// Eagerly load Index for fast initial paint
import Index from "./pages/Index";

// Lazy load other pages to reduce initial bundle size
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const Admin = lazy(() => import("./pages/Admin"));
const Premixes = lazy(() => import("./pages/Premixes"));
const GuidedBake = lazy(() => import("./pages/GuidedBake"));
const Tutorials = lazy(() => import("./pages/Tutorials"));
const TutorialsManagement = lazy(() => import("./pages/TutorialsManagement"));
const ShareBake = lazy(() => import("./pages/ShareBake"));
const Marketing = lazy(() => import("./pages/Marketing"));
const Settings = lazy(() => import("./pages/Settings"));
const Contact = lazy(() => import("./pages/Contact"));
const MakeSetupGuide = lazy(() => import("./pages/MakeSetupGuide"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Simple loading fallback that doesn't affect layout
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
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
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
                <Route path="/premixes" element={<Premixes />} />
                <Route path="/premixes/:id/bake" element={<GuidedBake />} />
                <Route path="/tutorials" element={<Tutorials />} />
                <Route path="/tutorials/manage" element={<TutorialsManagement />} />
                <Route path="/share" element={<ShareBake />} />
                <Route path="/marketing" element={<Marketing />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/settings/make-setup" element={<MakeSetupGuide />} />
                <Route path="/contact" element={<Contact />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
};

export default App;
