import {
  loadChannelQuestions,
  saveChannelQuestions,
  runWithRetries,
  parseJson,
  updateIndexFile
} from './utils.js';

const questionId = process.argv[2] || 'sd-1';
const channel = questionId.split('-')[0] === 'sd' ? 'system-design' : 'algorithms';

console.log(`Converting question ${questionId} in ${channel} channel...\n`);

const questions = loadChannelQuestions(channel);
const question = questions.find(q => q.id === questionId);

if (!question) {
  console.error(`Question ${questionId} not found!`);
  process.exit(1);
}

console.log(`Question: ${question.question.substring(0, 80)}...`);
console.log(`Current diagram type: ${question.diagramType || 'mermaid'}\n`);

const prompt = `Convert this Load Balancer architecture diagram to a D3.js force-directed graph format.

Question: "${question.question}"
Current Mermaid Diagram:
\`\`\`
${question.diagram}
\`\`\`

Create a logical D3.js force-directed graph showing:
- User/Client nodes
- Load Balancer node (central)
- Multiple backend servers
- Clear connections with labels

Return ONLY valid JSON with this exact structure:
{
  "type": "d3-force",
  "data": {
    "nodes": [
      {"id": "client", "group": 1, "label": "Client"},
      {"id": "lb", "group": 2, "label": "Load Balancer"},
      {"id": "server1", "group": 3, "label": "Server 1"},
      {"id": "server2", "group": 3, "label": "Server 2"}
    ],
    "links": [
      {"source": "client", "target": "lb", "value": 2, "label": "HTTP Request"},
      {"source": "lb", "target": "server1", "value": 1, "label": "Forward"},
      {"source": "lb", "target": "server2", "value": 1, "label": "Forward"}
    ]
  },
  "config": {
    "width": 800,
    "height": 600,
    "chargeStrength": -500,
    "linkDistance": 200
  }
}`;

console.log('Calling OpenCode CLI...\n');

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

console.log('✅ Conversion successful!\n');
console.log('Nodes:', data.data.nodes.length);
console.log('Links:', data.data.links.length);

// Update question
const qIndex = questions.findIndex(q => q.id === questionId);
questions[qIndex] = {
  ...questions[qIndex],
  diagram: question.diagram, // Keep original
  diagramType: data.type,
  diagramData: data.data,
  diagramConfig: data.config,
  lastUpdated: new Date().toISOString()
};

saveChannelQuestions(channel, questions);
updateIndexFile();

console.log(`\n✅ Updated ${questionId} in ${channel}.json`);
console.log('Refresh your browser to see the new diagram!');
