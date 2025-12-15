import { useState } from 'react';
import { Play, X, Youtube, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface YouTubePlayerProps {
  shortVideo?: string;
  longVideo?: string;
}

// Extract YouTube video ID from various URL formats
function extractVideoId(url: string): string | null {
  if (!url) return null;
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Check if URL is a YouTube Short
function isYouTubeShort(url: string): boolean {
  return url?.includes('/shorts/') || false;
}

export function YouTubePlayer({ shortVideo, longVideo }: YouTubePlayerProps) {
  const [activeVideo, setActiveVideo] = useState<'short' | 'long' | null>(null);
  
  const shortVideoId = shortVideo ? extractVideoId(shortVideo) : null;
  const longVideoId = longVideo ? extractVideoId(longVideo) : null;
  
  if (!shortVideoId && !longVideoId) return null;

  const closePlayer = () => setActiveVideo(null);

  return (
    <>
      {/* Video Buttons - Compact on mobile */}
      <div className="w-full clear-both">
        <div className="flex flex-wrap gap-1.5 sm:gap-3">
          {shortVideoId && (
            <button
              onClick={() => setActiveVideo('short')}
              className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg transition-all group"
            >
              <Youtube className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-red-500" />
              <div className="text-left">
                <div className="text-[10px] sm:text-sm font-bold text-white group-hover:text-red-400 transition-colors">
                  Quick
                </div>
                <div className="text-[8px] sm:text-xs text-white/50 hidden sm:flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Under 60s
                </div>
              </div>
              <Play className="w-3 h-3 sm:w-4 sm:h-4 text-red-500 ml-1 sm:ml-2" />
            </button>
          )}
          
          {longVideoId && (
            <button
              onClick={() => setActiveVideo('long')}
              className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg transition-all group"
            >
              <Youtube className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-red-500" />
              <div className="text-left">
                <div className="text-[10px] sm:text-sm font-bold text-white group-hover:text-red-400 transition-colors">
                  Deep Dive
                </div>
                <div className="text-[8px] sm:text-xs text-white/50 hidden sm:flex items-center gap-1">
                  <Clock className="w-3 h-3" /> 5-20 min
                </div>
              </div>
              <Play className="w-3 h-3 sm:w-4 sm:h-4 text-red-500 ml-1 sm:ml-2" />
            </button>
          )}
        </div>
      </div>

      {/* Video Modal */}
      <AnimatePresence>
        {activeVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={closePlayer}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-4xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={closePlayer}
                className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
                <span className="sr-only">Close</span>
              </button>

              {/* Video Container */}
              <div className={`relative w-full ${
                activeVideo === 'short' && isYouTubeShort(shortVideo || '')
                  ? 'max-w-sm mx-auto aspect-[9/16]' // Vertical for shorts
                  : 'aspect-video' // 16:9 for regular videos
              } bg-black rounded-lg overflow-hidden border border-white/20`}>
                <iframe
                  src={`https://www.youtube.com/embed/${
                    activeVideo === 'short' ? shortVideoId : longVideoId
                  }?autoplay=1&rel=0`}
                  title={activeVideo === 'short' ? 'Quick Explanation' : 'Deep Dive Video'}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              </div>

              {/* Video Type Label */}
              <div className="mt-4 text-center">
                <span className="text-xs font-bold uppercase tracking-widest text-white/50">
                  {activeVideo === 'short' ? '⚡ Quick Explanation' : '📚 Deep Dive'}
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
