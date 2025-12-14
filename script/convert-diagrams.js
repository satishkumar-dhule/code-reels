import {
  QUESTIONS_DIR,
  loadChannelQuestions,
  saveChannelQuestions,
  runWithRetries,
  parseJson,
  updateIndexFile,
  writeGitHubOutput
} from './utils.js';
import fs from 'fs';

/**
 * Diagram Conversion Bot
 * Converts Mermaid diagrams to D3.js or Google Charts where appropriate
 * Maintains backward compatibility - keeps mermaid as fallback
 */

function loadAllQuestionsWithFile() {
  const all = [];
  try {
    fs.readdirSync(QUESTIONS_DIR)
      .filter(f => f.endsWith('.json'))
      .forEach(f => {
        try {
          const questions = JSON.parse(fs.readFileSync(`${QUESTIONS_DIR}/${f}`, 'utf8'));
          questions.forEach(q => all.push({ ...q, _file: f }));
        } catch (e) {}
      });
  } catch (e) {}
  return all;
}

// Determine best diagram type based on content
function analyzeDiagramType(diagram, question, explanation) {
  const content = `${diagram} ${question} ${explanation}`.toLowerCase();
  
  // Flowchart/Process - D3.js hierarchical
  if (diagram.includes('graph TD') || diagram.includes('graph LR') || 
      content.includes('flow') || content.includes('process')) {
    return 'd3-hierarchy';
  }
  
  // Sequence diagram - D3.js timeline
  if (diagram.includes('sequenceDiagram') || content.includes('sequence') || 
      content.includes('timeline') || content.includes('interaction')) {
    return 'd3-timeline';
  }
  
  // Metrics/Performance - Google Charts
  if (content.includes('metric') || content.includes('performance') || 
      content.includes('latency') || content.includes('throughput') ||
      content.includes('cpu') || content.includes('memory')) {
    return 'google-charts-line';
  }
  
  // Architecture/System - D3.js force-directed
  if (content.includes('architecture') || content.includes('system') || 
      content.includes('distributed') || content.includes('microservice')) {
    return 'd3-force';
  }
  
  // Tree/Hierarchy - D3.js tree
  if (content.includes('tree') || content.includes('hierarchy') || 
      content.includes('parent') || content.includes('child')) {
    return 'd3-tree';
  }
  
  // Default: keep mermaid
  return 'mermaid';
}


// Conversion prompts for different diagram types
const conversionPrompts = {
  'd3-hierarchy': (diagram, question, answer, explanation, tags) => `You are a system design visualization expert. Create a HIGHLY LOGICAL hierarchical diagram.

## FULL CONTEXT

**Question**: ${question}
**Answer**: ${answer}
**Explanation**: ${explanation}
**Tags**: ${tags?.join(', ') || 'N/A'}

**Mermaid Diagram**:
\`\`\`
${diagram}
\`\`\`

## TASK

Create a D3.js hierarchical tree that shows ALL key components from the explanation with clear parent-child relationships. Use descriptive labels.

Return ONLY valid JSON:
{
  "type": "d3-hierarchy",
  "data": {
    "name": "Root Component",
    "children": [
      {"name": "Child 1", "value": 100, "description": "Details"},
      {"name": "Child 2", "children": [...]}
    ]
  },
  "config": {"width": 800, "height": 600}
}`,

  'd3-force': (diagram, question, answer, explanation, tags) => `You are a system design visualization expert. Create a HIGHLY LOGICAL network diagram.

## FULL CONTEXT

**Question**: ${question}
**Answer**: ${answer}
**Explanation**: ${explanation}
**Tags**: ${tags?.join(', ') || 'N/A'}

**Mermaid Diagram**:
\`\`\`
${diagram}
\`\`\`

## TASK

Create a D3.js force-directed graph showing ALL key components from the explanation with:
1. Descriptive node labels matching technical terms
2. Proper grouping (use group numbers)
3. Clear connection labels
4. Logical spacing (chargeStrength: -800 to -1200, linkDistance: 200-300)

Return ONLY valid JSON:
{
  "type": "d3-force",
  "data": {
    "nodes": [
      {"id": "node1", "group": 1, "label": "Component Name", "description": "What it does"},
      {"id": "node2", "group": 2, "label": "Another Component"}
    ],
    "links": [
      {"source": "node1", "target": "node2", "value": 2, "label": "Connection Type"}
    ]
  },
  "config": {
    "width": 800,
    "height": 600,
    "chargeStrength": -800,
    "linkDistance": 250
  }
}`,

  'd3-timeline': (diagram, question, answer, explanation, tags) => `You are a system design visualization expert. Create a HIGHLY LOGICAL timeline.

## FULL CONTEXT

**Question**: ${question}
**Answer**: ${answer}
**Explanation**: ${explanation}
**Tags**: ${tags?.join(', ') || 'N/A'}

**Mermaid Diagram**:
\`\`\`
${diagram}
\`\`\`

## TASK

Create a D3.js timeline showing ALL steps from the explanation in sequential order with descriptive labels.

Return ONLY valid JSON:
{
  "type": "d3-timeline",
  "data": {
    "steps": [
      {"id": 1, "label": "Step Name", "description": "What happens", "duration": 100},
      {"id": 2, "label": "Next Step", "description": "Details", "duration": 150}
    ]
  },
  "config": {"width": 800, "height": 400}
}`,

  'google-charts-line': (diagram, question, answer, explanation, tags) => `You are a system design visualization expert. Create a LOGICAL metrics chart.

## FULL CONTEXT

**Question**: ${question}
**Answer**: ${answer}
**Explanation**: ${explanation}
**Tags**: ${tags?.join(', ') || 'N/A'}

**Mermaid Diagram**:
\`\`\`
${diagram}
\`\`\`

## TASK

Create a Google Charts line chart showing performance metrics or data trends from the explanation.

Return ONLY valid JSON:
{
  "type": "google-charts",
  "data": {
    "chartType": "LineChart",
    "data": [
      ["Time", "Metric1", "Metric2"],
      ["0s", 100, 80],
      ["1s", 120, 90]
    ],
    "options": {
      "title": "Chart Title",
      "hAxis": {"title": "X Axis"},
      "vAxis": {"title": "Y Axis"}
    }
  }
}`
};


async function main() {
  console.log('=== Diagram Conversion Bot (Mermaid → D3.js/Google Charts) ===\n');
  console.log('Note: Maintains backward compatibility - keeps mermaid as fallback\n');

  const allQuestions = loadAllQuestionsWithFile();
  console.log(`Loaded ${allQuestions.length} questions`);

  // Find questions with mermaid diagrams that could benefit from conversion
  const convertibleQuestions = allQuestions.filter(q => {
    if (!q.diagram || q.diagram.length < 20) return false;
    if (q.diagramType && q.diagramType !== 'mermaid') return false; // Already converted
    if (q.diagramData) return false; // Already has converted data
    
    const suggestedType = analyzeDiagramType(q.diagram, q.question, q.explanation);
    return suggestedType !== 'mermaid';
  });

  console.log(`Found ${convertibleQuestions.length} diagrams that could benefit from conversion\n`);

  if (convertibleQuestions.length === 0) {
    console.log('✅ No diagrams need conversion at this time!');
    writeGitHubOutput({
      converted_count: 0,
      failed_count: 0,
      total_questions: allQuestions.length
    });
    return;
  }

  // Sort by lastUpdated (oldest first)
  convertibleQuestions.sort((a, b) => {
    const dateA = new Date(a.lastUpdated || 0).getTime();
    const dateB = new Date(b.lastUpdated || 0).getTime();
    return dateA - dateB;
  });

  const convertedQuestions = [];
  const failedAttempts = [];
  const NUM_TO_CONVERT = 3; // Convert fewer at a time to be conservative

  for (let i = 0; i < Math.min(NUM_TO_CONVERT, convertibleQuestions.length); i++) {
    const question = convertibleQuestions[i];
    const suggestedType = analyzeDiagramType(question.diagram, question.question, question.explanation);
    
    console.log(`\n--- Question ${i + 1}/${Math.min(NUM_TO_CONVERT, convertibleQuestions.length)} ---`);
    console.log(`ID: ${question.id}`);
    console.log(`Current: Mermaid`);
    console.log(`Suggested: ${suggestedType}`);
    console.log(`Q: ${question.question.substring(0, 60)}...`);

    const prompt = conversionPrompts[suggestedType](
      question.diagram, 
      question.question, 
      question.answer, 
      question.explanation, 
      question.tags
    );
    const response = await runWithRetries(prompt);
    
    if (!response) {
      console.log('❌ OpenCode failed after retries.');
      failedAttempts.push({ id: question.id, reason: 'OpenCode timeout' });
      continue;
    }

    const data = parseJson(response);
    
    if (!data || !data.type || !data.data) {
      console.log('❌ Invalid conversion format.');
      failedAttempts.push({ id: question.id, reason: 'Invalid JSON' });
      continue;
    }

    // Load channel questions and find the question to update
    const channelQuestions = loadChannelQuestions(question.channel);
    const qIndex = channelQuestions.findIndex(q => q.id === question.id);
    
    if (qIndex === -1) {
      console.log('❌ Question not found in channel file.');
      failedAttempts.push({ id: question.id, reason: 'Not found in file' });
      continue;
    }

    // Update with new diagram data (keeping mermaid as fallback)
    channelQuestions[qIndex] = {
      ...channelQuestions[qIndex],
      diagram: question.diagram, // Keep original mermaid
      diagramType: data.type, // New diagram type
      diagramData: data.data, // Converted data
      diagramConfig: data.config, // Configuration
      lastUpdated: new Date().toISOString()
    };

    saveChannelQuestions(question.channel, channelQuestions);
    updateIndexFile();
    
    convertedQuestions.push(channelQuestions[qIndex]);
    console.log(`✅ Converted: ${question.id} → ${data.type}`);
  }

  console.log('\n\n=== SUMMARY ===');
  console.log(`Total Diagrams Converted: ${convertedQuestions.length}/${Math.min(NUM_TO_CONVERT, convertibleQuestions.length)}`);
  
  if (convertedQuestions.length > 0) {
    console.log('\n✅ Successfully Converted Diagrams:');
    convertedQuestions.forEach((q, idx) => {
      console.log(`  ${idx + 1}. [${q.id}] ${q.channel}/${q.subChannel}`);
      console.log(`     Type: ${q.diagramType}`);
      console.log(`     Fallback: Mermaid (preserved)`);
    });
  }

  if (failedAttempts.length > 0) {
    console.log(`\n❌ Failed Attempts: ${failedAttempts.length}`);
    failedAttempts.forEach(f => {
      console.log(`  - ${f.id}: ${f.reason}`);
    });
  }

  console.log(`\nTotal Questions in Database: ${allQuestions.length}`);
  console.log(`Diagrams Still Using Mermaid: ${allQuestions.filter(q => !q.diagramType || q.diagramType === 'mermaid').length}`);
  console.log(`Diagrams Converted: ${allQuestions.filter(q => q.diagramType && q.diagramType !== 'mermaid').length}`);
  console.log('=== END SUMMARY ===\n');

  writeGitHubOutput({
    converted_count: convertedQuestions.length,
    failed_count: failedAttempts.length,
    total_questions: allQuestions.length,
    converted_ids: convertedQuestions.map(q => q.id).join(',')
  });
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
