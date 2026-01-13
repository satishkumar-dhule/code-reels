#!/usr/bin/env node
/**
 * Test Blog Quality Gates
 * 
 * Tests the quality validation system with sample blog content
 */

import { validateBlogQuality, getQualityThresholds } from './ai/services/blog-quality-gates.js';

// Sample blog content for testing
const goodBlogContent = {
  title: "How Netflix Scaled Their Microservices Architecture",
  introduction: "In 2015, Netflix faced a critical challenge [1]. Their monolithic architecture was struggling to handle 75 million subscribers across 190 countries. The engineering team knew they needed to make a change, but the stakes were high - any downtime would cost millions in revenue and customer trust.",
  sections: [
    {
      heading: "The Breaking Point",
      content: "Netflix's monolithic application had served them well for years. However, as their user base exploded, cracks began to show [2]. Deploy times stretched to hours, and a single bug could bring down the entire platform. The team realized they needed a fundamental shift in their architecture. This realization came after a particularly painful incident where a small code change caused a 3-hour outage affecting millions of users [3]."
    },
    {
      heading: "The Microservices Journey",
      content: "The transition wasn't easy. Netflix decided to break their monolith into hundreds of microservices [4]. Each service would own a specific business capability - user profiles, recommendations, video streaming, billing. This approach offered several advantages: teams could deploy independently, scale services based on demand, and use the best technology for each job. However, it also introduced new challenges around service discovery, communication, and monitoring [5]."
    },
    {
      heading: "Building the Infrastructure",
      content: "To support their microservices architecture, Netflix built several key tools [6]. Eureka handled service discovery, allowing services to find each other dynamically. Hystrix provided circuit breakers to prevent cascading failures. Ribbon enabled client-side load balancing. These tools became so valuable that Netflix open-sourced them, and they're now used by thousands of companies worldwide [7]. The infrastructure investment paid off - Netflix could now deploy code hundreds of times per day with minimal risk."
    },
    {
      heading: "Lessons Learned",
      content: "The migration taught Netflix several valuable lessons [8]. First, you don't need to migrate everything at once - they took a gradual approach, moving one service at a time. Second, observability is critical - you need excellent monitoring and tracing to debug distributed systems. Third, embrace failure - Netflix's famous Chaos Monkey randomly kills services in production to ensure resilience. These practices have become industry standards for building scalable systems [9]."
    }
  ],
  conclusion: "Netflix's journey from monolith to microservices demonstrates that architectural evolution is possible, even at massive scale. The key is to move gradually, invest in tooling, and learn from failures. Today, Netflix serves over 200 million subscribers with an architecture that can scale to meet any demand. If you're considering microservices for your own system, start small, measure everything, and remember that the goal isn't microservices themselves - it's building a system that can evolve with your business needs.",
  realWorldExample: {
    company: "Netflix",
    scenario: "Netflix migrated from a monolithic architecture to hundreds of microservices to handle their explosive growth from 75 million to 200+ million subscribers. The transition took several years and required building custom infrastructure tools.",
    lesson: "Architectural evolution requires patience, excellent tooling, and a culture that embraces failure as a learning opportunity."
  },
  diagram: "graph TD\n    A[API Gateway] --> B[User Service]\n    A --> C[Video Service]\n    A --> D[Recommendation Service]\n    B --> E[User DB]\n    C --> F[Video DB]\n    D --> G[ML Models]",
  diagramType: "flowchart",
  diagramLabel: "Netflix Microservices Architecture",
  glossary: [
    { term: "Microservices", definition: "An architectural style where an application is built as a collection of small, independent services" },
    { term: "Circuit Breaker", definition: "A design pattern that prevents cascading failures by stopping requests to failing services" },
    { term: "Service Discovery", definition: "The process of automatically detecting services in a network" }
  ],
  sources: [
    { title: "Netflix Tech Blog: Microservices", url: "https://en.wikipedia.org/wiki/Microservices", type: "documentation" },
    { title: "Scaling Netflix", url: "https://en.wikipedia.org/wiki/Netflix", type: "article" },
    { title: "Netflix Architecture", url: "https://github.com/Netflix", type: "documentation" },
    { title: "Microservices at Netflix", url: "https://en.wikipedia.org/wiki/Service-oriented_architecture", type: "article" },
    { title: "Hystrix Documentation", url: "https://github.com/Netflix/Hystrix", type: "documentation" },
    { title: "Eureka Service Discovery", url: "https://github.com/Netflix/eureka", type: "documentation" },
    { title: "Netflix OSS", url: "https://netflix.github.io/", type: "documentation" },
    { title: "Chaos Engineering", url: "https://en.wikipedia.org/wiki/Chaos_engineering", type: "article" },
    { title: "Distributed Systems", url: "https://en.wikipedia.org/wiki/Distributed_computing", type: "article" }
  ],
  quickReference: [
    "Start with a monolith, migrate to microservices gradually",
    "Invest heavily in observability and monitoring",
    "Use circuit breakers to prevent cascading failures",
    "Embrace chaos engineering to build resilience"
  ],
  funFact: "Netflix's Chaos Monkey randomly terminates production instances to ensure their systems can handle failures gracefully.",
  metaDescription: "Learn how Netflix migrated from a monolithic architecture to microservices, handling 200+ million subscribers with lessons for scaling any system.",
  tags: ["microservices", "architecture", "scalability", "netflix"],
  images: []
};

const poorBlogContent = {
  title: "Microservices",
  introduction: "Microservices are good.",
  sections: [
    {
      heading: "What are they",
      content: "They are small services. I think they are useful. My team uses them."
    },
    {
      heading: "Benefits",
      content: "Scalability. Independence. Flexibility."
    }
  ],
  conclusion: "Use microservices.",
  realWorldExample: null,
  diagram: null,
  glossary: [],
  sources: [
    { title: "Some article", url: "https://example.com/fake", type: "blog" }
  ],
  quickReference: [],
  funFact: null,
  metaDescription: "Microservices article",
  tags: ["microservices"]
};

async function testQualityGates() {
  console.log('=== 🧪 Testing Blog Quality Gates ===\n');
  
  // Show thresholds
  const thresholds = getQualityThresholds();
  console.log('📊 Quality Thresholds:');
  console.log(`   Min sections: ${thresholds.minSections}`);
  console.log(`   Min sources: ${thresholds.minSources}`);
  console.log(`   Min inline citations: ${thresholds.minInlineCitations}`);
  console.log(`   Min overall score: ${thresholds.minOverallScore}/100`);
  console.log('');
  
  // Test good content
  console.log('✅ Testing GOOD blog content...');
  console.log('─'.repeat(60));
  const goodResults = await validateBlogQuality(goodBlogContent, {
    question: "How do you scale a microservices architecture?",
    channel: "system-design",
    tags: ["microservices", "scalability"]
  });
  
  console.log('\n📈 Results Summary:');
  console.log(`   Passed: ${goodResults.passed ? '✅ YES' : '❌ NO'}`);
  console.log(`   Overall Score: ${goodResults.overallScore.toFixed(1)}/100`);
  console.log(`   Issues: ${goodResults.issues.length}`);
  console.log(`   Warnings: ${goodResults.warnings.length}`);
  
  // Test poor content
  console.log('\n\n❌ Testing POOR blog content...');
  console.log('─'.repeat(60));
  const poorResults = await validateBlogQuality(poorBlogContent, {
    question: "What are microservices?",
    channel: "system-design",
    tags: ["microservices"]
  });
  
  console.log('\n📈 Results Summary:');
  console.log(`   Passed: ${poorResults.passed ? '✅ YES' : '❌ NO'}`);
  console.log(`   Overall Score: ${poorResults.overallScore.toFixed(1)}/100`);
  console.log(`   Issues: ${poorResults.issues.length}`);
  console.log(`   Warnings: ${poorResults.warnings.length}`);
  
  // Comparison
  console.log('\n\n📊 Comparison:');
  console.log('─'.repeat(60));
  console.log('Metric                    | Good Content | Poor Content');
  console.log('─'.repeat(60));
  console.log(`Overall Score             | ${goodResults.overallScore.toFixed(1).padEnd(12)} | ${poorResults.overallScore.toFixed(1)}`);
  console.log(`Structure Score           | ${goodResults.structure.score.toFixed(1).padEnd(12)} | ${poorResults.structure.score.toFixed(1)}`);
  console.log(`Readability Score         | ${goodResults.readability.score.toFixed(1).padEnd(12)} | ${poorResults.readability.score.toFixed(1)}`);
  console.log(`Coherence Score           | ${goodResults.coherence.score.toFixed(1).padEnd(12)} | ${poorResults.coherence.score.toFixed(1)}`);
  console.log(`Technical Score           | ${goodResults.technical.score.toFixed(1).padEnd(12)} | ${poorResults.technical.score.toFixed(1)}`);
  console.log(`Valid Sources             | ${goodResults.sources.valid.toString().padEnd(12)} | ${poorResults.sources.valid}`);
  console.log(`Inline Citations          | ${goodResults.citations.inline.toString().padEnd(12)} | ${poorResults.citations.inline}`);
  console.log(`First-Person Violations   | ${goodResults.readability.firstPersonViolations.toString().padEnd(12)} | ${poorResults.readability.firstPersonViolations}`);
  console.log(`Transition Words          | ${goodResults.coherence.transitionCount.toString().padEnd(12)} | ${poorResults.coherence.transitionCount}`);
  
  console.log('\n✅ Quality gates test complete!\n');
}

testQualityGates().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
