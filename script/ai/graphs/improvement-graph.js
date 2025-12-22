/**
 * LangGraph-based Adaptive Question Improvement Pipeline
 * 
 * This graph orchestrates the improvement of interview questions through
 * multiple specialized nodes with conditional routing based on detected issues.
 * 
 * Flow:
 *   analyze → route → [improve_answer | improve_explanation | add_diagram | add_eli5] → validate → (loop or end)
 */

import { StateGraph, END, START } from '@langchain/langgraph';
import { Annotation } from '@langchain/langgraph';
import ai from '../index.js';

// Define the state schema using Annotation
const QuestionState = Annotation.Root({
  // Input question data
  questionId: Annotation({ reducer: (_, b) => b, default: () => '' }),
  question: Annotation({ reducer: (_, b) => b, default: () => '' }),
  answer: Annotation({ reducer: (_, b) => b, default: () => '' }),
  explanation: Annotation({ reducer: (_, b) => b, default: () => '' }),
  diagram: Annotation({ reducer: (_, b) => b, default: () => null }),
  eli5: Annotation({ reducer: (_, b) => b, default: () => null }),
  tldr: Annotation({ reducer: (_, b) => b, default: () => null }),
  channel: Annotation({ reducer: (_, b) => b, default: () => '' }),
  difficulty: Annotation({ reducer: (_, b) => b, default: () => 'intermediate' }),
  tags: Annotation({ reducer: (_, b) => b, default: () => [] }),
  
  // Analysis results
  issues: Annotation({ reducer: (_, b) => b, default: () => [] }),
  relevanceScore: Annotation({ reducer: (_, b) => b, default: () => 0 }),
  originalScore: Annotation({ reducer: (_, b) => b, default: () => 0 }),
  relevanceDetails: Annotation({ reducer: (_, b) => b, default: () => null }),
  
  // Processing state
  currentIssue: Annotation({ reducer: (_, b) => b, default: () => null }),
  improvements: Annotation({ reducer: (a, b) => [...a, ...b], default: () => [] }),
  retryCount: Annotation({ reducer: (_, b) => b, default: () => 0 }),
  maxRetries: Annotation({ reducer: (_, b) => b, default: () => 3 }),
  
  // Output
  status: Annotation({ reducer: (_, b) => b, default: () => 'pending' }),
  error: Annotation({ reducer: (_, b) => b, default: () => null })
});

/**
 * Node: Analyze question and detect issues
 */
async function analyzeNode(state) {
  console.log('\n📊 [ANALYZE] Scoring question relevance...');
  
  try {
    const result = await ai.run('relevance', {
      question: state.question,
      answer: state.answer,
      explanation: state.explanation,
      channel: state.channel,
      difficulty: state.difficulty,
      tags: state.tags
    });
    
    // Detect issues based on relevance scoring
    const issues = [];
    
    // Check individual scores
    if (result.questionClarity < 6) issues.push('unclear_question');
    if (result.answerQuality < 6) issues.push('weak_answer');
    if (result.conceptDepth < 5) issues.push('shallow_explanation');
    
    // Check for short/high-level answers (need 150+ chars for interview-worthy answers)
    if (!state.answer || state.answer.length < 150) {
      issues.push('short_answer');
      console.log(`   ⚠️ Answer too short (${state.answer?.length || 0} chars, need 150+)`);
    }
    
    // Check for missing content
    if (!state.eli5 || state.eli5.length < 50) issues.push('missing_eli5');
    if (!state.tldr || state.tldr.length < 20) issues.push('missing_tldr');
    if (!state.diagram || state.diagram.length < 50) issues.push('missing_diagram');
    
    // Add issues from AI analysis
    if (result.improvements) {
      if (result.improvements.questionIssues?.length > 0) issues.push('question_issues');
      if (result.improvements.answerIssues?.length > 0) issues.push('answer_issues');
      if (result.improvements.missingTopics?.length > 0) issues.push('missing_topics');
    }
    
    // Calculate weighted score
    const score = Math.round(
      (result.interviewFrequency * 0.25 +
       result.practicalRelevance * 0.20 +
       result.conceptDepth * 0.15 +
       result.industryDemand * 0.15 +
       result.difficultyAppropriate * 0.10 +
       result.questionClarity * 0.10 +
       result.answerQuality * 0.05) * 10
    );
    
    console.log(`   Score: ${score}/100`);
    console.log(`   Issues found: ${issues.length > 0 ? issues.join(', ') : 'none'}`);
    console.log(`   Recommendation: ${result.recommendation}`);
    
    return {
      issues,
      relevanceScore: score,
      relevanceDetails: result,
      currentIssue: issues[0] || null
    };
  } catch (error) {
    console.log(`   ❌ Analysis failed: ${error.message}`);
    return {
      issues: ['analysis_failed'],
      error: error.message,
      status: 'error'
    };
  }
}

/**
 * Node: Improve answer quality
 */
async function improveAnswerNode(state) {
  console.log('\n✏️ [IMPROVE_ANSWER] Enhancing answer...');
  
  try {
    const result = await ai.run('improve', {
      question: state.question,
      answer: state.answer,
      explanation: state.explanation,
      channel: state.channel,
      issues: ['short_answer', 'weak_answer'],
      relevanceFeedback: state.relevanceDetails?.improvements
    });
    
    console.log(`   New answer: ${result.answer?.substring(0, 80)}...`);
    
    // Remove processed issues
    const remainingIssues = state.issues.filter(i => 
      !['weak_answer', 'answer_issues', 'short_answer'].includes(i)
    );
    
    return {
      answer: result.answer || state.answer,
      explanation: result.explanation || state.explanation,
      question: result.question || state.question,
      issues: remainingIssues,
      currentIssue: remainingIssues[0] || null,
      improvements: [{ type: 'answer', timestamp: new Date().toISOString() }]
    };
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    return { error: error.message };
  }
}

/**
 * Node: Improve explanation depth
 */
async function improveExplanationNode(state) {
  console.log('\n📝 [IMPROVE_EXPLANATION] Deepening explanation...');
  
  try {
    const result = await ai.run('improve', {
      question: state.question,
      answer: state.answer,
      explanation: state.explanation,
      channel: state.channel,
      issues: ['shallow_explanation', 'missing_topics'],
      relevanceFeedback: state.relevanceDetails?.improvements
    });
    
    console.log(`   Explanation length: ${state.explanation?.length || 0} → ${result.explanation?.length || 0}`);
    
    const remainingIssues = state.issues.filter(i => 
      !['shallow_explanation', 'missing_topics', 'question_issues'].includes(i)
    );
    
    return {
      explanation: result.explanation || state.explanation,
      issues: remainingIssues,
      currentIssue: remainingIssues[0] || null,
      improvements: [{ type: 'explanation', timestamp: new Date().toISOString() }]
    };
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    return { error: error.message };
  }
}

/**
 * Node: Add ELI5 explanation
 */
async function addEli5Node(state) {
  console.log('\n🧒 [ADD_ELI5] Creating simple explanation...');
  
  try {
    const result = await ai.run('eli5', {
      question: state.question,
      answer: state.answer
    });
    
    console.log(`   ELI5: ${result.eli5?.substring(0, 80)}...`);
    
    const remainingIssues = state.issues.filter(i => i !== 'missing_eli5');
    
    return {
      eli5: result.eli5,
      issues: remainingIssues,
      currentIssue: remainingIssues[0] || null,
      improvements: [{ type: 'eli5', timestamp: new Date().toISOString() }]
    };
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    return { error: error.message };
  }
}

/**
 * Node: Add TLDR summary
 */
async function addTldrNode(state) {
  console.log('\n⚡ [ADD_TLDR] Creating summary...');
  
  try {
    const result = await ai.run('tldr', {
      question: state.question,
      answer: state.answer
    });
    
    console.log(`   TLDR: ${result.tldr}`);
    
    const remainingIssues = state.issues.filter(i => i !== 'missing_tldr');
    
    return {
      tldr: result.tldr,
      issues: remainingIssues,
      currentIssue: remainingIssues[0] || null,
      improvements: [{ type: 'tldr', timestamp: new Date().toISOString() }]
    };
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    return { error: error.message };
  }
}

/**
 * Node: Add diagram
 */
async function addDiagramNode(state) {
  console.log('\n📊 [ADD_DIAGRAM] Creating visualization...');
  
  try {
    const result = await ai.run('diagram', {
      question: state.question,
      answer: state.answer
    });
    
    console.log(`   Diagram: ${result.diagram?.substring(0, 80)}...`);
    
    const remainingIssues = state.issues.filter(i => i !== 'missing_diagram');
    
    return {
      diagram: result.diagram,
      issues: remainingIssues,
      currentIssue: remainingIssues[0] || null,
      improvements: [{ type: 'diagram', timestamp: new Date().toISOString() }]
    };
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    return { error: error.message };
  }
}

/**
 * Node: Validate improvements
 */
async function validateNode(state) {
  console.log('\n✅ [VALIDATE] Checking improvement quality...');
  
  // If no more issues, we're done
  if (state.issues.length === 0) {
    console.log('   All issues resolved!');
    return { status: 'completed' };
  }
  
  // Check retry count
  if (state.retryCount >= state.maxRetries) {
    console.log(`   Max retries (${state.maxRetries}) reached, stopping`);
    return { status: 'max_retries' };
  }
  
  console.log(`   Remaining issues: ${state.issues.join(', ')}`);
  console.log(`   Retry count: ${state.retryCount + 1}/${state.maxRetries}`);
  
  return {
    retryCount: state.retryCount + 1,
    status: 'continuing'
  };
}

/**
 * Router: Decide which improvement node to run next
 */
function routeToImprovement(state) {
  const issue = state.currentIssue;
  
  if (!issue) {
    return 'validate';
  }
  
  console.log(`\n🔀 [ROUTER] Routing for issue: ${issue}`);
  
  // Map issues to nodes
  const routeMap = {
    'weak_answer': 'improve_answer',
    'answer_issues': 'improve_answer',
    'short_answer': 'improve_answer',
    'shallow_explanation': 'improve_explanation',
    'missing_topics': 'improve_explanation',
    'question_issues': 'improve_explanation',
    'unclear_question': 'improve_explanation',
    'missing_eli5': 'add_eli5',
    'missing_tldr': 'add_tldr',
    'missing_diagram': 'add_diagram'
  };
  
  return routeMap[issue] || 'validate';
}

/**
 * Router: After validation, decide to continue or end
 */
function routeAfterValidation(state) {
  if (state.status === 'completed' || state.status === 'max_retries' || state.status === 'error') {
    return END;
  }
  
  // Continue processing remaining issues
  if (state.issues.length > 0) {
    return 'route';
  }
  
  return END;
}

/**
 * Dummy route node for conditional edge source
 */
function routeNode(state) {
  return { currentIssue: state.issues[0] || null };
}

/**
 * Build and compile the improvement graph
 */
export function createImprovementGraph() {
  const graph = new StateGraph(QuestionState);
  
  // Add nodes
  graph.addNode('analyze', analyzeNode);
  graph.addNode('route', routeNode);
  graph.addNode('improve_answer', improveAnswerNode);
  graph.addNode('improve_explanation', improveExplanationNode);
  graph.addNode('add_eli5', addEli5Node);
  graph.addNode('add_tldr', addTldrNode);
  graph.addNode('add_diagram', addDiagramNode);
  graph.addNode('validate', validateNode);
  
  // Add edges
  graph.addEdge(START, 'analyze');
  graph.addEdge('analyze', 'route');
  
  // Conditional routing based on current issue
  graph.addConditionalEdges('route', routeToImprovement, {
    'improve_answer': 'improve_answer',
    'improve_explanation': 'improve_explanation',
    'add_eli5': 'add_eli5',
    'add_tldr': 'add_tldr',
    'add_diagram': 'add_diagram',
    'validate': 'validate'
  });
  
  // All improvement nodes go to validate
  graph.addEdge('improve_answer', 'validate');
  graph.addEdge('improve_explanation', 'validate');
  graph.addEdge('add_eli5', 'validate');
  graph.addEdge('add_tldr', 'validate');
  graph.addEdge('add_diagram', 'validate');
  
  // After validation, either continue or end
  graph.addConditionalEdges('validate', routeAfterValidation, {
    'route': 'route',
    [END]: END
  });
  
  return graph.compile();
}

/**
 * Run the improvement pipeline on a question
 * @param {Object} question - The question to improve
 * @param {Object} options - Options for the pipeline
 * @param {Function} options.onImprovement - Callback called after each improvement step with updated question data
 */
export async function improveQuestion(question, options = {}) {
  const { onImprovement } = options;
  const graph = createImprovementGraph();
  
  // Store the original score for before/after comparison
  const originalScore = question.relevanceScore || 0;
  
  console.log('\n' + '═'.repeat(60));
  console.log('🚀 LANGGRAPH IMPROVEMENT PIPELINE');
  console.log('═'.repeat(60));
  console.log(`Question: ${question.question?.substring(0, 60)}...`);
  console.log(`Channel: ${question.channel}`);
  console.log(`📊 BEFORE Score: ${originalScore}/100`);
  
  const initialState = {
    questionId: question.id,
    question: question.question,
    answer: question.answer,
    explanation: question.explanation,
    diagram: question.diagram,
    eli5: question.eli5,
    tldr: question.tldr,
    channel: question.channel,
    difficulty: question.difficulty,
    tags: question.tags || [],
    issues: [],
    relevanceScore: originalScore,
    originalScore: originalScore,
    relevanceDetails: null,
    currentIssue: null,
    improvements: [],
    retryCount: 0,
    maxRetries: 3,
    status: 'pending',
    error: null,
    // Pass callback through state for node access
    _onImprovement: onImprovement,
    _originalQuestion: question
  };
  
  try {
    // Use stream to process step by step and save after each improvement
    let finalResult = initialState;
    let lastImprovementCount = 0;
    
    for await (const step of await graph.stream(initialState)) {
      // Get the node name and state from the step
      const [nodeName, nodeState] = Object.entries(step)[0];
      finalResult = { ...finalResult, ...nodeState };
      
      // Check if an improvement was made (improvements array grew)
      const currentImprovementCount = finalResult.improvements?.length || 0;
      if (currentImprovementCount > lastImprovementCount && onImprovement) {
        const latestImprovement = finalResult.improvements[currentImprovementCount - 1];
        console.log(`\n💾 [SAVE] Saving after ${latestImprovement.type} improvement...`);
        
        // Build updated question with current state
        const updatedQuestion = {
          ...question,
          question: finalResult.question,
          answer: finalResult.answer,
          explanation: finalResult.explanation,
          diagram: finalResult.diagram,
          eli5: finalResult.eli5,
          tldr: finalResult.tldr,
          lastUpdated: new Date().toISOString()
        };
        
        // Call the save callback
        try {
          await onImprovement(updatedQuestion, {
            improvementType: latestImprovement.type,
            currentScore: finalResult.relevanceScore,
            improvementsMade: currentImprovementCount
          });
          console.log(`   ✅ Saved ${latestImprovement.type} improvement`);
        } catch (saveError) {
          console.log(`   ⚠️ Save failed: ${saveError.message}`);
        }
        
        lastImprovementCount = currentImprovementCount;
      }
    }
    
    // Calculate score change
    const scoreChange = finalResult.relevanceScore - originalScore;
    const scoreChangeStr = scoreChange >= 0 ? `+${scoreChange}` : `${scoreChange}`;
    
    console.log('\n' + '═'.repeat(60));
    console.log('📋 PIPELINE RESULT');
    console.log('═'.repeat(60));
    console.log(`Status: ${finalResult.status}`);
    console.log(`📊 BEFORE Score: ${originalScore}/100`);
    console.log(`📊 AFTER Score:  ${finalResult.relevanceScore}/100`);
    console.log(`📈 Change:       ${scoreChangeStr} points`);
    console.log(`Improvements Made: ${finalResult.improvements.length}`);
    finalResult.improvements.forEach(imp => {
      console.log(`   - ${imp.type} at ${imp.timestamp}`);
    });
    console.log('═'.repeat(60) + '\n');
    
    return {
      success: finalResult.status === 'completed' || finalResult.status === 'max_retries',
      status: finalResult.status,
      score: finalResult.relevanceScore,
      originalScore: originalScore,
      scoreChange: scoreChange,
      improvements: finalResult.improvements,
      updatedQuestion: {
        ...question,
        question: finalResult.question,
        answer: finalResult.answer,
        explanation: finalResult.explanation,
        diagram: finalResult.diagram,
        eli5: finalResult.eli5,
        tldr: finalResult.tldr
      }
    };
  } catch (error) {
    console.error('Pipeline error:', error);
    return {
      success: false,
      status: 'error',
      error: error.message,
      originalScore: originalScore
    };
  }
}

export default { createImprovementGraph, improveQuestion };
