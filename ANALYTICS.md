# Google Analytics Integration - Code Reels

## Overview
Code Reels includes comprehensive Google Analytics integration to track user behavior, engagement, and platform usage.

## Setup Instructions

### 1. Google Analytics Account
Code Reels is already configured with Google Analytics Measurement ID: **G-47MSM57H95**

Analytics will automatically start tracking when the application loads. No additional setup is required for the default configuration.

To use a different Google Analytics account:
1. Go to [Google Analytics](https://analytics.google.com/)
2. Create a new property for your instance
3. Select "Web" as the platform
4. Copy your **Measurement ID** (format: `G-XXXXXXXXXX`)

### 2. Configure Environment Variable (Optional)
The Code Reels project is pre-configured with Measurement ID: `G-47MSM57H95`

To use a different Measurement ID, create a `.env.local` file in the `client` directory:

```env
VITE_GA_MEASUREMENT_ID=G-YOUR-MEASUREMENT-ID
```

If no environment variable is set, the default `G-47MSM57H95` will be used.

### 3. Build and Deploy
The analytics will automatically initialize when the app loads.

## Tracked Events

### Page Views
- **Event**: `page_view`
- **Tracked on**: Every page navigation
- **Data**: Page path, page title

### User Interactions

#### Channel Selection
- **Event**: `channel_select`
- **Triggered**: When user selects a learning channel
- **Data**: Channel ID, channel name

#### Question View
- **Event**: `question_view`
- **Triggered**: When a question is displayed
- **Data**: Question ID, channel, difficulty level

#### Answer Revealed
- **Event**: `answer_revealed`
- **Triggered**: When user reveals the answer
- **Data**: Question ID, time to reveal (seconds)

#### Question Completed
- **Event**: `question_completed`
- **Triggered**: When user marks question as complete
- **Data**: Question ID, channel, time spent (seconds)

### Social & Sharing

#### LinkedIn Share
- **Event**: `linkedin_share`
- **Triggered**: When user opens LinkedIn post preview
- **Data**: Question ID, channel

#### LinkedIn Download
- **Event**: `linkedin_download`
- **Triggered**: When user downloads post as image or text
- **Data**: Question ID, format (image/text)

#### GitHub Clicks
- **Event**: `github_click`
- **Triggered**: When user clicks GitHub links
- **Data**: Link type (star, issue, repo, discussions)

### Feature Usage

#### Timer Usage
- **Event**: `timer_usage`
- **Triggered**: When timer is toggled
- **Data**: Timer enabled (boolean), duration (seconds)

#### Theme Change
- **Event**: `theme_change`
- **Triggered**: When user changes theme
- **Data**: Theme name

#### Easter Egg Unlocked
- **Event**: `easter_egg_unlocked`
- **Triggered**: When user discovers easter egg
- **Data**: Egg name (hacker_mode, legend_status)

### Page-Specific Events

#### Stats View
- **Event**: `stats_view`
- **Triggered**: When user visits stats page
- **Data**: Timestamp

#### About View
- **Event**: `about_view`
- **Triggered**: When user visits about page
- **Data**: Timestamp

### Session & Engagement

#### Session Duration
- **Event**: `session_duration`
- **Triggered**: When user leaves the site
- **Data**: Duration in seconds

#### User Engagement
- **Event**: `user_engagement`
- **Triggered**: Every 10 user interactions
- **Data**: Engagement type, interaction count

#### Error Tracking
- **Event**: `error`
- **Triggered**: When an error occurs
- **Data**: Error message, error context

## Analytics Hooks

### usePageViewTracking()
Automatically tracks page views on route changes.

```tsx
import { usePageViewTracking } from '@/hooks/use-analytics';

function MyComponent() {
  usePageViewTracking();
  // Component code
}
```

### useSessionTracking()
Tracks session duration when user leaves.

```tsx
import { useSessionTracking } from '@/hooks/use-analytics';

function MyComponent() {
  useSessionTracking();
  // Component code
}
```

### useInteractionTracking()
Tracks user interactions (clicks, keyboard, scroll, touch).

```tsx
import { useInteractionTracking } from '@/hooks/use-analytics';

function MyComponent() {
  useInteractionTracking();
  // Component code
}
```

## Direct Event Tracking

### Track Custom Events
```tsx
import { trackEvent } from '@/hooks/use-analytics';

trackEvent('custom_event', {
  'custom_property': 'value',
  'another_property': 123
});
```

### Track Channel Selection
```tsx
import { trackChannelSelect } from '@/hooks/use-analytics';

trackChannelSelect('system-design', 'System Design');
```

### Track Question View
```tsx
import { trackQuestionView } from '@/hooks/use-analytics';

trackQuestionView('q-123', 'algorithms', 'intermediate');
```

### Track Answer Revealed
```tsx
import { trackAnswerRevealed } from '@/hooks/use-analytics';

trackAnswerRevealed('q-123', 45); // 45 seconds to reveal
```

### Track Social Share
```tsx
import { trackSocialShare } from '@/hooks/use-analytics';

trackSocialShare('q-123', 'system-design');
```

### Track GitHub Click
```tsx
import { trackGitHubClick } from '@/hooks/use-analytics';

trackGitHubClick('star'); // or 'issue', 'repo', 'discussions'
```

## Google Analytics Dashboard Setup

### Recommended Reports

#### 1. User Engagement
- Track which channels are most popular
- Monitor question difficulty preferences
- Identify user learning patterns

#### 2. Feature Usage
- Monitor timer usage
- Track theme preferences
- Measure easter egg discovery rate

#### 3. Social Sharing
- Track LinkedIn post shares
- Monitor download formats
- Measure sharing engagement

#### 4. User Behavior
- Session duration analysis
- Page flow analysis
- Bounce rate monitoring

#### 5. Error Tracking
- Monitor application errors
- Track error frequency
- Identify problematic features

### Custom Segments

Create segments to analyze:
- **Active Learners**: Users with 10+ questions completed
- **Social Sharers**: Users who share on LinkedIn
- **Theme Switchers**: Users who change themes
- **Easter Egg Hunters**: Users who unlock easter eggs

## Privacy & Compliance

### Data Collection
- IP anonymization is enabled
- Google Signals are disabled
- Ad personalization signals are disabled
- No personally identifiable information is collected

### GDPR Compliance
- Users can opt-out of analytics
- No sensitive data is tracked
- Data retention follows Google's policies

### Cookie Policy
- Google Analytics uses cookies for tracking
- Users should be informed via privacy policy
- Consent management can be implemented

## Implementation Details

### Analytics Module (`client/src/lib/analytics.ts`)
- Initializes Google Analytics
- Provides tracking functions
- Handles gtag configuration

### Analytics Hook (`client/src/hooks/use-analytics.ts`)
- Provides React hooks for tracking
- Automatic page view tracking
- Session duration tracking
- Interaction tracking

### Integration Points
- **main.tsx**: Initializes analytics on app load
- **App.tsx**: Activates tracking hooks
- **Home.tsx**: Tracks channel selection and GitHub clicks
- **About.tsx**: Tracks easter egg unlocks
- **Stats.tsx**: Tracks stats page views
- **Reels.tsx**: Tracks question views and answer reveals

## Monitoring & Optimization

### Key Metrics to Monitor
1. **User Engagement**: Average session duration, pages per session
2. **Learning Progress**: Questions completed per user, completion rate
3. **Feature Adoption**: Timer usage, theme preferences
4. **Social Impact**: LinkedIn shares, GitHub interactions
5. **Error Rate**: Application errors, error frequency

### Optimization Opportunities
- Identify drop-off points in learning flow
- Optimize most popular channels
- Improve features with low adoption
- Fix frequently occurring errors
- Enhance social sharing features

## Troubleshooting

### Analytics Not Showing Data
1. Verify Measurement ID is correct
2. Check browser console for errors
3. Ensure Google Analytics script loaded
4. Wait 24-48 hours for data to appear

### Events Not Tracking
1. Check event name spelling
2. Verify event is being called
3. Check browser console for errors
4. Ensure gtag is initialized

### Privacy Issues
1. Add privacy policy mentioning analytics
2. Implement consent management
3. Respect user privacy preferences
4. Follow GDPR/CCPA guidelines

## Resources

- [Google Analytics Documentation](https://developers.google.com/analytics/devguides/collection/gtagjs)
- [Google Analytics Events](https://developers.google.com/analytics/devguides/collection/gtagjs/events)
- [Google Analytics Setup Guide](https://support.google.com/analytics/answer/1008015)
- [Privacy & Data Protection](https://support.google.com/analytics/answer/6004245)

## Future Enhancements

- [ ] Implement custom user IDs for authenticated users
- [ ] Add conversion tracking for learning milestones
- [ ] Create custom dashboards for insights
- [ ] Implement A/B testing
- [ ] Add real-time monitoring alerts
- [ ] Create automated reports
- [ ] Implement cohort analysis
- [ ] Add funnel analysis for learning flow
