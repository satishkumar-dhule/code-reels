// Fuzzy search utility for finding questions
// Uses lightweight metadata for search, loads full questions only for results
import { 
  getAllQuestionMetadata, 
  loadQuestion,
  type QuestionMetadata,
  type Question 
} from './questions-lazy-loader';

// Simple fuzzy matching score - higher is better
function fuzzyScore(query: string, text: string): number {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  
  // Exact match gets highest score
  if (textLower === queryLower) return 1000;
  
  // Contains exact query
  if (textLower.includes(queryLower)) return 500 + (100 - text.length);
  
  // Word-by-word matching
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 1);
  const textWords = textLower.split(/\s+/);
  
  let score = 0;
  let consecutiveMatches = 0;
  
  for (const qWord of queryWords) {
    let wordMatched = false;
    for (const tWord of textWords) {
      // Exact word match
      if (tWord === qWord) {
        score += 50;
        wordMatched = true;
        break;
      }
      // Word starts with query word
      if (tWord.startsWith(qWord)) {
        score += 30;
        wordMatched = true;
        break;
      }
      // Word contains query word
      if (tWord.includes(qWord)) {
        score += 15;
        wordMatched = true;
        break;
      }
    }
    
    if (wordMatched) {
      consecutiveMatches++;
      score += consecutiveMatches * 5; // Bonus for consecutive matches
    } else {
      consecutiveMatches = 0;
    }
  }
  
  // Character-by-character fuzzy matching for typo tolerance
  if (score === 0 && queryLower.length >= 3) {
    let charScore = 0;
    let lastIndex = -1;
    
    for (const char of queryLower) {
      const index = textLower.indexOf(char, lastIndex + 1);
      if (index > -1) {
        charScore += 1;
        // Bonus for characters appearing in order
        if (index === lastIndex + 1) charScore += 0.5;
        lastIndex = index;
      }
    }
    
    // Only count if we matched most characters
    if (charScore >= queryLower.length * 0.6) {
      score = charScore;
    }
  }
  
  return score;
}

export interface SearchResult {
  question: Question;
  score: number;
  matchedIn: ('question' | 'channel')[];
}

// Lightweight search result using metadata only
interface MetadataSearchResult {
  metadata: QuestionMetadata;
  score: number;
  matchedIn: ('question' | 'channel')[];
}

// Search questions using metadata (fast, no full load)
function searchMetadata(query: string, limit: number = 20): MetadataSearchResult[] {
  if (!query || query.trim().length < 2) return [];
  
  const allMetadata = getAllQuestionMetadata();
  const results: MetadataSearchResult[] = [];
  
  for (const metadata of allMetadata) {
    const matchedIn: ('question' | 'channel')[] = [];
    let totalScore = 0;
    
    // Search in question text (highest weight)
    const questionScore = fuzzyScore(query, metadata.question);
    if (questionScore > 0) {
      totalScore += questionScore * 3;
      matchedIn.push('question');
    }
    
    // Search in channel
    const channelText = metadata.channel.replace(/-/g, ' ');
    const channelScore = fuzzyScore(query, channelText);
    if (channelScore > 0) {
      totalScore += channelScore * 1.5;
      matchedIn.push('channel');
    }
    
    if (totalScore > 0) {
      results.push({ metadata, score: totalScore, matchedIn });
    }
  }
  
  // Sort by score descending
  results.sort((a, b) => b.score - a.score);
  
  return results.slice(0, limit);
}

// Search questions with fuzzy matching (async - loads full questions for results)
export async function searchQuestionsAsync(query: string, limit: number = 20): Promise<SearchResult[]> {
  // First search metadata (fast)
  const metadataResults = searchMetadata(query, limit);
  
  // Then load full questions for top results
  const results: SearchResult[] = [];
  
  for (const result of metadataResults) {
    const question = await loadQuestion(result.metadata.id);
    if (question) {
      results.push({
        question,
        score: result.score,
        matchedIn: result.matchedIn
      });
    }
  }
  
  return results;
}

// Sync version for backwards compatibility (uses cached questions if available)
// Note: This searches metadata only, which is faster but less comprehensive
export function searchQuestions(query: string, limit: number = 20): SearchResult[] {
  if (!query || query.trim().length < 2) return [];
  
  const metadataResults = searchMetadata(query, limit);
  
  // Return results with metadata as partial question objects
  // The full question will be loaded when navigating
  return metadataResults.map(result => ({
    question: {
      id: result.metadata.id,
      question: result.metadata.question,
      channel: result.metadata.channel,
      difficulty: result.metadata.difficulty,
      // Partial data - full question loaded on navigation
      answer: '',
      explanation: '',
      tags: [] as string[],
      subChannel: 'general',
      hasVideo: result.metadata.hasVideo,
      hasDiagram: result.metadata.hasDiagram,
    } as Question,
    score: result.score,
    matchedIn: result.matchedIn
  }));
}

// Highlight matching text in a string
export function highlightMatch(text: string, query: string): string {
  if (!query || query.length < 2) return text;
  
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  
  // Find the best match position
  const index = textLower.indexOf(queryLower);
  if (index === -1) return text;
  
  const before = text.slice(0, index);
  const match = text.slice(index, index + query.length);
  const after = text.slice(index + query.length);
  
  return `${before}<mark>${match}</mark>${after}`;
}
