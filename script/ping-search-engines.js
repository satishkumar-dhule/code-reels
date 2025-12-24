#!/usr/bin/env node
/**
 * 🔍 Ping Search Engines
 * Notifies Google and Bing about sitemap updates
 * Run after deploying: node script/ping-search-engines.js
 */

import https from 'https';

const SITE_URL = 'https://open-interview.github.io';
const SITEMAP_URL = `${SITE_URL}/sitemap.xml`;

const searchEngines = [
  {
    name: 'Google',
    url: `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`
  },
  {
    name: 'Bing',
    url: `https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`
  }
];

async function pingSearchEngine(engine) {
  return new Promise((resolve) => {
    const req = https.get(engine.url, { timeout: 10000 }, (res) => {
      if (res.statusCode === 200) {
        console.log(`✅ ${engine.name}: Pinged successfully`);
        resolve(true);
      } else {
        console.log(`⚠️ ${engine.name}: HTTP ${res.statusCode}`);
        resolve(false);
      }
    });
    
    req.on('error', (err) => {
      console.log(`❌ ${engine.name}: ${err.message}`);
      resolve(false);
    });
    
    req.on('timeout', () => {
      req.destroy();
      console.log(`⏱️ ${engine.name}: Timeout`);
      resolve(false);
    });
  });
}

async function main() {
  console.log('=== 🔍 Pinging Search Engines ===\n');
  console.log(`Sitemap: ${SITEMAP_URL}\n`);
  
  for (const engine of searchEngines) {
    await pingSearchEngine(engine);
  }
  
  console.log('\n📋 Next Steps:');
  console.log('1. Go to Google Search Console: https://search.google.com/search-console');
  console.log('2. Add property: https://open-interview.github.io');
  console.log('3. Verify ownership with HTML meta tag');
  console.log('4. Submit sitemap: sitemap.xml');
  console.log('5. Use URL Inspection to request indexing for key pages');
  console.log('\n=== Done ===');
}

main();
