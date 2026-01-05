/**
 * RCA/Postmortem Search Template
 * Generates incident details based on known company postmortems
 * 
 * Note: Since AI doesn't have real-time web search, this template uses
 * the AI's knowledge of famous incidents and postmortems from training data.
 */

// Well-known incidents from various companies (for reference/seeding)
const KNOWN_INCIDENTS = {
  'Google': [
    { title: 'Gmail Outage 2020', type: 'outage', hint: 'Storage quota system failure' },
    { title: 'YouTube Global Outage 2018', type: 'outage', hint: 'Routing configuration change' },
    { title: 'Google Cloud Networking Incident 2019', type: 'outage', hint: 'Network configuration error' }
  ],
  'Meta': [
    { title: 'Facebook 6-Hour Outage 2021', type: 'outage', hint: 'BGP routing withdrawal' },
    { title: 'Instagram Outage 2019', type: 'outage', hint: 'Server configuration change' }
  ],
  'Amazon': [
    { title: 'S3 Outage 2017', type: 'outage', hint: 'Human error in playbook command' },
    { title: 'Prime Day Outage 2018', type: 'outage', hint: 'Database scaling issues' },
    { title: 'Kinesis Outage 2020', type: 'outage', hint: 'Thread starvation in frontend servers' }
  ],
  'Netflix': [
    { title: 'Christmas Eve Outage 2012', type: 'outage', hint: 'AWS ELB issues' },
    { title: 'Streaming Degradation 2016', type: 'performance', hint: 'CDN capacity issues' }
  ],
  'GitHub': [
    { title: '24-Hour Outage 2018', type: 'outage', hint: 'Database failover and replication lag' },
    { title: 'Actions Outage 2020', type: 'outage', hint: 'Database connection pool exhaustion' }
  ],
  'Cloudflare': [
    { title: 'Global Outage 2019', type: 'outage', hint: 'Regex CPU exhaustion in WAF' },
    { title: 'Backbone Outage 2020', type: 'outage', hint: 'Router configuration error' }
  ],
  'Slack': [
    { title: 'January 2021 Outage', type: 'outage', hint: 'Database infrastructure issues' },
    { title: 'Connectivity Issues 2020', type: 'outage', hint: 'AWS dependency failure' }
  ],
  'Stripe': [
    { title: 'API Degradation 2019', type: 'performance', hint: 'Database migration issues' }
  ],
  'Uber': [
    { title: 'Surge Pricing Incident', type: 'outage', hint: 'Demand prediction system failure' },
    { title: 'Payment Processing Outage', type: 'outage', hint: 'Database replication lag' }
  ],
  'Airbnb': [
    { title: 'Search Outage 2019', type: 'outage', hint: 'Elasticsearch cluster failure' }
  ],
  'Discord': [
    { title: 'Voice Server Outage 2020', type: 'outage', hint: 'Google Cloud networking issues' }
  ],
  'Spotify': [
    { title: 'Global Outage 2020', type: 'outage', hint: 'Google Cloud DNS issues' }
  ],
  'Fastly': [
    { title: 'Global CDN Outage 2021', type: 'outage', hint: 'Software bug triggered by customer config' }
  ],
  'Atlassian': [
    { title: 'Cloud Outage 2022', type: 'outage', hint: 'Script deleted customer data during maintenance' }
  ],
  'GitLab': [
    { title: 'Database Deletion 2017', type: 'data-loss', hint: 'Accidental rm -rf on production database' }
  ],
  'Roblox': [
    { title: '73-Hour Outage 2021', type: 'outage', hint: 'HashiCorp Consul cluster failure' }
  ],
  'CrowdStrike': [
    { title: 'Global IT Outage 2024', type: 'outage', hint: 'Faulty sensor update caused Windows BSOD' }
  ]
};

export const schema = {
  incidents: [
    {
      title: "Incident title",
      date: "When it happened (YYYY-MM or approximate)",
      description: "What happened - the incident summary",
      impact: "User/business impact",
      rootCause: "Technical root cause",
      lesson: "Key lesson learned",
      sourceUrl: "URL to the postmortem/blog post",
      sourceTitle: "Title of the source article",
      type: "outage|data-loss|security|performance|deployment"
    }
  ]
};

export function build(context) {
  const { company } = context;
  
  // Get known incidents for this company if available
  const knownIncidents = KNOWN_INCIDENTS[company] || [];
  const incidentHints = knownIncidents.length > 0 
    ? `\nKNOWN ${company.toUpperCase()} INCIDENTS (use these as reference):\n${knownIncidents.map(i => `- ${i.title}: ${i.hint}`).join('\n')}`
    : '';
  
  return `You are a technical researcher with deep knowledge of famous tech incidents and postmortems.

TASK: Provide details about 1-2 REAL, DOCUMENTED incidents from ${company} that have been publicly discussed in engineering blogs, postmortems, or tech news.

REQUIREMENTS:
1. These must be REAL incidents that actually happened
2. Use your knowledge of famous tech incidents and postmortems
3. Provide realistic source URLs (engineering blogs, status pages)
4. Focus on interesting technical failures with good lessons
${incidentHints}

COMMON POSTMORTEM SOURCES FOR ${company.toUpperCase()}:
- ${company.toLowerCase().replace(/\s+/g, '')}.engineering (if they have an engineering blog)
- ${company.toLowerCase().replace(/\s+/g, '')}.com/blog/engineering
- status.${company.toLowerCase().replace(/\s+/g, '')}.com
- GitHub repositories with postmortem collections
- Conference talks (Strange Loop, QCon, etc.)

For each incident, provide:
- title: A descriptive title for the incident
- date: When it happened (be as accurate as possible)
- description: 2-3 sentence summary of what went wrong
- impact: How users/business were affected (duration, users affected)
- rootCause: The technical root cause explained clearly
- lesson: The key takeaway/lesson learned
- sourceUrl: Most likely URL where postmortem was published
- sourceTitle: Title of the source article
- type: Category (outage, data-loss, security, performance, deployment)

If you don't have reliable knowledge about ${company} incidents, provide your best educated guess based on common patterns for similar companies, but make it realistic and educational.

Output JSON format:
${JSON.stringify(schema, null, 2)}

Output ONLY valid JSON, no markdown code blocks.`;
}

export default { schema, build };
