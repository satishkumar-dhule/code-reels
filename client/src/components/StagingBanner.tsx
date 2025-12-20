/**
 * Staging Environment Banner
 * Shows a visual indicator when running in staging environment
 */

import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';

export function StagingBanner() {
  const [dismissed, setDismissed] = useState(false);
  
  // Only show in staging environment
  const isStaging = import.meta.env.VITE_STAGING === 'true';
  
  if (!isStaging || dismissed) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-yellow-500 text-black">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm font-bold">
            STAGING ENVIRONMENT
          </span>
          <span className="text-sm hidden sm:inline">
            — This is a preview. Changes here are not live.
          </span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://reel-interview.github.io"
            className="text-xs font-bold underline hover:no-underline"
          >
            Go to Production →
          </a>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 hover:bg-yellow-600 rounded transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default StagingBanner;
