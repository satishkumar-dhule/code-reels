/**
 * AI Explainer - Magical AI-powered topic explanation
 * Uses Gemini/OpenAI with TTS to explain content in natural language
 * Supports multiple languages, user brings their own API keys
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, X, Settings, Globe, Loader2,
  Play, Pause, RotateCcw, Download, Copy, Check
} from 'lucide-react';
import { useFocusTrap } from '@/hooks/use-focus-trap';

interface AIExplainerProps {
  content: {
    question?: string;
    answer?: string;
    explanation?: string;
    code?: string;
    tags?: string[];
    difficulty?: string;
  };
  context?: string; // Additional context (e.g., "certification", "interview")
}

type AIProvider = 'gemini' | 'openai' | 'groq' | 'cohere' | 'huggingface';
type TTSProvider = 'elevenlabs' | 'openai' | 'webspeech';
type Language = 'en' | 'es' | 'fr' | 'de' | 'hi' | 'zh' | 'ja' | 'pt' | 'ar';

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
];

export function AIExplainer({ content, context = 'learning' }: AIExplainerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Settings
  const [provider, setProvider] = useState<AIProvider>('groq');
  const [ttsProvider, setTTSProvider] = useState<TTSProvider>('elevenlabs');
  const [language, setLanguage] = useState<Language>('en');
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [cohereKey, setCohereKey] = useState('');
  const [huggingfaceKey, setHuggingfaceKey] = useState('');
  const [elevenlabsKey, setElevenlabsKey] = useState('');
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Apply focus trapping to modal
  useFocusTrap(modalRef, { enabled: isOpen, returnFocus: true });

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ai-explainer-settings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        setProvider(settings.provider || 'groq');
        setTTSProvider(settings.ttsProvider || 'elevenlabs');
        setLanguage(settings.language || 'en');
        setGeminiKey(settings.geminiKey || '');
        setOpenaiKey(settings.openaiKey || '');
        setGroqKey(settings.groqKey || '');
        setCohereKey(settings.cohereKey || '');
        setHuggingfaceKey(settings.huggingfaceKey || '');
        setElevenlabsKey(settings.elevenlabsKey || '');
      } catch {}
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = () => {
    localStorage.setItem('ai-explainer-settings', JSON.stringify({
      provider,
      ttsProvider,
      language,
      geminiKey,
      openaiKey,
      groqKey,
      cohereKey,
      huggingfaceKey,
      elevenlabsKey,
    }));
    setShowSettings(false);
  };

  // Generate explanation using AI
  const generateExplanation = async () => {
    const apiKey = provider === 'gemini' ? geminiKey : 
                   provider === 'openai' ? openaiKey :
                   provider === 'groq' ? groqKey :
                   provider === 'cohere' ? cohereKey :
                   huggingfaceKey;
    
    if (!apiKey) {
      alert(`Please set your ${provider.charAt(0).toUpperCase() + provider.slice(1)} API key in settings`);
      setShowSettings(true);
      return;
    }

    setIsGenerating(true);
    setExplanation('');
    setAudioUrl(null);

    try {
      // Build context from content
      const contextText = buildContext(content, context);
      
      // Generate text explanation
      const text = await generateText(provider, apiKey, contextText, language);
      setExplanation(text);
      
      // Generate audio (TTS)
      const audio = await generateAudio(ttsProvider, text, language);
      setAudioUrl(audio);
      
    } catch (error: any) {
      console.error('AI Explainer error:', error);
      setExplanation(`Error: ${error.message || 'Failed to generate explanation'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Build context from content
  const buildContext = (content: any, context: string) => {
    let text = `Context: ${context}\n\n`;
    
    if (content.question) {
      text += `Question: ${content.question}\n\n`;
    }
    
    if (content.answer) {
      text += `Answer: ${content.answer}\n\n`;
    }
    
    if (content.explanation) {
      text += `Detailed Explanation: ${content.explanation}\n\n`;
    }
    
    if (content.code) {
      text += `Code Example:\n${content.code}\n\n`;
    }
    
    if (content.difficulty) {
      text += `Difficulty: ${content.difficulty}\n`;
    }
    
    if (content.tags && content.tags.length > 0) {
      text += `Topics: ${content.tags.join(', ')}\n`;
    }
    
    return text;
  };

  // Generate text using AI
  const generateText = async (
    provider: AIProvider,
    apiKey: string,
    context: string,
    language: Language
  ): Promise<string> => {
    const languageName = LANGUAGES.find(l => l.code === language)?.name || 'English';
    
    const prompt = `You are an expert technical educator. Explain the following topic in detail in ${languageName}.

${context}

Provide a comprehensive, natural-sounding explanation that:
1. Explains the concept clearly and thoroughly
2. Uses analogies and real-world examples
3. Breaks down complex ideas into simple terms
4. Highlights key points and best practices
5. Is conversational and engaging

Explanation in ${languageName}:`;

    if (provider === 'gemini') {
      return await generateWithGemini(apiKey, prompt);
    } else if (provider === 'openai') {
      return await generateWithOpenAI(apiKey, prompt);
    } else if (provider === 'groq') {
      return await generateWithGroq(apiKey, prompt);
    } else if (provider === 'cohere') {
      return await generateWithCohere(apiKey, prompt);
    } else {
      return await generateWithHuggingFace(apiKey, prompt);
    }
  };

  // Generate with Gemini
  const generateWithGemini = async (apiKey: string, prompt: string): Promise<string> => {
    // Try multiple model names in order of preference
    const models = [
      'gemini-1.5-pro-latest',
      'gemini-1.5-flash-latest', 
      'gemini-pro',
      'gemini-1.5-pro',
      'gemini-1.5-flash'
    ];
    
    let lastError: any = null;
    
    for (const model of models) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ 
                parts: [{ text: prompt }] 
              }],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048,
              },
            }),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          lastError = error;
          console.warn(`Model ${model} failed:`, error.error?.message);
          continue; // Try next model
        }

        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
          console.warn(`Model ${model} returned invalid response`);
          continue; // Try next model
        }
        
        console.log(`Successfully used Gemini model: ${model}`);
        return data.candidates[0].content.parts[0].text;
      } catch (err) {
        console.warn(`Model ${model} error:`, err);
        lastError = err;
        continue; // Try next model
      }
    }
    
    // All models failed
    throw new Error(lastError?.error?.message || 'All Gemini models failed. Please check your API key.');
  };

  // Generate with OpenAI
  const generateWithOpenAI = async (apiKey: string, prompt: string): Promise<string> => {
    // Try multiple models in order of preference
    const models = [
      'gpt-4o',                    // Latest GPT-4 Omni
      'gpt-4-turbo',               // GPT-4 Turbo
      'gpt-4-turbo-preview',       // GPT-4 Turbo Preview
      'gpt-4',                     // Standard GPT-4
      'gpt-3.5-turbo',             // Fallback to 3.5
    ];
    
    let lastError: any = null;
    
    for (const model of models) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 2048,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          lastError = error;
          console.warn(`OpenAI model ${model} failed:`, error.error?.message);
          continue; // Try next model
        }

        const data = await response.json();
        
        if (!data.choices || !data.choices[0]?.message?.content) {
          console.warn(`OpenAI model ${model} returned invalid response`);
          continue; // Try next model
        }
        
        console.log(`Successfully used OpenAI model: ${model}`);
        return data.choices[0].message.content;
      } catch (err) {
        console.warn(`OpenAI model ${model} error:`, err);
        lastError = err;
        continue; // Try next model
      }
    }
    
    // All models failed
    throw new Error(lastError?.error?.message || 'All OpenAI models failed. Please check your API key and credits.');
  };

  // Generate with Groq (FAST & FREE - 30 req/min)
  const generateWithGroq = async (apiKey: string, prompt: string): Promise<string> => {
    // Try multiple models in order of preference (best to fallback)
    const models = [
      'llama-3.3-70b-versatile',      // Latest Llama 3.3
      'llama-3.1-70b-versatile',      // Llama 3.1 70B (may be deprecated)
      'llama-3.2-90b-text-preview',   // Llama 3.2 90B
      'mixtral-8x7b-32768',           // Mixtral fallback
      'gemma2-9b-it',                 // Gemma 2 fallback
    ];
    
    let lastError: any = null;
    
    for (const model of models) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 2048,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          lastError = error;
          console.warn(`Groq model ${model} failed:`, error.error?.message);
          continue; // Try next model
        }

        const data = await response.json();
        
        if (!data.choices || !data.choices[0]?.message?.content) {
          console.warn(`Groq model ${model} returned invalid response`);
          continue; // Try next model
        }
        
        console.log(`Successfully used Groq model: ${model}`);
        return data.choices[0].message.content;
      } catch (err) {
        console.warn(`Groq model ${model} error:`, err);
        lastError = err;
        continue; // Try next model
      }
    }
    
    // All models failed
    throw new Error(lastError?.error?.message || 'All Groq models failed. Please check your API key or try another provider.');
  };

  // Generate with Cohere (FREE tier available)
  const generateWithCohere = async (apiKey: string, prompt: string): Promise<string> => {
    // Try multiple models in order of preference
    const models = [
      'command-r-plus',     // Latest Command R+
      'command-r',          // Command R
      'command',            // Standard Command
      'command-light',      // Lighter model fallback
    ];
    
    let lastError: any = null;
    
    for (const model of models) {
      try {
        const response = await fetch('https://api.cohere.ai/v1/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model,
            prompt: prompt,
            max_tokens: 2048,
            temperature: 0.7,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          lastError = error;
          console.warn(`Cohere model ${model} failed:`, error.message);
          continue; // Try next model
        }

        const data = await response.json();
        
        if (!data.generations || !data.generations[0]?.text) {
          console.warn(`Cohere model ${model} returned invalid response`);
          continue; // Try next model
        }
        
        console.log(`Successfully used Cohere model: ${model}`);
        return data.generations[0].text;
      } catch (err) {
        console.warn(`Cohere model ${model} error:`, err);
        lastError = err;
        continue; // Try next model
      }
    }
    
    // All models failed
    throw new Error(lastError?.message || 'All Cohere models failed. Please check your API key.');
  };

  // Generate with HuggingFace (FREE)
  const generateWithHuggingFace = async (apiKey: string, prompt: string): Promise<string> => {
    // Try multiple models in order of preference
    const models = [
      'mistralai/Mixtral-8x7B-Instruct-v0.1',
      'mistralai/Mistral-7B-Instruct-v0.2',
      'meta-llama/Meta-Llama-3-8B-Instruct',
      'google/gemma-7b-it',
      'HuggingFaceH4/zephyr-7b-beta',
    ];
    
    let lastError: any = null;
    
    for (const model of models) {
      try {
        const response = await fetch(
          `https://api-inference.huggingface.co/models/${model}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              inputs: prompt,
              parameters: {
                max_new_tokens: 2048,
                temperature: 0.7,
                return_full_text: false,
              },
            }),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          lastError = error;
          console.warn(`HuggingFace model ${model} failed:`, error.error);
          continue; // Try next model
        }

        const data = await response.json();
        
        if (!data || !data[0]?.generated_text) {
          console.warn(`HuggingFace model ${model} returned invalid response`);
          continue; // Try next model
        }
        
        console.log(`Successfully used HuggingFace model: ${model}`);
        return data[0].generated_text;
      } catch (err) {
        console.warn(`HuggingFace model ${model} error:`, err);
        lastError = err;
        continue; // Try next model
      }
    }
    
    // All models failed
    throw new Error(lastError?.error || 'All HuggingFace models failed. Please check your API key or try again later.');
  };

  // Generate audio using TTS
  const generateAudio = async (
    ttsProvider: TTSProvider,
    text: string,
    language: Language
  ): Promise<string> => {
    if (ttsProvider === 'elevenlabs') {
      return await generateAudioElevenLabs(elevenlabsKey, text, language);
    } else if (ttsProvider === 'openai') {
      return await generateAudioOpenAI(openaiKey, text, language);
    } else {
      // Web Speech API - no URL needed, will use live speech
      return '';
    }
  };

  // Generate audio with ElevenLabs (FREE tier - very human-like)
  const generateAudioElevenLabs = async (
    apiKey: string,
    text: string,
    language: Language
  ): Promise<string> => {
    if (!apiKey) {
      console.warn('No ElevenLabs API key, falling back to Web Speech API');
      return '';
    }

    try {
      // Map language to best ElevenLabs voice
      const voiceMap: Record<Language, string> = {
        en: 'EXAVITQu4vr4xnSDxMaL', // Sarah - natural female voice
        es: 'VR6AewLTigWG4xSOukaG', // Spanish voice
        fr: 'cgSgspJ2msm6clMCkdW9', // French voice
        de: 'iP95p4xoKVk53GoZ742B', // German voice
        hi: 'pFZP5JQG7iQjIQuC4Bku', // Hindi voice
        zh: 'XB0fDUnXU5powFXDhCwa', // Chinese voice
        ja: 'jBpfuIE2acCO8z3wKNLl', // Japanese voice
        pt: 'yoZ06aMxZJJ28mfd3POQ', // Portuguese voice
        ar: 'onwK4e9ZLuTAKqWW03F9', // Arabic voice
      };

      const voiceId = voiceMap[language] || voiceMap.en;

      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': apiKey,
          },
          body: JSON.stringify({
            text: text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        }
      );

      if (!response.ok) {
        console.warn('ElevenLabs API error, falling back to Web Speech API');
        return '';
      }

      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error) {
      console.warn('ElevenLabs error, falling back to Web Speech API:', error);
      return '';
    }
  };

  // Generate audio with OpenAI TTS
  const generateAudioOpenAI = async (
    apiKey: string,
    text: string,
    language: Language
  ): Promise<string> => {
    if (!apiKey) {
      console.warn('No OpenAI API key, falling back to Web Speech API');
      return '';
    }

    try {
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'tts-1-hd', // HD model for better quality
          voice: 'nova', // Most natural voice
          input: text,
          speed: 1.0,
        }),
      });

      if (!response.ok) {
        console.warn('OpenAI TTS error, falling back to Web Speech API');
        return '';
      }

      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error) {
      console.warn('OpenAI TTS error, falling back to Web Speech API:', error);
      return '';
    }
  };

  // Get best available voice for Web Speech API
  const getBestVoice = (lang: Language): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis.getVoices();
    const langCode = getVoiceLanguage(lang);
    
    // Priority order: Google > Microsoft > Apple > Others
    const priorities = ['Google', 'Microsoft', 'Apple'];
    
    // First, try to find premium voices
    for (const priority of priorities) {
      const voice = voices.find(v => 
        v.lang.startsWith(langCode.split('-')[0]) && 
        v.name.includes(priority) &&
        !v.name.includes('eSpeak') // Avoid robotic voices
      );
      if (voice) return voice;
    }
    
    // Fallback to any voice for the language
    const fallback = voices.find(v => 
      v.lang.startsWith(langCode.split('-')[0]) &&
      !v.name.includes('eSpeak')
    );
    
    return fallback || voices[0] || null;
  };

  // Play/pause audio
  const togglePlayback = () => {
    if (isPlaying) {
      // Stop playback
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (speechSynthesisRef.current) {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
    } else {
      // Start playback
      if (audioUrl) {
        // Play audio file (ElevenLabs or OpenAI)
        audioRef.current?.play();
        setIsPlaying(true);
      } else {
        // Use Web Speech API for live playback
        speakText(explanation, language);
      }
    }
  };

  // Speak text using Web Speech API with best voice
  const speakText = (text: string, lang: Language) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = getVoiceLanguage(lang);
      utterance.rate = 0.95; // Slightly slower for clarity
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      // Use best available voice
      const bestVoice = getBestVoice(lang);
      if (bestVoice) {
        utterance.voice = bestVoice;
        console.log(`Using voice: ${bestVoice.name}`);
      }
      
      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      
      speechSynthesisRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Get voice language code
  const getVoiceLanguage = (lang: Language): string => {
    const map: Record<Language, string> = {
      en: 'en-US',
      es: 'es-ES',
      fr: 'fr-FR',
      de: 'de-DE',
      hi: 'hi-IN',
      zh: 'zh-CN',
      ja: 'ja-JP',
      pt: 'pt-BR',
      ar: 'ar-SA',
    };
    return map[lang] || 'en-US';
  };

  // Copy explanation
  const copyExplanation = async () => {
    await navigator.clipboard.writeText(explanation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download audio
  const downloadAudio = () => {
    if (!audioUrl) return;
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = 'explanation.mp3';
    a.click();
  };

  return (
    <>
      {/* Magical Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-24 right-6 z-40 w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow"
        title="AI Explain"
      >
        <Sparkles className="w-6 h-6 text-white" />
      </motion.button>

      {/* Explainer Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              ref={modalRef}
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-label="AI Explainer"
            >
              {/* Header */}
              <div className="p-6 border-b border-border bg-gradient-to-r from-purple-500/10 to-pink-500/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">AI Explainer</h2>
                      <p className="text-sm text-muted-foreground">
                        {LANGUAGES.find(l => l.code === language)?.flag} {LANGUAGES.find(l => l.code === language)?.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowSettings(!showSettings)}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Settings Panel */}
              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="overflow-hidden border-b border-border bg-muted/30"
                  >
                    <div className="p-6 space-y-4">
                      {/* TTS Provider */}
                      <div>
                        <label className="text-sm font-semibold mb-2 block">Voice Provider</label>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => setTTSProvider('elevenlabs')}
                            className={`px-3 py-2 rounded-lg font-medium transition-colors text-xs ${
                              ttsProvider === 'elevenlabs'
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                                : 'bg-muted hover:bg-muted/80'
                            }`}
                          >
                            ElevenLabs ⭐
                          </button>
                          <button
                            onClick={() => setTTSProvider('openai')}
                            className={`px-3 py-2 rounded-lg font-medium transition-colors text-xs ${
                              ttsProvider === 'openai'
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                                : 'bg-muted hover:bg-muted/80'
                            }`}
                          >
                            OpenAI
                          </button>
                          <button
                            onClick={() => setTTSProvider('webspeech')}
                            className={`px-3 py-2 rounded-lg font-medium transition-colors text-xs ${
                              ttsProvider === 'webspeech'
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                                : 'bg-muted hover:bg-muted/80'
                            }`}
                          >
                            Browser
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {ttsProvider === 'elevenlabs' && '⭐ Most human-like! FREE tier: 10k chars/month'}
                          {ttsProvider === 'openai' && 'High quality, requires OpenAI API key (paid)'}
                          {ttsProvider === 'webspeech' && 'Free browser voices (quality varies)'}
                        </p>
                      </div>

                      {/* ElevenLabs API Key */}
                      {ttsProvider === 'elevenlabs' && (
                        <div>
                          <label className="text-sm font-semibold mb-2 block">ElevenLabs API Key</label>
                          <input
                            type="password"
                            value={elevenlabsKey}
                            onChange={(e) => setElevenlabsKey(e.target.value)}
                            placeholder="Enter your ElevenLabs API key"
                            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            ⭐ FREE tier: 10,000 characters/month! Get key at elevenlabs.io
                          </p>
                        </div>
                      )}

                      {/* Provider */}
                      <div>
                        <label className="text-sm font-semibold mb-2 block">AI Provider</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setProvider('groq')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                              provider === 'groq'
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                                : 'bg-muted hover:bg-muted/80'
                            }`}
                          >
                            Groq ⚡ FREE
                          </button>
                          <button
                            onClick={() => setProvider('gemini')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                              provider === 'gemini'
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                                : 'bg-muted hover:bg-muted/80'
                            }`}
                          >
                            Gemini
                          </button>
                          <button
                            onClick={() => setProvider('cohere')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                              provider === 'cohere'
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                                : 'bg-muted hover:bg-muted/80'
                            }`}
                          >
                            Cohere FREE
                          </button>
                          <button
                            onClick={() => setProvider('huggingface')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                              provider === 'huggingface'
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                                : 'bg-muted hover:bg-muted/80'
                            }`}
                          >
                            HuggingFace
                          </button>
                          <button
                            onClick={() => setProvider('openai')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                              provider === 'openai'
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                                : 'bg-muted hover:bg-muted/80'
                            }`}
                          >
                            OpenAI
                          </button>
                        </div>
                      </div>

                      {/* API Key */}
                      <div>
                        <label className="text-sm font-semibold mb-2 block">
                          {provider === 'gemini' ? 'Gemini' : 
                           provider === 'openai' ? 'OpenAI' :
                           provider === 'groq' ? 'Groq' :
                           provider === 'cohere' ? 'Cohere' :
                           'HuggingFace'} API Key
                        </label>
                        <input
                          type="password"
                          value={provider === 'gemini' ? geminiKey : 
                                 provider === 'openai' ? openaiKey :
                                 provider === 'groq' ? groqKey :
                                 provider === 'cohere' ? cohereKey :
                                 huggingfaceKey}
                          onChange={(e) => {
                            if (provider === 'gemini') setGeminiKey(e.target.value);
                            else if (provider === 'openai') setOpenaiKey(e.target.value);
                            else if (provider === 'groq') setGroqKey(e.target.value);
                            else if (provider === 'cohere') setCohereKey(e.target.value);
                            else setHuggingfaceKey(e.target.value);
                          }}
                          placeholder="Enter your API key"
                          className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {provider === 'groq' && '⚡ Groq: FREE, super fast! Get key at console.groq.com'}
                          {provider === 'gemini' && 'Get key at makersuite.google.com/app/apikey'}
                          {provider === 'cohere' && 'FREE tier available at dashboard.cohere.com'}
                          {provider === 'huggingface' && 'FREE! Get key at huggingface.co/settings/tokens'}
                          {provider === 'openai' && 'Paid. Get key at platform.openai.com/api-keys'}
                        </p>
                      </div>

                      {/* Language */}
                      <div>
                        <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                          <Globe className="w-4 h-4" />
                          Language
                        </label>
                        <select
                          value={language}
                          onChange={(e) => setLanguage(e.target.value as Language)}
                          className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
                        >
                          {LANGUAGES.map((lang) => (
                            <option key={lang.code} value={lang.code}>
                              {lang.flag} {lang.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        onClick={saveSettings}
                        className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                      >
                        Save Settings
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {!explanation ? (
                  <div className="text-center py-12">
                    <Sparkles className="w-16 h-16 mx-auto mb-4 text-purple-500" />
                    <h3 className="text-xl font-bold mb-2">Ready to Explain</h3>
                    <p className="text-muted-foreground mb-6">
                      Click the button below to generate an AI-powered explanation
                    </p>
                    <button
                      onClick={generateExplanation}
                      disabled={isGenerating}
                      className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2 mx-auto"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          Generate Explanation
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Explanation Text */}
                    <div className="prose prose-invert max-w-none">
                      <p className="whitespace-pre-wrap leading-relaxed">{explanation}</p>
                    </div>

                    {/* Audio Player */}
                    {audioUrl && (
                      <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} />
                    )}
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              {explanation && (
                <div className="p-4 border-t border-border bg-muted/30">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={togglePlayback}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="w-4 h-4" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          Play Audio
                        </>
                      )}
                    </button>
                    <button
                      onClick={generateExplanation}
                      disabled={isGenerating}
                      className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Regenerate
                    </button>
                    <button
                      onClick={copyExplanation}
                      className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                    {audioUrl && (
                      <button
                        onClick={downloadAudio}
                        className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg font-medium transition-colors flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
