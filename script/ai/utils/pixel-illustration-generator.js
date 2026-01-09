/**
 * 16-bit Pixel Art Illustration Generator v4
 * Smaller characters, guaranteed no overlaps
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const IMAGES_DIR = 'blog-output/images';
const W = 800, H = 500;

// Canvas is 800x500 pixels
// We'll work in a 200x125 grid (4px per unit)
const UNIT = 4;
const GW = 200; // grid width
const GH = 125; // grid height

const PAL = {
  bg: '#2C1810',
  floor: '#8B7355', floorLine: '#7A6448',
  wall: '#D4C4A8', wallDark: '#B8A888', wallLight: '#E8DCC8',
  skin: ['#FFE0BD', '#FFCD94', '#EAC086', '#C68642', '#8D5524'],
  hair: ['#1a1a1a', '#3D2314', '#8B6914', '#D4A84B', '#A0522D'],
  shirt: ['#E74C3C', '#3498DB', '#2ECC71', '#9B59B6', '#F39C12', '#1ABC9C'],
  pants: '#2C3E50',
  shoes: '#1a1a1a',
  wood: '#A0522D', woodDark: '#8B4513',
  metal: '#95A5A6', metalDark: '#7F8C8D',
  screen: '#4FC3F7', screenDark: '#0288D1',
  plant: '#27AE60', plantDark: '#1E8449', pot: '#D35400',
  white: '#FFFFFF', black: '#000000',
  gray: '#BDC3C7',
  gold: '#FFD700', red: '#E74C3C', blue: '#3498DB', green: '#2ECC71',
};

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
let _id = 0;
const uid = () => `id${++_id}`;

const ANIM = {
  float: id => `@keyframes ${id}{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}`,
  bounce: id => `@keyframes ${id}{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}`,
};
let _styles = [];
const addAnim = (type) => { const id = uid(); addStyle(ANIM[type](id)); return id; };
const addStyle = css => { if (!_styles.includes(css)) _styles.push(css); };
const getStyles = () => _styles.join('\n');
const resetStyles = () => { _styles = []; _id = 0; };

// Draw a rectangle in grid units
const box = (x, y, w, h, fill) => 
  `<rect x="${x*UNIT}" y="${y*UNIT}" width="${w*UNIT}" height="${h*UNIT}" fill="${fill}"/>`;

// Simple character: 12 wide x 20 tall grid units
// Positioned by CENTER-BOTTOM (feet position)
function person(cx, by, opts = {}) {
  const { 
    skin = pick(PAL.skin), 
    hair = pick(PAL.hair), 
    shirt = pick(PAL.shirt),
    pose = 'stand',
    anim = null,
    delay = 0 
  } = opts;
  
  // Character bounds: x from cx-6 to cx+6, y from by-20 to by
  const x = cx - 6;
  const y = by - 20;
  
  let animAttr = '';
  if (anim === 'float') {
    const id = addAnim('float');
    animAttr = `style="animation:${id} 2s ease-in-out ${delay}s infinite"`;
  } else if (anim === 'bounce') {
    const id = addAnim('bounce');
    animAttr = `style="animation:${id} 0.6s ease-in-out ${delay}s infinite"`;
  }
  
  let s = `<g ${animAttr}>`;
  
  // Shadow
  s += `<ellipse cx="${cx*UNIT}" cy="${by*UNIT}" rx="${5*UNIT}" ry="${1.5*UNIT}" fill="rgba(0,0,0,0.2)"/>`;
  
  if (pose === 'sit') {
    // Sitting pose (shorter)
    const sy = y + 6; // shift down
    s += box(x+3, sy, 6, 3, hair);      // hair
    s += box(x+3, sy+3, 6, 4, skin);    // head
    s += box(x+4, sy+4, 1, 1, PAL.black); // eye
    s += box(x+7, sy+4, 1, 1, PAL.black); // eye
    s += box(x+2, sy+7, 8, 5, shirt);   // body
    s += box(x+1, sy+9, 2, 3, shirt);   // arm
    s += box(x+9, sy+9, 2, 3, shirt);   // arm
    s += box(x+2, sy+12, 8, 2, PAL.pants); // legs bent
    s += box(x+1, sy+13, 3, 2, PAL.shoes); // foot
    s += box(x+8, sy+13, 3, 2, PAL.shoes); // foot
  } else if (pose === 'wave') {
    s += box(x+3, y, 6, 3, hair);       // hair
    s += box(x+3, y+3, 6, 4, skin);     // head
    s += box(x+4, y+4, 1, 1, PAL.black);  // eye
    s += box(x+7, y+4, 1, 1, PAL.black);  // eye
    s += box(x+5, y+6, 2, 1, '#C4956A');  // smile
    s += box(x+2, y+7, 8, 6, shirt);    // body
    s += box(x+1, y+8, 2, 4, shirt);    // left arm down
    s += box(x+9, y+7, 2, 2, shirt);    // right arm up
    s += box(x+10, y+4, 2, 4, shirt);   // arm going up
    s += box(x+11, y+2, 2, 3, skin);    // hand waving
    s += box(x+3, y+13, 3, 6, PAL.pants); // leg
    s += box(x+6, y+13, 3, 6, PAL.pants); // leg
    s += box(x+3, y+19, 3, 1, PAL.shoes);
    s += box(x+6, y+19, 3, 1, PAL.shoes);
  } else if (pose === 'cheer') {
    s += box(x+3, y+1, 6, 3, hair);     // hair
    s += box(x+3, y+4, 6, 4, skin);     // head
    s += box(x+4, y+5, 1, 1, PAL.black);  // eye
    s += box(x+7, y+5, 1, 1, PAL.black);  // eye
    s += box(x+4, y+7, 4, 1, '#8B4513');  // open mouth
    s += box(x+2, y+8, 8, 6, shirt);    // body
    // Both arms up
    s += box(x, y+6, 2, 3, shirt);      // left arm
    s += box(x-1, y+3, 2, 4, skin);     // left hand
    s += box(x+10, y+6, 2, 3, shirt);   // right arm
    s += box(x+11, y+3, 2, 4, skin);    // right hand
    s += box(x+3, y+14, 3, 5, PAL.pants);
    s += box(x+6, y+14, 3, 5, PAL.pants);
    s += box(x+3, y+19, 3, 1, PAL.shoes);
    s += box(x+6, y+19, 3, 1, PAL.shoes);
  } else {
    // Standing (default)
    s += box(x+3, y, 6, 3, hair);       // hair
    s += box(x+3, y+3, 6, 4, skin);     // head
    s += box(x+4, y+4, 1, 1, PAL.black);  // eye
    s += box(x+7, y+4, 1, 1, PAL.black);  // eye
    s += box(x+2, y+7, 8, 6, shirt);    // body
    s += box(x+1, y+8, 2, 4, shirt);    // left arm
    s += box(x+9, y+8, 2, 4, shirt);    // right arm
    s += box(x+1, y+12, 2, 1, skin);    // left hand
    s += box(x+9, y+12, 2, 1, skin);    // right hand
    s += box(x+3, y+13, 3, 6, PAL.pants); // left leg
    s += box(x+6, y+13, 3, 6, PAL.pants); // right leg
    s += box(x+3, y+19, 3, 1, PAL.shoes);
    s += box(x+6, y+19, 3, 1, PAL.shoes);
  }
  
  s += '</g>';
  return s;
}

// Objects
function desk(x, y, w = 40) {
  let s = '';
  s += box(x, y-8, w, 2, PAL.wood);
  s += box(x, y-6, w, 1, PAL.woodDark);
  s += box(x+2, y-5, w-4, 4, PAL.woodDark);
  s += box(x+3, y-1, 2, 3, PAL.woodDark);
  s += box(x+w-5, y-1, 2, 3, PAL.woodDark);
  return s;
}

function chair(x, y, color = '#E74C3C') {
  let s = '';
  s += box(x, y-12, 10, 2, color);
  s += box(x+1, y-10, 8, 6, color);
  s += box(x, y-4, 10, 2, color);
  s += box(x+1, y-2, 2, 4, PAL.metal);
  s += box(x+7, y-2, 2, 4, PAL.metal);
  return s;
}

function monitor(x, y, w = 22, h = 14) {
  let s = '';
  s += box(x, y-h-4, w, h, PAL.metalDark);
  s += box(x+1, y-h-3, w-2, h-2, PAL.black);
  s += box(x+2, y-h-2, w-4, h-4, PAL.screen);
  // Code lines
  s += box(x+3, y-h, 8, 1, '#FFF');
  s += box(x+3, y-h+2, 12, 1, '#AED581');
  s += box(x+3, y-h+4, 6, 1, '#FFB74D');
  s += box(x+3, y-h+6, 10, 1, '#4FC3F7');
  // Stand
  s += box(x+w/2-2, y-4, 4, 2, PAL.metal);
  s += box(x+w/2-4, y-2, 8, 2, PAL.metalDark);
  return s;
}

function laptop(x, y) {
  let s = '';
  s += box(x, y-10, 18, 8, PAL.metalDark);
  s += box(x+1, y-9, 16, 6, PAL.screen);
  s += box(x+2, y-8, 6, 1, '#FFF');
  s += box(x+2, y-6, 10, 1, '#AED581');
  s += box(x-1, y-2, 20, 3, PAL.metal);
  return s;
}

function plant(x, y) {
  let s = '';
  s += box(x+2, y-16, 6, 8, PAL.plant);
  s += box(x+1, y-14, 3, 5, PAL.plantDark);
  s += box(x+6, y-13, 3, 4, PAL.plantDark);
  s += box(x+3, y-8, 4, 2, PAL.plantDark);
  s += box(x+2, y-6, 6, 6, PAL.pot);
  s += box(x+3, y-6, 4, 1, '#3E2723');
  return s;
}

function windowObj(x, y, w = 24, h = 30) {
  let s = '';
  s += box(x, y, w, h, PAL.white);
  s += box(x+2, y+2, w-4, h-4, '#87CEEB');
  s += box(x+w-8, y+4, 4, 4, '#FFD93D'); // sun
  s += box(x+4, y+8, 6, 2, PAL.white); // cloud
  s += box(x+w/2-1, y, 2, h, PAL.white); // cross
  s += box(x, y+h/2-1, w, 2, PAL.white);
  return s;
}

function whiteboard(x, y, w = 40, h = 24) {
  let s = '';
  s += box(x, y, w, h, PAL.white);
  s += box(x, y, w, 1, PAL.gray);
  s += box(x, y+h-1, w, 1, PAL.gray);
  s += box(x, y, 1, h, PAL.gray);
  s += box(x+w-1, y, 1, h, PAL.gray);
  s += box(x+3, y+4, w*0.5, 2, PAL.blue);
  s += box(x+3, y+8, w*0.7, 2, PAL.red);
  s += box(x+3, y+12, w*0.4, 2, PAL.green);
  s += box(x+3, y+16, w*0.6, 2, PAL.blue);
  return s;
}

function speechBubble(x, y, text) {
  const w = Math.max(text.length * 2.5 + 6, 16);
  let s = '';
  s += box(x, y, w, 8, PAL.white);
  s += box(x+2, y+8, 2, 2, PAL.white);
  s += box(x, y, w, 0.5, PAL.gray);
  s += box(x, y+7.5, w, 0.5, PAL.gray);
  s += box(x, y, 0.5, 8, PAL.gray);
  s += box(x+w-0.5, y, 0.5, 8, PAL.gray);
  s += `<text x="${(x+3)*UNIT}" y="${(y+5.5)*UNIT}" fill="${PAL.black}" font-size="${UNIT*2.8}" font-family="monospace" font-weight="bold">${text}</text>`;
  return s;
}

function trophy(x, y) {
  let s = '';
  s += box(x+4, y, 12, 3, PAL.gold);
  s += box(x+6, y+3, 8, 10, PAL.gold);
  s += box(x+2, y+3, 4, 4, PAL.gold);
  s += box(x+14, y+3, 4, 4, PAL.gold);
  s += box(x+7, y+13, 6, 4, PAL.gold);
  s += box(x+5, y+17, 10, 3, '#B8860B');
  return s;
}

function star(x, y, c = PAL.gold) {
  let s = '';
  s += box(x+2, y, 2, 2, c);
  s += box(x, y+2, 6, 2, c);
  s += box(x+1, y+4, 4, 2, c);
  s += box(x, y+5, 2, 2, c);
  s += box(x+4, y+5, 2, 2, c);
  return s;
}

function clock(x, y) {
  let s = '';
  s += box(x, y, 12, 12, PAL.white);
  s += box(x+1, y+1, 10, 10, '#F5F5F5');
  s += box(x+5, y+3, 1, 4, PAL.black);
  s += box(x+5, y+6, 4, 1, PAL.black);
  return s;
}

function codePanel(x, y, w = 30, h = 24) {
  let s = '';
  s += box(x, y, w, h, '#1a1a2e');
  s += box(x+2, y+3, 12, 1, '#AED581');
  s += box(x+2, y+6, 20, 1, '#4FC3F7');
  s += box(x+2, y+9, 8, 1, '#FFB74D');
  s += box(x+2, y+12, 16, 1, '#F48FB1');
  s += box(x+2, y+15, 10, 1, '#AED581');
  s += box(x+2, y+18, 18, 1, '#4FC3F7');
  return s;
}

function videoPanel(x, y) {
  let s = '';
  s += box(x, y, 40, 36, PAL.metalDark);
  s += box(x+1, y+1, 38, 34, '#1a1a2e');
  // 4 video boxes
  s += box(x+3, y+3, 15, 13, '#2C3E50');
  s += box(x+21, y+3, 15, 13, '#2C3E50');
  s += box(x+3, y+19, 15, 13, '#2C3E50');
  s += box(x+21, y+19, 15, 13, '#2C3E50');
  // Face circles
  s += `<circle cx="${(x+10.5)*UNIT}" cy="${(y+9.5)*UNIT}" r="${4*UNIT}" fill="${PAL.skin[0]}"/>`;
  s += `<circle cx="${(x+28.5)*UNIT}" cy="${(y+9.5)*UNIT}" r="${4*UNIT}" fill="${PAL.skin[1]}"/>`;
  s += `<circle cx="${(x+10.5)*UNIT}" cy="${(y+25.5)*UNIT}" r="${4*UNIT}" fill="${PAL.skin[2]}"/>`;
  s += `<circle cx="${(x+28.5)*UNIT}" cy="${(y+25.5)*UNIT}" r="${4*UNIT}" fill="${PAL.skin[3]}"/>`;
  return s;
}

// Background
function background() {
  let s = '';
  s += box(0, 0, GW, 75, PAL.wall);
  s += box(0, 72, GW, 3, PAL.wallDark);
  s += box(0, 75, GW, 50, PAL.floor);
  for (let i = 0; i < GW; i += 12) s += box(i, 75, 0.5, 50, PAL.floorLine);
  return s;
}

function darkBackground() {
  let s = '';
  s += box(0, 0, GW, GH, '#1a1a2e');
  s += box(0, 85, GW, 40, '#2C3E50');
  return s;
}

// SCENES - Character width is 12 units, so minimum spacing is 20 units
const FLOOR = 100; // y position of floor for standing

const SCENES = {
  collaboration: () => {
    let s = background();
    
    // Window (left)
    s += windowObj(5, 15, 22, 28);
    
    // Whiteboard (center-left wall)
    s += whiteboard(35, 12, 38, 22);
    
    // Desk with sitting person (left side)
    s += desk(8, FLOOR, 35);
    s += chair(18, FLOOR, '#3498DB');
    s += laptop(12, FLOOR-8);
    s += person(24, FLOOR, { pose: 'sit', shirt: '#3498DB', anim: 'float' });
    
    // Two standing people (right side, 30 units apart)
    s += person(110, FLOOR, { pose: 'stand', shirt: '#E74C3C' });
    s += person(150, FLOOR, { pose: 'stand', shirt: '#2ECC71', anim: 'float', delay: 0.3 });
    
    // Plant (far right)
    s += plant(180, FLOOR);
    
    // Speech bubble
    s += speechBubble(120, 50, 'Great!');
    
    return s;
  },

  remote: () => {
    let s = background();
    
    // Window
    s += windowObj(5, 12, 26, 32);
    
    // Desk with person (center)
    s += desk(45, FLOOR, 50);
    s += chair(65, FLOOR, '#9B59B6');
    s += monitor(52, FLOOR-8, 24, 16);
    s += laptop(80, FLOOR-8);
    s += person(70, FLOOR, { pose: 'sit', shirt: '#9B59B6', anim: 'float' });
    
    // Video call panel (right wall)
    s += videoPanel(130, 15);
    
    // Plant
    s += plant(180, FLOOR);
    
    return s;
  },

  meeting: () => {
    let s = background();
    
    // Whiteboard
    s += whiteboard(5, 10, 45, 26);
    
    // Presenter (left, standing)
    s += person(25, FLOOR, { pose: 'stand', shirt: '#E74C3C', anim: 'float' });
    
    // Conference table
    s += desk(70, FLOOR, 70);
    
    // Two attendees (well spaced - 40 units apart)
    s += chair(85, FLOOR, '#3498DB');
    s += person(90, FLOOR, { pose: 'sit', shirt: '#3498DB' });
    
    s += chair(125, FLOOR, '#2ECC71');
    s += person(130, FLOOR, { pose: 'sit', shirt: '#2ECC71', anim: 'float', delay: 0.2 });
    
    // Laptops
    s += laptop(78, FLOOR-8);
    s += laptop(118, FLOOR-8);
    
    // Speech bubble
    s += speechBubble(35, 28, 'Q3 Goals');
    
    // Plant
    s += plant(175, FLOOR);
    
    return s;
  },

  coding: () => {
    let s = background();
    
    // Dual monitor desk
    s += desk(10, FLOOR, 55);
    s += monitor(15, FLOOR-8, 22, 14);
    s += monitor(40, FLOOR-8, 22, 14);
    s += chair(32, FLOOR, '#1ABC9C');
    s += person(38, FLOOR, { pose: 'sit', shirt: '#1ABC9C', anim: 'float' });
    
    // Code panel on wall
    s += codePanel(90, 15, 35, 28);
    
    // Colleague (far right)
    s += person(160, FLOOR, { pose: 'stand', shirt: '#E74C3C', anim: 'float', delay: 0.5 });
    
    // Speech bubble
    s += speechBubble(145, 52, 'LGTM!');
    
    // Plant
    s += plant(180, FLOOR);
    
    return s;
  },

  success: () => {
    let s = darkBackground();
    
    // Trophy (center top)
    s += trophy(90, 25);
    
    // Stars
    s += star(75, 20);
    s += star(120, 18);
    s += star(70, 40);
    s += star(125, 38);
    
    // Confetti (fixed positions)
    const colors = [PAL.red, PAL.blue, PAL.green, PAL.gold, '#E91E63'];
    [[20,15],[45,10],[70,8],[130,12],[155,18],[180,10],[35,25],[165,22]].forEach((p, i) => {
      s += box(p[0], p[1], 2, 2, colors[i % colors.length]);
    });
    
    // Four celebrating people (40 units apart)
    s += person(35, FLOOR, { pose: 'cheer', shirt: '#E74C3C', anim: 'bounce' });
    s += person(80, FLOOR, { pose: 'wave', shirt: '#3498DB', anim: 'bounce', delay: 0.1 });
    s += person(125, FLOOR, { pose: 'cheer', shirt: '#2ECC71', anim: 'bounce', delay: 0.2 });
    s += person(170, FLOOR, { pose: 'cheer', shirt: '#9B59B6', anim: 'bounce', delay: 0.3 });
    
    // Speech bubble
    s += speechBubble(75, 5, 'We did it!');
    
    return s;
  },

  brainstorm: () => {
    let s = background();
    
    // Whiteboard with sticky notes
    s += whiteboard(5, 8, 50, 28);
    // Sticky notes
    s += box(10, 12, 8, 6, '#FFEB3B');
    s += box(22, 10, 8, 6, '#FF7043');
    s += box(34, 14, 8, 6, '#4FC3F7');
    s += box(12, 22, 8, 6, '#AED581');
    s += box(26, 20, 8, 6, '#F48FB1');
    s += box(40, 24, 8, 6, '#CE93D8');
    
    // Light bulb
    s += box(150, 12, 8, 10, '#FFEB3B');
    s += box(151, 22, 6, 3, PAL.gray);
    s += box(146, 8, 2, 2, '#FFF');
    s += box(160, 10, 2, 2, '#FFF');
    
    // Three people (40 units apart)
    s += person(75, FLOOR, { pose: 'stand', shirt: '#E74C3C', anim: 'float' });
    s += person(120, FLOOR, { pose: 'stand', shirt: '#3498DB' });
    s += person(165, FLOOR, { pose: 'wave', shirt: '#2ECC71', anim: 'float', delay: 0.4 });
    
    // Speech bubbles
    s += speechBubble(60, 48, 'What if...');
    s += speechBubble(150, 45, 'Yes!');
    
    return s;
  },

  default: () => {
    let s = background();
    
    // Window
    s += windowObj(5, 12, 24, 30);
    
    // Desk with person
    s += desk(40, FLOOR, 55);
    s += chair(62, FLOOR, '#3498DB');
    s += monitor(48, FLOOR-8, 24, 16);
    s += laptop(76, FLOOR-8);
    s += person(68, FLOOR, { pose: 'sit', shirt: '#3498DB', anim: 'float' });
    
    // Clock
    s += clock(140, 20);
    
    // Plant
    s += plant(170, FLOOR);
    
    return s;
  },
};

const KEYWORDS = {
  collaboration: ['collaboration', 'team', 'together', 'pair', 'group', 'teamwork'],
  remote: ['remote', 'home', 'wfh', 'distributed', 'virtual', 'video', 'hybrid'],
  meeting: ['meeting', 'standup', 'presentation', 'demo', 'sync', 'planning', 'review'],
  coding: ['code', 'coding', 'programming', 'develop', 'software', 'engineer', 'api', 'debug'],
  success: ['success', 'celebrate', 'win', 'achieve', 'launch', 'milestone', 'ship', 'release'],
  brainstorm: ['brainstorm', 'idea', 'ideation', 'creative', 'innovation', 'workshop', 'design'],
};

function detectScene(title, content = '') {
  const text = `${title} ${content}`.toLowerCase();
  let best = 'default', score = 0;
  for (const [scene, kws] of Object.entries(KEYWORDS)) {
    const s = kws.filter(k => text.includes(k)).length;
    if (s > score) { score = s; best = scene; }
  }
  return best;
}

function generateSVG(sceneType, title) {
  resetStyles();
  
  const scene = SCENES[sceneType] || SCENES.default;
  const content = scene();
  const styles = getStyles();
  const esc = t => String(t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs><style>${styles}</style></defs>
  <rect width="${W}" height="${H}" fill="${PAL.bg}"/>
  ${content}
  <rect x="${W*0.1}" y="${H-50}" width="${W*0.8}" height="38" rx="6" fill="rgba(0,0,0,0.8)"/>
  <text x="${W/2}" y="${H-25}" text-anchor="middle" fill="${PAL.white}" font-size="16" font-family="monospace" font-weight="bold">${esc(title.substring(0,40))}</text>
</svg>`;
}

async function ensureDir() {
  try { await fs.promises.mkdir(IMAGES_DIR, { recursive: true }); } catch {}
}

export async function generatePixelIllustration(title, content = '', filename = null, options = {}) {
  await ensureDir();
  const sceneType = options.scene || detectScene(title, content);
  const svg = generateSVG(sceneType, title);
  const hash = crypto.createHash('md5').update(String(title)).digest('hex').slice(0, 8);
  const outputFilename = filename || `pixel-${hash}`;
  const outputPath = path.join(IMAGES_DIR, `${outputFilename}.svg`);
  await fs.promises.writeFile(outputPath, svg, 'utf-8');
  return { path: outputPath, scene: sceneType, filename: `${outputFilename}.svg` };
}

export function generatePixelSceneSVG(sceneName, title = '') {
  resetStyles();
  return generateSVG(sceneName, title || sceneName.charAt(0).toUpperCase() + sceneName.slice(1));
}

export function getAvailablePixelScenes() {
  return Object.keys(SCENES);
}

export { detectScene as detectPixelScene };

export default {
  generatePixelIllustration,
  generatePixelSceneSVG,
  getAvailablePixelScenes,
  detectPixelScene: detectScene,
};
