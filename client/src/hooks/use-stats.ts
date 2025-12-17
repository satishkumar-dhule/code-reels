import { useState, useEffect, useMemo } from 'react';
import { getChannelStats, api } from '../lib/questions-loader';

export interface ChannelStats {
  id: string;
  total: number;
  beginner: number;
  intermediate: number;
  advanced: number;
}

// Hook to get channel statistics
export function useChannelStats() {
  const [stats, setStats] = useState<ChannelStats[]>([]);
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
    api.fetchStats()
      .then(setStats)
      .catch(err => {
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
