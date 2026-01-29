/**
 * Modern Home Page - Complete UX Redesign
 * Features: Extreme UX focus, engaging interactions, optimal user flow
 * Responsive: Mobile-first design with desktop enhancements
 */

import { AppLayout } from '../components/layout/AppLayout';
import { GenZHomePage } from '../components/home/GenZHomePage';
import { SEOHead } from '../components/SEOHead';

export default function HomeRedesigned() {
  return (
    <>
      <SEOHead
        title="CodeReels - Level Up Your Interview Game 🚀"
        description="Practice. Progress. Get hired. The most addictive way to prep for technical interviews. No cap."
        canonical="https://open-interview.github.io/"
      />
      
      {/* iPhone 13 FIX: Use fullWidth to prevent double padding */}
      <AppLayout fullWidth>
        <GenZHomePage />
      </AppLayout>
    </>
  );
}


