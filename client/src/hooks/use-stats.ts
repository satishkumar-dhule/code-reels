import { useMemo } from 'react';
import { getChannelStats } from '../lib/questions-loader';

export interface ChannelStats {
  id: string;
  total: number;
  beginner: number;
  intermediate: number;
  advanced: number;
}

// Hook to get channel statistics (static, no API call)
export function useChannelStats() {
  const stats = useMemo(() => getChannelStats(), []);

  return { 
    stats, 
    loading: false, 
    error: null 
  };
}
