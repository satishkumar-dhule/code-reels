import {
  loadChannelQuestions,
  saveChannelQuestions,
  runWithRetries,
  parseJson,
  updateIndexFile
} from './utils.js';

const questionId = process.argv[2];
if (!questionId) {
  console.error('Usage: node script/convert-question-smart.js <question-id>');
  process.exit(1);
}

const channel = questionId.startsWith('sd-') ? 'system-design' : 
                questionId.startsWith('gh-') ? 'github-actions' :
                questionId.startsWith('sy-') ? 'system-design' : 'algorithms';

console.log(`Converting question ${questionId} in ${channel} channel...\n`);

const questions = loadChannelQuestions(channel);
const question = questions.find(q => q.id === questionId);

if (!question) {
  console.error(`Question ${questionId} not found!`);
  process.exit(1);
}

if (!question.diagram) {
  console.error(`Question ${questionId} has no diagram!`);
  process.exit(1);
}

console.log(`Question: ${question.question.substring(0, 80)}...`);
console.log(`Current diagram type: ${question.diagramType || 'mermaid'}\n`);

const prompt = `You are a system design visualization expert. Create a HIGHLY LOGICAL, consolidated diagram based on ALL the context below.

## FULL QUESTION CONTEXT

**Question**: ${question.question}

**Answer**: ${question.answer}

**Detailed Explanation**:
${question.explanation}

**Tags**: ${question.tags?.join(', ') || 'N/A'}
**Difficulty**: ${question.difficulty || 'N/A'}
**Channel**: ${question.channel || 'N/A'}

**Current Mermaid Diagram**:
\`\`\`
${question.diagram}
\`\`\`

## YOUR TASK

Analyze ALL the information above (question, answer, explanation, tags) and create the MOST LOGICAL visualization that:
1. Shows ALL key components mentioned in the explanation
2. Clearly illustrates the relationships and data flow
3. Uses proper grouping and hierarchy
4. Has descriptive labels that match the explanation
5. Is visually organized (not randomly scattered)

## FORMAT SELECTION

Choose the BEST format (PREFER GOOGLE CHARTS):

- **google-orgchart**: Hierarchical structures, parent-child relationships, organizational trees
- **google-sankey**: Flow diagrams, data flows, request/response flows, distributed systems
- **google-charts**: Metrics, performance data, statistics over time
- **d3-timeline**: Sequential steps, pipelines (only if Google Charts doesn't fit)

## OUTPUT FORMAT

Return ONLY valid JSON:

**For google-orgchart** (PREFERRED for hierarchies):
{
  "type": "google-orgchart",
  "data": [
    ["Component Name", "Parent Name", "Tooltip/Description"],
    ["Load Balancer", "", "Distributes traffic"],
    ["Server 1", "Load Balancer", "Backend server"],
    ["Server 2", "Load Balancer", "Backend server"]
  ],
  "config": {"width": 800, "height": 600}
}

**For google-sankey** (PREFERRED for flows):
{
  "type": "google-sankey",
  "data": [
    ["From", "To", Weight],
    ["User", "Load Balancer", 5],
    ["Load Balancer", "Server 1", 2],
    ["Load Balancer", "Server 2", 3]
  ],
  "config": {"width": 800, "height": 600}
}

**For google-charts** (metrics/performance):
{
  "type": "google-charts",
  "data": {
    "chartType": "LineChart",
    "data": [
      ["Time", "Metric1", "Metric2"],
      ["0s", 100, 80],
      ["1s", 120, 90]
    ],
    "options": {"title": "Performance"}
  }
}

**For d3-timeline** (only if Google Charts doesn't fit):
{
  "type": "d3-timeline",
  "data": {
    "steps": [
      {"id": 1, "label": "Step", "description": "Details", "duration": 100}
    ]
  },
  "config": {"width": 800, "height": 400}
}

## CRITICAL REQUIREMENTS

1. Use ALL information from the explanation to create comprehensive nodes/components
2. Group related components (use group numbers for d3-force)
3. Add descriptive labels that match the technical terms in the explanation
4. For d3-force: Use higher chargeStrength (-800 to -1200) and linkDistance (200-300) for better spacing
5. Create a LOGICAL layout that tells the story of the system

Return ONLY the JSON, no markdown, no explanation.`;

console.log('Calling OpenCode CLI to analyze and convert...\n');

const response = await runWithRetries(prompt);

if (!response) {
  console.error('❌ OpenCode failed');
  process.exit(1);
}

const data = parseJson(response);

if (!data || !data.type || !data.data) {
  console.error('❌ Invalid response format');
  console.log('Response:', response.substring(0, 500));
  process.exit(1);
}

console.log(`✅ Conversion successful to ${data.type}!\n`);

if (data.type === 'd3-hierarchy') {
  console.log('Root:', data.data.name);
  console.log('Children:', data.data.children?.length || 0);
} else if (data.type === 'd3-force') {
  console.log('Nodes:', data.data.nodes?.length || 0);
  console.log('Links:', data.data.links?.length || 0);
} else if (data.type === 'd3-timeline') {
  console.log('Steps:', data.data.steps?.length || 0);
} else if (data.type === 'google-charts') {
  console.log('Chart Type:', data.data.chartType);
  console.log('Data Points:', data.data.data?.length || 0);
}

// Update question
const qIndex = questions.findIndex(q => q.id === questionId);
questions[qIndex] = {
  ...questions[qIndex],
  diagram: question.diagram, // Keep original as fallback
  diagramType: data.type,
  diagramData: data.data,
  diagramConfig: data.config || {},
  lastUpdated: new Date().toISOString()
};

saveChannelQuestions(channel, questions);
updateIndexFile();

console.log(`\n✅ Updated ${questionId} in ${channel}.json`);
console.log('Refresh your browser to see the new diagram!');
