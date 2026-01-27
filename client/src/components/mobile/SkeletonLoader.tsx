/**
 * Skeleton Loader Component - Mobile-First
 * Pattern: Facebook, LinkedIn, Instagram
 */

import { cn } from '../../lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({ 
  className, 
  variant = 'rectangular',
  animation = 'pulse'
}: SkeletonProps) {
  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg'
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: ''
  };

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading content"
      className={cn(
        'bg-gray-200 dark:bg-gray-800',
        variantClasses[variant],
        animationClasses[animation],
        className
      )}
    />
  );
}

// Preset skeleton components
export function SkeletonCard() {
  return (
    <div 
      className="p-4 bg-white dark:bg-gray-900 rounded-[20px] border border-gray-200 dark:border-gray-800"
      role="status"
      aria-busy="true"
      aria-label="Loading card"
    >
      <div className="flex items-start gap-4">
        <Skeleton variant="circular" className="w-12 h-12 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div 
      className="space-y-4"
      role="status"
      aria-busy="true"
      aria-label="Loading list"
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div 
      className="space-y-2"
      role="status"
      aria-busy="true"
      aria-label="Loading text"
    >
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          variant="text"
          className={cn(
            "h-4",
            i === lines - 1 ? "w-2/3" : "w-full"
          )}
        />
      ))}
    </div>
  );
}
