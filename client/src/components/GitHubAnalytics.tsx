import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Eye, GitFork, Star, Download, ExternalLink, TrendingUp, Users } from "lucide-react";

interface GitHubAnalyticsData {
  views: { date: string; count: number; uniques: number }[];
  clones: { date: string; count: number; uniques: number }[];
  referrers: { referrer: string; count: number; uniques: number }[];
  repoStats: Record<string, { stars?: number; forks?: number; watchers?: number }>;
  lastUpdated: string;
}

export function GitHubAnalytics() {
  const [data, setData] = useState<GitHubAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/data/github-analytics.json')
      .then(res => res.ok ? res.json() : null)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="border border-border p-3 bg-card rounded-lg animate-pulse">
        <div className="h-4 bg-muted/30 rounded w-32 mb-3" />
        <div className="h-20 bg-muted/20 rounded" />
      </div>
    );
  }

  if (!data || (data.views.length === 0 && Object.keys(data.repoStats).length === 0)) {
    return null; // Don't show if no data
  }

  // Calculate totals
  const totalViews = data.views.reduce((sum, d) => sum + d.count, 0);
  const uniqueVisitors = data.views.reduce((sum, d) => sum + d.uniques, 0);
  const totalClones = data.clones.reduce((sum, d) => sum + d.count, 0);
  const uniqueCloners = data.clones.reduce((sum, d) => sum + d.uniques, 0);

  // Aggregate repo stats
  const totalStars = Object.values(data.repoStats).reduce((sum, r) => sum + (r.stars || 0), 0);
  const totalForks = Object.values(data.repoStats).reduce((sum, r) => sum + (r.forks || 0), 0);

  // Mini sparkline for views
  const maxView = Math.max(...data.views.map(v => v.count), 1);
  const sparklineData = data.views.slice(-14); // Last 14 days

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="border border-border p-3 bg-card rounded-lg"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-primary" />
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
            GitHub Traffic
          </span>
        </div>
        <a
          href="https://github.com/satishkumar-dhule/code-reels"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[9px] text-muted-foreground hover:text-primary flex items-center gap-0.5"
        >
          View on GitHub <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        <div className="bg-muted/10 rounded p-2 text-center">
          <Eye className="w-3.5 h-3.5 mx-auto mb-1 text-blue-500" />
          <div className="text-sm font-bold">{totalViews.toLocaleString()}</div>
          <div className="text-[9px] text-muted-foreground">Views (14d)</div>
        </div>
        <div className="bg-muted/10 rounded p-2 text-center">
          <Users className="w-3.5 h-3.5 mx-auto mb-1 text-green-500" />
          <div className="text-sm font-bold">{uniqueVisitors.toLocaleString()}</div>
          <div className="text-[9px] text-muted-foreground">Unique Visitors</div>
        </div>
        <div className="bg-muted/10 rounded p-2 text-center">
          <Star className="w-3.5 h-3.5 mx-auto mb-1 text-yellow-500" />
          <div className="text-sm font-bold">{totalStars}</div>
          <div className="text-[9px] text-muted-foreground">Stars</div>
        </div>
        <div className="bg-muted/10 rounded p-2 text-center">
          <GitFork className="w-3.5 h-3.5 mx-auto mb-1 text-purple-500" />
          <div className="text-sm font-bold">{totalForks}</div>
          <div className="text-[9px] text-muted-foreground">Forks</div>
        </div>
      </div>

      {/* Mini Sparkline */}
      {sparklineData.length > 0 && (
        <div className="mb-3">
          <div className="text-[9px] text-muted-foreground mb-1">Daily Views (14 days)</div>
          <div className="flex items-end gap-[2px] h-8">
            {sparklineData.map((d, i) => (
              <div
                key={d.date}
                className="flex-1 bg-primary/60 hover:bg-primary rounded-t transition-colors"
                style={{ height: `${Math.max((d.count / maxView) * 100, 4)}%` }}
                title={`${d.date}: ${d.count} views`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Top Referrers */}
      {data.referrers.length > 0 && (
        <div>
          <div className="text-[9px] text-muted-foreground mb-1.5">Top Referrers</div>
          <div className="space-y-1">
            {data.referrers.slice(0, 5).map((ref, i) => (
              <div key={ref.referrer} className="flex items-center justify-between text-[10px]">
                <span className="truncate flex-1 text-muted-foreground">{ref.referrer}</span>
                <span className="font-mono ml-2">{ref.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clone Stats */}
      {totalClones > 0 && (
        <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between text-[9px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <Download className="w-3 h-3" />
            <span>{totalClones} clones ({uniqueCloners} unique)</span>
          </div>
          {data.lastUpdated && (
            <span>Updated {new Date(data.lastUpdated).toLocaleDateString()}</span>
          )}
        </div>
      )}
    </motion.div>
  );
}
