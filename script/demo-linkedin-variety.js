#!/usr/bin/env node
/**
 * Demo: LinkedIn Post Variety
 * Shows how different posts use different hooks with AI generation
 */

import { generateLinkedInPost } from './ai/graphs/linkedin-graph.js';

// Skip image generation for faster demo
process.env.SKIP_IMAGE = 'true';

const demoPost = {
  title: 'Understanding Database Indexing Strategies',
  url: 'https://open-interview.github.io/',
  excerpt: 'Learn how database indexes work and when to use B-tree, hash, or bitmap indexes for optimal query performance.',
  channel: 'database',
  tags: '#database #performance #sql'
};

console.log('🎭 LinkedIn Post Variety Demo\n');
console.log('Generating 5 posts with the SAME content using AI to show variety:\n');
console.log('═'.repeat(70));

async function demo() {
  for (let i = 1; i <= 5; i++) {
    console.log(`\n📝 Post ${i}/5`);
    console.log('─'.repeat(70));
    
    const result = await generateLinkedInPost(demoPost);
    
    if (result.success) {
      const content = result.content;
      const storyPart = content.split('─────')[0].trim();
      const hook = storyPart.split('\n\n')[0];
      
      console.log(`\nHook: "${hook}"\n`);
      console.log(storyPart);
      console.log(`\n(${content.length} chars total)`);
    }
    
    console.log('─'.repeat(70));
  }
  
  console.log('\n' + '═'.repeat(70));
  console.log('✨ Notice how each post uses a different hook and structure!');
  console.log('═'.repeat(70));
}

demo().catch(console.error);
