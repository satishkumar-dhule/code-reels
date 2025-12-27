import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { MascotToaster } from "./components/MascotToaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { StagingBanner } from "./components/StagingBanner";
import NotFound from "@/pages/not-found";
// Pages - using redesigned versions as default
import Home from "@/pages/HomeRedesigned";
import About from "@/pages/About";
import WhatsNew from "@/pages/WhatsNew";
import QuestionViewer from "@/pages/QuestionViewer";
import Stats from "@/pages/StatsRedesigned";
import Channels from "@/pages/AllChannelsRedesigned";
import BotActivity from "@/pages/BotActivity";
import Badges from "@/pages/Badges";
import TestSession from "@/pages/TestSession";
import Tests from "@/pages/Tests";
import CodingChallenge from "@/pages/CodingChallenge";
import Profile from "@/pages/Profile";
import Notifications from "@/pages/Notifications";
import Bookmarks from "@/pages/Bookmarks";
import ReviewSession from "@/pages/ReviewSession";
import VoiceInterview from "@/pages/VoiceInterview";
import { Onboarding } from "./components/Onboarding";
import { MarvelIntro, useMarvelIntro } from "./components/MarvelIntro";
import { ThemeProvider } from "./context/ThemeContext";
import { UserPreferencesProvider, useUserPreferences } from "./context/UserPreferencesContext";
import { BadgeProvider } from "./context/BadgeContext";
import { CreditsProvider, useCredits } from "./context/CreditsContext";
import { CreditSplash } from "./components/CreditsDisplay";
import { usePageViewTracking, useSessionTracking, useInteractionTracking } from "./hooks/use-analytics";
import { AnimatePresence } from "framer-motion";
import { preloadQuestions } from "./lib/questions-loader";
import PixelMascot from "./components/PixelMascot";
import BackgroundMascots from "./components/BackgroundMascots";

// Handle SPA redirect from 404.html (GitHub Pages)
function useSpaRedirect() {
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    // Check if we're returning from a 404 redirect
    const params = new URLSearchParams(window.location.search);
    if (params.get('spa-redirect') === 'true') {
      try {
        const stored = sessionStorage.getItem('spa-redirect');
        if (stored) {
          const { path, search, hash } = JSON.parse(stored);
          sessionStorage.removeItem('spa-redirect');
          
          // Navigate to the intended path
          const fullPath = path + (search || '') + (hash || '');
          // Use replaceState to clean up the URL
          window.history.replaceState(null, '', fullPath);
          setLocation(path);
        }
      } catch (e) {
        console.error('SPA redirect error:', e);
      }
    }
  }, [setLocation]);
}

function Router() {
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
      <Route path="/notifications" component={Notifications} />
      <Route path="/bookmarks" component={Bookmarks} />
      <Route path="/review" component={ReviewSession} />
      <Route path="/voice-interview" component={VoiceInterview} />
      <Route path="/channel/:id" component={QuestionViewer} />
      <Route path="/channel/:id/:index" component={QuestionViewer} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  // Handle SPA redirects from 404.html (GitHub Pages)
  useSpaRedirect();
  
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
      <MascotToaster />
      <BackgroundMascots />
      <GlobalCreditSplash />
    </>
  );
}

// Global credit splash component
function GlobalCreditSplash() {
  const { creditChange, clearCreditChange } = useCredits();
  return (
    <CreditSplash 
      amount={creditChange.amount} 
      show={creditChange.show} 
      onComplete={clearCreditChange}
    />
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <UserPreferencesProvider>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <BadgeProvider>
                <CreditsProvider>
                  <StagingBanner />
                  <Toaster />
                  <AppContent />
                </CreditsProvider>
              </BadgeProvider>
            </TooltipProvider>
          </QueryClientProvider>
        </UserPreferencesProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
