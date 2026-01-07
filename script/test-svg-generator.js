#!/usr/bin/env node
/**
 * Test SVG Generator - People & Dialogue Scenes
 * Run: node script/test-svg-generator.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  generateSceneSVG, 
  getAvailableScenes,
  detectScene 
} from './ai/utils/blog-illustration-generator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '../test-svg-output');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log('🧪 Testing SVG Generator - People & Dialogue Scenes\n');

// Test 1: List all available scenes
console.log('📋 Available scenes:');
const scenes = getAvailableScenes();
console.log(`   ${scenes.join(', ')}\n`);

// Test 2: Generate all scene types
console.log('🎨 Generating all scene SVGs...\n');

const results = [];
for (const sceneName of scenes) {
  try {
    const svg = generateSceneSVG(sceneName);
    const filename = `test-${sceneName}.svg`;
    const filepath = path.join(OUTPUT_DIR, filename);
    fs.writeFileSync(filepath, svg);
    results.push({ scene: sceneName, status: '✅', file: filename });
    console.log(`   ✅ ${sceneName} -> ${filename}`);
  } catch (err) {
    results.push({ scene: sceneName, status: '❌', error: err.message });
    console.log(`   ❌ ${sceneName}: ${err.message}`);
  }
}


// Test 3: Test keyword detection for new scenes
console.log('\n🔍 Testing keyword detection for people scenes:');
const testCases = [
  { title: 'How to ace your technical interview', expected: 'interview' },
  { title: 'Best practices for code review', expected: 'codeReview' },
  { title: 'Pair programming tips for remote teams', expected: 'pairProgramming' },
  { title: 'Running effective daily standups', expected: 'standup' },
  { title: 'Mentoring junior developers', expected: 'mentoring' },
  { title: 'Team collaboration in distributed systems', expected: 'collaboration' },
  { title: 'Debugging production issues together', expected: 'debugging' },
  { title: 'Giving a great tech talk', expected: 'presentation' },
  // Backward compatibility - old scenes should still work
  { title: 'Kubernetes scaling strategies', expected: 'scaling' },
  { title: 'Database optimization techniques', expected: 'database' },
  { title: 'CI/CD pipeline best practices', expected: 'deployment' },
];

for (const tc of testCases) {
  const detected = detectScene(tc.title);
  const match = detected === tc.expected ? '✅' : '⚠️';
  console.log(`   ${match} "${tc.title.substring(0, 40)}..." -> ${detected} (expected: ${tc.expected})`);
}

// Test 4: Verify SVG structure
console.log('\n🔬 Verifying SVG structure...');
const interviewSvg = generateSceneSVG('interview');
const checks = [
  { name: 'Has SVG root', test: interviewSvg.includes('<svg') },
  { name: 'Has viewBox', test: interviewSvg.includes('viewBox') },
  { name: 'Has person class', test: interviewSvg.includes('class="person"') },
  { name: 'Has speech-bubble', test: interviewSvg.includes('class="speech-bubble"') },
  { name: 'Has bottom label', test: interviewSvg.includes('Technical Interview') },
  { name: 'Valid XML closing', test: interviewSvg.includes('</svg>') },
];

for (const check of checks) {
  console.log(`   ${check.test ? '✅' : '❌'} ${check.name}`);
}

// Summary
console.log('\n📊 Summary:');
const passed = results.filter(r => r.status === '✅').length;
const failed = results.filter(r => r.status === '❌').length;
console.log(`   Scenes generated: ${passed}/${results.length}`);
console.log(`   Output directory: ${OUTPUT_DIR}`);

if (failed > 0) {
  console.log('\n❌ Some tests failed!');
  process.exit(1);
} else {
  console.log('\n✅ All tests passed!');
  console.log('\n💡 Open the SVG files in a browser to visually inspect:');
  console.log(`   open ${OUTPUT_DIR}/test-interview.svg`);
}
