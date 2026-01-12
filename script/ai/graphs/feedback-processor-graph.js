/**
 * LangGraph-based Feedback Processor Pipeline
 * 
 * Processes user feedback from GitHub Issues:
 * - Fetches open issues with bot:processor label
 * - Parses question ID and feedback type
 * - Executes appropriate action (improve/rewrite/delete)
 * - Comments on issue with results
 * - Closes issue when complete
 * 
 * PRIORITIZATION:
 * - Issues for channels with fewer questions are processed first
 * - Certifications and tests get higher priority
 * - Issues for channels with 0 questions get highest priority
 * 
 * CIRCULAR LOOP PREVENTION:
 * - Tracks processed issues in database to avoid reprocessing
 * - Uses bot:in-progress label during processing
 * - Marks completed issues with bot:completed label
 * - Skips issues that were processed within last 24 hours
 * 
 * Flow:
 *   fetch_issues → prioritize_issues → parse_feedback → check_processed → fetch_question → execute_action → update_question → close_issue → end
 */

import { StateGraph, END, START } from '@langchain/langgraph';
import { Annotation } from '@langchain/langgraph';
import ai from '../index.js';
import { dbClient, saveQuestion, getChannelQuestionCounts } from '../../utils.js';
import { certificationDomains } from '../prompts/templates/certification-question.js';

// GitHub configuration
const GITHUB_REPO = process.env.GITHUB_REPO || 'open-interview/open-interview.github.io';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// Processing history table for circular loop prevention
const PROCESSING_HISTORY_TABLE = `
  CREATE TABLE IF NOT EXISTS feedback_processing_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    issue_number INTEGER NOT NULL,
    question_id TEXT NOT NULL,
    feedback_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'processing',
    processed_at TEXT NOT NULL,
    completed_at TEXT,
    result TEXT,
    error TEXT,
    UNIQUE(issue_number)
  )
`;

// Define the state schema
const FeedbackState = Annotation.Root({
  // Input
  maxIssues: Annotation({ reducer: (_, b) => b, default: () => 10 }),
  singleIssue: Annotation({ reducer: (_, b) => b, default: () => null }),
  externalIssues: Annotation({ reducer: (_, b) => b, default: () => null }),
  
  // Current issue being processed
  currentIssue: Annotation({ reducer: (_, b) => b, default: () => null }),
  questionId: Annotation({ reducer: (_, b) => b, default: () => null }),
  feedbackType: Annotation({ reducer: (_, b) => b, default: () => null }),
  userComment: Annotation({ reducer: (_, b) => b, default: () => null }),
  
  // Question data
  question: Annotation({ reducer: (_, b) => b, default: () => null }),
  updatedQuestion: Annotation({ reducer: (_, b) => b, default: () => null }),
  
  // Processing state
  issues: Annotation({ reducer: (_, b) => b, default: () => [] }),
  processedCount: Annotation({ reducer: (_, b) => b, default: () => 0 }),
  alreadyProcessed: Annotation({ reducer: (_, b) => b, default: () => false }),
  
  // Results
  results: Annotation({ reducer: (a, b) => [...a, ...b], default: () => [] }),
  error: Annotation({ reducer: (_, b) => b, default: () => null })
});

/**
 * Initialize processing history table
 */
async function initProcessingHistory() {
  try {
    await dbClient.execute(PROCESSING_HISTORY_TABLE);
  } catch (e) {
    console.log('   Note: Processing history table may already exist');
  }
}

/**
 * Check if issue was recently processed (within 24 hours)
 */
async function wasRecentlyProcessed(issueNumber) {
  try {
    const result = await dbClient.execute({
      sql: `SELECT * FROM feedback_processing_history 
            WHERE issue_number = ? 
            AND status = 'completed'
            AND datetime(completed_at) > datetime('now', '-24 hours')`,
      args: [issueNumber]
    });
    return result.rows.length > 0;
  } catch (e) {
    return false;
  }
}

/**
 * Record processing start
 */
async function recordProcessingStart(issueNumber, questionId, feedbackType) {
  try {
    await dbClient.execute({
      sql: `INSERT OR REPLACE INTO feedback_processing_history 
            (issue_number, question_id, feedback_type, status, processed_at)
            VALUES (?, ?, ?, 'processing', ?)`,
      args: [issueNumber, questionId, feedbackType, new Date().toISOString()]
    });
  } catch (e) {
    console.log(`   Warning: Could not record processing start: ${e.message}`);
  }
}

/**
 * Record processing completion
 */
async function recordProcessingComplete(issueNumber, success, result = null, error = null) {
  try {
    await dbClient.execute({
      sql: `UPDATE feedback_processing_history 
            SET status = ?, completed_at = ?, result = ?, error = ?
            WHERE issue_number = ?`,
      args: [
        success ? 'completed' : 'failed',
        new Date().toISOString(),
        result ? JSON.stringify(result) : null,
        error,
        issueNumber
      ]
    });
  } catch (e) {
    console.log(`   Warning: Could not record processing completion: ${e.message}`);
  }
}

/**
 * GitHub API helper
 */
async function githubApi(endpoint, options = {}) {
  if (!GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN not set');
  }
  
  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `https://api.github.com/repos/${GITHUB_REPO}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }
  
  return options.method === 'PATCH' || options.method === 'DELETE' 
    ? null 
    : response.json();
}

/**
 * Node: Fetch open issues with bot:processor label
 */
async function fetchIssuesNode(state) {
  console.log('\n📥 [FETCH_ISSUES] Getting feedback issues...');
  
  // Initialize processing history table
  await initProcessingHistory();
  
  // Handle external issues (from cross-repo sync)
  if (state.externalIssues) {
    console.log(`   Processing ${state.externalIssues.length} external issues`);
    
    // Convert external issues to the expected format
    const formattedIssues = state.externalIssues.map(issue => ({
      number: issue.number,
      title: issue.title,
      body: issue.body,
      html_url: issue.url,
      labels: [
        { name: 'bot:processor' },
        // Extract feedback type from title if available
        ...(issue.title.includes('[IMPROVE]') ? [{ name: 'feedback:improve' }] : []),
        ...(issue.title.includes('[REWRITE]') ? [{ name: 'feedback:rewrite' }] : []),
        ...(issue.title.includes('[DISABLE]') ? [{ name: 'feedback:disable' }] : [])
      ]
    }));
    
    return { issues: formattedIssues };
  }
  
  if (!GITHUB_TOKEN) {
    console.log('   ⚠️ GITHUB_TOKEN not set, skipping');
    return { error: 'GITHUB_TOKEN not set' };
  }
  
  try {
    let issues = [];
    
    // If single issue specified, fetch only that one
    if (state.singleIssue) {
      console.log(`   Fetching single issue #${state.singleIssue}...`);
      const issue = await githubApi(`/issues/${state.singleIssue}`);
      
      // Verify it has the bot:processor label
      if (issue.labels.some(l => l.name === 'bot:processor')) {
        issues = [issue];
      } else {
        console.log(`   ⚠️ Issue #${state.singleIssue} does not have bot:processor label`);
        return { issues: [], error: null };
      }
    } else {
      // Fetch all open issues with bot:processor label
      issues = await githubApi(
        `/issues?labels=bot:processor&state=open&per_page=${state.maxIssues}`
      );
    }
    
    // Filter out issues already being processed (has bot:in-progress label)
    let pendingIssues = issues.filter(
      issue => !issue.labels.some(l => l.name === 'bot:in-progress')
    );
    
    // Filter out issues already completed (has bot:completed label)
    pendingIssues = pendingIssues.filter(
      issue => !issue.labels.some(l => l.name === 'bot:completed')
    );
    
    // Filter out recently processed issues (within 24 hours) to prevent circular loops
    const filteredIssues = [];
    for (const issue of pendingIssues) {
      const recentlyProcessed = await wasRecentlyProcessed(issue.number);
      if (recentlyProcessed) {
        console.log(`   ⏭️ Skipping issue #${issue.number} (recently processed)`);
      } else {
        filteredIssues.push(issue);
      }
    }
    
    console.log(`   Found ${filteredIssues.length} pending feedback issues`);
    
    if (filteredIssues.length === 0) {
      return { issues: [], error: null };
    }
    
    // Prioritize issues based on channel question counts
    const prioritizedIssues = await prioritizeIssues(filteredIssues);
    
    return { issues: prioritizedIssues };
  } catch (error) {
    console.log(`   ❌ Failed to fetch issues: ${error.message}`);
    return { error: error.message };
  }
}

/**
 * Prioritize issues based on channel question counts
 * Issues for channels with fewer questions get higher priority
 */
async function prioritizeIssues(issues) {
  if (issues.length <= 1) return issues;
  
  console.log('\n📊 [PRIORITIZE] Sorting issues by channel priority...');
  
  // Get channel question counts
  let channelCounts = {};
  try {
    channelCounts = await getChannelQuestionCounts();
  } catch (e) {
    console.log('   ⚠️ Could not get channel counts, using default order');
    return issues;
  }
  
  // Certification channel IDs
  const certChannels = new Set(Object.keys(certificationDomains));
  
  // Parse question IDs from issues to get channels
  const issuesWithPriority = await Promise.all(issues.map(async (issue) => {
    // Parse question ID from issue body
    const questionIdMatch = issue.body?.match(/\*\*Question ID:\*\*\s*`([^`]+)`/);
    if (!questionIdMatch) {
      return { issue, priority: 100, channel: null }; // Low priority if can't parse
    }
    
    const questionId = questionIdMatch[1];
    
    // Get channel from question
    try {
      const result = await dbClient.execute({
        sql: 'SELECT channel FROM questions WHERE id = ?',
        args: [questionId]
      });
      
      if (result.rows.length === 0) {
        return { issue, priority: 100, channel: null };
      }
      
      const channel = result.rows[0].channel;
      const count = channelCounts[channel] || 0;
      const isCert = certChannels.has(channel);
      
      // Calculate priority (lower = higher priority)
      // - Channels with 0 questions: priority 0
      // - Certifications: priority = count / 2
      // - Regular channels: priority = count
      let priority = count;
      if (count === 0) {
        priority = 0;
      } else if (isCert) {
        priority = Math.floor(count / 2);
      }
      
      return { issue, priority, channel };
    } catch (e) {
      return { issue, priority: 100, channel: null };
    }
  }));
  
  // Sort by priority (ascending)
  issuesWithPriority.sort((a, b) => a.priority - b.priority);
  
  // Log prioritization
  console.log('   Issue priority order:');
  issuesWithPriority.slice(0, 5).forEach(({ issue, priority, channel }) => {
    const status = priority === 0 ? '🔴 CRITICAL' : priority < 10 ? '🟡 HIGH' : '🟢';
    console.log(`   #${issue.number}: ${channel || 'unknown'} (priority: ${priority}) ${status}`);
  });
  
  return issuesWithPriority.map(i => i.issue);
}

/**
 * Node: Parse feedback from current issue
 */
async function parseFeedbackNode(state) {
  const issue = state.issues[state.processedCount];
  
  if (!issue) {
    console.log('\n✅ [PARSE_FEEDBACK] No more issues to process');
    return { currentIssue: null };
  }
  
  console.log(`\n🔍 [PARSE_FEEDBACK] Processing issue #${issue.number}...`);
  
  // Parse question ID from issue body
  const questionIdMatch = issue.body?.match(/\*\*Question ID:\*\*\s*`([^`]+)`/);
  if (!questionIdMatch) {
    console.log('   ⚠️ Could not parse question ID');
    return { 
      currentIssue: issue,
      error: 'Could not parse question ID from issue body'
    };
  }
  
  const questionId = questionIdMatch[1];
  
  // Determine feedback type from labels
  let feedbackType = 'improve';
  if (issue.labels.some(l => l.name === 'feedback:rewrite')) feedbackType = 'rewrite';
  if (issue.labels.some(l => l.name === 'feedback:disable')) feedbackType = 'disable';
  
  // Extract user comment (everything after "### Details")
  const detailsMatch = issue.body?.match(/### Details\s*\n([\s\S]*?)(?:\n---|$)/);
  const userComment = detailsMatch?.[1]?.trim() || null;
  
  console.log(`   Question: ${questionId}`);
  console.log(`   Feedback: ${feedbackType}`);
  if (userComment) console.log(`   Comment: ${userComment.substring(0, 50)}...`);
  
  // Record processing start to prevent circular loops
  await recordProcessingStart(issue.number, questionId, feedbackType);
  
  return {
    currentIssue: issue,
    questionId,
    feedbackType,
    userComment
  };
}

/**
 * Node: Fetch question from database
 */
async function fetchQuestionNode(state) {
  if (!state.questionId) {
    return { question: null };
  }
  
  console.log(`\n📖 [FETCH_QUESTION] Loading question ${state.questionId}...`);
  
  try {
    const result = await dbClient.execute({
      sql: 'SELECT * FROM questions WHERE id = ?',
      args: [state.questionId]
    });
    
    if (result.rows.length === 0) {
      console.log('   ⚠️ Question not found');
      return { question: null, error: 'Question not found in database' };
    }
    
    const row = result.rows[0];
    const question = {
      id: row.id,
      question: row.question,
      answer: row.answer,
      explanation: row.explanation,
      diagram: row.diagram,
      difficulty: row.difficulty,
      tags: row.tags ? JSON.parse(row.tags) : [],
      channel: row.channel,
      subChannel: row.sub_channel,
      videos: row.videos ? JSON.parse(row.videos) : null,
      companies: row.companies ? JSON.parse(row.companies) : null,
      eli5: row.eli5
    };
    
    console.log(`   ✅ Loaded: ${question.question.substring(0, 50)}...`);
    return { question };
  } catch (error) {
    console.log(`   ❌ Database error: ${error.message}`);
    return { error: error.message };
  }
}

/**
 * Node: Execute the appropriate action based on feedback type
 */
async function executeActionNode(state) {
  if (!state.question || !state.feedbackType) {
    return { updatedQuestion: null };
  }
  
  console.log(`\n⚡ [EXECUTE_ACTION] Running ${state.feedbackType} action...`);
  
  const isExternalIssue = state.externalIssues !== null;
  
  try {
    // Add in-progress label to issue (skip for external issues)
    if (state.currentIssue && !isExternalIssue) {
      await githubApi(`/issues/${state.currentIssue.number}/labels`, {
        method: 'POST',
        body: JSON.stringify({ labels: ['bot:in-progress'] })
      });
    } else if (isExternalIssue) {
      console.log('   ⏭️ Skipping in-progress label for external issue');
    }
    
    let updatedQuestion = null;
    
    switch (state.feedbackType) {
      case 'improve':
        updatedQuestion = await improveQuestion(state.question, state.userComment);
        break;
        
      case 'rewrite':
        updatedQuestion = await rewriteQuestion(state.question, state.userComment);
        break;
        
      case 'disable':
        await disableQuestion(state.questionId);
        console.log('   ✅ Question disabled');
        return { updatedQuestion: { ...state.question, status: 'deleted' } };
        
      default:
        console.log(`   ⚠️ Unknown feedback type: ${state.feedbackType}`);
        return { error: `Unknown feedback type: ${state.feedbackType}` };
    }
    
    if (updatedQuestion) {
      console.log('   ✅ Action completed successfully');
      return { updatedQuestion };
    }
    
    return { error: 'Action produced no result' };
  } catch (error) {
    console.log(`   ❌ Action failed: ${error.message}`);
    return { error: error.message };
  }
}

/**
 * Improve question using AI
 */
async function improveQuestion(question, userComment) {
  console.log('   🔧 Improving question with AI...');
  
  // Check if this is a certification MCQ question (check tags array)
  const tags = typeof question.tags === 'string' ? JSON.parse(question.tags || '[]') : (question.tags || []);
  const isCertQuestion = tags.includes('certification-mcq');
  
  const context = {
    question: question.question,
    answer: question.answer,
    explanation: question.explanation,
    channel: question.channel,
    feedback: userComment || 'User requested improvement - make the explanation clearer and more comprehensive'
  };
  
  const result = await ai.run('improve', context);
  
  if (result) {
    const updated = {
      ...question,
      answer: result.answer || question.answer,
      explanation: result.explanation || question.explanation,
      diagram: result.diagram || question.diagram,
      eli5: result.eli5 || question.eli5,
      lastUpdated: new Date().toISOString()
    };
    
    return updated;
  }
  
  return null;
}

/**
 * Rewrite question using AI
 */
async function rewriteQuestion(question, userComment) {
  console.log('   ✏️ Rewriting question with AI...');
  
  // Check if this is a certification MCQ question (check tags array)
  const tags = typeof question.tags === 'string' ? JSON.parse(question.tags || '[]') : (question.tags || []);
  const isCertQuestion = tags.includes('certification-mcq');
  
  const context = {
    question: question.question,
    answer: question.answer,
    explanation: question.explanation,
    channel: question.channel,
    subChannel: question.subChannel,
    difficulty: question.difficulty,
    feedback: userComment || 'User requested complete rewrite - content may be incorrect or outdated'
  };
  
  // For certification questions, use the certification-question template
  if (isCertQuestion) {
    const result = await ai.run('certification-question', {
      certificationId: question.channel,
      domain: question.subChannel,
      difficulty: question.difficulty,
      count: 1
    });
    
    if (result && Array.isArray(result) && result.length > 0) {
      const newQ = result[0];
      return {
        ...question,
        question: newQ.question || question.question,
        answer: JSON.stringify(newQ.options) || question.answer,
        explanation: newQ.explanation || question.explanation,
        tags: newQ.tags || question.tags,
        metadata: {
          ...question.metadata,
          options: newQ.options
        },
        lastUpdated: new Date().toISOString()
      };
    }
  }
  
  // Use generate template with rewrite hint for regular questions
  const result = await ai.run('generate', {
    ...context,
    scenarioHint: `REWRITE this existing question. Original: "${question.question}". User feedback: ${userComment || 'needs rewrite'}`
  });
  
  if (result) {
    return {
      ...question,
      question: result.question || question.question,
      answer: result.answer || question.answer,
      explanation: result.explanation || question.explanation,
      diagram: result.diagram || question.diagram,
      eli5: result.eli5 || question.eli5,
      tags: result.tags || question.tags,
      lastUpdated: new Date().toISOString()
    };
  }
  
  return null;
}

/**
 * Disable/delete question
 */
async function disableQuestion(questionId) {
  await dbClient.execute({
    sql: `UPDATE questions SET status = 'deleted', last_updated = ? WHERE id = ?`,
    args: [new Date().toISOString(), questionId]
  });
}

/**
 * Node: Update question in database
 */
async function updateQuestionNode(state) {
  if (!state.updatedQuestion || state.feedbackType === 'disable') {
    return {};
  }
  
  console.log('\n💾 [UPDATE_QUESTION] Saving changes to database...');
  
  try {
    await saveQuestion(state.updatedQuestion);
    console.log('   ✅ Question updated');
    return {};
  } catch (error) {
    console.log(`   ❌ Save failed: ${error.message}`);
    return { error: error.message };
  }
}

/**
 * Node: Close GitHub issue with results
 */
async function closeIssueNode(state) {
  if (!state.currentIssue) {
    return { processedCount: state.processedCount + 1 };
  }
  
  console.log(`\n📝 [CLOSE_ISSUE] Updating issue #${state.currentIssue.number}...`);
  
  const success = !state.error;
  const isExternalIssue = state.externalIssues !== null;
  
  try {
    // Build result comment
    let comment = '';
    
    if (state.error) {
      comment = `## ❌ Processing Failed\n\n**Error:** ${state.error}\n\nPlease check the question ID and try again, or contact maintainers.`;
    } else if (state.feedbackType === 'disable') {
      comment = `## ✅ Question Disabled\n\n**Question ID:** \`${state.questionId}\`\n\nThe question has been marked as deleted and will no longer appear in the app.\n\n---\n*Processed by processor-bot*`;
    } else {
      const action = state.feedbackType === 'improve' ? 'Improved' : 'Rewritten';
      comment = `## ✅ Question ${action}\n\n**Question ID:** \`${state.questionId}\`\n\n### Changes Made:\n`;
      
      if (state.updatedQuestion) {
        if (state.feedbackType === 'rewrite') {
          comment += `- Question text updated\n`;
        }
        comment += `- Answer enhanced\n`;
        comment += `- Explanation improved\n`;
        if (state.updatedQuestion.diagram !== state.question?.diagram) {
          comment += `- Diagram updated\n`;
        }
      }
      
      comment += `\n---\n*Processed by processor-bot using AI*`;
    }
    
    // Skip GitHub API calls for external issues (handled by cross-repo sync)
    if (!isExternalIssue) {
      // Post comment
      await githubApi(`/issues/${state.currentIssue.number}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body: comment })
      });
      
      // Close issue with appropriate labels
      await githubApi(`/issues/${state.currentIssue.number}`, {
        method: 'PATCH',
        body: JSON.stringify({ 
          state: 'closed',
          labels: state.error 
            ? ['bot:processor', `feedback:${state.feedbackType}`, 'bot:failed']
            : ['bot:processor', `feedback:${state.feedbackType}`, 'bot:completed']
        })
      });
      
      console.log('   ✅ Issue closed');
    } else {
      console.log('   ✅ External issue processed (will be closed by cross-repo sync)');
    }
    
    // Record processing completion to prevent circular loops
    await recordProcessingComplete(
      state.currentIssue.number, 
      success,
      success ? { questionId: state.questionId, feedbackType: state.feedbackType } : null,
      state.error
    );
    
    // Record result
    const result = {
      issueNumber: state.currentIssue.number,
      questionId: state.questionId,
      feedbackType: state.feedbackType,
      success,
      error: state.error
    };
    
    return { 
      processedCount: state.processedCount + 1,
      results: [result],
      // Reset for next iteration
      currentIssue: null,
      questionId: null,
      feedbackType: null,
      userComment: null,
      question: null,
      updatedQuestion: null,
      error: null
    };
  } catch (error) {
    console.log(`   ❌ Failed to close issue: ${error.message}`);
    
    // Still record the failure to prevent reprocessing
    await recordProcessingComplete(state.currentIssue.number, false, null, error.message);
    
    return { 
      processedCount: state.processedCount + 1,
      results: [{
        issueNumber: state.currentIssue.number,
        questionId: state.questionId,
        feedbackType: state.feedbackType,
        success: false,
        error: error.message
      }]
    };
  }
}

/**
 * Conditional: Check if more issues to process
 */
function shouldContinue(state) {
  if (state.processedCount < state.issues.length) {
    return 'parse_feedback';
  }
  return END;
}

/**
 * Conditional: Check if we have a valid issue to process
 */
function hasValidIssue(state) {
  if (state.error || !state.currentIssue) {
    return 'close_issue';
  }
  return 'fetch_question';
}

/**
 * Conditional: Check if we have a valid question
 */
function hasValidQuestion(state) {
  if (state.error || !state.question) {
    return 'close_issue';
  }
  return 'execute_action';
}

/**
 * Build and return the graph
 */
export function buildFeedbackProcessorGraph() {
  const graph = new StateGraph(FeedbackState)
    .addNode('fetch_issues', fetchIssuesNode)
    .addNode('parse_feedback', parseFeedbackNode)
    .addNode('fetch_question', fetchQuestionNode)
    .addNode('execute_action', executeActionNode)
    .addNode('update_question', updateQuestionNode)
    .addNode('close_issue', closeIssueNode)
    
    .addEdge(START, 'fetch_issues')
    .addConditionalEdges('fetch_issues', (state) => {
      if (state.error || state.issues.length === 0) return END;
      return 'parse_feedback';
    })
    .addConditionalEdges('parse_feedback', hasValidIssue)
    .addConditionalEdges('fetch_question', hasValidQuestion)
    .addEdge('execute_action', 'update_question')
    .addEdge('update_question', 'close_issue')
    .addConditionalEdges('close_issue', shouldContinue);
  
  return graph.compile();
}

/**
 * Run the feedback processor pipeline
 */
export async function processFeedback(options = {}) {
  console.log('\n' + '═'.repeat(60));
  console.log('🔄 LANGGRAPH FEEDBACK PROCESSOR PIPELINE');
  console.log('═'.repeat(60));
  
  if (options.externalIssues) {
    console.log(`   Mode: External issues processing (${options.externalIssues.length} issues)`);
  } else if (options.singleIssue) {
    console.log(`   Mode: Single issue #${options.singleIssue}`);
  } else {
    console.log(`   Mode: Batch processing (max ${options.maxIssues || 10} issues)`);
  }
  
  const graph = buildFeedbackProcessorGraph();
  
  const initialState = {
    maxIssues: options.maxIssues || 10,
    singleIssue: options.singleIssue || null,
    externalIssues: options.externalIssues || null
  };
  
  const result = await graph.invoke(initialState);
  
  console.log('\n' + '═'.repeat(60));
  console.log('📊 PROCESSING COMPLETE');
  console.log('═'.repeat(60));
  console.log(`   Total processed: ${result.processedCount}`);
  console.log(`   Successful: ${result.results.filter(r => r.success).length}`);
  console.log(`   Failed: ${result.results.filter(r => !r.success).length}`);
  
  return result;
}

export default { buildFeedbackProcessorGraph, processFeedback };
