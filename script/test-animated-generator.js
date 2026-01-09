#!/usr/bin/env node
/**
 * Test Animated Illustration Generator
 * Run: node script/test-animated-generator.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  generateAnimatedSceneSVG, 
  getAvailableAnimatedScenes,
  detectAnimatedScene 
} from './ai/utils/animated-illustration-generator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '../test-svg-output/animated');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log('🎬 Testing Animated Illustration Generator\n');
console.log('Features: CSS animations, typing effects, floating elements, confetti\n');

const scenes = getAvailableAnimatedScenes();
console.log('📋 Available animated scenes:', scenes.join(', '), '\n');

console.log('🖼️  Generating animated SVGs...\n');
const results = [];

for (const sceneName of scenes) {
  try {
    const title = `${sceneName.charAt(0).toUpperCase() + sceneName.slice(1)} - Animated`;
    const svg = generateAnimatedSceneSVG(sceneName, title);
    const filename = `animated-${sceneName}.svg`;
    fs.writeFileSync(path.join(OUTPUT_DIR, filename), svg);
    results.push({ scene: sceneName, status: '✅', filename });
    console.log(`   ✅ ${sceneName} -> ${filename}`);
  } catch (err) {
    results.push({ scene: sceneName, status: '❌', error: err.message });
    console.log(`   ❌ ${sceneName}: ${err.message}`);
  }
}


// Create HTML gallery
const galleryHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Animated SVG Gallery</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #f5f5f5; padding: 20px; }
    h1 { text-align: center; margin-bottom: 10px; }
    .subtitle { text-align: center; color: #666; margin-bottom: 30px; }
    .gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 20px; max-width: 1400px; margin: 0 auto; }
    .card { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.15); }
    .card img, .card object { width: 100%; height: auto; display: block; }
    .card-info { padding: 12px 16px; border-top: 1px solid #eee; }
    .card-title { font-size: 14px; font-weight: 600; }
    .note { text-align: center; margin-top: 30px; padding: 20px; background: #e8f5e9; border-radius: 8px; max-width: 800px; margin-left: auto; margin-right: auto; }
  </style>
</head>
<body>
  <h1>🎬 Animated SVG Illustrations</h1>
  <p class="subtitle">CSS animations embedded in SVG - Open in browser to see animations</p>
  <div class="gallery">
    ${results.filter(r => r.status === '✅').map(r => `
    <div class="card">
      <object type="image/svg+xml" data="${r.filename}"></object>
      <div class="card-info">
        <div class="card-title">${r.scene}</div>
      </div>
    </div>`).join('')}
  </div>
  <div class="note">
    <strong>💡 Tip:</strong> These SVGs contain CSS animations. Open the gallery.html file in a browser to see the animations in action!
    <br><br>
    <strong>🎥 GIF Conversion:</strong> Use tools like <code>svg-to-gif</code>, <code>puppeteer</code>, or online converters to create GIFs for LinkedIn.
  </div>
</body>
</html>`;

fs.writeFileSync(path.join(OUTPUT_DIR, 'gallery.html'), galleryHtml);

console.log(`\n✅ Generated ${results.filter(r => r.status === '✅').length}/${scenes.length} animated illustrations!`);
console.log(`\n📂 Output: ${OUTPUT_DIR}`);
console.log(`\n🌐 Open the gallery to see animations:`);
console.log(`   open "${OUTPUT_DIR}/gallery.html"`);
console.log(`\n🎬 Animation features included:`);
console.log('   • Typing animations on laptops');
console.log('   • Waving and nodding characters');
console.log('   • Floating decorative elements');
console.log('   • Growing chart bars');
console.log('   • Confetti particles (success scene)');
console.log('   • Sparkle effects');
console.log('   • Pulsing notifications');
console.log('   • Typewriter text effects');
