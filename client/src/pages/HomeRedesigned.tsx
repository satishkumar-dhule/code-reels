/**
 * Redesigned Home Page
 * Features: Focused feed with featured question, channel cards, progress tracking
 * Responsive: Same design for mobile and desktop with scaling
 */

import { AppLayout } from '../components/layout/AppLayout';
import { MobileHomeFocused } from '../components/mobile/MobileHomeFocused';
import { SEOHead } from '../components/SEOHead';

export default function HomeRedesigned() {
  return (
    <>
      <SEOHead
        title="Code Reels - Free Technical Interview Prep | System Design, Algorithms, Frontend, DevOps"
        description="Master technical interviews with 1000+ free practice questions. System design, algorithms, frontend, backend, DevOps, SRE, AI/ML interview prep."
        canonical="https://open-interview.github.io/"
      />
      
      <AppLayout>
        <MobileHomeFocused />
      </AppLayout>
    </>
  );
}


