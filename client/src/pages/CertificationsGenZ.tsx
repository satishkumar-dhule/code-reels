/**
 * Gen Z Certifications Page - Get Certified, Get Hired
 * Same aesthetic as Channels page
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { AppLayout } from '../components/layout/AppLayout';
import { SEOHead } from '../components/SEOHead';
import {
  Search, Award, Clock, ChevronRight, Sparkles, TrendingUp, Check, Plus,
  Cloud, Shield, Database, Brain, Code, Users, Box, Terminal, Server, Cpu,
  Layers, Network, GitBranch, Loader2, Target
} from 'lucide-react';

// Certification type
interface Certification {
  id: string;
  name: string;
  provider: string;
  description: string;
  icon: string;
  color: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  category: string;
  estimatedHours: number;
  examCode?: string;
  questionCount: number;
  passingScore: number;
  examDuration: number;
}

// Icon mapping
const iconMap: Record<string, any> = {
  'cloud': Cloud,
  'shield': Shield,
  'database': Database,
  'brain': Brain,
  'code': Code,
  'users': Users,
  'box': Box,
  'terminal': Terminal,
  'server': Server,
  'cpu': Cpu,
  'layers': Layers,
  'network': Network,
  'infinity': GitBranch,
  'award': Award,
};

// Categories
const categories = [
  { id: 'cloud', name: 'Cloud' },
  { id: 'devops', name: 'DevOps' },
  { id: 'security', name: 'Security' },
  { id: 'data', name: 'Data' },
  { id: 'ai', name: 'AI & ML' },
  { id: 'development', name: 'Development' },
  { id: 'management', name: 'Management' }
];

// Fetch certifications
function useCertifications() {
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCertifications() {
      try {
        const basePath = import.meta.env.BASE_URL || '/';
        const response = await fetch(`${basePath}data/certifications.json`);
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        setCertifications(data);
      } catch (err) {
        console.error('Failed to load certifications:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchCertifications();
  }, []);

  return { certifications, loading };
}

export default function CertificationsGenZ() {
  const [, navigate] = useLocation();
  const { certifications, loading } = useCertifications();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [startedCerts, setStartedCerts] = useState<Set<string>>(new Set());

  // Load started certifications from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('startedCertifications');
      if (saved) {
        setStartedCerts(new Set(JSON.parse(saved)));
      }
    } catch (e) {
      console.error('Failed to load started certs:', e);
    }
  }, []);

  // Toggle started certification
  const toggleStarted = (certId: string) => {
    const newStarted = new Set(startedCerts);
    if (newStarted.has(certId)) {
      newStarted.delete(certId);
    } else {
      newStarted.add(certId);
    }
    setStartedCerts(newStarted);
    try {
      localStorage.setItem('startedCertifications', JSON.stringify(Array.from(newStarted)));
    } catch (e) {
      console.error('Failed to save:', e);
    }
  };

  // Filter certifications
  const filteredCerts = certifications.filter(cert => {
    const matchesSearch = cert.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         cert.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         cert.provider.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || cert.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-background flex items-center justify-center pt-safe pb-safe">
          <Loader2 className="w-10 h-10 md:w-12 md:h-12 text-primary animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <>
      <SEOHead
        title="Certifications - Get Certified, Get Hired 🎓"
        description="Practice for AWS, Azure, GCP, Kubernetes, and more certifications"
        canonical="https://open-interview.github.io/certifications"
      />

      <AppLayout>
        <div className="min-h-screen bg-background text-foreground pt-safe">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12 pb-safe">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-4 md:space-y-6 mb-8 md:mb-12"
            >
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-black">
                Get
                <br />
                <span className="bg-gradient-to-r from-primary to-cyan-500 bg-clip-text text-transparent">
                  certified
                </span>
              </h1>
              <p className="text-base md:text-xl text-muted-foreground">
                {filteredCerts.length} certifications to master
              </p>
            </motion.div>

            {/* Search Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="max-w-2xl mx-auto mb-6 md:mb-8"
            >
              <div className="relative">
                <Search className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 w-5 h-5 md:w-6 md:h-6 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search certifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 md:pl-16 pr-4 md:pr-6 py-4 md:py-6 bg-muted/50 backdrop-blur-xl border border-border rounded-[20px] md:rounded-[24px] text-base md:text-xl focus:outline-none focus:border-primary transition-all"
                />
              </div>
            </motion.div>

            {/* Category Filters */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap gap-2 md:gap-3 justify-center mb-8 md:mb-12"
            >
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 md:px-6 py-2 md:py-3 rounded-full text-sm md:text-base font-semibold transition-all ${
                  !selectedCategory
                    ? 'bg-gradient-to-r from-primary to-cyan-500 text-primary-foreground'
                    : 'bg-muted/50 border border-border hover:bg-muted'
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 md:px-6 py-2 md:py-3 rounded-full text-sm md:text-base font-semibold transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-gradient-to-r from-primary to-cyan-500 text-primary-foreground'
                      : 'bg-muted/50 border border-border hover:bg-muted'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </motion.div>

            {/* Certifications Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {filteredCerts.map((cert, i) => {
                const IconComponent = iconMap[cert.icon] || Award;
                const isStarted = startedCerts.has(cert.id);

                return (
                  <motion.div
                    key={cert.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: Math.min(i * 0.05, 0.5) }}
                    className="group relative p-4 md:p-6 bg-muted/50 backdrop-blur-xl rounded-[20px] md:rounded-[24px] border border-border hover:border-border transition-all overflow-hidden"
                  >
                    {/* Background gradient on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="relative space-y-3 md:space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                          {/* Icon */}
                          <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-primary/20 to-cyan-500/20 rounded-[14px] md:rounded-[16px] flex items-center justify-center flex-shrink-0 border border-primary/30">
                            <IconComponent className="w-6 h-6 md:w-7 md:h-7 text-primary" strokeWidth={2} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs text-muted-foreground mb-1">{cert.provider}</div>
                            <h3 className="text-base md:text-xl font-bold leading-tight line-clamp-2">{cert.name}</h3>
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">{cert.description}</p>

                      {/* Stats */}
                      <div className="flex items-center gap-3 md:gap-4 text-xs md:text-sm">
                        <div className="flex items-center gap-1.5 md:gap-2">
                          <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary flex-shrink-0" />
                          <span className="text-muted-foreground">{cert.questionCount} questions</span>
                        </div>
                        <div className="flex items-center gap-1.5 md:gap-2">
                          <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-cyan-500 flex-shrink-0" />
                          <span className="text-muted-foreground">{cert.estimatedHours}h</span>
                        </div>
                      </div>

                      {/* Difficulty Badge */}
                      <div className="flex items-center gap-2">
                        <Target className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground flex-shrink-0" />
                        <span className={`text-xs font-semibold uppercase ${
                          cert.difficulty === 'beginner' ? 'text-green-500' :
                          cert.difficulty === 'intermediate' ? 'text-yellow-500' :
                          cert.difficulty === 'advanced' ? 'text-orange-500' :
                          'text-red-500'
                        }`}>
                          {cert.difficulty}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 md:gap-3">
                        <button
                          onClick={() => toggleStarted(cert.id)}
                          className={`flex-1 px-4 md:px-6 py-2.5 md:py-3 rounded-[14px] md:rounded-[16px] text-sm md:text-base font-bold transition-all ${
                            isStarted
                              ? 'bg-muted border border-border hover:bg-white/20'
                              : 'bg-gradient-to-r from-primary to-cyan-500 text-primary-foreground hover:scale-105'
                          }`}
                        >
                          {isStarted ? (
                            <span className="flex items-center justify-center gap-2">
                              <Check className="w-4 h-4 md:w-5 md:h-5" />
                              <span className="hidden sm:inline">Started</span>
                            </span>
                          ) : (
                            <span className="flex items-center justify-center gap-2">
                              <Plus className="w-4 h-4 md:w-5 md:h-5" />
                              <span className="hidden sm:inline">Start</span>
                            </span>
                          )}
                        </button>

                        {isStarted && (
                          <button
                            onClick={() => navigate(`/channel/${cert.id}`)}
                            className="px-4 md:px-6 py-2.5 md:py-3 bg-muted/50 hover:bg-muted rounded-[14px] md:rounded-[16px] border border-border transition-all"
                          >
                            <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Empty State */}
            {filteredCerts.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 md:py-20"
              >
                <div className="text-4xl md:text-6xl mb-3 md:mb-4">🔍</div>
                <h3 className="text-xl md:text-2xl font-bold mb-2">No certifications found</h3>
                <p className="text-sm md:text-base text-muted-foreground">Try a different search or category</p>
              </motion.div>
            )}
          </div>
        </div>
      </AppLayout>
    </>
  );
}
