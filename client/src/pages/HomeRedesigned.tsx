/**
 * Modern Home Page - Complete UX Redesign
 * Features: Extreme UX focus, engaging interactions, optimal user flow
 * Responsive: Mobile-first design with desktop enhancements
 */

import { AppLayout } from '../components/layout/AppLayout';
import { ModernHomePage } from '../components/home/ModernHomePage';
import { SEOHead } from '../components/SEOHead';

export default function HomeRedesigned() {
  return (
    <>
      <SEOHead
        title="Code Reels - AI-Powered Technical Interview Prep | Master Coding Interviews"
        description="Transform your interview skills with AI-powered practice. Voice interviews, coding challenges, system design, and personalized learning paths. Join 12,000+ successful candidates."
        canonical="https://open-interview.github.io/"
      />
      
      <AppLayout>
        <ModernHomePage />
      </AppLayout>
    </>
  );
}


