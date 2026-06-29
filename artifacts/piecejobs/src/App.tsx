import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { useState } from "react";
import Landing from "@/pages/landing";
import Jobs from "@/pages/jobs";
import Workers from "@/pages/workers";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import PostJobModal from "@/components/modals/post-job-modal";
import WorkerRegistrationModal from "@/components/modals/worker-registration-modal";
import ApplyJobModal from "@/components/modals/apply-job-modal";

const queryClient = new QueryClient();

export type ModalState = {
  postJob: boolean;
  workerReg: boolean;
  applyJob: string | null; // job id
};

function Router({ modalState, setModalState }: { modalState: ModalState, setModalState: React.Dispatch<React.SetStateAction<ModalState>> }) {
  return (
    <div className="flex flex-col min-h-[100dvh] w-full font-sans">
      <Navbar setModalState={setModalState} />
      <main className="flex-1">
        <Switch>
          <Route path="/" component={() => <Landing setModalState={setModalState} />} />
          <Route path="/jobs" component={() => <Jobs setModalState={setModalState} />} />
          <Route path="/workers" component={Workers} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />

      <PostJobModal open={modalState.postJob} onOpenChange={(open) => setModalState(prev => ({ ...prev, postJob: open }))} />
      <WorkerRegistrationModal open={modalState.workerReg} onOpenChange={(open) => setModalState(prev => ({ ...prev, workerReg: open }))} />
      <ApplyJobModal jobId={modalState.applyJob} onOpenChange={(open) => setModalState(prev => ({ ...prev, applyJob: open ? modalState.applyJob : null }))} />
    </div>
  );
}

function App() {
  const [modalState, setModalState] = useState<ModalState>({ postJob: false, workerReg: false, applyJob: null });

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router modalState={modalState} setModalState={setModalState} />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
