import { useState, useEffect } from 'react';
import { getChannelStats, api } from '../lib/questions-loader';
import type { ChannelDetailedStats } from '../types';

// Re-export for backward compatibility
export type ChannelStats = ChannelDetailedStats;

// Hook to get channel statistics
export function useChannelStats() {
  const [stats, setStats] = useState<ChannelDetailedStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Try cache first
    const cached = getChannelStats();
    if (cached.length > 0) {
      setStats(cached);
      setLoading(false);
      return;
    }

    // Load from API
    api.stats.getAll()
      .then(setStats)
      .catch((err: Error) => {
        setError(err);
        setStats([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return { 
    stats, 
    loading, 
    error 
  };
}
