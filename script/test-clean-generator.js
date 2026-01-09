#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateCleanSceneSVG, getAvailableCleanScenes } from './ai/utils/clean-illustration-generator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '../test-svg-output/clean');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

console.log('🎨 Testing Clean Illustration Generator v4\n');

const scenes = getAvailableCleanScenes();
console.log('Scenes:', scenes.join(', '), '\n');

for (const scene of scenes) {
  const svg = generateCleanSceneSVG(scene, `${scene.charAt(0).toUpperCase() + scene.slice(1)} - Clean Design`);
  fs.writeFileSync(path.join(OUTPUT_DIR, `clean-${scene}.svg`), svg);
  console.log(`✅ ${scene}`);
}

// Create gallery
const html = `<!DOCTYPE html>
<html><head><title>Clean SVG Gallery</title>
<style>
body{font-family:system-ui;background:#f5f5f5;padding:20px}
h1{text-align:center}
.gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(400px,1fr));gap:20px;max-width:1400px;margin:0 auto}
.card{background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)}
.card img{width:100%;display:block}
.card-info{padding:12px;border-top:1px solid #eee;font-weight:600}
</style></head><body>
<h1>🎨 Clean Illustrations v4</h1>
<p style="text-align:center;color:#666">Properly proportioned, logical compositions</p>
<div class="gallery">
${scenes.map(s => `<div class="card"><img src="clean-${s}.svg"><div class="card-info">${s}</div></div>`).join('')}
</div></body></html>`;

fs.writeFileSync(path.join(OUTPUT_DIR, 'gallery.html'), html);

console.log(`\n✅ Generated ${scenes.length} clean illustrations`);
console.log(`📂 ${OUTPUT_DIR}`);
console.log(`\nopen "${OUTPUT_DIR}/gallery.html"`);
