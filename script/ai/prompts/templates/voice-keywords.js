/**
 * Voice Keywords Template
 * Extracts mandatory keywords from question answers for voice interview evaluation
 */

export default {
  name: 'voice-keywords',
  description: 'Extract mandatory keywords from answers for voice interview matching',
  
  build({ questions }) {
    const questionsJson = questions.map((q, i) => ({
      idx: i,
      question: q.question.substring(0, 300),
      answer: q.answer.substring(0, 1500),
      channel: q.channel
    }));

    return `You are an expert technical interviewer. Extract the MANDATORY keywords that a candidate MUST mention to demonstrate understanding.

For each question, identify 5-10 essential keywords/phrases that are:
1. Technical terms specific to the topic (e.g., "load balancer", "circuit breaker", "kubernetes")
2. Key concepts that show understanding (e.g., "horizontal scaling", "eventual consistency")  
3. Important tools/technologies mentioned (e.g., "prometheus", "terraform", "kafka")
4. Critical processes or patterns (e.g., "blue-green deployment", "STAR method")

DO NOT include:
- Generic words like "system", "application", "data", "service"
- Common verbs like "implement", "use", "create", "handle"
- Filler words or phrases
- Single letters or numbers

Return ONLY a JSON array with this exact structure:
[
  {
    "idx": 0,
    "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
  }
]

Questions to analyze:
${JSON.stringify(questionsJson, null, 2)}

Return ONLY the JSON array, no explanation or markdown.`;
  },
  
  parse(response) {
    if (!response) return null;
    
    // Try direct JSON parse
    try {
      const parsed = JSON.parse(response);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    
    // Try extracting from code blocks
    const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      try {
        const parsed = JSON.parse(codeBlockMatch[1]);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    
    // Try finding JSON array
    const arrayMatch = response.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        const parsed = JSON.parse(arrayMatch[0]);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    
    return null;
  }
};
