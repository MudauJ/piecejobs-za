import { Switch, Route, Router as WouterRouter } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, type ReactNode } from "react";
import Landing from "@/pages/landing";
import Jobs from "@/pages/jobs";
import Workers from "@/pages/workers";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Admin from "@/pages/admin";
import Dashboard from "@/pages/dashboard";
import WorkerDashboard from "@/pages/worker-dashboard";
import NotFound from "@/pages/not-found";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import PostJobModal from "@/components/modals/post-job-modal";
import WorkerRegistrationModal from "@/components/modals/worker-registration-modal";
import ApplyJobModal from "@/components/modals/apply-job-modal";
import { AuthProvider, useAuth, type UserRole } from "@/lib/auth";

const queryClient = new QueryClient();

export type ModalState = {
  postJob: boolean;
  workerReg: boolean;
  applyJob: string | null;
};

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground font-medium">Loading…</p>
      </div>
    </div>
  );
}

function ProtectedRoute({
  children,
  requiredRole,
}: {
  children: ReactNode;
  requiredRole?: UserRole | UserRole[];
}) {
  const { user, role, loading } = useAuth();
  const [, setLocation] = useHashLocation();

  if (loading) return <LoadingScreen />;

  if (!user) {
    setLocation("/login");
    return null;
  }

  if (requiredRole && role) {
    const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!allowed.includes(role)) {
      if (role === "super_admin")  setLocation("/admin");
      else if (role === "homeowner") setLocation("/dashboard");
      else                           setLocation("/worker-dashboard");
      return null;
    }
  }

  return <>{children}</>;
}

function Shell({
  children,
  modalState,
  setModalState,
}: {
  children: ReactNode;
  modalState: ModalState;
  setModalState: React.Dispatch<React.SetStateAction<ModalState>>;
}) {
  return (
    <div className="flex flex-col min-h-[100dvh] w-full font-sans">
      <Navbar setModalState={setModalState} />
      <main className="flex-1">{children}</main>
      <Footer />
      <PostJobModal
        open={modalState.postJob}
        onOpenChange={open => setModalState(prev => ({ ...prev, postJob: open }))}
      />
      <WorkerRegistrationModal
        open={modalState.workerReg}
        onOpenChange={open => setModalState(prev => ({ ...prev, workerReg: open }))}
      />
      <ApplyJobModal
        jobId={modalState.applyJob}
        onOpenChange={open =>
          setModalState(prev => ({ ...prev, applyJob: open ? prev.applyJob : null }))
        }
      />
    </div>
  );
}

function AppRoutes({
  modalState,
  setModalState,
}: {
  modalState: ModalState;
  setModalState: React.Dispatch<React.SetStateAction<ModalState>>;
}) {
  return (
    <Switch>
      {/* Full-page routes — no navbar/footer */}
      <Route path="/login"    component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/admin"    component={() => (
        <ProtectedRoute requiredRole="super_admin">
          <Admin />
        </ProtectedRoute>
      )} />

      {/* Protected dashboard routes */}
      <Route path="/dashboard" component={() => (
        <ProtectedRoute requiredRole="homeowner">
          <Shell modalState={modalState} setModalState={setModalState}>
            <Dashboard setModalState={setModalState} />
          </Shell>
        </ProtectedRoute>
      )} />
      <Route path="/worker-dashboard" component={() => (
        <ProtectedRoute requiredRole="worker">
          <Shell modalState={modalState} setModalState={setModalState}>
            <WorkerDashboard setModalState={setModalState} />
          </Shell>
        </ProtectedRoute>
      )} />

      {/* Public routes with shell */}
      <Route path="/jobs"    component={() => (
        <Shell modalState={modalState} setModalState={setModalState}>
          <Jobs setModalState={setModalState} />
        </Shell>
      )} />
      <Route path="/workers" component={() => (
        <Shell modalState={modalState} setModalState={setModalState}>
          <Workers setModalState={setModalState} />
        </Shell>
      )} />
      <Route path="/" component={() => (
        <Shell modalState={modalState} setModalState={setModalState}>
          <Landing setModalState={setModalState} />
        </Shell>
      )} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [modalState, setModalState] = useState<ModalState>({
    postJob:   false,
    workerReg: false,
    applyJob:  null,
  });

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter hook={useHashLocation}>
            <AppRoutes modalState={modalState} setModalState={setModalState} />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
