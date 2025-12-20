import { Switch, Route } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
// Original pages
import StatsOriginal from "@/pages/Stats";
import HomeOriginal from "@/pages/Home";
import About from "@/pages/About";
import WhatsNew from "@/pages/WhatsNew";
import ReelsOriginal from "@/pages/ReelsRedesigned";
import AllChannels from "@/pages/AllChannels";
import MermaidTest from "@/pages/MermaidTest";
import BotActivity from "@/pages/BotActivity";
import Badges from "@/pages/Badges";
import TestSession from "@/pages/TestSession";
import Tests from "@/pages/Tests";
import CodingChallenge from "@/pages/CodingChallenge";
// Redesigned pages (Google-style)
import HomeRedesigned from "@/pages/HomeRedesigned";
import ReelsGoogle from "@/pages/ReelsGoogle";
import StatsRedesigned from "@/pages/StatsRedesigned";
import AllChannelsRedesigned from "@/pages/AllChannelsRedesigned";
import Profile from "@/pages/Profile";
import { Onboarding } from "./components/Onboarding";
import { MarvelIntro, useMarvelIntro } from "./components/MarvelIntro";
import { ThemeProvider } from "./context/ThemeContext";
import { UserPreferencesProvider, useUserPreferences } from "./context/UserPreferencesContext";
import { usePageViewTracking, useSessionTracking, useInteractionTracking } from "./hooks/use-analytics";
import { AnimatePresence } from "framer-motion";
import { preloadQuestions } from "./lib/questions-loader";
import PixelMascot from "./components/PixelMascot";
import DuolingoMascots from "./components/DuolingoMascots";

// New UI is now the default for all users
const useNewUI = () => {
  return true; // Always use new UI
};

// Export toggle function for easy switching
if (typeof window !== 'undefined') {
  (window as any).toggleNewUI = () => {
    const current = localStorage.getItem('use-new-ui') === 'true';
    localStorage.setItem('use-new-ui', (!current).toString());
    window.location.reload();
  };
}

function Router() {
  const newUI = useNewUI();
  
  // Select components based on UI mode
  const Home = newUI ? HomeRedesigned : HomeOriginal;
  const Reels = newUI ? ReelsGoogle : ReelsOriginal;
  const Stats = newUI ? StatsRedesigned : StatsOriginal;
  const Channels = newUI ? AllChannelsRedesigned : AllChannels;
  
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/about" component={About} />
      <Route path="/whats-new" component={WhatsNew} />
      <Route path="/stats" component={Stats} />
      <Route path="/badges" component={Badges} />
      <Route path="/tests" component={Tests} />
      <Route path="/test/:channelId" component={TestSession} />
      <Route path="/coding" component={CodingChallenge} />
      <Route path="/coding/:id" component={CodingChallenge} />
      <Route path="/bot-activity" component={BotActivity} />
      <Route path="/channels" component={Channels} />
      <Route path="/profile" component={Profile} />
      <Route path="/test/mermaid" component={MermaidTest} />
      <Route path="/channel/:id" component={Reels} />
      <Route path="/channel/:id/:index" component={Reels} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  // Initialize analytics hooks
  usePageViewTracking();
  useSessionTracking();
  useInteractionTracking();
  
  // Preload questions for search functionality
  useEffect(() => {
    preloadQuestions().catch(console.error);
  }, []);
  
  const { needsOnboarding } = useUserPreferences();
  const { showIntro, isChecking, completeIntro } = useMarvelIntro();
  
  // Don't render anything while checking localStorage
  if (isChecking) {
    return null;
  }
  
  // Show Marvel intro for first-time visitors (before onboarding)
  if (showIntro) {
    return (
      <AnimatePresence>
        <MarvelIntro onComplete={completeIntro} />
      </AnimatePresence>
    );
  }
  
  // Show onboarding for first-time users
  if (needsOnboarding) {
    return <Onboarding />;
  }

  return (
    <>
      <Router />
      <PixelMascot />
      <DuolingoMascots />
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <UserPreferencesProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <AppContent />
          </TooltipProvider>
        </QueryClientProvider>
      </UserPreferencesProvider>
    </ThemeProvider>
  );
}

export default App;
