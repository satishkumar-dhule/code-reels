import {
  loadChannelQuestions,
  saveChannelQuestions,
  runWithRetries,
  parseJson,
  updateIndexFile
} from './utils.js';

const questionIds = process.argv.slice(2);

if (questionIds.length === 0) {
  console.error('Usage: node script/batch-convert.js <id1> <id2> ...');
  console.error('Example: node script/batch-convert.js sd-1 sd-2 sd-3');
  process.exit(1);
}

console.log(`Converting ${questionIds.length} questions...\n`);

const results = {
  success: [],
  failed: []
};

for (const questionId of questionIds) {
  const channel = questionId.startsWith('sd-') ? 'system-design' : 
                  questionId.startsWith('gh-') ? 'github-actions' :
                  questionId.startsWith('sy-') ? 'system-design' : 'algorithms';

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Converting ${questionId}...`);
  console.log('='.repeat(60));

  const questions = loadChannelQuestions(channel);
  const question = questions.find(q => q.id === questionId);

  if (!question) {
    console.error(`❌ Question ${questionId} not found!`);
    results.failed.push({ id: questionId, reason: 'not found' });
    continue;
  }

  if (!question.diagram) {
    console.error(`❌ Question ${questionId} has no diagram!`);
    results.failed.push({ id: questionId, reason: 'no diagram' });
    continue;
  }

  const prompt = `You are a system design visualization expert. Create a HIGHLY LOGICAL, consolidated diagram based on ALL the context below.

## FULL QUESTION CONTEXT

**Question**: ${question.question}

**Answer**: ${question.answer}

**Detailed Explanation**:
${question.explanation}

**Tags**: ${question.tags?.join(', ') || 'N/A'}
**Difficulty**: ${question.difficulty || 'N/A'}

**Current Mermaid Diagram**:
\`\`\`
${question.diagram}
\`\`\`

## YOUR TASK

Analyze ALL the information and create the MOST LOGICAL visualization that:
1. Shows ALL key components from the explanation
2. Clearly illustrates relationships and data flow
3. Uses proper grouping and hierarchy
4. Has descriptive labels matching the explanation
5. Is visually organized (not randomly scattered)

## FORMAT SELECTION (PREFER GOOGLE CHARTS)

- **google-orgchart**: Hierarchical structures, parent-child relationships
- **google-sankey**: Flow diagrams, data flows, distributed systems
- **google-charts**: Metrics, performance data
- **d3-timeline**: Sequential steps (only if Google Charts doesn't fit)

## OUTPUT

Return ONLY valid JSON:

{"type": "google-orgchart", "data": [["Name", "Parent", "Tooltip"], ["LB", "", "Load Balancer"], ["S1", "LB", "Server"]], "config": {"width": 800, "height": 600}}
{"type": "google-sankey", "data": [["From", "To", Weight], ["User", "LB", 5], ["LB", "Server", 3]], "config": {"width": 800, "height": 600}}
{"type": "google-charts", "data": {"chartType": "LineChart", "data": [...], "options": {...}}}
{"type": "d3-timeline", "data": {"steps": [...]}, "config": {"width": 800, "height": 400}}

Return ONLY JSON, no markdown.`;

  const response = await runWithRetries(prompt);

  if (!response) {
    console.error(`❌ OpenCode failed for ${questionId}`);
    results.failed.push({ id: questionId, reason: 'opencode failed' });
    continue;
  }

  const data = parseJson(response);

  if (!data || !data.type || !data.data) {
    console.error(`❌ Invalid response format for ${questionId}`);
    results.failed.push({ id: questionId, reason: 'invalid format' });
    continue;
  }

  console.log(`✅ Converted to ${data.type}`);

  // Update question
  const qIndex = questions.findIndex(q => q.id === questionId);
  questions[qIndex] = {
    ...questions[qIndex],
    diagram: question.diagram,
    diagramType: data.type,
    diagramData: data.data,
    diagramConfig: data.config || {},
    lastUpdated: new Date().toISOString()
  };

  saveChannelQuestions(channel, questions);
  results.success.push({ id: questionId, type: data.type });
}

updateIndexFile();

console.log(`\n${'='.repeat(60)}`);
console.log('CONVERSION SUMMARY');
console.log('='.repeat(60));
console.log(`✅ Success: ${results.success.length}`);
results.success.forEach(r => console.log(`   - ${r.id} → ${r.type}`));
console.log(`❌ Failed: ${results.failed.length}`);
results.failed.forEach(r => console.log(`   - ${r.id}: ${r.reason}`));
console.log('\nRefresh your browser to see the new diagrams!');
