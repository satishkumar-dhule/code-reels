/**
 * Blog Quality Gates
 * 
 * Comprehensive quality validation for generated blog posts
 * Ensures logical coherence, proper structure, and high-quality content
 */

// Quality thresholds
const QUALITY_THRESHOLDS = {
  // Content requirements
  minSections: 3,
  maxSections: 8,
  minSectionLength: 150,  // characters
  maxSectionLength: 2000,
  minIntroLength: 100,
  maxIntroLength: 600,
  minConclusionLength: 100,
  maxConclusionLength: 500,
  
  // Source requirements
  minSources: 8,
  minValidSourcePercentage: 0.85, // 85% of sources must be valid
  
  // Citation requirements
  minInlineCitations: 5,
  citationDensity: 0.002, // citations per character (roughly 1 per 500 chars)
  
  // Readability
  maxAvgSentenceLength: 25, // words
  minAvgSentenceLength: 10,
  maxConsecutiveLongSentences: 3,
  
  // Coherence
  minTransitionWords: 5,
  minKeywordDensity: 0.01, // topic keywords should appear at least 1% of the time
  maxKeywordDensity: 0.05, // but not more than 5%
  
  // Structure
  minHeadingVariety: 2, // should have at least 2 different heading levels
  maxListsPerSection: 3,
  
  // Quality scores
  minOverallScore: 70, // out of 100
  minCoherenceScore: 60,
  minReadabilityScore: 60,
  minTechnicalScore: 70
};

// Transition words that indicate logical flow
const TRANSITION_WORDS = [
  'however', 'therefore', 'moreover', 'furthermore', 'consequently',
  'additionally', 'meanwhile', 'nevertheless', 'thus', 'hence',
  'accordingly', 'similarly', 'conversely', 'specifically', 'notably',
  'for example', 'for instance', 'in contrast', 'on the other hand',
  'as a result', 'in addition', 'in fact', 'in particular'
];

// First-person words that should be avoided
const FIRST_PERSON_WORDS = [
  /\bi\s/gi, /\bmy\b/gi, /\bme\b/gi, /\bmine\b/gi,
  /\bwe\s/gi, /\bour\b/gi, /\bus\b/gi, /\bours\b/gi,
  /\bi'm\b/gi, /\bi've\b/gi, /\bi'll\b/gi, /\bwe're\b/gi, /\bwe've\b/gi
];

/**
 * Validate URL by checking if it returns a valid response
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

/**
 * Extract text content from blog sections
 */
function extractTextContent(blogContent) {
  const parts = [
    blogContent.introduction || '',
    ...(blogContent.sections || []).map(s => `${s.heading || ''} ${s.content || ''}`),
    blogContent.conclusion || ''
  ];
  return parts.join(' ');
}

/**
 * Count sentences in text
 */
function countSentences(text) {
  return (text.match(/[.!?]+/g) || []).length;
}

/**
 * Count words in text
 */
function countWords(text) {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Calculate average sentence length
 */
function calculateAvgSentenceLength(text) {
  const sentences = countSentences(text);
  const words = countWords(text);
  return sentences > 0 ? words / sentences : 0;
}

/**
 * Check for consecutive long sentences
 */
function checkConsecutiveLongSentences(text, threshold = 30) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  let maxConsecutive = 0;
  let currentConsecutive = 0;
  
  for (const sentence of sentences) {
    const wordCount = countWords(sentence);
    if (wordCount > threshold) {
      currentConsecutive++;
      maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
    } else {
      currentConsecutive = 0;
    }
  }
  
  return maxConsecutive;
}

/**
 * Count transition words in text
 */
function countTransitionWords(text) {
  const lowerText = text.toLowerCase();
  return TRANSITION_WORDS.filter(word => lowerText.includes(word)).length;
}

/**
 * Check for first-person usage
 */
function checkFirstPerson(text) {
  const violations = [];
  for (const pattern of FIRST_PERSON_WORDS) {
    const matches = text.match(pattern);
    if (matches) {
      violations.push(...matches);
    }
  }
  return violations;
}

/**
 * Calculate keyword density
 */
function calculateKeywordDensity(text, keywords) {
  const lowerText = text.toLowerCase();
  const totalWords = countWords(text);
  
  let keywordCount = 0;
  for (const keyword of keywords) {
    const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'g');
    const matches = lowerText.match(regex);
    if (matches) keywordCount += matches.length;
  }
  
  return totalWords > 0 ? keywordCount / totalWords : 0;
}

/**
 * Validate source quality
 */
async function validateSources(sources) {
  if (!sources || !Array.isArray(sources)) {
    return { valid: [], invalid: [], validPercentage: 0 };
  }
  
  const valid = [];
  const invalid = [];
  
  for (const source of sources) {
    if (!source.url || !source.title) {
      invalid.push({ ...source, reason: 'Missing URL or title' });
      continue;
    }
    
    const isValid = await validateUrl(source.url);
    if (isValid) {
      valid.push(source);
    } else {
      invalid.push({ ...source, reason: 'URL returned 404 or unreachable' });
    }
  }
  
  const validPercentage = sources.length > 0 ? valid.length / sources.length : 0;
  
  return { valid, invalid, validPercentage };
}

/**
 * Count inline citations in content
 */
function countInlineCitations(blogContent) {
  const content = JSON.stringify(blogContent.sections || []);
  const matches = content.match(/\[\d+\]/g) || [];
  return matches.length;
}

/**
 * Check citation distribution across sections
 */
function checkCitationDistribution(blogContent) {
  const sections = blogContent.sections || [];
  const distribution = sections.map(section => {
    const content = section.content || '';
    const citations = (content.match(/\[\d+\]/g) || []).length;
    return {
      heading: section.heading,
      citations,
      length: content.length,
      density: content.length > 0 ? citations / content.length : 0
    };
  });
  
  const sectionsWithoutCitations = distribution.filter(d => d.citations === 0).length;
  const avgDensity = distribution.reduce((sum, d) => sum + d.density, 0) / distribution.length;
  
  return {
    distribution,
    sectionsWithoutCitations,
    avgDensity,
    wellDistributed: sectionsWithoutCitations <= Math.floor(sections.length * 0.3) // max 30% without citations
  };
}

/**
 * Validate content structure
 */
function validateStructure(blogContent) {
  const issues = [];
  const sections = blogContent.sections || [];
  
  // Check section count
  if (sections.length < QUALITY_THRESHOLDS.minSections) {
    issues.push(`Too few sections: ${sections.length} (need ${QUALITY_THRESHOLDS.minSections})`);
  }
  if (sections.length > QUALITY_THRESHOLDS.maxSections) {
    issues.push(`Too many sections: ${sections.length} (max ${QUALITY_THRESHOLDS.maxSections})`);
  }
  
  // Check section lengths
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const length = (section.content || '').length;
    
    if (length < QUALITY_THRESHOLDS.minSectionLength) {
      issues.push(`Section ${i + 1} too short: ${length} chars (need ${QUALITY_THRESHOLDS.minSectionLength})`);
    }
    if (length > QUALITY_THRESHOLDS.maxSectionLength) {
      issues.push(`Section ${i + 1} too long: ${length} chars (max ${QUALITY_THRESHOLDS.maxSectionLength})`);
    }
  }
  
  // Check intro and conclusion
  const introLength = (blogContent.introduction || '').length;
  if (introLength < QUALITY_THRESHOLDS.minIntroLength) {
    issues.push(`Introduction too short: ${introLength} chars (need ${QUALITY_THRESHOLDS.minIntroLength})`);
  }
  
  const conclusionLength = (blogContent.conclusion || '').length;
  if (conclusionLength < QUALITY_THRESHOLDS.minConclusionLength) {
    issues.push(`Conclusion too short: ${conclusionLength} chars (need ${QUALITY_THRESHOLDS.minConclusionLength})`);
  }
  
  return {
    valid: issues.length === 0,
    issues,
    score: Math.max(0, 100 - (issues.length * 15))
  };
}

/**
 * Validate readability
 */
function validateReadability(blogContent) {
  const text = extractTextContent(blogContent);
  const issues = [];
  
  // Average sentence length
  const avgSentenceLength = calculateAvgSentenceLength(text);
  if (avgSentenceLength > QUALITY_THRESHOLDS.maxAvgSentenceLength) {
    issues.push(`Sentences too long on average: ${avgSentenceLength.toFixed(1)} words (max ${QUALITY_THRESHOLDS.maxAvgSentenceLength})`);
  }
  if (avgSentenceLength < QUALITY_THRESHOLDS.minAvgSentenceLength) {
    issues.push(`Sentences too short on average: ${avgSentenceLength.toFixed(1)} words (min ${QUALITY_THRESHOLDS.minAvgSentenceLength})`);
  }
  
  // Consecutive long sentences
  const consecutiveLong = checkConsecutiveLongSentences(text);
  if (consecutiveLong > QUALITY_THRESHOLDS.maxConsecutiveLongSentences) {
    issues.push(`Too many consecutive long sentences: ${consecutiveLong} (max ${QUALITY_THRESHOLDS.maxConsecutiveLongSentences})`);
  }
  
  // First-person usage
  const firstPersonViolations = checkFirstPerson(text);
  if (firstPersonViolations.length > 0) {
    issues.push(`First-person usage detected: ${firstPersonViolations.slice(0, 3).join(', ')}${firstPersonViolations.length > 3 ? '...' : ''}`);
  }
  
  return {
    valid: issues.length === 0,
    issues,
    avgSentenceLength,
    consecutiveLong,
    firstPersonViolations: firstPersonViolations.length,
    score: Math.max(0, 100 - (issues.length * 20) - (firstPersonViolations.length * 5))
  };
}

/**
 * Validate logical coherence
 */
function validateCoherence(blogContent, question) {
  const text = extractTextContent(blogContent);
  const issues = [];
  
  // Transition words
  const transitionCount = countTransitionWords(text);
  if (transitionCount < QUALITY_THRESHOLDS.minTransitionWords) {
    issues.push(`Too few transition words: ${transitionCount} (need ${QUALITY_THRESHOLDS.minTransitionWords})`);
  }
  
  // Keyword density
  const keywords = [
    ...(blogContent.tags || []),
    ...question.question.toLowerCase().split(/\s+/).filter(w => w.length > 4)
  ];
  const keywordDensity = calculateKeywordDensity(text, keywords);
  
  if (keywordDensity < QUALITY_THRESHOLDS.minKeywordDensity) {
    issues.push(`Topic keywords too sparse: ${(keywordDensity * 100).toFixed(2)}% (need ${QUALITY_THRESHOLDS.minKeywordDensity * 100}%)`);
  }
  if (keywordDensity > QUALITY_THRESHOLDS.maxKeywordDensity) {
    issues.push(`Topic keywords too dense: ${(keywordDensity * 100).toFixed(2)}% (max ${QUALITY_THRESHOLDS.maxKeywordDensity * 100}%)`);
  }
  
  // Check if introduction mentions the main topic
  const intro = (blogContent.introduction || '').toLowerCase();
  const mainTopicMentioned = keywords.some(kw => intro.includes(kw.toLowerCase()));
  if (!mainTopicMentioned) {
    issues.push('Introduction does not clearly mention the main topic');
  }
  
  // Check if conclusion ties back to introduction
  const conclusion = (blogContent.conclusion || '').toLowerCase();
  const conclusionRelevant = keywords.some(kw => conclusion.includes(kw.toLowerCase()));
  if (!conclusionRelevant) {
    issues.push('Conclusion does not tie back to main topic');
  }
  
  return {
    valid: issues.length === 0,
    issues,
    transitionCount,
    keywordDensity,
    score: Math.max(0, 100 - (issues.length * 20))
  };
}

/**
 * Validate technical accuracy
 */
function validateTechnicalAccuracy(blogContent, question) {
  const issues = [];
  
  // Check if real-world example exists and is substantial
  const realWorldExample = blogContent.realWorldExample;
  if (!realWorldExample || !realWorldExample.company) {
    issues.push('Missing real-world example from a known company');
  } else {
    if (!realWorldExample.scenario || realWorldExample.scenario.length < 50) {
      issues.push('Real-world scenario is too brief or missing');
    }
    if (!realWorldExample.lesson || realWorldExample.lesson.length < 30) {
      issues.push('Real-world lesson is too brief or missing');
    }
  }
  
  // Check if diagram exists and is appropriate
  if (!blogContent.diagram || blogContent.diagram.length < 50) {
    issues.push('Missing or insufficient diagram');
  }
  
  // Check glossary
  const glossary = blogContent.glossary || [];
  if (glossary.length === 0) {
    issues.push('No glossary terms defined');
  }
  
  // Check quick reference
  const quickRef = blogContent.quickReference || [];
  if (quickRef.length < 3) {
    issues.push(`Too few quick reference items: ${quickRef.length} (need 3+)`);
  }
  
  return {
    valid: issues.length === 0,
    issues,
    score: Math.max(0, 100 - (issues.length * 15))
  };
}

/**
 * Main quality gate validation
 */
export async function validateBlogQuality(blogContent, question) {
  console.log('\n🔍 [QUALITY GATES] Running comprehensive validation...');
  
  const results = {
    passed: false,
    overallScore: 0,
    structure: null,
    readability: null,
    coherence: null,
    technical: null,
    sources: null,
    citations: null,
    issues: [],
    warnings: []
  };
  
  // 1. Structure validation
  console.log('   📐 Validating structure...');
  results.structure = validateStructure(blogContent);
  if (!results.structure.valid) {
    results.issues.push(...results.structure.issues);
  }
  
  // 2. Readability validation
  console.log('   📖 Validating readability...');
  results.readability = validateReadability(blogContent);
  if (!results.readability.valid) {
    results.issues.push(...results.readability.issues);
  }
  
  // 3. Coherence validation
  console.log('   🔗 Validating logical coherence...');
  results.coherence = validateCoherence(blogContent, question);
  if (!results.coherence.valid) {
    results.issues.push(...results.coherence.issues);
  }
  
  // 4. Technical accuracy validation
  console.log('   🎯 Validating technical accuracy...');
  results.technical = validateTechnicalAccuracy(blogContent, question);
  if (!results.technical.valid) {
    results.issues.push(...results.technical.issues);
  }
  
  // 5. Source validation
  console.log('   📚 Validating sources...');
  const sourceValidation = await validateSources(blogContent.sources);
  results.sources = {
    total: (blogContent.sources || []).length,
    valid: sourceValidation.valid.length,
    invalid: sourceValidation.invalid.length,
    validPercentage: sourceValidation.validPercentage,
    invalidSources: sourceValidation.invalid
  };
  
  if (sourceValidation.valid.length < QUALITY_THRESHOLDS.minSources) {
    results.issues.push(`Insufficient valid sources: ${sourceValidation.valid.length} (need ${QUALITY_THRESHOLDS.minSources})`);
  }
  if (sourceValidation.validPercentage < QUALITY_THRESHOLDS.minValidSourcePercentage) {
    results.issues.push(`Too many invalid sources: ${(sourceValidation.validPercentage * 100).toFixed(0)}% valid (need ${QUALITY_THRESHOLDS.minValidSourcePercentage * 100}%)`);
  }
  
  // 6. Citation validation
  console.log('   📝 Validating citations...');
  const inlineCitations = countInlineCitations(blogContent);
  const citationDistribution = checkCitationDistribution(blogContent);
  const text = extractTextContent(blogContent);
  const citationDensity = text.length > 0 ? inlineCitations / text.length : 0;
  
  results.citations = {
    inline: inlineCitations,
    density: citationDensity,
    distribution: citationDistribution,
    wellDistributed: citationDistribution.wellDistributed
  };
  
  if (inlineCitations < QUALITY_THRESHOLDS.minInlineCitations) {
    results.issues.push(`Too few inline citations: ${inlineCitations} (need ${QUALITY_THRESHOLDS.minInlineCitations})`);
  }
  if (citationDensity < QUALITY_THRESHOLDS.citationDensity) {
    results.warnings.push(`Low citation density: ${(citationDensity * 1000).toFixed(2)} per 1000 chars`);
  }
  if (!citationDistribution.wellDistributed) {
    results.warnings.push(`${citationDistribution.sectionsWithoutCitations} sections lack citations`);
  }
  
  // Calculate overall score
  const scores = [
    results.structure.score,
    results.readability.score,
    results.coherence.score,
    results.technical.score
  ];
  results.overallScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  
  // Determine if passed
  results.passed = 
    results.overallScore >= QUALITY_THRESHOLDS.minOverallScore &&
    results.structure.score >= QUALITY_THRESHOLDS.minReadabilityScore &&
    results.readability.score >= QUALITY_THRESHOLDS.minReadabilityScore &&
    results.coherence.score >= QUALITY_THRESHOLDS.minCoherenceScore &&
    results.technical.score >= QUALITY_THRESHOLDS.minTechnicalScore &&
    results.sources.valid >= QUALITY_THRESHOLDS.minSources;
  
  // Log results
  console.log(`\n   📊 Quality Scores:`);
  console.log(`      Overall: ${results.overallScore.toFixed(1)}/100 ${results.passed ? '✅' : '❌'}`);
  console.log(`      Structure: ${results.structure.score}/100`);
  console.log(`      Readability: ${results.readability.score}/100`);
  console.log(`      Coherence: ${results.coherence.score}/100`);
  console.log(`      Technical: ${results.technical.score}/100`);
  console.log(`      Sources: ${results.sources.valid}/${results.sources.total} valid`);
  console.log(`      Citations: ${results.citations.inline} inline`);
  
  if (results.issues.length > 0) {
    console.log(`\n   ❌ Issues (${results.issues.length}):`);
    results.issues.forEach(issue => console.log(`      - ${issue}`));
  }
  
  if (results.warnings.length > 0) {
    console.log(`\n   ⚠️  Warnings (${results.warnings.length}):`);
    results.warnings.forEach(warning => console.log(`      - ${warning}`));
  }
  
  return results;
}

/**
 * Get quality gate thresholds (for external reference)
 */
export function getQualityThresholds() {
  return { ...QUALITY_THRESHOLDS };
}

export default {
  validateBlogQuality,
  getQualityThresholds,
  validateSources,
  countInlineCitations,
  checkCitationDistribution
};
