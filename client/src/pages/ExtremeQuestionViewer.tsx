/**
 * Extreme UX Question Viewer Page
 * Complete redesign with immersive experience and SEO optimization
 */

import { useRoute } from 'wouter';
import { ExtremeQuestionViewer } from '../components/question/ExtremeQuestionViewer';
import { SEOHead } from '../components/SEOHead';
import { getChannel } from '../lib/data';

export default function ExtremeQuestionViewerPage() {
  const [, params] = useRoute('/extreme/channel/:id/:questionId?');
  const channelId = params?.id;
  const questionId = params?.questionId;
  
  const channel = getChannel(channelId || '');

  if (!channelId) {
    return <div>Channel not found</div>;
  }

  return (
    <>
      <SEOHead
        title={`${channel?.name || 'Question'} - Extreme Learning Experience | Code Reels`}
        description={`Immersive question practice for ${channel?.name || 'technical interviews'} with AI assistance, gamified learning, and extreme UX design.`}
        canonical={`https://open-interview.github.io/extreme/channel/${channelId}${questionId ? `/${questionId}` : ''}`}
      />
      
      <ExtremeQuestionViewer 
        channelId={channelId}
        questionId={questionId}
      />
    </>
  );
}