import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = 'client/public';
const BASE_URL = 'https://reel-interview.github.io';

// All channels from channels-config.ts with SEO metadata
const channels = [
  { id: 'system-design', name: 'System Design', priority: '0.9' },
  { id: 'algorithms', name: 'Algorithms', priority: '0.9' },
  { id: 'frontend', name: 'Frontend', priority: '0.9' },
  { id: 'backend', name: 'Backend', priority: '0.9' },
  { id: 'database', name: 'Database', priority: '0.8' },
  { id: 'devops', name: 'DevOps', priority: '0.8' },
  { id: 'sre', name: 'SRE', priority: '0.8' },
  { id: 'kubernetes', name: 'Kubernetes', priority: '0.8' },
  { id: 'aws', name: 'AWS', priority: '0.8' },
  { id: 'terraform', name: 'Terraform', priority: '0.7' },
  { id: 'data-engineering', name: 'Data Engineering', priority: '0.7' },
  { id: 'machine-learning', name: 'Machine Learning', priority: '0.8' },
  { id: 'generative-ai', name: 'Generative AI', priority: '0.9' },
  { id: 'prompt-engineering', name: 'Prompt Engineering', priority: '0.8' },
  { id: 'llm-ops', name: 'LLMOps', priority: '0.7' },
  { id: 'computer-vision', name: 'Computer Vision', priority: '0.7' },
  { id: 'nlp', name: 'NLP', priority: '0.7' },
  { id: 'python', name: 'Python', priority: '0.8' },
  { id: 'security', name: 'Security', priority: '0.8' },
  { id: 'networking', name: 'Networking', priority: '0.7' },
  { id: 'operating-systems', name: 'Operating Systems', priority: '0.7' },
  { id: 'linux', name: 'Linux', priority: '0.7' },
  { id: 'unix', name: 'Unix', priority: '0.6' },
  { id: 'ios', name: 'iOS', priority: '0.7' },
  { id: 'android', name: 'Android', priority: '0.7' },
  { id: 'react-native', name: 'React Native', priority: '0.7' },
  { id: 'testing', name: 'Testing', priority: '0.8' },
  { id: 'e2e-testing', name: 'E2E Testing', priority: '0.7' },
  { id: 'api-testing', name: 'API Testing', priority: '0.7' },
  { id: 'performance-testing', name: 'Performance Testing', priority: '0.7' },
  { id: 'engineering-management', name: 'Engineering Management', priority: '0.7' },
  { id: 'behavioral', name: 'Behavioral', priority: '0.8' }
];

// Static pages with SEO metadata
const staticPages = [
  { path: '/', priority: '1.0', changefreq: 'daily', title: 'Home' },
  { path: '/channels', priority: '0.9', changefreq: 'daily', title: 'All Channels' },
  { path: '/whats-new', priority: '0.8', changefreq: 'daily', title: 'What\'s New' },
  { path: '/about', priority: '0.6', changefreq: 'monthly', title: 'About' },
  { path: '/stats', priority: '0.7', changefreq: 'weekly', title: 'Statistics' },
  { path: '/bot-activity', priority: '0.6', changefreq: 'daily', title: 'Bot Activity' },
];

function generateSitemap() {
  const today = new Date().toISOString().split('T')[0];

  let urls = '';

  // Add static pages
  staticPages.forEach(page => {
    urls += `
  <url>
    <loc>${BASE_URL}${page.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
  });

  // Add channel pages
  channels.forEach(channel => {
    urls += `
  <url>
    <loc>${BASE_URL}/channel/${channel.id}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>${channel.priority}</priority>
  </url>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urls}
</urlset>`;
}

// Generate robots.txt
function generateRobotsTxt() {
  return `# Code Reels - Technical Interview Prep
# https://reel-interview.github.io

User-agent: *
Allow: /

# Sitemaps
Sitemap: ${BASE_URL}/sitemap.xml

# Crawl-delay for polite crawling
Crawl-delay: 1

# Disallow admin/internal paths (none currently)
# Disallow: /admin/
`;
}

function main() {
  console.log('=== 🔍 SEO Files Generator ===\n');

  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Generate and write sitemap
  const sitemap = generateSitemap();
  const sitemapPath = path.join(OUTPUT_DIR, 'sitemap.xml');
  fs.writeFileSync(sitemapPath, sitemap);
  console.log(`✅ Sitemap generated: ${sitemapPath}`);

  // Generate and write robots.txt
  const robotsTxt = generateRobotsTxt();
  const robotsPath = path.join(OUTPUT_DIR, 'robots.txt');
  fs.writeFileSync(robotsPath, robotsTxt);
  console.log(`✅ Robots.txt generated: ${robotsPath}`);

  console.log(`\n📊 Summary:`);
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   Static pages: ${staticPages.length}`);
  console.log(`   Channel pages: ${channels.length}`);
  console.log(`   Total URLs: ${staticPages.length + channels.length}`);
}

main();
