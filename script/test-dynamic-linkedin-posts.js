#!/usr/bin/env node
/**
 * Test Dynamic LinkedIn Post Generation
 * Verifies that posts use varied hooks and include technical details
 */

import { generateLinkedInPost } from './ai/graphs/linkedin-graph.js';

// Test posts with different topics - using the main site URL which exists
const testPosts = [
  {
    title: 'Understanding Kubernetes Pod Scheduling and Resource Management',
    url: 'https://open-interview.github.io/',
    excerpt: 'Learn how Kubernetes scheduler makes decisions about pod placement and why resource requests and limits are critical for cluster stability.',
    channel: 'kubernetes',
    tags: '#kubernetes #devops #cloudnative'
  },
  {
    title: 'Database Sharding Strategies for High-Scale Applications',
    url: 'https://open-interview.github.io/',
    excerpt: 'Explore different approaches to database sharding including hash-based, range-based, and geographic sharding patterns.',
    channel: 'database',
    tags: '#database #systemdesign #scalability'
  },
  {
    title: 'Building Resilient Microservices with Circuit Breakers',
    url: 'https://open-interview.github.io/',
    excerpt: 'Circuit breakers prevent cascading failures in distributed systems by detecting failures and preventing requests to unhealthy services.',
    channel: 'system-design',
    tags: '#microservices #resilience #systemdesign'
  },
  {
    title: 'React Server Components: A Deep Dive into the New Paradigm',
    url: 'https://open-interview.github.io/',
    excerpt: 'React Server Components fundamentally change how we think about data fetching and rendering in React applications.',
    channel: 'frontend',
    tags: '#react #frontend #webdev'
  },
  {
    title: 'Implementing Idempotency in Distributed Systems',
    url: 'https://open-interview.github.io/',
    excerpt: 'Idempotency ensures operations can be safely retried without unintended side effects, critical for reliable distributed systems.',
    channel: 'system-design',
    tags: '#distributedsystems #api #reliability'
  }
];

async function testPostGeneration() {
  console.log('🧪 Testing Dynamic LinkedIn Post Generation\n');
  console.log('═'.repeat(70));
  console.log('Testing varied hooks and educational content with AI');
  console.log('═'.repeat(70));
  
  const results = [];
  
  for (let i = 0; i < testPosts.length; i++) {
    const post = testPosts[i];
    console.log(`\n📝 Test ${i + 1}/${testPosts.length}: ${post.title.substring(0, 50)}...`);
    console.log('─'.repeat(70));
    
    try {
      const result = await generateLinkedInPost(post);
      
      if (result.success) {
        const content = result.content;
        const storyPart = content.split('─────')[0].trim();
        
        // Extract the hook (first line/paragraph)
        const hook = storyPart.split('\n\n')[0];
        
        console.log('\n✅ Generated successfully');
        console.log(`\nHook: "${hook}"`);
        console.log(`\nFull Story:\n${storyPart}`);
        console.log(`\nLength: ${content.length} chars`);
        
        // Analyze the hook pattern
        const hookPatterns = {
          question: /^(why|what|how|when|where|who)/i,
          statistic: /\d+%|\d+ (percent|out of)/i,
          contrarian: /(everyone|most|popular|conventional|wrong|incomplete)/i,
          story: /(last|yesterday|recently|when|after)/i,
          problem: /(issue|problem|challenge|error|bug)/i,
          insight: /(learned|realized|discovered|noticed|pattern)/i,
          trend: /(2025|2024|new|changing|evolved|different)/i,
          mistake: /(spent|debugging|fix|simple|embarrassing)/i
        };
        
        let detectedPattern = 'unknown';
        for (const [pattern, regex] of Object.entries(hookPatterns)) {
          if (regex.test(hook)) {
            detectedPattern = pattern;
            break;
          }
        }
        
        console.log(`Hook Pattern: ${detectedPattern}`);
        
        // Check for technical depth
        const hasTechnicalTerms = /kubernetes|pod|sharding|circuit breaker|idempotency|server component|distributed|microservice/i.test(storyPart);
        const hasExplanation = storyPart.length > 400; // Reasonable length for context
        const hasBulletPoints = (storyPart.match(/[🔍⚡🎯🛡️💡🚀✅❌📈]/g) || []).length >= 4;
        
        console.log(`\nQuality Checks:`);
        console.log(`  ✓ Technical terms: ${hasTechnicalTerms ? '✅' : '❌'}`);
        console.log(`  ✓ Sufficient explanation: ${hasExplanation ? '✅' : '❌'}`);
        console.log(`  ✓ Structured insights: ${hasBulletPoints ? '✅' : '❌'}`);
        
        results.push({
          title: post.title,
          success: true,
          hook,
          hookPattern: detectedPattern,
          length: content.length,
          hasTechnicalTerms,
          hasExplanation,
          hasBulletPoints
        });
      } else {
        console.log(`\n❌ Failed: ${result.error}`);
        results.push({
          title: post.title,
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.log(`\n❌ Error: ${error.message}`);
      results.push({
        title: post.title,
        success: false,
        error: error.message
      });
    }
    
    console.log('─'.repeat(70));
  }
  
  // Summary
  console.log('\n' + '═'.repeat(70));
  console.log('📊 SUMMARY');
  console.log('═'.repeat(70));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`\nTotal: ${results.length}`);
  console.log(`Successful: ${successful.length}`);
  console.log(`Failed: ${failed.length}`);
  
  if (successful.length > 0) {
    console.log('\n🎯 Hook Pattern Distribution:');
    const patternCounts = {};
    successful.forEach(r => {
      patternCounts[r.hookPattern] = (patternCounts[r.hookPattern] || 0) + 1;
    });
    Object.entries(patternCounts).forEach(([pattern, count]) => {
      console.log(`  ${pattern}: ${count}`);
    });
    
    console.log('\n📏 Quality Metrics:');
    const withTechnicalTerms = successful.filter(r => r.hasTechnicalTerms).length;
    const withExplanation = successful.filter(r => r.hasExplanation).length;
    const withBulletPoints = successful.filter(r => r.hasBulletPoints).length;
    
    console.log(`  Technical depth: ${withTechnicalTerms}/${successful.length}`);
    console.log(`  Sufficient context: ${withExplanation}/${successful.length}`);
    console.log(`  Structured insights: ${withBulletPoints}/${successful.length}`);
    
    const avgLength = successful.reduce((sum, r) => sum + r.length, 0) / successful.length;
    console.log(`  Average length: ${Math.round(avgLength)} chars`);
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Failed Posts:');
    failed.forEach(r => {
      console.log(`  - ${r.title.substring(0, 50)}...`);
      console.log(`    Error: ${r.error}`);
    });
  }
  
  console.log('\n' + '═'.repeat(70));
  console.log(successful.length === results.length ? '✅ All tests passed!' : '⚠️ Some tests failed');
  console.log('═'.repeat(70));
}

testPostGeneration().catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
