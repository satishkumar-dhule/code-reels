/**
 * Text-to-Speech Utility
 * Uses Web Speech API SpeechSynthesis - fully client-side
 */

// Check if TTS is supported
export function isTTSSupported(): boolean {
  return 'speechSynthesis' in window;
}

// State tracking
let currentUtterance: SpeechSynthesisUtterance | null = null;
let isSpeaking = false;

// Voice preference storage
const VOICE_PREF_KEY = 'tts-voice-preference';
const RATE_PREF_KEY = 'tts-rate-preference';

// Get available voices (prefer English voices)
export function getVoices(): SpeechSynthesisVoice[] {
  if (!isTTSSupported()) return [];
  return speechSynthesis.getVoices();
}

// Get voices grouped by language for UI
export function getVoicesGrouped(): { language: string; voices: SpeechSynthesisVoice[] }[] {
  const voices = getVoices();
  const grouped: Record<string, SpeechSynthesisVoice[]> = {};
  
  voices.forEach(voice => {
    const lang = voice.lang;
    if (!grouped[lang]) {
      grouped[lang] = [];
    }
    grouped[lang].push(voice);
  });
  
  // Sort by language, English first
  return Object.entries(grouped)
    .sort(([a], [b]) => {
      if (a.startsWith('en') && !b.startsWith('en')) return -1;
      if (!a.startsWith('en') && b.startsWith('en')) return 1;
      return a.localeCompare(b);
    })
    .map(([language, voices]) => ({ language, voices }));
}

// Get saved voice preference
export function getSavedVoiceName(): string | null {
  try {
    return localStorage.getItem(VOICE_PREF_KEY);
  } catch {
    return null;
  }
}

// Save voice preference
export function saveVoicePreference(voiceName: string): void {
  try {
    localStorage.setItem(VOICE_PREF_KEY, voiceName);
  } catch {
    // Ignore storage errors
  }
}

// Get saved rate preference
export function getSavedRate(): number {
  try {
    const rate = localStorage.getItem(RATE_PREF_KEY);
    return rate ? parseFloat(rate) : 0.9;
  } catch {
    return 0.9;
  }
}

// Save rate preference
export function saveRatePreference(rate: number): void {
  try {
    localStorage.setItem(RATE_PREF_KEY, String(rate));
  } catch {
    // Ignore storage errors
  }
}

// Get the user's preferred voice or best default
function getPreferredVoice(): SpeechSynthesisVoice | null {
  const voices = getVoices();
  if (voices.length === 0) return null;
  
  // Check for saved preference
  const savedName = getSavedVoiceName();
  if (savedName) {
    const savedVoice = voices.find(v => v.name === savedName);
    if (savedVoice) return savedVoice;
  }
  
  // Default: first English voice
  const englishVoice = voices.find(v => v.lang.startsWith('en'));
  return englishVoice || voices[0];
}

// Clean text for better speech (remove markdown, code blocks, etc.)
function cleanTextForSpeech(text: string): string {
  let cleaned = text;
  
  // Remove code blocks
  cleaned = cleaned.replace(/```[\s\S]*?```/g, '... code example omitted ...');
  
  // Remove inline code backticks
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');
  
  // Remove markdown bold/italic
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
  cleaned = cleaned.replace(/__([^_]+)__/g, '$1');
  cleaned = cleaned.replace(/_([^_]+)_/g, '$1');
  
  // Remove markdown headers
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');
  
  // Remove bullet points but add pause
  cleaned = cleaned.replace(/^[-*•]\s+/gm, '... ');
  
  // Remove numbered lists formatting but add pause
  cleaned = cleaned.replace(/^\d+\.\s+/gm, '... ');
  
  // Remove URLs
  cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, 'link');
  
  // Remove markdown links but keep text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  
  // Add natural pauses at sentence boundaries
  // Add slight pause after periods, question marks, exclamation marks
  cleaned = cleaned.replace(/([.!?])\s+/g, '$1 ... ');
  
  // Add pause after colons (often introduces a list or explanation)
  cleaned = cleaned.replace(/:\s+/g, ': ... ');
  
  // Add pause after semicolons
  cleaned = cleaned.replace(/;\s+/g, '; ... ');
  
  // Expand common abbreviations for better pronunciation
  cleaned = cleaned.replace(/\be\.g\./gi, 'for example');
  cleaned = cleaned.replace(/\bi\.e\./gi, 'that is');
  cleaned = cleaned.replace(/\betc\./gi, 'etcetera');
  cleaned = cleaned.replace(/\bvs\./gi, 'versus');
  cleaned = cleaned.replace(/\bAPI\b/g, 'A P I');
  cleaned = cleaned.replace(/\bAPIs\b/g, 'A P Is');
  cleaned = cleaned.replace(/\bURL\b/g, 'U R L');
  cleaned = cleaned.replace(/\bURLs\b/g, 'U R Ls');
  cleaned = cleaned.replace(/\bHTML\b/g, 'H T M L');
  cleaned = cleaned.replace(/\bCSS\b/g, 'C S S');
  cleaned = cleaned.replace(/\bSQL\b/g, 'S Q L');
  cleaned = cleaned.replace(/\bJSON\b/g, 'Jason');
  cleaned = cleaned.replace(/\bREST\b/g, 'Rest');
  cleaned = cleaned.replace(/\bHTTP\b/g, 'H T T P');
  cleaned = cleaned.replace(/\bHTTPS\b/g, 'H T T P S');
  cleaned = cleaned.replace(/\bCPU\b/g, 'C P U');
  cleaned = cleaned.replace(/\bRAM\b/g, 'Ram');
  cleaned = cleaned.replace(/\bSSD\b/g, 'S S D');
  cleaned = cleaned.replace(/\bI\/O\b/g, 'I O');
  cleaned = cleaned.replace(/\bUI\b/g, 'U I');
  cleaned = cleaned.replace(/\bUX\b/g, 'U X');
  cleaned = cleaned.replace(/\bCI\/CD\b/g, 'C I C D');
  cleaned = cleaned.replace(/\bDevOps\b/gi, 'Dev Ops');
  cleaned = cleaned.replace(/\bNoSQL\b/gi, 'No S Q L');
  cleaned = cleaned.replace(/\bGraphQL\b/gi, 'Graph Q L');
  cleaned = cleaned.replace(/\bORM\b/g, 'O R M');
  cleaned = cleaned.replace(/\bMVC\b/g, 'M V C');
  cleaned = cleaned.replace(/\bDOM\b/g, 'Dom');
  cleaned = cleaned.replace(/\bAWS\b/g, 'A W S');
  cleaned = cleaned.replace(/\bGCP\b/g, 'G C P');
  cleaned = cleaned.replace(/\bK8s\b/gi, 'Kubernetes');
  cleaned = cleaned.replace(/\bk8s\b/gi, 'Kubernetes');
  
  // Clean up multiple pauses
  cleaned = cleaned.replace(/(\.\.\.\s*){2,}/g, '... ');
  
  // Clean up extra whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.trim();
  
  return cleaned;
}

export interface SpeakOptions {
  rate?: number; // 0.1 to 10, default 1
  pitch?: number; // 0 to 2, default 1
  volume?: number; // 0 to 1, default 1
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

// Speak text
export function speak(text: string, options: SpeakOptions = {}): void {
  if (!isTTSSupported()) {
    options.onError?.('Text-to-speech not supported in this browser');
    return;
  }
  
  // Stop any current speech
  stop();
  
  const cleanedText = cleanTextForSpeech(text);
  
  if (!cleanedText) {
    options.onError?.('No text to speak');
    return;
  }
  
  const utterance = new SpeechSynthesisUtterance(cleanedText);
  
  // Set voice from user preference
  const voice = getPreferredVoice();
  if (voice) {
    utterance.voice = voice;
  }
  
  // Use saved rate or default
  utterance.rate = options.rate ?? getSavedRate();
  utterance.pitch = options.pitch ?? 1.05;
  utterance.volume = options.volume ?? 1;
  
  // Event handlers
  utterance.onstart = () => {
    isSpeaking = true;
    options.onStart?.();
  };
  
  utterance.onend = () => {
    isSpeaking = false;
    currentUtterance = null;
    options.onEnd?.();
  };
  
  utterance.onerror = (event) => {
    isSpeaking = false;
    currentUtterance = null;
    options.onError?.(event.error);
  };
  
  currentUtterance = utterance;
  
  // Chrome bug workaround: voices may not be loaded yet
  if (getVoices().length === 0) {
    speechSynthesis.addEventListener('voiceschanged', () => {
      const newVoice = getPreferredVoice();
      if (newVoice) utterance.voice = newVoice;
      speechSynthesis.speak(utterance);
    }, { once: true });
  } else {
    speechSynthesis.speak(utterance);
  }
}

// Stop speaking
export function stop(): void {
  if (isTTSSupported()) {
    speechSynthesis.cancel();
    isSpeaking = false;
    currentUtterance = null;
  }
}

// Pause speaking
export function pause(): void {
  if (isTTSSupported() && isSpeaking) {
    speechSynthesis.pause();
  }
}

// Resume speaking
export function resume(): void {
  if (isTTSSupported()) {
    speechSynthesis.resume();
  }
}

// Check if currently speaking
export function getIsSpeaking(): boolean {
  return isSpeaking;
}

// Toggle speak/stop
export function toggleSpeak(text: string, options: SpeakOptions = {}): boolean {
  if (isSpeaking) {
    stop();
    return false;
  } else {
    speak(text, options);
    return true;
  }
}
