import { Switch, Route, useLocation } from "wouter";
import { useEffect, useState, Suspense } from "react";
import React from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { StagingBanner } from "./components/StagingBanner";
import NotFound from "@/pages/not-found";

// Lazy loaded pages with React.lazy for code splitting
const Home = React.lazy(() => import("@/pages/HomeRedesigned"));
const About = React.lazy(() => import("@/pages/About"));
const WhatsNew = React.lazy(() => import("@/pages/WhatsNew"));
const QuestionViewer = React.lazy(() => import("@/pages/QuestionViewer"));
const Stats = React.lazy(() => import("@/pages/StatsRedesigned"));
const Channels = React.lazy(() => import("@/pages/AllChannelsRedesigned"));
const BotActivity = React.lazy(() => import("@/pages/BotActivity"));
const Badges = React.lazy(() => import("@/pages/Badges"));
const TestSession = React.lazy(() => import("@/pages/TestSession"));
const Tests = React.lazy(() => import("@/pages/Tests"));
const CodingChallenge = React.lazy(() => import("@/pages/CodingChallenge"));
const Profile = React.lazy(() => import("@/pages/Profile"));
const Notifications = React.lazy(() => import("@/pages/Notifications"));
const Bookmarks = React.lazy(() => import("@/pages/Bookmarks"));
const ReviewSession = React.lazy(() => import("@/pages/ReviewSession"));
const VoiceInterview = React.lazy(() => import("@/pages/VoiceInterview"));
const VoiceSession = React.lazy(() => import("@/pages/VoiceSession"));
const Certifications = React.lazy(() => import("@/pages/Certifications"));
const CertificationPractice = React.lazy(() => import("@/pages/CertificationPractice"));
const CertificationExam = React.lazy(() => import("@/pages/CertificationExam"));
const TrainingMode = React.lazy(() => import("@/pages/TrainingMode"));
const Documentation = React.lazy(() => import("@/pages/Documentation"));
const ExtremeQuestionViewer = React.lazy(() => import("@/pages/ExtremeQuestionViewer"));
import { ProgressiveOnboarding } from "./components/ProgressiveOnboarding";
import { ThemeProvider } from "./context/ThemeContext";
import { UserPreferencesProvider, useUserPreferences } from "./context/UserPreferencesContext";
import { BadgeProvider } from "./context/BadgeContext";
import { CreditsProvider, useCredits } from "./context/CreditsContext";
import { AchievementProvider, useAchievementContext } from "./context/AchievementContext";
import { SidebarProvider } from "./context/SidebarContext";
import { CreditSplash } from "./components/CreditsDisplay";
import { AchievementNotificationManager } from "./components/AchievementNotificationManager";
import { UnifiedNotificationProvider } from "./components/UnifiedNotificationManager";
import { usePageViewTracking, useSessionTracking, useInteractionTracking } from "./hooks/use-analytics";
import { preloadQuestions, getQuestionByIdAsync } from "./lib/questions-loader";
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

// Handle ?search=q-XXX URL parameter to navigate directly to a question
function useSearchParamRedirect() {
  const [, setLocation] = useLocation();
  const [isRedirecting, setIsRedirecting] = useState(() => {
    // Check on initial render if we have a search param
    const params = new URLSearchParams(window.location.search);
    const searchParam = params.get('search');
    return !!(searchParam && (searchParam.startsWith('q-') || searchParam.startsWith('gh-')));
  });
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const searchParam = params.get('search');
    
    // Check if it's a question ID (q-XXX or gh-XXX format)
    if (searchParam && (searchParam.startsWith('q-') || searchParam.startsWith('gh-'))) {
      // Preload questions first, then find and redirect
      preloadQuestions().then(() => {
        return getQuestionByIdAsync(searchParam);
      }).then(question => {
        if (question) {
          // Navigate to the question
          const targetUrl = `/channel/${question.channel}/${question.id}`;
          window.history.replaceState(null, '', targetUrl);
          setLocation(targetUrl);
        }
        setIsRedirecting(false);
      }).catch(() => {
        setIsRedirecting(false);
      });
    }
  }, [setLocation]);
  
  return isRedirecting;
}

function Router() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
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
        <Route path="/voice-session" component={VoiceSession} />
        <Route path="/voice-session/:questionId" component={VoiceSession} />
        <Route path="/training" component={TrainingMode} />
        <Route path="/docs" component={Documentation} />
        <Route path="/certifications" component={Certifications} />
        <Route path="/certification/:id" component={CertificationPractice} />
        <Route path="/certification/:id/exam" component={CertificationExam} />
        <Route path="/certification/:id/:questionIndex" component={CertificationPractice} />
        <Route path="/extreme/channel/:id" component={ExtremeQuestionViewer} />
        <Route path="/extreme/channel/:id/:questionId" component={ExtremeQuestionViewer} />
        <Route path="/channel/:id" component={QuestionViewer} />
        <Route path="/channel/:id/:index" component={QuestionViewer} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function AppContent() {
  // Handle SPA redirects from 404.html (GitHub Pages)
  useSpaRedirect();
  
  // Handle ?search=q-XXX URL parameter
  const isSearchRedirecting = useSearchParamRedirect();
  
  // Initialize analytics hooks
  usePageViewTracking();
  useSessionTracking();
  useInteractionTracking();
  
  // Track daily login for achievements
  const { trackEvent } = useAchievementContext();
  useEffect(() => {
    trackEvent({
      type: 'daily_login',
      timestamp: new Date().toISOString(),
    });
  }, []);
  
  // Preload questions for search functionality
  useEffect(() => {
    preloadQuestions().catch(console.error);
  }, []);
  
  const { needsOnboarding } = useUserPreferences();
  
  // Don't render anything while redirecting
  if (isSearchRedirecting) {
    return null;
  }

  return (
    <>
      <Router />
      <PixelMascot />
      <BackgroundMascots />
      <GlobalCreditSplash />
      <AchievementNotificationManager />
      {/* Progressive onboarding - non-blocking, appears after delay */}
      {needsOnboarding && <ProgressiveOnboarding />}
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
          <SidebarProvider>
            <QueryClientProvider client={queryClient}>
              <TooltipProvider>
                <BadgeProvider>
                  <CreditsProvider>
                    <AchievementProvider>
                      <UnifiedNotificationProvider>
                        <StagingBanner />
                        <AppContent />
                      </UnifiedNotificationProvider>
                    </AchievementProvider>
                  </CreditsProvider>
                </BadgeProvider>
              </TooltipProvider>
            </QueryClientProvider>
          </SidebarProvider>
        </UserPreferencesProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
