#!/usr/bin/env node
/**
 * Test script to validate GitHub issue creation URLs
 * Run this to test the QuestionFeedback component's issue creation
 */

import 'dotenv/config';

// Simulate the QuestionFeedback component's URL generation
function generateGitHubIssueUrl(questionId, feedbackType) {
  const GITHUB_REPO = process.env.VITE_GITHUB_REPO || 'open-interview/open-interview';
  
  const title = `[${feedbackType.toUpperCase()}] Question: ${questionId}`;
  const body = `## Question Feedback

**Question ID:** \`${questionId}\`
**Feedback Type:** ${feedbackType}
**Page URL:** https://open-interview.github.io/

---

### Details
<!-- Please describe what needs to be ${feedbackType === 'improve' ? 'improved' : feedbackType === 'rewrite' ? 'rewritten' : 'removed'} -->



---
*This issue was created via the question feedback button.*
`;

  const labels = `bot:processor,feedback:${feedbackType}`;
  
  return `https://github.com/${GITHUB_REPO}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}&labels=${encodeURIComponent(labels)}`;
}

// Test all feedback types
const testCases = [
  { questionId: 'q-123', feedbackType: 'improve' },
  { questionId: 'q-456', feedbackType: 'rewrite' },
  { questionId: 'q-789', feedbackType: 'disable' }
];

console.log('🧪 Testing GitHub Issue Creation URLs\n');
console.log('Repository:', process.env.VITE_GITHUB_REPO || 'open-interview/open-interview');
console.log('');

for (const testCase of testCases) {
  const url = generateGitHubIssueUrl(testCase.questionId, testCase.feedbackType);
  
  console.log(`📝 ${testCase.feedbackType.toUpperCase()} - Question ${testCase.questionId}`);
  console.log(`   URL: ${url}`);
  console.log('');
}

console.log('✅ All URLs generated successfully!');
console.log('');
console.log('🔍 To test manually:');
console.log('1. Copy any URL above');
console.log('2. Paste in browser');
console.log('3. Verify the issue form is pre-filled correctly');
console.log('4. Check that labels are applied (bot:processor, feedback:*)');
console.log('');
console.log('⚠️  Note: Labels must exist in the repository first!');
console.log('   Run the "Setup Repository Labels" workflow if labels are missing.');