/**
 * Certifications Page - Redesigned
 * Browse and select certification tracks with clear practice modes
 * Now loads certifications dynamically from the database
 */

import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { AppLayout } from '../components/layout/AppLayout';
import { useIsMobile } from '../hooks/use-mobile';
import { SEOHead } from '../components/SEOHead';
import {
  Search, Award, Clock, ChevronRight, Play, BookOpen,
  Cloud, Shield, Database, Brain, Code, Users, Box,
  Terminal, Server, Cpu, Layers, Network, GitBranch,
  Target, Zap, GraduationCap, Lock, Loader2
} from 'lucide-react';

// Certification type from API
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
  officialUrl?: string;
  domains: { id: string; name: string; weight: number }[];
  prerequisites: string[];
  questionCount: number;
  passingScore: number;
  examDuration: number;
}

// Certification categories
const certificationCategories = [
  { id: 'cloud', name: 'Cloud', icon: 'cloud' },
  { id: 'devops', name: 'DevOps', icon: 'infinity' },
  { id: 'security', name: 'Security', icon: 'shield' },
  { id: 'data', name: 'Data', icon: 'database' },
  { id: 'ai', name: 'AI & ML', icon: 'brain' },
  { id: 'development', name: 'Development', icon: 'code' },
  { id: 'management', name: 'Management', icon: 'users' }
];

const iconMap: Record<string, React.ReactNode> = {
  'cloud': <Cloud className="w-5 h-5" />,
  'shield': <Shield className="w-5 h-5" />,
  'database': <Database className="w-5 h-5" />,
  'brain': <Brain className="w-5 h-5" />,
  'code': <Code className="w-5 h-5" />,
  'users': <Users className="w-5 h-5" />,
  'box': <Box className="w-5 h-5" />,
  'terminal': <Terminal className="w-5 h-5" />,
  'server': <Server className="w-5 h-5" />,
  'cpu': <Cpu className="w-5 h-5" />,
  'layers': <Layers className="w-5 h-5" />,
  'network': <Network className="w-5 h-5" />,
  'infinity': <GitBranch className="w-5 h-5" />
};

const difficultyConfig: Record<string, { color: string; bg: string }> = {
  beginner: { color: 'text-green-500', bg: 'bg-green-500/10' },
  intermediate: { color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  advanced: { color: 'text-orange-500', bg: 'bg-orange-500/10' },
  expert: { color: 'text-red-500', bg: 'bg-red-500/10' }
};

// Custom hook to fetch certifications from static JSON (built from database)
function useCertifications() {
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCertifications() {
      try {
        // Fetch from static JSON file (generated at build time from database)
        const basePath = import.meta.env.BASE_URL || '/';
        const response = await fetch(`${basePath}data/certifications.json`);
        if (!response.ok) throw new Error('Failed to fetch certifications');
        const data = await response.json();
        setCertifications(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchCertifications();
  }, []);

  return { certifications, loading, error };
}

export default function Certifications() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const isMobile = useIsMobile();
  
  // Fetch certifications from API
  const { certifications, loading, error } = useCertifications();

  // Filter certifications
  const filteredCertifications = certifications.filter(cert => {
    const matchesSearch = cert.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         cert.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         cert.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || cert.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group by category
  const groupedCertifications = certificationCategories.map(cat => ({
    ...cat,
    certifications: filteredCertifications.filter(c => c.category === cat.id)
  })).filter(group => group.certifications.length > 0);

  // Featured certifications (those with questions)
  const featuredCerts = certifications.filter(c => c.questionCount > 0);

  // Show loading state
  if (loading) {
    return (
      <AppLayout title="Certifications">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <>
      <SEOHead
        title="Certification Tracks | Interview Prep"
        description="Practice for popular IT certifications: AWS, Azure, GCP, Kubernetes, Terraform, and more."
        canonical="https://open-interview.github.io/certifications"
      />

      <AppLayout title="Certifications">
        <div className="space-y-8">
          {/* Hero Header */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6 md:p-8">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-primary/20 rounded-xl">
                  <GraduationCap className="w-6 h-6 text-primary" />
                </div>
                <span className="text-sm font-medium text-primary">Certification Prep</span>
              </div>
              
              <h1 className="text-2xl md:text-3xl font-bold mb-2">
                Master Your Certification
              </h1>
              <p className="text-muted-foreground max-w-xl">
                Practice with exam-aligned questions, track your progress by domain, 
                and simulate real exam conditions.
              </p>

              <div className="flex flex-wrap gap-4 mt-6 text-sm">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-primary" />
                  <span>{certifications.length} Certifications</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  <span>Exam-Aligned Questions</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <span>Timed Practice Mode</span>
                </div>
              </div>
            </div>
            
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
          </div>

          {/* Featured Certifications with Exam Questions */}
          {featuredCerts.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg font-semibold">Ready for Exam Practice</h2>
                <span className="text-xs px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded-full">
                  {featuredCerts.length} available
                </span>
              </div>
              
              <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'} gap-4`}>
                {featuredCerts.map((cert, index) => (
                  <FeaturedCertCard
                    key={cert.id}
                    certification={cert}
                    index={index}
                    onPractice={() => navigate(`/certification/${cert.id}`)}
                    onExam={() => navigate(`/certification/${cert.id}/exam`)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Search and Filters */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search certifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-card border border-border rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
            </div>

            {/* Category Pills */}
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-all flex-shrink-0
                  ${!selectedCategory 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
              >
                All
              </button>
              {certificationCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                  className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-all flex items-center gap-2 flex-shrink-0
                    ${selectedCategory === cat.id 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                >
                  {iconMap[cat.icon]}
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* All Certifications */}
          <div className="space-y-8">
            {groupedCertifications.map(group => (
              <div key={group.id}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    {iconMap[group.icon]}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">{group.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {group.certifications.length} certifications
                    </p>
                  </div>
                </div>
                
                <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'} gap-4`}>
                  {group.certifications.map((cert, index) => (
                    <CertificationCard
                      key={cert.id}
                      certification={cert}
                      index={index}
                      onClick={() => navigate(`/certification/${cert.id}`)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {filteredCertifications.length === 0 && (
            <div className="text-center py-12">
              <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
              <h3 className="text-lg font-medium mb-2">No certifications found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or filter criteria
              </p>
            </div>
          )}
        </div>
      </AppLayout>
    </>
  );
}


// Featured certification card with exam mode
function FeaturedCertCard({ 
  certification, 
  index,
  onPractice,
  onExam,
}: { 
  certification: Certification;
  index: number;
  onPractice: () => void;
  onExam: () => void;
}) {
  const diff = difficultyConfig[certification.difficulty];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-card border border-border rounded-xl overflow-hidden group hover:border-primary/30 hover:shadow-lg transition-all"
    >
      {/* Header with gradient */}
      <div className="p-4 bg-gradient-to-r from-primary/10 to-transparent border-b border-border">
        <div className="flex items-start justify-between">
          <div className={`p-2.5 rounded-xl ${certification.color} bg-current/10`}>
            {iconMap[certification.icon] || <Award className="w-5 h-5" />}
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${diff.bg} ${diff.color} capitalize`}>
              {certification.difficulty}
            </span>
          </div>
        </div>
        
        <h3 className="font-semibold mt-3 leading-tight">{certification.name}</h3>
        <p className="text-xs text-muted-foreground">{certification.provider}</p>
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
          {certification.description}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {certification.estimatedHours}h
          </span>
          <span className="flex items-center gap-1">
            <Target className="w-3.5 h-3.5" />
            {certification.questionCount} questions
          </span>
          <span className="flex items-center gap-1">
            <Award className="w-3.5 h-3.5" />
            {certification.passingScore}% pass
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onPractice}
            className="flex-1 py-2 px-3 bg-muted hover:bg-muted/80 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            Study
          </button>
          <button
            onClick={onExam}
            className="flex-1 py-2 px-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
          >
            <Play className="w-4 h-4" />
            Exam Mode
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Standard certification card
function CertificationCard({ 
  certification, 
  index,
  onClick
}: { 
  certification: Certification;
  index: number;
  onClick: () => void;
}) {
  const diff = difficultyConfig[certification.difficulty];
  const hasQuestions = certification.questionCount > 0;
  
  // Get progress from localStorage
  const progressKey = `cert-progress-${certification.id}`;
  const savedProgress = localStorage.getItem(progressKey);
  const completedCount = savedProgress ? JSON.parse(savedProgress).length : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={onClick}
      className="bg-card border border-border rounded-xl p-4 transition-all cursor-pointer group hover:border-primary/30 hover:shadow-md"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${certification.color} bg-current/10`}>
          {iconMap[certification.icon] || <Award className="w-5 h-5" />}
        </div>
        <div className="flex items-center gap-2">
          {hasQuestions && (
            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-amber-500/10 text-amber-500">
              EXAM
            </span>
          )}
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${diff.bg} ${diff.color} capitalize`}>
            {certification.difficulty}
          </span>
        </div>
      </div>

      <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors leading-tight">
        {certification.name}
      </h3>
      <p className="text-xs text-muted-foreground mb-2">{certification.provider}</p>
      <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
        {certification.description}
      </p>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {certification.estimatedHours}h
          </span>
          {certification.questionCount > 0 && (
            <span className="flex items-center gap-1">
              <Target className="w-3.5 h-3.5" />
              {certification.questionCount}
            </span>
          )}
          {completedCount > 0 && (
            <span className="text-primary font-medium">{completedCount} done</span>
          )}
        </div>
        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </div>
    </motion.div>
  );
}
