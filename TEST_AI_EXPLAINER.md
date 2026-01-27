# 🧪 AI Explainer Testing Guide

**Dev Server**: http://localhost:5002/  
**Test Date**: January 23, 2026

---

## Quick Test Checklist

### 1. Visual Test (2 minutes)

1. **Navigate to a question page**:
   ```
   http://localhost:5002/channel/aws
   ```

2. **Look for the magical button**:
   - ✨ Sparkle button at bottom-right
   - Should be purple-to-pink gradient
   - Should be above bottom navigation
   - Should have hover animation

3. **Click the button**:
   - Modal should open smoothly
   - Should see "AI Explainer" title
   - Should see settings icon (⚙️)
   - Should see "Generate Explanation" button

### 2. Settings Test (3 minutes)

1. **Open settings** (click ⚙️ icon):
   - Should see 5 provider buttons:
     - Groq ⚡ FREE (should be selected by default)
     - Gemini
     - Cohere FREE
     - HuggingFace
     - OpenAI
   - Should see API key input field
   - Should see language dropdown (9 languages)
   - Should see "Save Settings" button

2. **Test provider switching**:
   - Click each provider button
   - API key field should update
   - Help text should change

3. **Test language selection**:
   - Open language dropdown
   - Should see 9 languages with flags
   - Select different language
   - Should update immediately

### 3. Functional Test (5 minutes)

**Prerequisites**: You need a free API key from Groq

1. **Get Groq API key** (if you don't have one):
   - Visit: https://console.groq.com
   - Sign up (free, no credit card)
   - Go to API Keys
   - Create new key
   - Copy key

2. **Configure AI Explainer**:
   - Open settings
   - Ensure "Groq" is selected
   - Paste your API key
   - Select "English" language
   - Click "Save Settings"
   - Settings panel should close

3. **Generate explanation**:
   - Click "Generate Explanation" button
   - Should see loading spinner
   - Wait 5-10 seconds
   - Should see explanation text appear
   - Text should be relevant to the question

4. **Test audio playback**:
   - Click "Play Audio" button
   - Should hear explanation read aloud
   - Click "Pause" to stop
   - Should stop immediately

5. **Test actions**:
   - Click copy button (📋)
   - Should see checkmark briefly
   - Paste somewhere to verify text copied
   - Click "Regenerate" button
   - Should generate new explanation

### 4. Multi-Language Test (Optional, 5 minutes)

1. **Switch to Spanish**:
   - Open settings
   - Select "Español" from dropdown
   - Save settings
   - Click "Regenerate"
   - Should see Spanish explanation

2. **Test other languages**:
   - Try French, German, Hindi, etc.
   - Each should generate in that language
   - Audio should speak in that language

### 5. Error Handling Test (2 minutes)

1. **Test without API key**:
   - Open settings
   - Clear API key field
   - Save settings
   - Click "Generate Explanation"
   - Should see error: "Please set your Groq API key in settings"
   - Settings should open automatically

2. **Test with invalid key**:
   - Enter "invalid-key-123"
   - Save settings
   - Click "Generate Explanation"
   - Should see error message
   - Should not crash

### 6. Mobile Test (Optional, 3 minutes)

1. **Open dev tools**:
   - Press F12
   - Click device toolbar (mobile view)
   - Select iPhone or Android device

2. **Test on mobile**:
   - Button should be visible
   - Modal should be responsive
   - Settings should work
   - All features should function

### 7. Theme Test (2 minutes)

1. **Test in light mode**:
   - Switch to light theme (if available)
   - Button should be visible
   - Modal should have light background
   - Text should be readable

2. **Test in dark mode**:
   - Switch to dark theme
   - Button should be visible
   - Modal should have dark background
   - Text should be readable

---

## Expected Results

### ✅ Pass Criteria

- [ ] Button appears on question pages
- [ ] Button has correct styling (gradient, sparkle icon)
- [ ] Modal opens smoothly with animation
- [ ] Settings panel works (provider selection, API key, language)
- [ ] Settings persist after page reload
- [ ] Explanation generates successfully (with valid API key)
- [ ] Explanation is relevant to question content
- [ ] Audio playback works (Web Speech API)
- [ ] Copy button works
- [ ] Regenerate button works
- [ ] Error handling works (no API key, invalid key)
- [ ] Mobile responsive
- [ ] Theme support works
- [ ] No console errors
- [ ] No visual glitches

### ❌ Fail Criteria

- Button doesn't appear
- Modal doesn't open
- Settings don't save
- Explanation doesn't generate
- Audio doesn't play
- Console errors appear
- Visual glitches or broken layout
- Mobile view broken
- Theme issues

---

## Test Results Template

```
Date: _______________
Tester: _______________
Browser: _______________
Device: _______________

Visual Test: ☐ Pass ☐ Fail
Settings Test: ☐ Pass ☐ Fail
Functional Test: ☐ Pass ☐ Fail
Multi-Language Test: ☐ Pass ☐ Fail (Optional)
Error Handling Test: ☐ Pass ☐ Fail
Mobile Test: ☐ Pass ☐ Fail (Optional)
Theme Test: ☐ Pass ☐ Fail

Notes:
_________________________________
_________________________________
_________________________________

Overall: ☐ PASS ☐ FAIL
```

---

## Quick Test (30 seconds)

**Fastest way to verify it works**:

1. Go to: http://localhost:5002/channel/aws
2. Look for ✨ button at bottom-right
3. Click it
4. Modal should open
5. ✅ WORKING!

---

## Troubleshooting

### Button not visible
- Check z-index conflicts
- Check if component is imported
- Check console for errors

### Modal not opening
- Check onClick handler
- Check state management
- Check console for errors

### Explanation not generating
- Verify API key is correct
- Check network tab for API calls
- Check console for errors
- Verify provider is selected

### Audio not playing
- Check browser supports Web Speech API
- Check audio permissions
- Try OpenAI provider for better audio

### Settings not saving
- Check localStorage in dev tools
- Verify save function is called
- Check console for errors

---

## Performance Benchmarks

### Expected Performance

| Metric | Target | Acceptable | Poor |
|--------|--------|------------|------|
| Button render | <100ms | <200ms | >200ms |
| Modal open | <300ms | <500ms | >500ms |
| Settings save | <50ms | <100ms | >100ms |
| Explanation (Groq) | 1-3s | 3-5s | >5s |
| Audio playback | Instant | <1s | >1s |

### Measuring Performance

```javascript
// In browser console
console.time('explanation');
// Click "Generate Explanation"
// Wait for completion
console.timeEnd('explanation');
```

---

## Browser Compatibility

### Tested Browsers

- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

### Known Issues

- Web Speech API quality varies by browser
- Some languages may not have voices in all browsers
- Safari may have audio autoplay restrictions

---

## API Provider Testing

### Groq (Default)
- [ ] API key accepted
- [ ] Explanation generates
- [ ] Response time <3s
- [ ] Quality is good
- [ ] No rate limit issues

### Gemini
- [ ] API key accepted
- [ ] Explanation generates
- [ ] Fallback models work
- [ ] Quality is good

### Cohere
- [ ] API key accepted
- [ ] Explanation generates
- [ ] Quality is acceptable

### HuggingFace
- [ ] API key accepted
- [ ] Explanation generates
- [ ] Response time acceptable

### OpenAI
- [ ] API key accepted
- [ ] Explanation generates
- [ ] TTS audio works
- [ ] Quality is best

---

## Security Testing

### API Key Security
- [ ] Keys stored in localStorage only
- [ ] Keys not visible in network tab
- [ ] Keys not logged to console
- [ ] Password field masks input
- [ ] Keys not sent to our servers

### Data Privacy
- [ ] Content only sent to chosen provider
- [ ] No tracking of AI usage
- [ ] No server-side storage
- [ ] User can clear settings

---

## Accessibility Testing

### Keyboard Navigation
- [ ] Can tab to button
- [ ] Can open modal with Enter
- [ ] Can navigate settings with Tab
- [ ] Can close modal with Escape

### Screen Reader
- [ ] Button has aria-label
- [ ] Modal has proper ARIA attributes
- [ ] Settings are announced
- [ ] Actions are announced

### Visual
- [ ] High contrast mode works
- [ ] Text is readable
- [ ] Focus indicators visible
- [ ] Color contrast meets WCAG AA

---

## Integration Testing

### Question Page Integration
- [ ] Button appears on all question pages
- [ ] Receives correct question content
- [ ] Context is passed properly
- [ ] No conflicts with other components

### Theme Integration
- [ ] Respects current theme
- [ ] Switches with theme changes
- [ ] Colors are theme-aware
- [ ] No visual glitches

### Navigation Integration
- [ ] Doesn't interfere with navigation
- [ ] Modal closes on navigation
- [ ] State persists across pages

---

## Load Testing

### Stress Test
1. Generate 10 explanations rapidly
2. Switch languages multiple times
3. Switch providers multiple times
4. Open/close modal repeatedly
5. Check for memory leaks

### Expected Behavior
- No crashes
- No memory leaks
- No performance degradation
- Smooth animations maintained

---

## Final Checklist

Before marking as complete:

- [ ] All visual tests pass
- [ ] All functional tests pass
- [ ] Error handling works
- [ ] Mobile responsive
- [ ] Theme support works
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Documentation complete
- [ ] User guide written
- [ ] Code reviewed
- [ ] Performance acceptable
- [ ] Security verified
- [ ] Accessibility checked

---

**Status**: Ready for testing  
**Estimated Test Time**: 10-20 minutes (full suite)  
**Quick Test Time**: 30 seconds  

**Start Testing**: http://localhost:5002/channel/aws

---

*Happy Testing! 🧪*
