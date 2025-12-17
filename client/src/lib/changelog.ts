/**
 * Changelog data - static for now, can be fetched from API later
 * This replaces the deleted changelog.json
 */

export interface ChangelogEntry {
  date: string;
  type: 'added' | 'improved' | 'initial' | 'feature';
  title: string;
  description: string;
  details?: {
    questionsAdded?: number;
    questionsImproved?: number;
    channels?: string[];
    questionIds?: string[];
    features?: string[];
  };
}

export interface ChangelogData {
  entries: ChangelogEntry[];
  stats: {
    totalQuestionsAdded: number;
    totalQuestionsImproved: number;
    lastUpdated: string;
  };
}

// Static changelog data - questions are now served from Turso database
export const changelog: ChangelogData = {
  entries: [
    {
      date: new Date().toISOString().split('T')[0],
      type: 'feature',
      title: 'Migrated to Turso Database',
      description: 'All questions are now served from Turso database for better performance and real-time updates.',
      details: {
        features: [
          'Questions served from Turso database',
          'Real-time updates without deployments',
          'Improved API performance',
          'Read-only credentials for serving'
        ]
      }
    }
  ],
  stats: {
    totalQuestionsAdded: 283,
    totalQuestionsImproved: 0,
    lastUpdated: new Date().toISOString()
  }
};

export default changelog;
