/**
 * Advanced Voice Interview Evaluation System
 * 
 * Comprehensive client-side evaluation with:
 * - Semantic concept matching with synonyms and related terms
 * - Answer structure analysis (STAR method, intro/body/conclusion)
 * - Fluency scoring (filler words, repetition, coherence)
 * - Multi-dimensional grading (technical, communication, completeness)
 * - Detailed, actionable feedback generation
 * 
 * No APIs, no registration, no keys - runs entirely in browser
 */

// ============================================
// TYPES
// ============================================

export interface EvaluationResult {
  score: number; // 0-100 overall score
  verdict: 'strong-hire' | 'hire' | 'lean-hire' | 'lean-no-hire' | 'no-hire';
  
  // Detailed scores (0-100 each)
  scores: {
    technical: number;      // Technical accuracy & depth
    completeness: number;   // Coverage of key concepts
    structure: number;      // Answer organization
    communication: number;  // Clarity & fluency
  };
  
  // Key points analysis
  keyPointsCovered: ConceptMatch[];
  keyPointsMissed: string[];
  
  // Feedback
  feedback: string;
  strengths: string[];
  improvements: string[];
  
  // Structure analysis
  structureAnalysis: StructureAnalysis;
  
  // Fluency metrics
  fluencyMetrics: FluencyMetrics;
}

export interface ConceptMatch {
  concept: string;
  matchedAs: string;
  confidence: 'exact' | 'synonym' | 'related' | 'partial';
}

export interface StructureAnalysis {
  hasIntroduction: boolean;
  hasExamples: boolean;
  hasConclusion: boolean;
  usesSTAR: boolean;
  starComponents: {
    situation: boolean;
    task: boolean;
    action: boolean;
    result: boolean;
  };
  organizationScore: number;
}

export interface FluencyMetrics {
  wordCount: number;
  uniqueWordRatio: number;
  fillerWordCount: number;
  fillerWords: string[];
  repetitionScore: number; // Lower is better
  averageSentenceLength: number;
  vocabularyRichness: number;
}

// ============================================
// CONCEPT KNOWLEDGE BASE
// ============================================

// Technical concepts with synonyms and related terms
const CONCEPT_KNOWLEDGE: Record<string, {
  synonyms: string[];
  related: string[];
  weight: number; // Importance weight 1-3
}> = {
  // System Design
  'scalability': {
    synonyms: ['scale', 'scaling', 'scalable', 'scales'],
    related: ['horizontal scaling', 'vertical scaling', 'elastic', 'growth', 'capacity'],
    weight: 3
  },
  'load balancer': {
    synonyms: ['load balancing', 'lb', 'balancer'],
    related: ['nginx', 'haproxy', 'round robin', 'traffic distribution', 'reverse proxy'],
    weight: 3
  },
  'caching': {
    synonyms: ['cache', 'cached', 'caches'],
    related: ['redis', 'memcached', 'cdn', 'in-memory', 'ttl', 'invalidation'],
    weight: 3
  },
  'database': {
    synonyms: ['db', 'databases', 'data store', 'datastore'],
    related: ['sql', 'nosql', 'postgres', 'mysql', 'mongodb', 'dynamodb', 'storage'],
    weight: 3
  },
  'microservices': {
    synonyms: ['microservice', 'micro-services', 'micro service'],
    related: ['distributed', 'service-oriented', 'soa', 'decoupled', 'modular'],
    weight: 2
  },
  'api': {
    synonyms: ['apis', 'endpoint', 'endpoints'],
    related: ['rest', 'graphql', 'grpc', 'interface', 'contract'],
    weight: 2
  },
  'availability': {
    synonyms: ['available', 'uptime'],
    related: ['high availability', 'ha', 'redundancy', 'failover', 'fault tolerance', '99.9%', 'sla'],
    weight: 3
  },
  'latency': {
    synonyms: ['delay', 'response time'],
    related: ['milliseconds', 'ms', 'fast', 'slow', 'performance', 'speed'],
    weight: 2
  },
  'throughput': {
    synonyms: ['bandwidth', 'capacity'],
    related: ['requests per second', 'rps', 'qps', 'tps', 'volume'],
    weight: 2
  },
  'consistency': {
    synonyms: ['consistent'],
    related: ['eventual consistency', 'strong consistency', 'cap theorem', 'acid', 'base'],
    weight: 2
  },
  'partition tolerance': {
    synonyms: ['partitioning', 'network partition'],
    related: ['cap theorem', 'distributed', 'split brain'],
    weight: 2
  },
  'replication': {
    synonyms: ['replicate', 'replicas', 'replica'],
    related: ['master-slave', 'primary-secondary', 'sync', 'async', 'copies'],
    weight: 2
  },
  'sharding': {
    synonyms: ['shard', 'shards', 'partitioning'],
    related: ['horizontal partitioning', 'distribute data', 'hash', 'range'],
    weight: 2
  },
  'message queue': {
    synonyms: ['queue', 'messaging', 'message broker'],
    related: ['kafka', 'rabbitmq', 'sqs', 'pub/sub', 'async', 'decoupling'],
    weight: 2
  },
  'cdn': {
    synonyms: ['content delivery network', 'edge'],
    related: ['cloudfront', 'akamai', 'cloudflare', 'static content', 'caching'],
    weight: 2
  },
  
  // DevOps & Cloud
  'kubernetes': {
    synonyms: ['k8s', 'kube'],
    related: ['container orchestration', 'pods', 'deployment', 'service', 'ingress'],
    weight: 3
  },
  'docker': {
    synonyms: ['containers', 'containerization'],
    related: ['image', 'dockerfile', 'compose', 'registry'],
    weight: 2
  },
  'ci/cd': {
    synonyms: ['cicd', 'ci cd', 'continuous integration', 'continuous deployment'],
    related: ['pipeline', 'jenkins', 'github actions', 'automation', 'build'],
    weight: 2
  },
  'monitoring': {
    synonyms: ['monitor', 'observability'],
    related: ['metrics', 'logging', 'alerting', 'prometheus', 'grafana', 'datadog'],
    weight: 2
  },
  'terraform': {
    synonyms: ['infrastructure as code', 'iac'],
    related: ['provisioning', 'cloudformation', 'pulumi', 'declarative'],
    weight: 2
  },
  'aws': {
    synonyms: ['amazon web services', 'amazon'],
    related: ['ec2', 's3', 'lambda', 'rds', 'cloud'],
    weight: 2
  },
  
  // Security
  'authentication': {
    synonyms: ['auth', 'authn', 'login'],
    related: ['oauth', 'jwt', 'token', 'credentials', 'identity', 'sso'],
    weight: 2
  },
  'authorization': {
    synonyms: ['authz', 'permissions'],
    related: ['rbac', 'acl', 'access control', 'roles', 'policies'],
    weight: 2
  },
  'encryption': {
    synonyms: ['encrypt', 'encrypted'],
    related: ['ssl', 'tls', 'https', 'at rest', 'in transit', 'aes'],
    weight: 2
  },
  
  // Behavioral
  'communication': {
    synonyms: ['communicate', 'communicating'],
    related: ['discuss', 'explain', 'present', 'share', 'collaborate', 'meeting'],
    weight: 3
  },
  'leadership': {
    synonyms: ['lead', 'leading', 'leader'],
    related: ['mentor', 'guide', 'influence', 'decision', 'responsibility'],
    weight: 3
  },
  'teamwork': {
    synonyms: ['team', 'collaboration', 'collaborate'],
    related: ['together', 'group', 'cross-functional', 'stakeholder'],
    weight: 3
  },
  'problem solving': {
    synonyms: ['solve', 'solving', 'solution'],
    related: ['analyze', 'debug', 'troubleshoot', 'investigate', 'root cause'],
    weight: 3
  },
  'conflict resolution': {
    synonyms: ['conflict', 'disagreement', 'resolve'],
    related: ['mediate', 'compromise', 'negotiate', 'consensus'],
    weight: 2
  },
  'prioritization': {
    synonyms: ['prioritize', 'priority', 'priorities'],
    related: ['urgent', 'important', 'deadline', 'trade-off', 'focus'],
    weight: 2
  },
  'feedback': {
    synonyms: ['review', 'critique'],
    related: ['constructive', 'improve', 'learn', 'growth'],
    weight: 2
  },
};

// Filler words to detect
const FILLER_WORDS = [
  'um', 'uh', 'like', 'you know', 'basically', 'actually', 'literally',
  'sort of', 'kind of', 'i mean', 'right', 'okay', 'so yeah', 'anyway',
  'i guess', 'i think', 'maybe', 'probably', 'stuff', 'things', 'whatever'
];

// STAR method indicators
const STAR_INDICATORS = {
  situation: ['situation', 'context', 'background', 'scenario', 'when i was', 'at my previous', 'in my role', 'there was a time'],
  task: ['task', 'goal', 'objective', 'responsible for', 'needed to', 'had to', 'my job was', 'challenge was'],
  action: ['action', 'i did', 'i decided', 'i implemented', 'i created', 'i led', 'i worked', 'steps i took', 'approach'],
  result: ['result', 'outcome', 'impact', 'achieved', 'improved', 'reduced', 'increased', 'learned', 'success']
};

// Structure indicators
const STRUCTURE_INDICATORS = {
  introduction: ['first', 'to start', 'let me explain', 'the main', 'essentially', 'in summary', 'overall'],
  examples: ['for example', 'for instance', 'such as', 'like when', 'in one case', 'specifically', 'concrete example'],
  conclusion: ['in conclusion', 'to summarize', 'overall', 'in the end', 'finally', 'the key takeaway', 'most importantly']
};

// ============================================
// MAIN EVALUATION FUNCTION
// ============================================

export function evaluateVoiceAnswer(
  userAnswer: string,
  idealAnswer: string,
  voiceKeywords?: string[],
  questionType?: 'technical' | 'behavioral' | 'system-design'
): EvaluationResult {
  const normalizedUser = normalizeText(userAnswer);
  const normalizedIdeal = normalizeText(idealAnswer);
  
  // 1. Analyze concepts coverage
  const conceptAnalysis = analyzeConceptCoverage(normalizedUser, normalizedIdeal, voiceKeywords);
  
  // 2. Analyze answer structure
  const structureAnalysis = analyzeStructure(normalizedUser, questionType);
  
  // 3. Analyze fluency
  const fluencyMetrics = analyzeFluency(userAnswer);
  
  // 4. Calculate dimension scores
  const scores = calculateDimensionScores(
    conceptAnalysis,
    structureAnalysis,
    fluencyMetrics,
    normalizedUser,
    normalizedIdeal
  );
  
  // 5. Calculate overall score (weighted average)
  const overallScore = calculateOverallScore(scores, questionType);
  
  // 6. Determine verdict
  const verdict = determineVerdict(overallScore, scores);
  
  // 7. Generate feedback
  const feedback = generateDetailedFeedback(scores, conceptAnalysis, structureAnalysis, fluencyMetrics);
  const strengths = generateStrengths(scores, conceptAnalysis, structureAnalysis, fluencyMetrics);
  const improvements = generateImprovements(scores, conceptAnalysis, structureAnalysis, fluencyMetrics);
  
  return {
    score: overallScore,
    verdict,
    scores,
    keyPointsCovered: conceptAnalysis.covered,
    keyPointsMissed: conceptAnalysis.missed,
    feedback,
    strengths,
    improvements,
    structureAnalysis,
    fluencyMetrics
  };
}

// ============================================
// TEXT NORMALIZATION
// ============================================

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ============================================
// CONCEPT ANALYSIS
// ============================================

interface ConceptAnalysisResult {
  covered: ConceptMatch[];
  missed: string[];
  coverageScore: number;
  technicalDepth: number;
}

function analyzeConceptCoverage(
  userText: string,
  idealText: string,
  voiceKeywords?: string[]
): ConceptAnalysisResult {
  // Get required concepts from voiceKeywords or extract from ideal answer
  const requiredConcepts = voiceKeywords && voiceKeywords.length > 0
    ? voiceKeywords
    : extractConceptsFromText(idealText);
  
  const covered: ConceptMatch[] = [];
  const missed: string[] = [];
  let totalWeight = 0;
  let coveredWeight = 0;
  
  for (const concept of requiredConcepts) {
    const conceptLower = concept.toLowerCase();
    const knowledgeEntry = CONCEPT_KNOWLEDGE[conceptLower];
    const weight = knowledgeEntry?.weight || 1;
    totalWeight += weight;
    
    // Check for exact match
    if (userText.includes(conceptLower)) {
      covered.push({ concept, matchedAs: concept, confidence: 'exact' });
      coveredWeight += weight;
      continue;
    }
    
    // Check for synonyms
    if (knowledgeEntry?.synonyms) {
      const synonymMatch = knowledgeEntry.synonyms.find(s => userText.includes(s));
      if (synonymMatch) {
        covered.push({ concept, matchedAs: synonymMatch, confidence: 'synonym' });
        coveredWeight += weight * 0.9;
        continue;
      }
    }
    
    // Check for related terms
    if (knowledgeEntry?.related) {
      const relatedMatch = knowledgeEntry.related.find(r => userText.includes(r));
      if (relatedMatch) {
        covered.push({ concept, matchedAs: relatedMatch, confidence: 'related' });
        coveredWeight += weight * 0.7;
        continue;
      }
    }
    
    // Check for partial/fuzzy match
    const fuzzyMatch = findFuzzyMatch(userText, conceptLower);
    if (fuzzyMatch) {
      covered.push({ concept, matchedAs: fuzzyMatch, confidence: 'partial' });
      coveredWeight += weight * 0.5;
      continue;
    }
    
    missed.push(concept);
  }
  
  const coverageScore = totalWeight > 0 ? (coveredWeight / totalWeight) * 100 : 0;
  
  // Calculate technical depth based on additional concepts mentioned
  const additionalConcepts = findAdditionalConcepts(userText, requiredConcepts);
  const technicalDepth = Math.min(100, coverageScore + (additionalConcepts.length * 5));
  
  return {
    covered,
    missed,
    coverageScore: Math.round(coverageScore),
    technicalDepth: Math.round(technicalDepth)
  };
}

function extractConceptsFromText(text: string): string[] {
  const concepts: string[] = [];
  const textLower = text.toLowerCase();
  
  // Check for known concepts
  for (const [concept, data] of Object.entries(CONCEPT_KNOWLEDGE)) {
    if (textLower.includes(concept) || data.synonyms.some(s => textLower.includes(s))) {
      concepts.push(concept);
    }
  }
  
  // Extract capitalized terms (technologies, proper nouns)
  const capitalizedPattern = /\b[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*\b/g;
  const matches = text.match(capitalizedPattern) || [];
  const filtered = matches.filter(m => 
    m.length > 3 && 
    !['The', 'This', 'That', 'When', 'What', 'How', 'Why', 'For', 'And', 'But'].includes(m)
  );
  
  for (const match of filtered.slice(0, 10)) {
    if (!concepts.includes(match.toLowerCase())) {
      concepts.push(match.toLowerCase());
    }
  }
  
  return concepts.slice(0, 15); // Limit to 15 key concepts
}

function findFuzzyMatch(text: string, term: string): string | null {
  const words = text.split(/\s+/);
  
  for (const word of words) {
    if (word.length < 3) continue;
    
    // Check if word starts with same letters (handles plurals, tenses)
    if (word.startsWith(term.slice(0, Math.min(4, term.length))) && 
        Math.abs(word.length - term.length) <= 3) {
      return word;
    }
    
    // Check Levenshtein-like similarity
    if (calculateSimilarity(word, term) > 0.7) {
      return word;
    }
  }
  
  return null;
}

function calculateSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  
  let matches = 0;
  const shorterChars = shorter.split('');
  
  for (const char of longer) {
    const idx = shorterChars.indexOf(char);
    if (idx !== -1) {
      matches++;
      shorterChars.splice(idx, 1);
    }
  }
  
  return matches / longer.length;
}

function findAdditionalConcepts(text: string, requiredConcepts: string[]): string[] {
  const additional: string[] = [];
  const requiredLower = requiredConcepts.map(c => c.toLowerCase());
  
  for (const [concept] of Object.entries(CONCEPT_KNOWLEDGE)) {
    if (!requiredLower.includes(concept) && text.includes(concept)) {
      additional.push(concept);
    }
  }
  
  return additional;
}

// ============================================
// STRUCTURE ANALYSIS
// ============================================

function analyzeStructure(text: string, questionType?: string): StructureAnalysis {
  const textLower = text.toLowerCase();
  
  // Check for introduction
  const hasIntroduction = STRUCTURE_INDICATORS.introduction.some(i => textLower.includes(i)) ||
    textLower.startsWith('so ') || textLower.startsWith('well ') || textLower.startsWith('i would');
  
  // Check for examples
  const hasExamples = STRUCTURE_INDICATORS.examples.some(i => textLower.includes(i));
  
  // Check for conclusion
  const hasConclusion = STRUCTURE_INDICATORS.conclusion.some(i => textLower.includes(i));
  
  // Check for STAR method (especially for behavioral questions)
  const starComponents = {
    situation: STAR_INDICATORS.situation.some(i => textLower.includes(i)),
    task: STAR_INDICATORS.task.some(i => textLower.includes(i)),
    action: STAR_INDICATORS.action.some(i => textLower.includes(i)),
    result: STAR_INDICATORS.result.some(i => textLower.includes(i))
  };
  
  const starCount = Object.values(starComponents).filter(Boolean).length;
  const usesSTAR = starCount >= 3;
  
  // Calculate organization score
  let organizationScore = 0;
  
  // Base points for structure elements
  if (hasIntroduction) organizationScore += 20;
  if (hasExamples) organizationScore += 25;
  if (hasConclusion) organizationScore += 15;
  
  // STAR method bonus (especially for behavioral)
  if (questionType === 'behavioral') {
    organizationScore += starCount * 10;
  } else {
    organizationScore += starCount * 5;
  }
  
  // Sentence structure analysis
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length >= 3) organizationScore += 10;
  if (sentences.length >= 5) organizationScore += 10;
  
  // Check for logical flow words
  const flowWords = ['first', 'second', 'then', 'next', 'finally', 'also', 'additionally', 'however', 'therefore'];
  const flowCount = flowWords.filter(w => textLower.includes(w)).length;
  organizationScore += Math.min(flowCount * 5, 20);
  
  return {
    hasIntroduction,
    hasExamples,
    hasConclusion,
    usesSTAR,
    starComponents,
    organizationScore: Math.min(100, organizationScore)
  };
}

// ============================================
// FLUENCY ANALYSIS
// ============================================

function analyzeFluency(text: string): FluencyMetrics {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  
  // Unique word ratio (vocabulary diversity)
  const uniqueWords = new Set(words);
  const uniqueWordRatio = wordCount > 0 ? uniqueWords.size / wordCount : 0;
  
  // Filler word detection
  const textLower = text.toLowerCase();
  const detectedFillers: string[] = [];
  let fillerCount = 0;
  
  for (const filler of FILLER_WORDS) {
    const regex = new RegExp(`\\b${filler}\\b`, 'gi');
    const matches = textLower.match(regex);
    if (matches) {
      fillerCount += matches.length;
      if (!detectedFillers.includes(filler)) {
        detectedFillers.push(filler);
      }
    }
  }
  
  // Repetition analysis
  const wordFrequency: Record<string, number> = {};
  const meaningfulWords = words.filter(w => 
    w.length > 3 && 
    !['the', 'and', 'that', 'this', 'with', 'from', 'have', 'been', 'were', 'would', 'could', 'should'].includes(w)
  );
  
  for (const word of meaningfulWords) {
    wordFrequency[word] = (wordFrequency[word] || 0) + 1;
  }
  
  // Calculate repetition score (lower is better)
  const repeatedWords = Object.values(wordFrequency).filter(count => count > 2).length;
  const repetitionScore = meaningfulWords.length > 0 
    ? (repeatedWords / meaningfulWords.length) * 100 
    : 0;
  
  // Sentence analysis
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgSentenceLength = sentences.length > 0 
    ? words.length / sentences.length 
    : words.length;
  
  // Vocabulary richness (unique meaningful words / total meaningful words)
  const uniqueMeaningful = new Set(meaningfulWords);
  const vocabularyRichness = meaningfulWords.length > 0 
    ? (uniqueMeaningful.size / meaningfulWords.length) * 100 
    : 0;
  
  return {
    wordCount,
    uniqueWordRatio: Math.round(uniqueWordRatio * 100) / 100,
    fillerWordCount: fillerCount,
    fillerWords: detectedFillers,
    repetitionScore: Math.round(repetitionScore),
    averageSentenceLength: Math.round(avgSentenceLength),
    vocabularyRichness: Math.round(vocabularyRichness)
  };
}

// ============================================
// SCORING CALCULATIONS
// ============================================

function calculateDimensionScores(
  conceptAnalysis: ConceptAnalysisResult,
  structureAnalysis: StructureAnalysis,
  fluencyMetrics: FluencyMetrics,
  userText: string,
  idealText: string
): EvaluationResult['scores'] {
  // Technical score: concept coverage + depth
  const technical = Math.round(
    (conceptAnalysis.coverageScore * 0.7) + 
    (conceptAnalysis.technicalDepth * 0.3)
  );
  
  // Completeness score: coverage + length adequacy
  const idealWordCount = idealText.split(/\s+/).length;
  const lengthRatio = Math.min(fluencyMetrics.wordCount / (idealWordCount * 0.5), 1);
  const completeness = Math.round(
    (conceptAnalysis.coverageScore * 0.6) + 
    (lengthRatio * 100 * 0.4)
  );
  
  // Structure score: organization + examples
  const structure = structureAnalysis.organizationScore;
  
  // Communication score: fluency metrics
  let communication = 100;
  
  // Penalize filler words (up to -20)
  communication -= Math.min(fluencyMetrics.fillerWordCount * 3, 20);
  
  // Penalize high repetition (up to -15)
  communication -= Math.min(fluencyMetrics.repetitionScore * 0.5, 15);
  
  // Reward vocabulary richness
  communication += Math.min((fluencyMetrics.vocabularyRichness - 50) * 0.3, 15);
  
  // Penalize very short answers
  if (fluencyMetrics.wordCount < 30) communication -= 20;
  else if (fluencyMetrics.wordCount < 50) communication -= 10;
  
  // Reward good sentence structure
  if (fluencyMetrics.averageSentenceLength >= 10 && fluencyMetrics.averageSentenceLength <= 25) {
    communication += 10;
  }
  
  communication = Math.max(0, Math.min(100, Math.round(communication)));
  
  return {
    technical: Math.max(0, Math.min(100, technical)),
    completeness: Math.max(0, Math.min(100, completeness)),
    structure: Math.max(0, Math.min(100, structure)),
    communication: communication
  };
}

function calculateOverallScore(
  scores: EvaluationResult['scores'],
  questionType?: string
): number {
  // Weight dimensions based on question type
  let weights = {
    technical: 0.35,
    completeness: 0.30,
    structure: 0.15,
    communication: 0.20
  };
  
  if (questionType === 'behavioral') {
    weights = {
      technical: 0.20,
      completeness: 0.25,
      structure: 0.30, // Structure more important for behavioral
      communication: 0.25
    };
  } else if (questionType === 'system-design') {
    weights = {
      technical: 0.40, // Technical depth more important
      completeness: 0.30,
      structure: 0.15,
      communication: 0.15
    };
  }
  
  const overall = 
    scores.technical * weights.technical +
    scores.completeness * weights.completeness +
    scores.structure * weights.structure +
    scores.communication * weights.communication;
  
  return Math.round(overall);
}

function determineVerdict(
  overallScore: number,
  scores: EvaluationResult['scores']
): EvaluationResult['verdict'] {
  // Consider both overall score and minimum dimension scores
  const minScore = Math.min(scores.technical, scores.completeness);
  
  if (overallScore >= 75 && minScore >= 50) return 'strong-hire';
  if (overallScore >= 60 && minScore >= 40) return 'hire';
  if (overallScore >= 45 && minScore >= 30) return 'lean-hire';
  if (overallScore >= 30) return 'lean-no-hire';
  return 'no-hire';
}

// ============================================
// FEEDBACK GENERATION
// ============================================

function generateDetailedFeedback(
  scores: EvaluationResult['scores'],
  conceptAnalysis: ConceptAnalysisResult,
  structureAnalysis: StructureAnalysis,
  fluencyMetrics: FluencyMetrics
): string {
  const parts: string[] = [];
  
  // Overall assessment
  const avgScore = (scores.technical + scores.completeness + scores.structure + scores.communication) / 4;
  
  if (avgScore >= 70) {
    parts.push("Strong answer that demonstrates solid understanding.");
  } else if (avgScore >= 55) {
    parts.push("Good answer with room for improvement.");
  } else if (avgScore >= 40) {
    parts.push("Decent attempt that covers some key points.");
  } else {
    parts.push("Answer needs more depth and coverage of key concepts.");
  }
  
  // Concept coverage feedback
  const coveragePercent = conceptAnalysis.coverageScore;
  if (coveragePercent >= 70) {
    parts.push(`You covered ${conceptAnalysis.covered.length} key concepts effectively.`);
  } else if (coveragePercent >= 40) {
    parts.push(`You mentioned ${conceptAnalysis.covered.length} concepts but missed some important ones.`);
  } else {
    parts.push(`Try to include more specific technical terms and concepts.`);
  }
  
  // Structure feedback
  if (structureAnalysis.usesSTAR) {
    parts.push("Great use of structured storytelling!");
  } else if (structureAnalysis.hasExamples) {
    parts.push("Good job including concrete examples.");
  }
  
  // Fluency feedback
  if (fluencyMetrics.fillerWordCount > 5) {
    parts.push(`Watch out for filler words like "${fluencyMetrics.fillerWords.slice(0, 2).join(', ')}".`);
  }
  
  return parts.join(' ');
}

function generateStrengths(
  scores: EvaluationResult['scores'],
  conceptAnalysis: ConceptAnalysisResult,
  structureAnalysis: StructureAnalysis,
  fluencyMetrics: FluencyMetrics
): string[] {
  const strengths: string[] = [];
  
  // Technical strengths
  if (scores.technical >= 60) {
    strengths.push("Demonstrated solid technical knowledge");
  }
  if (conceptAnalysis.covered.length >= 3) {
    const exactMatches = conceptAnalysis.covered.filter(c => c.confidence === 'exact');
    if (exactMatches.length > 0) {
      strengths.push(`Used correct terminology: ${exactMatches.slice(0, 3).map(c => c.concept).join(', ')}`);
    }
  }
  
  // Structure strengths
  if (structureAnalysis.usesSTAR) {
    strengths.push("Excellent use of STAR method for structured response");
  } else if (structureAnalysis.hasExamples) {
    strengths.push("Included concrete examples to illustrate points");
  }
  if (structureAnalysis.hasIntroduction && structureAnalysis.hasConclusion) {
    strengths.push("Well-organized answer with clear beginning and end");
  }
  
  // Communication strengths
  if (fluencyMetrics.fillerWordCount <= 2) {
    strengths.push("Clear and confident delivery with minimal filler words");
  }
  if (fluencyMetrics.vocabularyRichness >= 60) {
    strengths.push("Rich vocabulary demonstrating expertise");
  }
  if (fluencyMetrics.wordCount >= 80) {
    strengths.push("Comprehensive answer with good depth");
  }
  
  // Ensure at least one strength
  if (strengths.length === 0) {
    if (fluencyMetrics.wordCount >= 30) {
      strengths.push("Made an effort to provide a complete answer");
    } else {
      strengths.push("Attempted to address the question");
    }
  }
  
  return strengths.slice(0, 4);
}

function generateImprovements(
  scores: EvaluationResult['scores'],
  conceptAnalysis: ConceptAnalysisResult,
  structureAnalysis: StructureAnalysis,
  fluencyMetrics: FluencyMetrics
): string[] {
  const improvements: string[] = [];
  
  // Technical improvements
  if (scores.technical < 60 && conceptAnalysis.missed.length > 0) {
    improvements.push(`Consider mentioning: ${conceptAnalysis.missed.slice(0, 3).join(', ')}`);
  }
  if (scores.technical < 40) {
    improvements.push("Study the core technical concepts more thoroughly");
  }
  
  // Structure improvements
  if (!structureAnalysis.hasExamples) {
    improvements.push("Add specific examples from your experience");
  }
  if (!structureAnalysis.usesSTAR && scores.structure < 50) {
    improvements.push("Try using the STAR method: Situation, Task, Action, Result");
  }
  if (!structureAnalysis.hasConclusion) {
    improvements.push("End with a clear summary or key takeaway");
  }
  
  // Communication improvements
  if (fluencyMetrics.fillerWordCount > 5) {
    improvements.push(`Reduce filler words (${fluencyMetrics.fillerWords.slice(0, 2).join(', ')})`);
  }
  if (fluencyMetrics.wordCount < 50) {
    improvements.push("Provide more detailed explanations");
  }
  if (fluencyMetrics.repetitionScore > 20) {
    improvements.push("Vary your vocabulary to avoid repetition");
  }
  
  // Completeness improvements
  if (scores.completeness < 50) {
    improvements.push("Cover more aspects of the question");
  }
  
  return improvements.slice(0, 4);
}
