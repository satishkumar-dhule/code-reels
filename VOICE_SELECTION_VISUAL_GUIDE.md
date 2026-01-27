# Voice Selection Feature - Visual Guide 🎙️

## What's New in Settings Panel

### Before (Old Settings)
```
┌─────────────────────────────────────┐
│ AI Provider: [Groq] [Gemini] [OpenAI] │
│ API Key: [••••••••••••]              │
│ Language: [🇺🇸 English ▼]            │
│ Voice Provider: [Browser] [ElevenLabs] [OpenAI] │
│ ✅ Free, works without API key       │
│ ☑ Auto-speak responses               │
│ [Save Settings]                      │
└─────────────────────────────────────┘
```

### After (New Settings with Voice Selection)
```
┌─────────────────────────────────────┐
│ AI Provider: [Groq] [Gemini] [OpenAI] │
│ API Key: [••••••••••••]              │
│ Language: [🇺🇸 English ▼]            │
│ Voice Provider: [Browser] [ElevenLabs] [OpenAI] │
│ ✅ Free, works without API key       │
│                                      │
│ ┌─ NEW! Voice Selection ───────────┐│
│ │ Voice Selection                  ││
│ │ [Google US English (en-US) ▼]   ││
│ │ 12 voices available for English  ││
│ │                                  ││
│ │ Speech Rate: 0.95x               ││
│ │ [━━━━━●━━━━━━━━━━━━━━━━━━━━━━] ││
│ │ Slower          Faster           ││
│ └──────────────────────────────────┘│
│                                      │
│ ☑ Auto-speak responses               │
│ [Save Settings]                      │
└─────────────────────────────────────┘
```

## Voice Selection Dropdown Options

When you click the dropdown, you'll see:

```
┌─────────────────────────────────────┐
│ Voice Selection                      │
│ ┌──────────────────────────────────┐│
│ │ Default Voice                    ││
│ │ ─────────────────────────────────││
│ │ Google US English (en-US)        ││ ← Selected
│ │ Google UK English Female (en-GB) ││
│ │ Google UK English Male (en-GB)   ││
│ │ Microsoft David (en-US)          ││
│ │ Microsoft Zira (en-US)           ││
│ │ Microsoft Mark (en-US)           ││
│ │ Apple Samantha (en-US)           ││
│ │ Apple Alex (en-US)               ││
│ │ Apple Karen (en-AU)              ││
│ │ Apple Daniel (en-GB)             ││
│ │ Apple Moira (en-IE)              ││
│ │ Apple Tessa (en-ZA)              ││
│ └──────────────────────────────────┘│
└─────────────────────────────────────┘
```

## Speech Rate Slider

```
Speech Rate: 0.50x (Very Slow)
[●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━]
Slower                        Faster

Speech Rate: 0.95x (Slightly Slow - Default)
[━━━━━━━━━━━━━━━━━━━●━━━━━━━━━━]
Slower                        Faster

Speech Rate: 1.00x (Normal)
[━━━━━━━━━━━━━━━━━━━━●━━━━━━━━━]
Slower                        Faster

Speech Rate: 1.50x (Fast)
[━━━━━━━━━━━━━━━━━━━━━━━━━━━━●━]
Slower                        Faster

Speech Rate: 2.00x (Very Fast)
[━━━━━━━━━━━━━━━━━━━━━━━━━━━━━●]
Slower                        Faster
```

## How Voice Selection Works

### Step-by-Step User Flow

```
1. User opens AI Companion
   ↓
2. Clicks Settings (⚙️) icon
   ↓
3. Selects "Browser" as Voice Provider
   ↓
4. Voice Selection dropdown appears! ✨
   ↓
5. User sees all voices for selected language
   ↓
6. User selects preferred voice
   ↓
7. User adjusts speech rate (optional)
   ↓
8. Clicks "Save Settings"
   ↓
9. Settings saved to localStorage
   ↓
10. AI uses selected voice for all responses!
```

## Language-Specific Voice Filtering

The voice dropdown automatically filters by language:

```
Selected Language: English (en)
└─ Shows: en-US, en-GB, en-AU, en-CA, en-IN, etc.

Selected Language: Spanish (es)
└─ Shows: es-ES, es-MX, es-AR, es-CO, etc.

Selected Language: French (fr)
└─ Shows: fr-FR, fr-CA, fr-BE, fr-CH, etc.

Selected Language: German (de)
└─ Shows: de-DE, de-AT, de-CH, etc.
```

## Voice Quality Comparison

### Browser Voice Quality Rankings

```
🏆 Tier 1 (Excellent)
├─ Safari (macOS/iOS): Apple voices
│  └─ Natural, expressive, high quality
│
├─ Edge (Windows): Microsoft voices
│  └─ Very natural, good prosody
│
└─ Chrome (all platforms): Google voices
   └─ Clear, natural, reliable

⭐ Tier 2 (Good)
├─ Chrome (Android): Google voices
│  └─ Good quality, slightly robotic
│
└─ Safari (older versions)
   └─ Decent quality

🔧 Tier 3 (Basic)
└─ Firefox: eSpeak voices
   └─ Robotic but fast and reliable
```

## Example Voice Names by Browser

### Chrome (Google Voices)
```
- Google US English
- Google UK English Female
- Google UK English Male
- Google español
- Google français
- Google Deutsch
```

### Safari (Apple Voices)
```
- Samantha (en-US)
- Alex (en-US)
- Karen (en-AU)
- Daniel (en-GB)
- Moira (en-IE)
- Tessa (en-ZA)
```

### Edge (Microsoft Voices)
```
- Microsoft David Desktop (en-US)
- Microsoft Zira Desktop (en-US)
- Microsoft Mark (en-US)
- Microsoft Hazel Desktop (en-GB)
```

### Firefox (eSpeak Voices)
```
- eSpeak English (en)
- eSpeak Spanish (es)
- eSpeak French (fr)
- eSpeak German (de)
```

## Settings Persistence

```
localStorage['ai-companion-settings'] = {
  provider: 'groq',
  ttsProvider: 'webspeech',
  language: 'en',
  selectedVoice: 'Google US English',  ← NEW!
  speechRate: 0.95,                    ← NEW!
  autoSpeak: false,
  // ... API keys
}
```

## Voice Mode Integration

```
┌─────────────────────────────────────┐
│ AI Companion                         │
│ 🇺🇸 English • Voice Mode 🎙️         │
├─────────────────────────────────────┤
│                                      │
│ [🎙️ Listening... (Release SPACEBAR  │
│  to send)]                           │
│                                      │
│ User: "What is React?"               │
│                                      │
│ 🤖 AI: "React is a JavaScript       │
│     library for building UIs."       │
│     [🔊] [📋]                        │
│                                      │
│ ↑ Spoken with selected voice!       │
│                                      │
├─────────────────────────────────────┤
│ Hold SPACEBAR to speak               │
└─────────────────────────────────────┘
```

## Testing Checklist

### ✅ Voice Selection
- [ ] Open settings
- [ ] Select "Browser" TTS
- [ ] See voice dropdown
- [ ] Dropdown shows voices for selected language
- [ ] Select a voice
- [ ] Voice name is saved
- [ ] Refresh page
- [ ] Selected voice persists

### ✅ Speech Rate
- [ ] See speech rate slider
- [ ] Slider shows current rate (0.95x default)
- [ ] Drag slider left (slower)
- [ ] Drag slider right (faster)
- [ ] Rate value updates in real-time
- [ ] Save settings
- [ ] AI speaks at selected rate

### ✅ Language Filtering
- [ ] Select English → See English voices
- [ ] Select Spanish → See Spanish voices
- [ ] Select French → See French voices
- [ ] Voice count updates correctly

### ✅ Integration
- [ ] Enable voice mode
- [ ] Hold SPACEBAR and speak
- [ ] AI responds with selected voice
- [ ] Speech rate is correct
- [ ] Can interrupt with SPACEBAR

## Common Voice Recommendations

### For Learning (Slower, Clear)
```
Voice: Google US English
Rate: 0.80x - 0.90x
Why: Clear pronunciation, easy to understand
```

### For Efficiency (Faster)
```
Voice: Microsoft David
Rate: 1.20x - 1.50x
Why: Fast but still intelligible
```

### For Natural Conversation
```
Voice: Apple Samantha (Safari)
Rate: 0.95x - 1.00x
Why: Most natural-sounding
```

### For Multilingual
```
Voice: Google voices (any language)
Rate: 1.00x
Why: Consistent quality across languages
```

## Troubleshooting

### No Voices in Dropdown
```
Problem: Dropdown is empty
Solution: 
1. Check if Browser TTS is selected
2. Wait a few seconds for voices to load
3. Refresh the page
4. Try a different browser
```

### Voice Doesn't Change
```
Problem: AI still uses old voice
Solution:
1. Make sure you clicked "Save Settings"
2. Check if correct voice is selected
3. Refresh the page
4. Clear localStorage and try again
```

### Voice Sounds Robotic
```
Problem: Voice quality is poor
Solution:
1. Try a different voice from dropdown
2. Use Chrome/Safari/Edge instead of Firefox
3. Update your browser to latest version
4. Try Google or Apple voices
```

## Summary

The voice selection feature gives users full control over:
- ✅ Which voice to use (from all available system voices)
- ✅ How fast the voice speaks (0.5x to 2.0x)
- ✅ Automatic language filtering
- ✅ Persistent settings across sessions

This makes the AI Companion much more personalized and pleasant to use! 🎉
