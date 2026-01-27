# ✨ AI Explainer Feature

**Feature**: AI-powered topic explanation with TTS in multiple languages  
**Status**: IMPLEMENTED ✅  
**Date**: January 21, 2026

---

## Overview

The AI Explainer is a magical floating button that uses Gemini or OpenAI APIs to explain any topic on the page in natural language, with text-to-speech support in 9 languages.

### Key Features

1. **🤖 5 AI Providers**: Groq (fast & free), Gemini, Cohere, HuggingFace, OpenAI
2. **🔊 Text-to-Speech**: OpenAI TTS + Web Speech API fallback
3. **🌍 Multi-Language**: 9 languages supported
4. **🔐 BYOK**: Users bring their own API keys (stored locally)
5. **✨ Magical UX**: Floating button with smooth animations
6. **📝 Rich Context**: Uses all available page content
7. **💾 Downloadable**: Save audio explanations
8. **📋 Copyable**: Copy text explanations

---

## Supported Languages

| Language | Code | Flag | Voice Support |
|----------|------|------|---------------|
| English | `en` | 🇺🇸 | ✅ Full |
| Español | `es` | 🇪🇸 | ✅ Full |
| Français | `fr` | 🇫🇷 | ✅ Full |
| Deutsch | `de` | 🇩🇪 | ✅ Full |
| हिन्दी | `hi` | 🇮🇳 | ✅ Full |
| 中文 | `zh` | 🇨🇳 | ✅ Full |
| 日本語 | `ja` | 🇯🇵 | ✅ Full |
| Português | `pt` | 🇧🇷 | ✅ Full |
| العربية | `ar` | 🇸🇦 | ✅ Full |

---

## How It Works

### 1. User Flow

```
User clicks magical button (✨)
  ↓
Opens AI Explainer modal
  ↓
User configures settings (first time)
  - Choose AI provider (Gemini/OpenAI)
  - Enter API key
  - Select language
  ↓
Click "Generate Explanation"
  ↓
AI analyzes page content
  ↓
Generates natural language explanation
  ↓
Generates audio (TTS)
  ↓
User can:
  - Listen to audio
  - Read text
  - Copy text
  - Download audio
  - Regenerate in different language
```

### 2. Technical Flow

```typescript
// 1. Collect page content
const context = {
  question: "What is a binary search tree?",
  answer: "A BST is a tree data structure...",
  explanation: "Detailed explanation...",
  code: "class BST { ... }",
  tags: ["data-structures", "trees"],
  difficulty: "intermediate"
};

// 2. Build prompt
const prompt = `
You are an expert technical educator.
Explain the following topic in detail in ${language}.

Question: ${context.question}
Answer: ${context.answer}
...

Provide a comprehensive, natural-sounding explanation.
`;

// 3. Call AI API
const explanation = await generateWithGemini(apiKey, prompt);
// or
const explanation = await generateWithOpenAI(apiKey, prompt);

// 4. Generate audio
const audioUrl = await generateAudioOpenAI(apiKey, explanation);
// or fallback to Web Speech API

// 5. Display to user
```

---

## API Integration

### Groq API ⚡ (RECOMMENDED - Fast & Free)

**Endpoint**: `https://api.groq.com/openai/v1/chat/completions`

**Request**:
```json
{
  "model": "llama-3.1-70b-versatile",
  "messages": [{ "role": "user", "content": "prompt here" }],
  "temperature": 0.7,
  "max_tokens": 2048
}
```

**Response**:
```json
{
  "choices": [{
    "message": {
      "content": "explanation here"
    }
  }]
}
```

**Get API Key**: https://console.groq.com  
**Rate Limit**: 30 requests/minute (FREE)  
**Speed**: Lightning fast (fastest provider)

### Gemini API

**Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent`

**Request**:
```json
{
  "contents": [{
    "parts": [{ "text": "prompt here" }]
  }],
  "generationConfig": {
    "temperature": 0.7,
    "maxOutputTokens": 2048
  }
}
```

**Response**:
```json
{
  "candidates": [{
    "content": {
      "parts": [{ "text": "explanation here" }]
    }
  }]
}
```

**Get API Key**: https://makersuite.google.com/app/apikey

### OpenAI API

**Text Generation Endpoint**: `https://api.openai.com/v1/chat/completions`

**Request**:
```json
{
  "model": "gpt-4-turbo-preview",
  "messages": [{ "role": "user", "content": "prompt here" }],
  "temperature": 0.7,
  "max_tokens": 2048
}
```

**TTS Endpoint**: `https://api.openai.com/v1/audio/speech`

**Request**:
```json
{
  "model": "tts-1",
  "voice": "alloy",
  "input": "text to speak"
}
```

**Get API Key**: https://platform.openai.com/api-keys

### Cohere API (Free Tier Available)

**Endpoint**: `https://api.cohere.ai/v1/generate`

**Request**:
```json
{
  "model": "command",
  "prompt": "prompt here",
  "max_tokens": 2048,
  "temperature": 0.7
}
```

**Response**:
```json
{
  "generations": [{
    "text": "explanation here"
  }]
}
```

**Get API Key**: https://dashboard.cohere.com

### HuggingFace API (Free)

**Endpoint**: `https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1`

**Request**:
```json
{
  "inputs": "prompt here",
  "parameters": {
    "max_new_tokens": 2048,
    "temperature": 0.7,
    "return_full_text": false
  }
}
```

**Response**:
```json
[{
  "generated_text": "explanation here"
}]
```

**Get API Key**: https://huggingface.co/settings/tokens

---

## Component API

### Props

```typescript
interface AIExplainerProps {
  content: {
    question?: string;      // Main question
    answer?: string;        // Short answer
    explanation?: string;   // Detailed explanation
    code?: string;          // Code examples
    tags?: string[];        // Related topics
    difficulty?: string;    // Difficulty level
  };
  context?: string;         // Additional context (e.g., "certification", "interview")
}
```

### Usage

```tsx
import { AIExplainer } from '../components/AIExplainer';

// In your component
<AIExplainer
  content={{
    question: currentQuestion.question,
    answer: currentQuestion.answer,
    explanation: currentQuestion.explanation,
    tags: currentQuestion.tags,
    difficulty: currentQuestion.difficulty,
  }}
  context="AWS Solutions Architect - Interview Question"
/>
```

---

## Features in Detail

### 1. Settings Panel

- **AI Provider Selection**: Toggle between Groq, Gemini, Cohere, HuggingFace, and OpenAI
- **API Key Input**: Secure password field, stored in localStorage
- **Language Selection**: Dropdown with 9 languages
- **Persistent Settings**: Saved locally, no server storage

### 2. Explanation Generation

- **Context-Aware**: Uses all available page content
- **Natural Language**: Conversational, engaging explanations
- **Comprehensive**: Covers concept, examples, best practices
- **Structured**: Clear breakdown of complex topics

### 3. Audio Playback

- **OpenAI TTS**: High-quality neural voices (when using OpenAI)
- **Web Speech API**: Browser-native TTS (fallback for Gemini)
- **Play/Pause Controls**: Standard audio controls
- **Auto-Stop**: Stops when explanation ends

### 4. Actions

- **Regenerate**: Generate new explanation (useful for different perspectives)
- **Copy**: Copy text to clipboard
- **Download**: Save audio file (MP3)
- **Language Switch**: Change language and regenerate

---

## Security & Privacy

### API Keys
- ✅ Stored in browser's localStorage only
- ✅ Never sent to our servers
- ✅ Password-masked input fields
- ✅ User has full control

### Data Privacy
- ✅ Content sent only to user's chosen AI provider
- ✅ No tracking or analytics on AI usage
- ✅ No server-side storage of explanations
- ✅ User can clear settings anytime

### Best Practices
```typescript
// API keys are stored securely
localStorage.setItem('ai-explainer-settings', JSON.stringify({
  provider: 'gemini',
  geminiKey: 'user-key-here',  // Only in browser
  openaiKey: '',
  language: 'en'
}));

// Keys are never logged or exposed
console.log('API Key:', '***hidden***');
```

---

## Styling & UX

### Magical Button
- **Position**: Fixed bottom-right (above bottom nav)
- **Design**: Gradient purple-to-pink circle
- **Icon**: Sparkles (✨)
- **Animation**: Hover scale, tap feedback
- **Z-index**: 40 (above content, below modals)

### Modal
- **Size**: Max-width 3xl, max-height 90vh
- **Design**: Card with gradient header
- **Backdrop**: Blur effect
- **Animations**: Smooth scale and fade
- **Responsive**: Works on mobile and desktop

### Theme Support
- ✅ Respects dark/light mode
- ✅ Uses theme colors (primary, muted, etc.)
- ✅ Gradient accents for AI branding

---

## Error Handling

### API Errors
```typescript
try {
  const explanation = await generateText(provider, apiKey, context, language);
} catch (error) {
  // Show user-friendly error
  setExplanation(`Error: ${error.message || 'Failed to generate explanation'}`);
  
  // Common errors:
  // - Invalid API key
  // - Rate limit exceeded
  // - Network error
  // - Model not available
}
```

### Fallbacks
- **No API Key**: Prompt user to add key in settings
- **TTS Unavailable**: Use Web Speech API
- **Network Error**: Show retry button
- **Invalid Response**: Show error message

---

## Performance

### Optimization
- **Lazy Loading**: Component only loads when button clicked
- **Caching**: Settings cached in localStorage
- **Streaming**: Could add streaming for real-time generation (future)
- **Debouncing**: Prevent multiple simultaneous requests

### Resource Usage
- **Text Generation**: ~2-5 seconds (depends on AI provider)
- **Audio Generation**: ~3-10 seconds (depends on text length)
- **Memory**: Minimal, audio cleaned up after use
- **Network**: Only when generating, no polling

---

## Future Enhancements

### Planned Features
1. **Streaming Responses**: Real-time text generation
2. **Voice Selection**: Multiple voice options
3. **Speed Control**: Adjust playback speed
4. **Bookmarking**: Save favorite explanations
5. **History**: View past explanations
6. **Sharing**: Share explanations with others
7. **Offline Mode**: Cache common explanations
8. **Custom Prompts**: User-defined explanation styles

### Additional Languages
- Korean (한국어)
- Italian (Italiano)
- Russian (Русский)
- Turkish (Türkçe)
- Dutch (Nederlands)

### Additional AI Providers
- ~~Anthropic Claude~~ (could add)
- ~~Cohere~~ ✅ ADDED
- ~~Mistral AI~~ (via HuggingFace)
- ~~Local models (Ollama)~~ (future)

---

## Testing

### Manual Testing Checklist

- [ ] Button appears on question pages
- [ ] Modal opens on button click
- [ ] Settings panel works
- [ ] API key input saves
- [ ] Language selection works
- [ ] Gemini generation works
- [ ] OpenAI generation works
- [ ] Audio playback works
- [ ] Copy button works
- [ ] Download button works
- [ ] Regenerate works
- [ ] Error handling works
- [ ] Mobile responsive
- [ ] Theme support works

### Test Cases

```typescript
// Test 1: Generate with Gemini
1. Set Gemini API key
2. Click "Generate Explanation"
3. Verify text appears
4. Verify audio plays (Web Speech)

// Test 2: Generate with OpenAI
1. Set OpenAI API key
2. Click "Generate Explanation"
3. Verify text appears
4. Verify audio plays (OpenAI TTS)
5. Verify download works

// Test 3: Multi-language
1. Select Spanish
2. Generate explanation
3. Verify Spanish text
4. Verify Spanish audio

// Test 4: Error handling
1. Use invalid API key
2. Verify error message
3. Verify settings prompt
```

---

## Integration Points

### Current Integration
- ✅ `QuestionViewerGenZ.tsx` - Question pages

### Potential Integration
- `CertificationPracticeGenZ.tsx` - Certification questions
- `CodingChallengeViewer.tsx` - Coding challenges
- `BlogPost.tsx` - Blog articles
- `Documentation.tsx` - Documentation pages
- `LearningPathsGenZ.tsx` - Learning path descriptions

### Integration Example
```tsx
// In any page component
import { AIExplainer } from '../components/AIExplainer';

<AIExplainer
  content={{
    question: "Your content here",
    explanation: "Detailed content",
    // ... other fields
  }}
  context="Page context"
/>
```

---

## Cost Considerations

### Gemini API
- **Free Tier**: 60 requests/minute
- **Pricing**: Free for most use cases
- **Limits**: 2048 tokens per request

### OpenAI API
- **GPT-4 Turbo**: ~$0.01 per 1K tokens
- **TTS**: ~$0.015 per 1K characters
- **Example**: 500-word explanation + audio ≈ $0.02

### User Cost Control
- Users provide their own keys
- Users control usage
- No hidden costs
- Clear pricing from providers

---

## Accessibility

### Features
- ✅ Keyboard navigation
- ✅ Screen reader support
- ✅ ARIA labels
- ✅ Focus management
- ✅ High contrast support

### Audio Controls
- ✅ Play/pause button
- ✅ Visual feedback
- ✅ Keyboard shortcuts (future)
- ✅ Transcript available

---

## Files Created

### Component
- `client/src/components/AIExplainer.tsx` - Main component (500+ lines)

### Integration
- Modified `client/src/pages/QuestionViewerGenZ.tsx` - Added AIExplainer

### Documentation
- `AI_EXPLAINER_FEATURE.md` - This file

---

## Quick Start Guide

### For Users

1. **Click the magical button** (✨) on any question page
2. **Open settings** (⚙️ icon)
3. **Choose AI provider**: Gemini or OpenAI
4. **Enter API key**: Get from provider's website
5. **Select language**: Choose from 9 languages
6. **Save settings**
7. **Click "Generate Explanation"**
8. **Listen or read** the explanation
9. **Copy, download, or regenerate** as needed

### For Developers

```bash
# Component is already integrated
# Just ensure dependencies are installed
pnpm install

# Run dev server
pnpm run dev

# Test on any question page
open http://localhost:5001/channel/aws
```

---

## Support & Troubleshooting

### Common Issues

**Issue**: "Please set your API key"
- **Solution**: Open settings and add your API key

**Issue**: "API error: Invalid authentication"
- **Solution**: Check your API key is correct

**Issue**: "No audio playing"
- **Solution**: Check browser supports Web Speech API or use OpenAI

**Issue**: "Explanation in wrong language"
- **Solution**: Change language in settings and regenerate

### Getting Help

- Check API provider documentation
- Verify API key has correct permissions
- Check browser console for errors
- Ensure network connection is stable

---

**Status**: ✅ READY FOR USE  
**Version**: 1.0.0  
**Last Updated**: January 21, 2026

The AI Explainer feature is fully implemented and ready to help users understand complex topics in their native language! 🎉
