import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { rolesConfig, getRecommendedChannels } from '../lib/channels-config';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { 
  Layout, Server, Layers, Smartphone, Activity, Shield, 
  Cpu, Users, Database, Brain, Workflow, Box, Check, ChevronRight, Sparkles
} from 'lucide-react';

const iconMap: Record<string, React.ReactNode> = {
  'layout': <Layout className="w-6 h-6" />,
  'server': <Server className="w-6 h-6" />,
  'layers': <Layers className="w-6 h-6" />,
  'smartphone': <Smartphone className="w-6 h-6" />,
  'infinity': <Activity className="w-6 h-6" />,
  'activity': <Activity className="w-6 h-6" />,
  'workflow': <Workflow className="w-6 h-6" />,
  'brain': <Brain className="w-6 h-6" />,
  'shield': <Shield className="w-6 h-6" />,
  'cpu': <Cpu className="w-6 h-6" />,
  'users': <Users className="w-6 h-6" />,
  'box': <Box className="w-6 h-6" />,
  'database': <Database className="w-6 h-6" />
};

export function Onboarding() {
  const { setRole, skipOnboarding } = useUserPreferences();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [step, setStep] = useState<'role' | 'preview'>('role');

  const handleRoleSelect = (roleId: string) => {
    setSelectedRole(roleId);
  };

  const handleContinue = () => {
    if (selectedRole) {
      if (step === 'role') {
        setStep('preview');
      } else {
        setRole(selectedRole);
      }
    }
  };

  const recommendedChannels = selectedRole ? getRecommendedChannels(selectedRole) : [];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 font-mono">
      <AnimatePresence mode="wait">
        {step === 'role' ? (
          <motion.div
            key="role"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-4xl w-full"
          >
            <div className="text-center mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold mb-2">
                <span className="text-primary">&gt;</span> Welcome to Learn_Reels
              </h1>
              <p className="text-white/60 text-sm">
                Select your role to get personalized channel recommendations
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
              {rolesConfig.map(role => (
                <button
                  key={role.id}
                  onClick={() => handleRoleSelect(role.id)}
                  className={`
                    p-4 border rounded-lg text-left transition-all
                    ${selectedRole === role.id 
                      ? 'border-primary bg-primary/10 ring-1 ring-primary' 
                      : 'border-white/20 hover:border-white/40 hover:bg-white/5'
                    }
                  `}
                >
                  <div className={`mb-2 ${selectedRole === role.id ? 'text-primary' : 'text-white/60'}`}>
                    {iconMap[role.icon] || <Cpu className="w-6 h-6" />}
                  </div>
                  <div className="font-bold text-sm mb-1">{role.name}</div>
                  <div className="text-[10px] text-white/50 line-clamp-2">{role.description}</div>
                  {selectedRole === role.id && (
                    <div className="mt-2 flex items-center gap-1 text-primary text-xs">
                      <Check className="w-3 h-3" /> Selected
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="flex justify-center gap-4">
              <button
                onClick={() => {
                  skipOnboarding();
                  window.location.href = '/';
                }}
                className="px-6 py-2 text-sm text-white/50 hover:text-white transition-colors"
              >
                Skip for now
              </button>
              <button
                onClick={handleContinue}
                disabled={!selectedRole}
                className={`
                  px-6 py-2 text-sm font-bold rounded flex items-center gap-2 transition-all
                  ${selectedRole 
                    ? 'bg-primary text-black hover:bg-primary/90' 
                    : 'bg-white/10 text-white/30 cursor-not-allowed'
                  }
                `}
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-3xl w-full"
          >
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 text-primary mb-2">
                <Sparkles className="w-5 h-5" />
                <span className="text-sm font-bold uppercase tracking-widest">Recommended for you</span>
              </div>
              <h2 className="text-2xl font-bold mb-2">
                Your Personalized Channels
              </h2>
              <p className="text-white/60 text-sm">
                Based on your role, we've selected {recommendedChannels.length} channels for you.
                You can always add or remove channels later.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
              {recommendedChannels.map(channel => (
                <div
                  key={channel.id}
                  className="p-4 border border-white/20 rounded-lg bg-white/5"
                >
                  <div className={`mb-2 ${channel.color}`}>
                    {iconMap[channel.icon] || <Cpu className="w-5 h-5" />}
                  </div>
                  <div className="font-bold text-sm">{channel.name}</div>
                  <div className="text-[10px] text-white/50 line-clamp-2 mt-1">
                    {channel.description}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center gap-4">
              <button
                type="button"
                onClick={() => setStep('role')}
                className="px-6 py-2 text-sm text-white/50 hover:text-white transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                data-testid="start-learning-btn"
                onClick={() => {
                  if (selectedRole) {
                    setRole(selectedRole);
                    // Force reload to apply preferences
                    window.location.href = '/';
                  }
                }}
                className="px-6 py-2 text-sm font-bold rounded bg-primary text-black hover:bg-primary/90 flex items-center gap-2"
              >
                Start Learning <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
