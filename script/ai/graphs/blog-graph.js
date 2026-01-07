/**
 * LangGraph-based Blog Generation Pipeline
 * 
 * This graph orchestrates blog post generation with a focus on real-world use cases.
 * Topics without interesting real-world cases are skipped.
 * Now enhanced with Vector DB for finding related content and avoiding duplicates.
 * 
 * Flow:
 *   find_real_world_case → validate_source → [retry_case | validate_case] → [skip | generate_blog] → validate_citations → generate_images → validate → end
 */

import { StateGraph, END, START } from '@langchain/langgraph';
import { Annotation } from '@langchain/langgraph';
import ai from '../index.js';
import { generateBlogIllustrations, generateBlogIllustrationsWithAI } from '../utils/blog-illustration-generator.js';
import vectorDB from '../services/vector-db.js';

/**
 * Validate a URL by checking if it returns a valid response
 */
async function validateUrl(url, timeout = 5000) {
  if (!url) return false;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BlogBot/1.0)'
      }
    });
    
    clearTimeout(timeoutId);
    return response.ok || response.status === 403 || response.status === 405;
  } catch {
    // Try GET as fallback
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BlogBot/1.0)'
        }
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Define the state schema using Annotation
const BlogState = Annotation.Root({
  // Input question data
  questionId: Annotation({ reducer: (_, b) => b, default: () => '' }),
  question: Annotation({ reducer: (_, b) => b, default: () => '' }),
  answer: Annotation({ reducer: (_, b) => b, default: () => '' }),
  explanation: Annotation({ reducer: (_, b) => b, default: () => '' }),
  diagram: Annotation({ reducer: (_, b) => b, default: () => null }),
  channel: Annotation({ reducer: (_, b) => b, default: () => '' }),
  difficulty: Annotation({ reducer: (_, b) => b, default: () => 'intermediate' }),
  tags: Annotation({ reducer: (_, b) => b, default: () => [] }),
  companies: Annotation({ reducer: (_, b) => b, default: () => [] }),
  
  // Real-world case discovery
  realWorldCase: Annotation({ reducer: (_, b) => b, default: () => null }),
  caseScore: Annotation({ reducer: (_, b) => b, default: () => 0 }),
  caseReason: Annotation({ reducer: (_, b) => b, default: () => '' }),
  sourceValid: Annotation({ reducer: (_, b) => b, default: () => false }),
  
  // Case finding retry tracking
  caseAttempts: Annotation({ reducer: (_, b) => b, default: () => 0 }),
  maxCaseAttempts: Annotation({ reducer: (_, b) => b, default: () => 3 }),
  failedCompanies: Annotation({ reducer: (a, b) => [...a, ...b], default: () => [] }),
  
  // Blog content
  blogContent: Annotation({ reducer: (_, b) => b, default: () => null }),
  
  // Processing state
  retryCount: Annotation({ reducer: (_, b) => b, default: () => 0 }),
  maxRetries: Annotation({ reducer: (_, b) => b, default: () => 2 }),
  
  // Output
  status: Annotation({ reducer: (_, b) => b, default: () => 'pending' }),
  skipReason: Annotation({ reducer: (_, b) => b, default: () => null }),
  error: Annotation({ reducer: (_, b) => b, default: () => null })
});

/**
 * Node: Find real-world use case for the topic
 */
async function findRealWorldCaseNode(state) {
  const attempt = state.caseAttempts + 1;
  console.log(`\n🔍 [FIND_REAL_WORLD_CASE] Searching for compelling use case (attempt ${attempt}/${state.maxCaseAttempts})...`);
  
  if (state.failedCompanies.length > 0) {
    console.log(`   Excluding companies with invalid sources: ${state.failedCompanies.join(', ')}`);
  }
  
  try {
    const result = await ai.run('realWorldCase', {
      question: state.question,
      answer: state.answer,
      explanation: state.explanation,
      channel: state.channel,
      tags: state.tags,
      companies: state.companies,
      excludeCompanies: state.failedCompanies
    });
    
    console.log(`   Company: ${result.company || 'None found'}`);
    console.log(`   Score: ${result.interestScore || 0}/10`);
    console.log(`   Source: ${result.sourceUrl || 'N/A'}`);
    console.log(`   Reason: ${result.reason || 'N/A'}`);
    
    return {
      realWorldCase: result.company ? {
        company: result.company,
        scenario: result.scenario,
        challenge: result.challenge,
        solution: result.solution,
        outcome: result.outcome,
        lesson: result.lesson,
        sourceUrl: result.sourceUrl,
        sourceTitle: result.sourceTitle
      } : null,
      caseScore: result.interestScore || 0,
      caseReason: result.reason || '',
      caseAttempts: attempt
    };
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    return {
      realWorldCase: null,
      caseScore: 0,
      caseReason: `Error finding case: ${error.message}`,
      caseAttempts: attempt,
      error: error.message
    };
  }
}

/**
 * Node: Validate if the real-world case is interesting enough
 */
function validateCaseNode(state) {
  console.log('\n✅ [VALIDATE_CASE] Checking case quality...');
  
  const MIN_SCORE = 6; // Minimum score to proceed
  
  if (!state.realWorldCase || state.caseScore < MIN_SCORE) {
    console.log(`   ❌ Case not interesting enough (score: ${state.caseScore}/${MIN_SCORE} required)`);
    console.log(`   Reason: ${state.caseReason}`);
    return {
      status: 'skip',
      skipReason: state.caseReason || `Case score ${state.caseScore} below threshold ${MIN_SCORE}`
    };
  }
  
  console.log(`   ✅ Case approved (score: ${state.caseScore}/10)`);
  console.log(`   Company: ${state.realWorldCase.company}`);
  return { status: 'approved' };
}

/**
 * Node: Validate the source URL for the real-world case
 */
async function validateSourceNode(state) {
  console.log('\n🔗 [VALIDATE_SOURCE] Checking source URL...');
  
  if (!state.realWorldCase) {
    console.log('   ⚠️ No case to validate');
    return { sourceValid: false };
  }
  
  const sourceUrl = state.realWorldCase.sourceUrl;
  
  if (!sourceUrl) {
    console.log('   ❌ No source URL provided');
    return { 
      sourceValid: false,
      failedCompanies: [state.realWorldCase.company]
    };
  }
  
  console.log(`   Checking: ${sourceUrl}`);
  const isValid = await validateUrl(sourceUrl);
  
  if (isValid) {
    console.log(`   ✅ Source URL is valid`);
    return { sourceValid: true };
  } else {
    console.log(`   ❌ Source URL returned 404 or is unreachable`);
    return { 
      sourceValid: false,
      failedCompanies: [state.realWorldCase.company]
    };
  }
}

/**
 * Router: After source validation, decide to retry or proceed
 */
function routeAfterSourceValidation(state) {
  if (!state.sourceValid) {
    // Check if we can retry
    if (state.caseAttempts < state.maxCaseAttempts) {
      console.log(`\n🔀 [ROUTER] Source invalid, retrying case discovery...`);
      return 'find_real_world_case';
    } else {
      console.log(`\n🔀 [ROUTER] Max case attempts reached, skipping topic`);
      return 'skip_topic';
    }
  }
  return 'validate_case';
}

/**
 * Node: Skip topic due to no valid source
 */
function skipTopicNode(state) {
  console.log('\n⏭️ [SKIP_TOPIC] No valid source found after multiple attempts');
  return {
    status: 'skip',
    skipReason: `Could not find a real-world case with valid source URL after ${state.caseAttempts} attempts. Failed companies: ${state.failedCompanies.join(', ')}`
  };
}

/**
 * Node: Generate blog content with real-world case as the hook
 * Enhanced with Vector DB to find related questions for richer content
 */
async function generateBlogNode(state) {
  console.log('\n📝 [GENERATE_BLOG] Creating blog content...');
  
  // Find related questions using Vector DB for content enrichment
  let relatedQuestions = [];
  try {
    const searchQuery = `${state.question} ${state.tags?.join(' ') || ''}`;
    relatedQuestions = await vectorDB.findSimilar(searchQuery, {
      limit: 5,
      threshold: 0.1,
      channel: state.channel,
      excludeIds: [state.questionId]
    });
    console.log(`   Found ${relatedQuestions.length} related questions for enrichment`);
  } catch (error) {
    console.log(`   ⚠️ Vector DB search failed: ${error.message}`);
  }
  
  try {
    const result = await ai.run('blog', {
      question: state.question,
      answer: state.answer,
      explanation: state.explanation,
      channel: state.channel,
      difficulty: state.difficulty,
      tags: state.tags,
      realWorldCase: state.realWorldCase,
      relatedQuestions: relatedQuestions.map(q => ({
        question: q.question,
        channel: q.channel
      }))
    });
    
    console.log(`   Title: ${result.title}`);
    console.log(`   Sections: ${result.sections?.length || 0}`);
    console.log(`   Sources: ${result.sources?.length || 0}`);
    
    return {
      blogContent: {
        ...result,
        // Ensure real-world example uses our discovered case
        realWorldExample: state.realWorldCase ? {
          company: state.realWorldCase.company,
          scenario: state.realWorldCase.scenario,
          lesson: state.realWorldCase.lesson
        } : result.realWorldExample,
        // Include related questions for "See Also" section
        relatedQuestions: relatedQuestions.slice(0, 3).map(q => ({
          id: q.id,
          question: q.question,
          channel: q.channel
        }))
      }
    };
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    return { error: error.message, status: 'error' };
  }
}

/**
 * Node: Validate and enhance citations
 */
async function validateCitationsNode(state) {
  console.log('\n📚 [VALIDATE_CITATIONS] Checking sources...');
  
  if (!state.blogContent) {
    return { error: 'No blog content to validate' };
  }
  
  const sources = state.blogContent.sources || [];
  console.log(`   Found ${sources.length} sources`);
  
  // Count inline citations in content
  const content = JSON.stringify(state.blogContent.sections || []);
  const citationMatches = content.match(/\[\d+\]/g) || [];
  console.log(`   Inline citations: ${citationMatches.length}`);
  
  if (sources.length < 8) {
    console.log(`   ⚠️ Need more sources (have ${sources.length}, need 8+)`);
    // Could trigger regeneration here, but for now just log
  }
  
  return {}; // Pass through
}

/**
 * Node: Generate cartoon-style SVG images for the blog
 * Creates contextual illustrations based on blog content
 * Uses AI-powered scene selection when USE_AI_SCENES env var is set
 */
async function validateImagesNode(state) {
  console.log('\n🖼️ [GENERATE_IMAGES] Creating cartoon-style illustrations...');
  
  if (!state.blogContent) {
    return { error: 'No blog content to validate' };
  }
  
  let images = state.blogContent.images || [];
  console.log(`   Found ${images.length} images from AI`);
  
  // Filter to only keep local images (already generated SVGs)
  let validImages = images.filter(img => img?.url?.startsWith('/images/'));
  
  // Generate new cartoon-style SVG images
  console.log(`   🎨 Generating cartoon-style SVG illustrations...`);
  
  try {
    // Use AI-powered generation if enabled, otherwise use keyword-based
    const useAI = process.env.USE_AI_SCENES === 'true';
    let generatedImages;
    
    if (useAI) {
      console.log(`   🤖 AI-powered scene selection enabled`);
      generatedImages = await generateBlogIllustrationsWithAI(state.blogContent, state.questionId);
    } else {
      generatedImages = generateBlogIllustrations(state.blogContent, state.questionId);
    }
    
    validImages = [...validImages, ...generatedImages];
    console.log(`   ✅ Generated ${generatedImages.length} cartoon illustrations`);
  } catch (error) {
    console.log(`   ⚠️ SVG generation failed: ${error.message}`);
    // Fallback to basic generation
    try {
      const fallbackImages = generateBlogIllustrations(state.blogContent, state.questionId);
      validImages = [...validImages, ...fallbackImages];
    } catch (e) {
      console.log(`   ❌ Fallback also failed: ${e.message}`);
    }
  }
  
  return {
    blogContent: {
      ...state.blogContent,
      images: validImages
    }
  };
}

/**
 * Node: Final validation
 */
function finalValidateNode(state) {
  console.log('\n🎯 [FINAL_VALIDATE] Final checks...');
  
  if (state.status === 'skip') {
    console.log(`   Skipped: ${state.skipReason}`);
    return { status: 'skipped' };
  }
  
  if (state.error) {
    console.log(`   Error: ${state.error}`);
    return { status: 'error' };
  }
  
  if (!state.blogContent) {
    console.log(`   ❌ No blog content generated`);
    return { status: 'error', error: 'No blog content' };
  }
  
  const blog = state.blogContent;
  const issues = [];
  
  if (!blog.title) issues.push('Missing title');
  if (!blog.introduction) issues.push('Missing introduction');
  if (!blog.sections || blog.sections.length < 2) issues.push('Need more sections');
  if (!blog.conclusion) issues.push('Missing conclusion');
  if (!blog.sources || blog.sources.length < 5) issues.push('Need more sources');
  
  if (issues.length > 0) {
    console.log(`   ⚠️ Issues: ${issues.join(', ')}`);
    // Could retry here, but for now proceed with warnings
  }
  
  console.log(`   ✅ Blog validated`);
  return { status: 'completed' };
}

/**
 * Router: After case validation, decide to generate or skip
 */
function routeAfterCaseValidation(state) {
  if (state.status === 'skip') {
    console.log('\n🔀 [ROUTER] Skipping - no interesting case found');
    return 'final_validate';
  }
  return 'generate_blog';
}

/**
 * Build and compile the blog generation graph
 */
export function createBlogGraph() {
  const graph = new StateGraph(BlogState);
  
  // Add nodes
  graph.addNode('find_real_world_case', findRealWorldCaseNode);
  graph.addNode('validate_source', validateSourceNode);
  graph.addNode('skip_topic', skipTopicNode);
  graph.addNode('validate_case', validateCaseNode);
  graph.addNode('generate_blog', generateBlogNode);
  graph.addNode('validate_citations', validateCitationsNode);
  graph.addNode('validate_images', validateImagesNode);
  graph.addNode('final_validate', finalValidateNode);
  
  // Add edges
  graph.addEdge(START, 'find_real_world_case');
  graph.addEdge('find_real_world_case', 'validate_source');
  
  // Conditional routing after source validation - retry or proceed
  graph.addConditionalEdges('validate_source', routeAfterSourceValidation, {
    'find_real_world_case': 'find_real_world_case',
    'skip_topic': 'skip_topic',
    'validate_case': 'validate_case'
  });
  
  // Skip topic goes to final validate
  graph.addEdge('skip_topic', 'final_validate');
  
  // Conditional routing after case validation
  graph.addConditionalEdges('validate_case', routeAfterCaseValidation, {
    'generate_blog': 'generate_blog',
    'final_validate': 'final_validate'
  });
  
  // Blog generation flow
  graph.addEdge('generate_blog', 'validate_citations');
  graph.addEdge('validate_citations', 'validate_images');
  graph.addEdge('validate_images', 'final_validate');
  
  // End
  graph.addEdge('final_validate', END);
  
  return graph.compile();
}

/**
 * Run the blog generation pipeline on a question
 * @param {Object} question - The question to convert to blog
 * @returns {Object} Result with blog content or skip reason
 */
export async function generateBlogPost(question) {
  const graph = createBlogGraph();
  
  console.log('\n' + '═'.repeat(60));
  console.log('🚀 LANGGRAPH BLOG GENERATION PIPELINE');
  console.log('═'.repeat(60));
  console.log(`Question: ${question.question?.substring(0, 60)}...`);
  console.log(`Channel: ${question.channel}`);
  console.log(`Difficulty: ${question.difficulty}`);
  
  const initialState = {
    questionId: question.id,
    question: question.question,
    answer: question.answer,
    explanation: question.explanation,
    diagram: question.diagram,
    channel: question.channel,
    difficulty: question.difficulty,
    tags: question.tags || [],
    companies: question.companies || [],
    realWorldCase: null,
    caseScore: 0,
    caseReason: '',
    sourceValid: false,
    caseAttempts: 0,
    maxCaseAttempts: 3,
    failedCompanies: [],
    blogContent: null,
    retryCount: 0,
    maxRetries: 2,
    status: 'pending',
    skipReason: null,
    error: null
  };
  
  try {
    let finalResult = initialState;
    
    for await (const step of await graph.stream(initialState)) {
      const [nodeName, nodeState] = Object.entries(step)[0];
      finalResult = { ...finalResult, ...nodeState };
    }
    
    console.log('\n' + '═'.repeat(60));
    console.log('📋 PIPELINE RESULT');
    console.log('═'.repeat(60));
    console.log(`Status: ${finalResult.status}`);
    
    if (finalResult.status === 'skipped') {
      console.log(`Skip Reason: ${finalResult.skipReason}`);
      console.log('═'.repeat(60) + '\n');
      return {
        success: false,
        skipped: true,
        skipReason: finalResult.skipReason,
        caseScore: finalResult.caseScore
      };
    }
    
    if (finalResult.status === 'error') {
      console.log(`Error: ${finalResult.error}`);
      console.log('═'.repeat(60) + '\n');
      return {
        success: false,
        error: finalResult.error
      };
    }
    
    console.log(`Title: ${finalResult.blogContent?.title}`);
    console.log(`Real-World Case: ${finalResult.realWorldCase?.company || 'N/A'}`);
    console.log(`Case Score: ${finalResult.caseScore}/10`);
    console.log('═'.repeat(60) + '\n');
    
    return {
      success: true,
      blogContent: finalResult.blogContent,
      realWorldCase: finalResult.realWorldCase,
      caseScore: finalResult.caseScore
    };
    
  } catch (error) {
    console.error('Pipeline error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export default { createBlogGraph, generateBlogPost };
