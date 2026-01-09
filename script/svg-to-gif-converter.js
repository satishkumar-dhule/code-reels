#!/usr/bin/env node
/**
 * SVG to GIF Converter for LinkedIn
 * 
 * This script converts animated SVGs to GIFs using Puppeteer
 * 
 * Prerequisites:
 *   npm install puppeteer gif-encoder-2 canvas
 * 
 * Usage:
 *   node script/svg-to-gif-converter.js <input.svg> [output.gif]
 *   node script/svg-to-gif-converter.js --batch <directory>
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Check if puppeteer is available
async function checkDependencies() {
  try {
    await import('puppeteer');
    return true;
  } catch {
    console.log('⚠️  Puppeteer not installed. Install with:');
    console.log('   npm install puppeteer\n');
    return false;
  }
}

async function convertSvgToGif(svgPath, outputPath, options = {}) {
  const {
    width = 800,
    height = 500,
    duration = 4000, // 4 seconds
    fps = 15,
    quality = 10,
  } = options;

  const puppeteer = await import('puppeteer');
  const browser = await puppeteer.default.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.setViewport({ width, height });
  
  // Read SVG content
  const svgContent = fs.readFileSync(svgPath, 'utf-8');
  
  // Create HTML wrapper
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; }
        body { background: white; }
        svg { display: block; }
      </style>
    </head>
    <body>${svgContent}</body>
    </html>
  `;
  
  await page.setContent(html, { waitUntil: 'networkidle0' });
  
  // Capture frames
  const frames = [];
  const frameCount = Math.floor(duration / 1000 * fps);
  const frameDelay = 1000 / fps;
  
  console.log(`   Capturing ${frameCount} frames...`);
  
  for (let i = 0; i < frameCount; i++) {
    const screenshot = await page.screenshot({ type: 'png' });
    frames.push(screenshot);
    await new Promise(r => setTimeout(r, frameDelay));
  }
  
  await browser.close();
  
  // Create GIF using gif-encoder-2
  try {
    const GIFEncoder = (await import('gif-encoder-2')).default;
    const { createCanvas, loadImage } = await import('canvas');
    
    const encoder = new GIFEncoder(width, height);
    encoder.setDelay(Math.floor(1000 / fps));
    encoder.setQuality(quality);
    encoder.setRepeat(0); // Loop forever
    
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    encoder.start();
    
    for (const frame of frames) {
      const img = await loadImage(frame);
      ctx.drawImage(img, 0, 0);
      encoder.addFrame(ctx);
    }
    
    encoder.finish();
    
    fs.writeFileSync(outputPath, encoder.out.getData());
    console.log(`   ✅ Created: ${outputPath}`);
    return true;
  } catch (err) {
    console.log('   ⚠️  gif-encoder-2 or canvas not installed.');
    console.log('   Install with: npm install gif-encoder-2 canvas');
    
    // Fallback: save as PNG sequence
    const pngDir = outputPath.replace('.gif', '-frames');
    if (!fs.existsSync(pngDir)) fs.mkdirSync(pngDir, { recursive: true });
    
    frames.forEach((frame, i) => {
      fs.writeFileSync(path.join(pngDir, `frame-${String(i).padStart(3, '0')}.png`), frame);
    });
    
    console.log(`   📁 Saved ${frames.length} PNG frames to: ${pngDir}`);
    console.log('   Use ffmpeg to create GIF: ffmpeg -framerate 15 -i frame-%03d.png output.gif');
    return false;
  }
}


// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('🎬 SVG to GIF Converter for LinkedIn\n');
    console.log('Usage:');
    console.log('  node script/svg-to-gif-converter.js <input.svg> [output.gif]');
    console.log('  node script/svg-to-gif-converter.js --batch <directory>\n');
    console.log('Options:');
    console.log('  --batch     Convert all SVGs in a directory');
    console.log('  --fps=N     Frames per second (default: 15)');
    console.log('  --duration=N Duration in ms (default: 4000)');
    console.log('\nExample:');
    console.log('  node script/svg-to-gif-converter.js test-svg-output/animated/animated-success.svg');
    return;
  }
  
  const hasDeps = await checkDependencies();
  if (!hasDeps) {
    console.log('Alternative: Use online tools like ezgif.com or svgator.com');
    return;
  }
  
  if (args[0] === '--batch') {
    const dir = args[1] || 'test-svg-output/animated';
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.svg'));
    
    console.log(`🎬 Batch converting ${files.length} SVGs to GIFs...\n`);
    
    for (const file of files) {
      const svgPath = path.join(dir, file);
      const gifPath = path.join(dir, file.replace('.svg', '.gif'));
      console.log(`Converting: ${file}`);
      await convertSvgToGif(svgPath, gifPath);
    }
    
    console.log('\n✅ Batch conversion complete!');
  } else {
    const svgPath = args[0];
    const gifPath = args[1] || svgPath.replace('.svg', '.gif');
    
    if (!fs.existsSync(svgPath)) {
      console.log(`❌ File not found: ${svgPath}`);
      return;
    }
    
    console.log(`🎬 Converting: ${svgPath}`);
    await convertSvgToGif(svgPath, gifPath);
  }
}

main().catch(console.error);

// Export for programmatic use
export { convertSvgToGif };
