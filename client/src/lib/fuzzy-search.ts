// Fuzzy search utility for finding questions and coding challenges
import { getAllQuestions, type Question } from './questions-loader';
import { getAllChallenges, type CodingChallenge } from './coding-challenges';

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
  matchedIn: ('question' | 'answer' | 'tags' | 'channel')[];
  type: 'question' | 'coding';
}

export interface CodingSearchResult {
  challenge: CodingChallenge;
  score: number;
  matchedIn: ('title' | 'description' | 'tags' | 'category')[];
  type: 'coding';
}

// Search questions with fuzzy matching
export function searchQuestions(query: string, limit: number = 20): SearchResult[] {
  if (!query || query.trim().length < 2) return [];
  
  const allQuestions = getAllQuestions();
  const resultsMap = new Map<string, SearchResult>(); // Dedupe by question ID
  
  // Check if this is an explicit tag search (e.g., "tag:react" or "#react")
  const tagSearchMatch = query.match(/^(?:tag:|#)(.+)$/i);
  const isTagSearch = !!tagSearchMatch;
  const searchQuery = isTagSearch ? tagSearchMatch[1].trim() : query;
  
  for (const question of allQuestions) {
    // Skip if we already have a result for this question ID (keep highest score)
    const existingResult = resultsMap.get(question.id);
    
    const matchedIn: ('question' | 'answer' | 'tags' | 'channel')[] = [];
    let totalScore = 0;
    
    // If explicit tag search, only search in tags with high priority
    if (isTagSearch) {
      const tagsText = question.tags?.join(' ') || '';
      const tagsScore = fuzzyScore(searchQuery, tagsText);
      if (tagsScore > 0) {
        totalScore += tagsScore * 10; // Very high weight for explicit tag searches
        matchedIn.push('tags');
      }
    } else {
      // Normal search across all fields
      
      // Search in question text (highest weight)
      const questionScore = fuzzyScore(searchQuery, question.question);
      if (questionScore > 0) {
        totalScore += questionScore * 3;
        matchedIn.push('question');
      }
      
      // Search in answer
      const answerScore = fuzzyScore(searchQuery, question.answer);
      if (answerScore > 0) {
        totalScore += answerScore * 1.5;
        matchedIn.push('answer');
      }
      
      // Search in tags (higher weight than before)
      const tagsText = question.tags?.join(' ') || '';
      const tagsScore = fuzzyScore(searchQuery, tagsText);
      if (tagsScore > 0) {
        totalScore += tagsScore * 4; // Increased from 2 to 4
        matchedIn.push('tags');
      }
      
      // Search in channel/subchannel
      const channelText = `${question.channel} ${question.subChannel}`.replace(/-/g, ' ');
      const channelScore = fuzzyScore(searchQuery, channelText);
      if (channelScore > 0) {
        totalScore += channelScore * 1.5;
        matchedIn.push('channel');
      }
    }
    
    if (totalScore > 0) {
      // Only add if no existing result or this one has higher score
      if (!existingResult || totalScore > existingResult.score) {
        resultsMap.set(question.id, { question, score: totalScore, matchedIn, type: 'question' });
      }
    }
  }
  
  // Convert map to array and sort by score descending
  const results = Array.from(resultsMap.values());
  results.sort((a, b) => b.score - a.score);
  
  return results.slice(0, limit);
}

// Search coding challenges with fuzzy matching
export function searchCodingChallenges(query: string, limit: number = 10): CodingSearchResult[] {
  if (!query || query.trim().length < 2) return [];
  
  const allChallenges = getAllChallenges();
  const results: CodingSearchResult[] = [];
  
  for (const challenge of allChallenges) {
    const matchedIn: ('title' | 'description' | 'tags' | 'category')[] = [];
    let totalScore = 0;
    
    // Search in title (highest weight)
    const titleScore = fuzzyScore(query, challenge.title);
    if (titleScore > 0) {
      totalScore += titleScore * 3;
      matchedIn.push('title');
    }
    
    // Search in description
    const descScore = fuzzyScore(query, challenge.description);
    if (descScore > 0) {
      totalScore += descScore * 1.5;
      matchedIn.push('description');
    }
    
    // Search in tags
    const tagsText = challenge.tags?.join(' ') || '';
    const tagsScore = fuzzyScore(query, tagsText);
    if (tagsScore > 0) {
      totalScore += tagsScore * 2;
      matchedIn.push('tags');
    }
    
    // Search in category
    const categoryScore = fuzzyScore(query, challenge.category.replace(/-/g, ' '));
    if (categoryScore > 0) {
      totalScore += categoryScore * 1.5;
      matchedIn.push('category');
    }
    
    if (totalScore > 0) {
      results.push({ challenge, score: totalScore, matchedIn, type: 'coding' });
    }
  }
  
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

// Combined search for both questions and coding challenges
export type UnifiedSearchResult = SearchResult | CodingSearchResult;

export function searchAll(query: string, limit: number = 20): UnifiedSearchResult[] {
  const questionResults = searchQuestions(query, limit);
  const codingResults = searchCodingChallenges(query, Math.floor(limit / 2));
  
  // Combine and sort by score
  const combined: UnifiedSearchResult[] = [...questionResults, ...codingResults];
  combined.sort((a, b) => b.score - a.score);
  
  return combined.slice(0, limit);
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
