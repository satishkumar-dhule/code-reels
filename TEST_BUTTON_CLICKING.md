# Test Guide: AI Agent Button Clicking

## How to Test

### 1. Start the Dev Server
```bash
cd client
npm run dev
```

### 2. Open the AI Companion
- Navigate to any page with buttons (e.g., a question page)
- Click the AI Companion button (bottom right, purple/pink gradient)
- The companion window opens

### 3. Test Button Clicking

#### Test Case 1: Next Question Button
1. Go to any question page that has a "Next Question" button
2. In AI Companion, type: **"next question"**
3. Press Enter

**Expected Result:**
- AI responds briefly (e.g., "Done! Moving to next question")
- Button scrolls into view
- Button glows with purple highlight
- Button gets clicked after 0.5 seconds
- Toast notification: "✅ Clicked! Moving to next question"
- Page navigates to next question

#### Test Case 2: Show Answer Button
1. Go to a question page with "Show Answer" button
2. In AI Companion, type: **"show answer"**
3. Press Enter

**Expected Result:**
- AI clicks the "Show Answer" button
- Answer section is revealed
- Toast confirms the click

#### Test Case 3: Continue Button
1. Go to a page with "Continue" or "Continue Learning" button
2. In AI Companion, type: **"continue"**
3. Press Enter

**Expected Result:**
- AI clicks the continue button
- User proceeds to next step

#### Test Case 4: Voice Mode (Push-to-Talk)
1. Click the microphone icon in AI Companion header
2. Hold SPACEBAR and say: **"next question"**
3. Release SPACEBAR

**Expected Result:**
- AI transcribes your speech
- AI responds with voice
- Button gets clicked automatically
- Seamless voice interaction!

### 4. Verify Visual Feedback

Watch for these visual cues:
1. **Scroll Animation** - Button smoothly scrolls into center of viewport
2. **Purple Glow** - Button gets purple outline with pulsing glow effect
3. **Label** - "👁️ AI is looking here" appears above button
4. **Click** - Button is clicked after 0.5 seconds
5. **Toast** - Green checkmark toast appears: "✅ Clicked!"

### 5. Test Error Handling

#### Test Case: Button Not Found
1. In AI Companion, type: **"click the delete button"**
2. Press Enter (when no delete button exists)

**Expected Result:**
- AI tries to find button
- Toast notification: "⚠️ Button Not Found - Couldn't find button: 'delete button'"
- No error in console
- AI continues working normally

## What to Look For

### ✅ Success Indicators
- Button is found and clicked
- Visual feedback is smooth and clear
- Toast notifications appear
- Page responds to button click
- No console errors

### ❌ Failure Indicators
- Button not found when it exists
- No visual feedback
- Console errors
- Button not clicked
- AI explains instead of clicking

## Debugging

### If Button Not Clicking

1. **Check Console Logs**
   ```
   AI clicking button: next question
   ```

2. **Check Button Text**
   - Open DevTools
   - Inspect the button
   - Verify button text matches what AI is searching for

3. **Check Button Selector**
   - Button should be `<button>`, `<a role="button">`, or `[role="button"]`
   - If button is custom element, may need to update selector

4. **Check AI Response**
   - Look for `[ACTION:{"type":"click","text":"..."}]` in AI response
   - If missing, AI didn't generate click action
   - May need to adjust prompt or provide more context

### If Visual Feedback Not Working

1. **Check CSS**
   - `.ai-agent-highlight` class should be defined
   - Purple glow animation should be visible

2. **Check Timing**
   - Highlight appears immediately
   - Click happens after 500ms
   - Highlight removed after click

## Advanced Testing

### Test with Different Button Types
- Standard buttons: `<button>Next</button>`
- Link buttons: `<a role="button">Next</a>`
- Div buttons: `<div role="button">Next</div>`
- Icon buttons: `<button><Icon /> Next</button>`

### Test with Different Text Variations
- "next question" → finds "Next Question"
- "NEXT" → finds "next question"
- "show" → finds "Show Answer"
- "continue" → finds "Continue Learning"

### Test in Voice Mode
- Hold SPACEBAR, say "next question"
- AI should click button AND respond with voice
- Should work seamlessly without typing

## Expected Behavior Summary

| User Input | Button on Page | AI Action | Result |
|------------|----------------|-----------|--------|
| "next question" | "Next Question" | Click | ✅ Navigates to next |
| "show answer" | "Show Answer" | Click | ✅ Reveals answer |
| "continue" | "Continue Learning" | Click | ✅ Proceeds |
| "next" | "Next Question" | Click | ✅ Navigates |
| "delete" | No delete button | Error toast | ⚠️ Button not found |

## Status: Ready for Testing! 🚀

The button clicking feature is fully implemented and ready to test. Try it out and see the AI agent in action!
