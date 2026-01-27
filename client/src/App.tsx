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
const AnswerHistory = React.lazy(() => import("@/pages/AnswerHistory"));
const About = React.lazy(() => import("@/pages/About"));
const WhatsNew = React.lazy(() => import("@/pages/WhatsNew"));
const QuestionViewer = React.lazy(() => import("@/pages/QuestionViewerGenZ"));
const Stats = React.lazy(() => import("@/pages/StatsGenZ"));
const Channels = React.lazy(() => import("@/pages/AllChannelsGenZ"));
const BotActivity = React.lazy(() => import("@/pages/BotActivity"));
const Badges = React.lazy(() => import("@/pages/BadgesGenZ"));
const TestSession = React.lazy(() => import("@/pages/TestSessionGenZ"));
const Tests = React.lazy(() => import("@/pages/TestsGenZ"));
const CodingChallenge = React.lazy(() => import("@/pages/CodingChallengeGenZ"));
const Profile = React.lazy(() => import("@/pages/ProfileGenZ"));
const Notifications = React.lazy(() => import("@/pages/Notifications"));
const Bookmarks = React.lazy(() => import("@/pages/Bookmarks"));
const ReviewSession = React.lazy(() => import("@/pages/ReviewSessionGenZ"));
const VoicePractice = React.lazy(() => import("@/pages/VoicePracticeGenZ"));
const VoiceSession = React.lazy(() => import("@/pages/VoiceSessionGenZ"));
const Certifications = React.lazy(() => import("@/pages/CertificationsGenZ"));
const CertificationPractice = React.lazy(() => import("@/pages/CertificationPracticeGenZ"));
const CertificationExam = React.lazy(() => import("@/pages/CertificationExamGenZ"));
const Documentation = React.lazy(() => import("@/pages/Documentation"));
const ExtremeQuestionViewer = React.lazy(() => import("@/pages/ExtremeQuestionViewer"));
const LearningPaths = React.lazy(() => import("@/pages/UnifiedLearningPathsGenZ"));
const MyPath = React.lazy(() => import("@/pages/UnifiedLearningPathsGenZ"));
const PersonalizedPath = React.lazy(() => import("@/pages/PersonalizedPath"));
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
import { AICompanion } from "./components/AICompanion";

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
        <Route path="/history" component={AnswerHistory} />
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
        <Route path="/learning-paths" component={LearningPaths} />
        <Route path="/my-path" component={MyPath} />
        <Route path="/personalized-path" component={PersonalizedPath} />
        <Route path="/profile" component={Profile} />
        <Route path="/notifications" component={Notifications} />
        <Route path="/bookmarks" component={Bookmarks} />
        <Route path="/review" component={ReviewSession} />
        <Route path="/voice-interview" component={VoicePractice} />
        <Route path="/training" component={VoicePractice} />
        <Route path="/voice-session" component={VoiceSession} />
        <Route path="/voice-session/:questionId" component={VoiceSession} />
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
      {/* AI Companion - DISABLED */}
      {/* <GlobalAICompanion /> */}
      {/* Progressive onboarding - DISABLED for Gen Z redesign */}
      {/* {needsOnboarding && <ProgressiveOnboarding />} */}
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

// Global AI Companion - available on every page
function GlobalAICompanion() {
  const [location, setLocation] = useLocation();
  
  // Determine page type and content based on current route
  const getPageContext = () => {
    if (location === '/') {
      return {
        type: 'home',
        title: 'Home',
        content: 'Welcome! Explore learning paths, certifications, and practice questions.',
      };
    } else if (location.startsWith('/learning-paths')) {
      return {
        type: 'learning-paths',
        title: 'Learning Paths',
        content: 'Browse and activate structured learning paths',
      };
    } else if (location.startsWith('/certifications')) {
      return {
        type: 'certifications',
        title: 'Certifications',
        content: 'Prepare for professional certifications',
      };
    } else if (location.startsWith('/channels')) {
      return {
        type: 'channels',
        title: 'All Channels',
        content: 'Browse all available learning channels',
      };
    } else if (location.startsWith('/profile')) {
      return {
        type: 'profile',
        title: 'Profile',
        content: 'View your progress and achievements',
      };
    } else if (location.startsWith('/bookmarks')) {
      return {
        type: 'bookmarks',
        title: 'Bookmarks',
        content: 'Your saved questions',
      };
    } else if (location.startsWith('/review')) {
      return {
        type: 'review',
        title: 'SRS Review',
        content: 'Spaced repetition review session',
      };
    } else if (location.startsWith('/voice-interview') || location.startsWith('/training')) {
      return {
        type: 'voice-interview',
        title: 'Voice Interview Practice',
        content: 'Practice answering questions with voice',
      };
    } else if (location.startsWith('/coding')) {
      return {
        type: 'coding',
        title: 'Coding Challenges',
        content: 'Practice coding problems',
      };
    } else if (location.startsWith('/tests')) {
      return {
        type: 'tests',
        title: 'Tests',
        content: 'Take practice tests',
      };
    } else if (location.startsWith('/badges')) {
      return {
        type: 'badges',
        title: 'Badges & Achievements',
        content: 'View your earned badges',
      };
    } else if (location.startsWith('/stats')) {
      return {
        type: 'stats',
        title: 'Statistics',
        content: 'View your learning statistics',
      };
    }
    
    return {
      type: 'general',
      title: 'Learning Platform',
      content: 'Your personalized learning companion',
    };
  };
  
  // Available actions based on current page
  const getAvailableActions = () => {
    if (location === '/') {
      return ['exploreLearningPaths', 'viewCertifications', 'startPractice', 'viewProfile'];
    } else if (location.startsWith('/learning-paths')) {
      return ['activatePath', 'viewPathDetails', 'startPath'];
    } else if (location.startsWith('/certifications')) {
      return ['startCertification', 'viewProgress'];
    }
    return [];
  };
  
  // Handle navigation
  const handleNavigate = (path: string) => {
    setLocation(path);
  };
  
  // Handle actions
  const handleAction = (action: string, data?: any) => {
    console.log('Global action:', action, data);
    
    switch (action) {
      case 'exploreLearningPaths':
        setLocation('/learning-paths');
        break;
      case 'viewCertifications':
        setLocation('/certifications');
        break;
      case 'startPractice':
        setLocation('/channels');
        break;
      case 'viewProfile':
        setLocation('/profile');
        break;
      case 'viewBookmarks':
        setLocation('/bookmarks');
        break;
      case 'startReview':
        setLocation('/review');
        break;
      case 'voiceInterview':
        setLocation('/voice-interview');
        break;
      case 'codingChallenges':
        setLocation('/coding');
        break;
      case 'takeTest':
        setLocation('/tests');
        break;
      case 'viewBadges':
        setLocation('/badges');
        break;
      case 'viewStats':
        setLocation('/stats');
        break;
      default:
        console.warn('Unknown global action:', action);
    }
  };
  
  return (
    <AICompanion
      pageContent={getPageContext()}
      onNavigate={handleNavigate}
      onAction={handleAction}
      availableActions={getAvailableActions()}
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
