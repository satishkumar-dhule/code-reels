import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { 
  BookOpen, Code2, Database, Cloud, Shield, Cpu, 
  Network, Terminal, Layers, GitBranch, CheckCircle, 
  Lock, ArrowRight, Trophy, Target, Zap, Flame, Clock
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { SEOHead } from '@/components/SEOHead';

interface LearningPath {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: string;
  topics: number;
  channels: string[];
  color: string;
  gradient: string;
  locked?: boolean;
}

const learningPaths: LearningPath[] = [
  {
    id: 'frontend-fundamentals',
    title: 'Frontend Fundamentals',
    description: 'Master HTML, CSS, JavaScript, and modern frontend frameworks',
    icon: <Code2 className="w-6 h-6" />,
    difficulty: 'beginner',
    duration: '4-6 weeks',
    topics: 45,
    channels: ['html-css', 'javascript', 'react', 'frontend'],
    color: 'text-blue-500',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'backend-mastery',
    title: 'Backend Development',
    description: 'Learn server-side programming, APIs, and database management',
    icon: <Database className="w-6 h-6" />,
    difficulty: 'intermediate',
    duration: '6-8 weeks',
    topics: 52,
    channels: ['nodejs', 'python', 'databases', 'api-design'],
    color: 'text-green-500',
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    id: 'system-design',
    title: 'System Design Expert',
    description: 'Design scalable, distributed systems for large-scale applications',
    icon: <Layers className="w-6 h-6" />,
    difficulty: 'advanced',
    duration: '8-10 weeks',
    topics: 38,
    channels: ['system-design', 'distributed-systems', 'microservices'],
    color: 'text-purple-500',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    id: 'devops-cloud',
    title: 'DevOps & Cloud',
    description: 'Master CI/CD, containerization, and cloud infrastructure',
    icon: <Cloud className="w-6 h-6" />,
    difficulty: 'intermediate',
    duration: '6-8 weeks',
    topics: 42,
    channels: ['docker', 'kubernetes', 'aws', 'devops'],
    color: 'text-orange-500',
    gradient: 'from-orange-500 to-red-500',
  },
  {
    id: 'data-structures',
    title: 'Data Structures & Algorithms',
    description: 'Build strong problem-solving skills for coding interviews',
    icon: <GitBranch className="w-6 h-6" />,
    difficulty: 'beginner',
    duration: '8-12 weeks',
    topics: 65,
    channels: ['algorithms', 'data-structures'],
    color: 'text-yellow-500',
    gradient: 'from-yellow-500 to-orange-500',
  },
  {
    id: 'security',
    title: 'Security & Authentication',
    description: 'Learn security best practices and authentication patterns',
    icon: <Shield className="w-6 h-6" />,
    difficulty: 'intermediate',
    duration: '4-6 weeks',
    topics: 28,
    channels: ['security', 'authentication'],
    color: 'text-red-500',
    gradient: 'from-red-500 to-pink-500',
    locked: true,
  },
  {
    id: 'machine-learning',
    title: 'ML & AI Fundamentals',
    description: 'Introduction to machine learning and artificial intelligence',
    icon: <Cpu className="w-6 h-6" />,
    difficulty: 'advanced',
    duration: '10-12 weeks',
    topics: 48,
    channels: ['machine-learning', 'ai'],
    color: 'text-indigo-500',
    gradient: 'from-indigo-500 to-purple-500',
    locked: true,
  },
  {
    id: 'networking',
    title: 'Networking & Protocols',
    description: 'Understand network fundamentals and communication protocols',
    icon: <Network className="w-6 h-6" />,
    difficulty: 'intermediate',
    duration: '5-7 weeks',
    topics: 35,
    channels: ['networking', 'protocols'],
    color: 'text-teal-500',
    gradient: 'from-teal-500 to-cyan-500',
    locked: true,
  },
];

const getDifficultyConfig = (difficulty: string) => {
  switch (difficulty) {
    case 'beginner':
      return { icon: <Zap className="w-4 h-4" />, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Beginner' };
    case 'intermediate':
      return { icon: <Target className="w-4 h-4" />, color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Intermediate' };
    case 'advanced':
      return { icon: <Flame className="w-4 h-4" />, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Advanced' };
    default:
      return { icon: <Target className="w-4 h-4" />, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Unknown' };
  }
};

export default function LearningPaths() {
  const [, setLocation] = useLocation();
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  const filteredPaths = selectedDifficulty === 'all' 
    ? learningPaths 
    : learningPaths.filter(p => p.difficulty === selectedDifficulty);

  return (
    <>
      <SEOHead
        title="Learning Paths | Structured Interview Prep"
        description="Follow curated learning paths to master frontend, backend, system design, DevOps, and more. Structured roadmaps for technical interview preparation."
        canonical="https://open-interview.github.io/learning-paths"
      />
      <AppLayout title="Learning Paths" showBackOnMobile>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-black text-foreground mb-4">Learning Paths</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Follow structured roadmaps to master technical skills. Each path includes curated questions and topics.
            </p>
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex items-center justify-center gap-3 mb-8 flex-wrap"
          >
            <span className="text-sm text-muted-foreground font-medium">Filter by:</span>
            {['all', 'beginner', 'intermediate', 'advanced'].map(level => (
              <button
                key={level}
                onClick={() => setSelectedDifficulty(level)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedDifficulty === level
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border border-border text-foreground hover:bg-muted'
                }`}
              >
                {level === 'all' ? 'All Paths' : level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </motion.div>

          {/* Learning Paths Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPaths.map((path, index) => {
              const diffConfig = getDifficultyConfig(path.difficulty);
              
              return (
                <motion.div
                  key={path.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative"
                >
                  <div className={`relative h-full bg-card border border-border rounded-xl overflow-hidden transition-all ${
                    path.locked 
                      ? 'opacity-60' 
                      : 'hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10'
                  }`}>
                    {/* Gradient header */}
                    <div className={`h-2 bg-gradient-to-r ${path.gradient}`} />
                    
                    <div className="p-6">
                      {/* Icon & Title */}
                      <div className="flex items-start justify-between mb-4">
                        <div className={`flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${path.gradient} text-white`}>
                          {path.icon}
                        </div>
                        {path.locked && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded-full">
                            <Lock className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground font-medium">Coming Soon</span>
                          </div>
                        )}
                      </div>

                      <h3 className="text-xl font-bold text-foreground mb-2">{path.title}</h3>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{path.description}</p>

                      {/* Meta info */}
                      <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Terminal className="w-3 h-3" />
                          <span>{path.topics} topics</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{path.duration}</span>
                        </div>
                      </div>

                      {/* Difficulty badge */}
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${diffConfig.bg} mb-4`}>
                        <span className={diffConfig.color}>{diffConfig.icon}</span>
                        <span className={`text-xs font-bold ${diffConfig.color}`}>{diffConfig.label}</span>
                      </div>

                      {/* Action button */}
                      <button
                        onClick={() => {
                          if (!path.locked && path.channels.length > 0) {
                            // Navigate to the first channel in the learning path using extreme viewer
                            setLocation(`/extreme/channel/${path.channels[0]}`);
                          }
                        }}
                        disabled={path.locked}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all ${
                          path.locked
                            ? 'bg-muted text-muted-foreground cursor-not-allowed'
                            : 'bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer'
                        }`}
                      >
                        {path.locked ? (
                          <>
                            <Lock className="w-4 h-4" />
                            Locked
                          </>
                        ) : (
                          <>
                            Start Learning
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Coming Soon Notice */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-12 text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 rounded-full">
              <Trophy className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">More learning paths coming soon!</span>
            </div>
          </motion.div>
        </div>
      </AppLayout>
    </>
  );
}
