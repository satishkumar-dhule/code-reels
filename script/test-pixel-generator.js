#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generatePixelSceneSVG, getAvailablePixelScenes } from './ai/utils/pixel-illustration-generator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '../test-svg-output/pixel');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

console.log('🎮 Testing 16-bit Pixel Art Illustration Generator\n');

const scenes = getAvailablePixelScenes();
console.log('Scenes:', scenes.join(', '), '\n');

for (const scene of scenes) {
  const svg = generatePixelSceneSVG(scene, `${scene.charAt(0).toUpperCase() + scene.slice(1)} - Pixel Art`);
  fs.writeFileSync(path.join(OUTPUT_DIR, `pixel-${scene}.svg`), svg);
  console.log(`✅ ${scene}`);
}

// Create gallery HTML
const html = `<!DOCTYPE html>
<html><head><title>🎮 Pixel Art SVG Gallery</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
body{font-family:'Press Start 2P',monospace,system-ui;background:#1a1a2e;color:#fff;padding:20px}
h1{text-align:center;color:#FDCB6E;text-shadow:3px 3px 0 #E17055}
p{text-align:center;color:#8b949e;font-size:10px}
.gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(400px,1fr));gap:20px;max-width:1400px;margin:0 auto}
.card{background:#0d1117;border-radius:8px;overflow:hidden;border:3px solid #30363d;image-rendering:pixelated}
.card:hover{border-color:#5B8DEF;transform:scale(1.02);transition:all 0.2s}
.card img{width:100%;display:block;image-rendering:pixelated}
.card-info{padding:12px;border-top:3px solid #30363d;font-size:10px;color:#FDCB6E;text-transform:uppercase}
</style></head><body>
<h1>🎮 Pixel Art Illustrations</h1>
<p>16-bit NES-style characters with CSS animations</p>
<div class="gallery">
${scenes.map(s => `<div class="card"><img src="pixel-${s}.svg"><div class="card-info">${s}</div></div>`).join('')}
</div></body></html>`;

fs.writeFileSync(path.join(OUTPUT_DIR, 'gallery.html'), html);

console.log(`\n✅ Generated ${scenes.length} pixel art illustrations`);
console.log(`📂 ${OUTPUT_DIR}`);
console.log(`\nopen "${OUTPUT_DIR}/gallery.html"`);
