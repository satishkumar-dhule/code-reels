/**
 * Clean Illustration Generator v4
 * Properly proportioned, logical, professional illustrations
 * 
 * Focus on:
 * - Correct human proportions
 * - Logical scene composition
 * - Clean, minimal design
 * - Subtle, purposeful animations
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const IMAGES_DIR = 'blog-output/images';
const W = 800, H = 500;

// Clean color palette
const C = {
  bg: '#FBF8F4',
  bgAlt: '#F0F4F8',
  panel1: '#FFE8D6',
  panel2: '#E8F4F8', 
  panel3: '#F0E6F6',
  panel4: '#E6F4E8',
  
  skin: ['#FFDCB5', '#E8C4A0', '#D4A574', '#C68642', '#8D5524'],
  hair: ['#2D3436', '#5D4037', '#8D6E63', '#DEB887', '#95A5A6'],
  shirt: ['#5B8DEF', '#FF7675', '#00B894', '#FDCB6E', '#A29BFE', '#E17055', '#00CEC9', '#6C5CE7'],
  
  accent: { blue: '#5B8DEF', coral: '#FF7675', green: '#00B894', yellow: '#FDCB6E', purple: '#A29BFE', teal: '#00CEC9' },
  dark: '#2D3436',
  gray: '#636E72',
  light: '#DFE6E9',
  white: '#FFFFFF',
};

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
let _id = 0;
const uid = p => `${p}${++_id}`;


// ============== CSS ANIMATIONS ==============

const ANIM = {
  float: (id, amp = 8) => `@keyframes float_${id} { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-${amp}px)} }`,
  wave: (id) => `@keyframes wave_${id} { 0%,100%{transform:rotate(0deg)} 25%{transform:rotate(15deg)} 75%{transform:rotate(-10deg)} }`,
  nod: (id) => `@keyframes nod_${id} { 0%,100%{transform:translateY(0)} 40%{transform:translateY(3px)} }`,
  typing: (id) => `@keyframes typing_${id} { 0%,100%{transform:translateY(0)} 20%{transform:translateY(-2px)} 40%{transform:translateY(0)} 60%{transform:translateY(-2px)} }`,
  pulse: (id) => `@keyframes pulse_${id} { 0%,100%{opacity:0.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.08)} }`,
  blink: (id) => `@keyframes blink_${id} { 0%,49%{opacity:1} 50%,100%{opacity:0} }`,
  grow: (id) => `@keyframes grow_${id} { from{transform:scaleY(0)} to{transform:scaleY(1)} }`,
  fadeSlide: (id) => `@keyframes fadeSlide_${id} { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }`,
  bounce: (id) => `@keyframes bounce_${id} { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }`,
};

let _styles = [];
const addStyle = (css) => { if (!_styles.includes(css)) _styles.push(css); };
const getStyles = () => _styles.join('\n');
const resetStyles = () => { _styles = []; };

// ============== PROPERLY PROPORTIONED HUMAN ==============
// Simple, clean stick-figure style like Notion/Linear illustrations

function human(cx, groundY, opts = {}) {
  const {
    scale = 1,
    skin = pick(C.skin),
    hair = pick(C.hair),
    shirt = pick(C.shirt),
    pose = 'stand', // stand, sit, wave, point, type
    flip = false,
    anim = null, // 'idle', 'wave', 'nod', 'typing'
    animDelay = 0,
  } = opts;
  
  const s = scale;
  const f = flip ? -1 : 1;
  
  // Proportions (head is 1 unit, total height ~4 units)
  const headR = 14 * s;
  const neckH = 4 * s;
  const torsoH = 28 * s;
  const legH = 32 * s;
  const armLen = 24 * s;
  
  const headY = groundY - legH - torsoH - neckH - headR;
  const shoulderY = headY + headR + neckH;
  const hipY = shoulderY + torsoH;
  
  // Animation setup
  const id = uid('h');
  let bodyAnim = '';
  let armAnim = '';
  let headAnim = '';
  
  if (anim === 'idle') {
    addStyle(ANIM.float(id, 4));
    bodyAnim = `style="animation:float_${id} 3s ease-in-out ${animDelay}s infinite;transform-origin:center bottom"`;
  } else if (anim === 'wave') {
    addStyle(ANIM.wave(id));
    armAnim = `style="animation:wave_${id} 0.8s ease-in-out ${animDelay}s infinite;transform-origin:${10*s}px ${shoulderY+5*s}px"`;
  } else if (anim === 'nod') {
    addStyle(ANIM.nod(id));
    headAnim = `style="animation:nod_${id} 2s ease-in-out ${animDelay}s infinite"`;
  } else if (anim === 'typing') {
    addStyle(ANIM.typing(id));
    armAnim = `style="animation:typing_${id} 0.6s ease-in-out ${animDelay}s infinite"`;
  }
  
  let svg = `<g transform="translate(${cx},0)${flip ? ' scale(-1,1)' : ''}" ${bodyAnim}>`;
  
  // Shadow
  svg += `<ellipse cx="0" cy="${groundY}" rx="${12*s}" ry="${3*s}" fill="rgba(0,0,0,0.08)"/>`;
  
  // LEGS
  if (pose === 'sit') {
    // Sitting - legs bent forward
    svg += `<path d="M${-5*s} ${hipY} Q${-8*s} ${hipY+15*s} ${-18*s} ${hipY+18*s}" stroke="${C.dark}" stroke-width="${6*s}" stroke-linecap="round" fill="none"/>`;
    svg += `<path d="M${5*s} ${hipY} Q${8*s} ${hipY+15*s} ${18*s} ${hipY+18*s}" stroke="${C.dark}" stroke-width="${6*s}" stroke-linecap="round" fill="none"/>`;
    // Feet
    svg += `<ellipse cx="${-20*s}" cy="${hipY+20*s}" rx="${5*s}" ry="${3*s}" fill="${C.dark}"/>`;
    svg += `<ellipse cx="${20*s}" cy="${hipY+20*s}" rx="${5*s}" ry="${3*s}" fill="${C.dark}"/>`;
  } else {
    // Standing
    svg += `<line x1="${-4*s}" y1="${hipY}" x2="${-6*s}" y2="${groundY-3*s}" stroke="${C.dark}" stroke-width="${6*s}" stroke-linecap="round"/>`;
    svg += `<line x1="${4*s}" y1="${hipY}" x2="${6*s}" y2="${groundY-3*s}" stroke="${C.dark}" stroke-width="${6*s}" stroke-linecap="round"/>`;
    // Feet
    svg += `<ellipse cx="${-6*s}" cy="${groundY}" rx="${6*s}" ry="${3*s}" fill="${C.dark}"/>`;
    svg += `<ellipse cx="${6*s}" cy="${groundY}" rx="${6*s}" ry="${3*s}" fill="${C.dark}"/>`;
  }
  
  // TORSO
  svg += `<rect x="${-10*s}" y="${shoulderY}" width="${20*s}" height="${torsoH}" rx="${5*s}" fill="${shirt}"/>`;
  
  // ARMS
  const armY = shoulderY + 5*s;
  if (pose === 'wave') {
    // Left arm down
    svg += `<line x1="${-10*s}" y1="${armY}" x2="${-14*s}" y2="${armY+armLen}" stroke="${shirt}" stroke-width="${5*s}" stroke-linecap="round"/>`;
    svg += `<circle cx="${-14*s}" cy="${armY+armLen+3*s}" r="${4*s}" fill="${skin}"/>`;
    // Right arm up waving (animated)
    svg += `<g ${armAnim}><path d="M${10*s} ${armY} Q${18*s} ${armY-10*s} ${16*s} ${armY-25*s}" stroke="${shirt}" stroke-width="${5*s}" stroke-linecap="round" fill="none"/>`;
    svg += `<circle cx="${16*s}" cy="${armY-28*s}" r="${4*s}" fill="${skin}"/></g>`;
  } else if (pose === 'point') {
    // Left arm down
    svg += `<line x1="${-10*s}" y1="${armY}" x2="${-14*s}" y2="${armY+armLen*0.8}" stroke="${shirt}" stroke-width="${5*s}" stroke-linecap="round"/>`;
    svg += `<circle cx="${-14*s}" cy="${armY+armLen*0.8+3*s}" r="${4*s}" fill="${skin}"/>`;
    // Right arm pointing
    svg += `<line x1="${10*s}" y1="${armY}" x2="${28*s}" y2="${armY-8*s}" stroke="${shirt}" stroke-width="${5*s}" stroke-linecap="round"/>`;
    svg += `<circle cx="${30*s}" cy="${armY-9*s}" r="${4*s}" fill="${skin}"/>`;
  } else if (pose === 'sit' || pose === 'type') {
    // Arms forward (typing position) - animated
    svg += `<g ${armAnim}><path d="M${-10*s} ${armY} Q${-14*s} ${armY+10*s} ${-8*s} ${armY+18*s}" stroke="${shirt}" stroke-width="${5*s}" stroke-linecap="round" fill="none"/>`;
    svg += `<circle cx="${-8*s}" cy="${armY+20*s}" r="${4*s}" fill="${skin}"/>`;
    svg += `<path d="M${10*s} ${armY} Q${14*s} ${armY+10*s} ${8*s} ${armY+18*s}" stroke="${shirt}" stroke-width="${5*s}" stroke-linecap="round" fill="none"/>`;
    svg += `<circle cx="${8*s}" cy="${armY+20*s}" r="${4*s}" fill="${skin}"/></g>`;
  } else {
    // Default - arms at sides
    svg += `<line x1="${-10*s}" y1="${armY}" x2="${-14*s}" y2="${armY+armLen}" stroke="${shirt}" stroke-width="${5*s}" stroke-linecap="round"/>`;
    svg += `<circle cx="${-14*s}" cy="${armY+armLen+3*s}" r="${4*s}" fill="${skin}"/>`;
    svg += `<line x1="${10*s}" y1="${armY}" x2="${14*s}" y2="${armY+armLen}" stroke="${shirt}" stroke-width="${5*s}" stroke-linecap="round"/>`;
    svg += `<circle cx="${14*s}" cy="${armY+armLen+3*s}" r="${4*s}" fill="${skin}"/>`;
  }
  
  // HEAD (with nod animation if set)
  svg += `<g ${headAnim}><circle cx="0" cy="${headY}" r="${headR}" fill="${skin}"/>`;
  
  // HAIR (simple cap style)
  const hairStyle = Math.floor(Math.random() * 3);
  if (hairStyle === 0) {
    // Short
    svg += `<path d="M${-headR*0.85} ${headY-2*s} Q${-headR*0.5} ${headY-headR*1.1} 0 ${headY-headR} Q${headR*0.5} ${headY-headR*1.1} ${headR*0.85} ${headY-2*s}" fill="${hair}"/>`;
  } else if (hairStyle === 1) {
    // Medium
    svg += `<ellipse cx="0" cy="${headY-headR*0.3}" rx="${headR*1.05}" ry="${headR*0.7}" fill="${hair}"/>`;
  } else {
    // Bun
    svg += `<circle cx="0" cy="${headY-headR-3*s}" r="${6*s}" fill="${hair}"/>`;
    svg += `<path d="M${-headR*0.7} ${headY-headR*0.4} Q0 ${headY-headR*1.1} ${headR*0.7} ${headY-headR*0.4}" fill="${hair}"/>`;
  }
  
  // FACE - simple dots
  const eyeY = headY - 2*s;
  svg += `<circle cx="${-5*s}" cy="${eyeY}" r="${2*s}" fill="${C.dark}"/>`;
  svg += `<circle cx="${5*s}" cy="${eyeY}" r="${2*s}" fill="${C.dark}"/>`;
  // Smile
  svg += `<path d="M${-4*s} ${headY+5*s} Q0 ${headY+9*s} ${4*s} ${headY+5*s}" stroke="${C.dark}" stroke-width="${1.5*s}" fill="none" stroke-linecap="round"/>`;
  
  svg += '</g>';
  return svg;
}


// ============== CLEAN OBJECTS ==============

function desk(x, y, w = 120) {
  return `
    <g>
      <rect x="${x}" y="${y}" width="${w}" height="6" rx="3" fill="#D4C4B0"/>
      <rect x="${x+10}" y="${y+6}" width="6" height="35" fill="#C4B4A0"/>
      <rect x="${x+w-16}" y="${y+6}" width="6" height="35" fill="#C4B4A0"/>
    </g>`;
}

function chair(x, y, color = C.accent.teal) {
  return `
    <g>
      <ellipse cx="${x}" cy="${y}" rx="18" ry="6" fill="${color}"/>
      <path d="M${x-14} ${y-3} Q${x-16} ${y-25} ${x-12} ${y-40} Q${x} ${y-48} ${x+12} ${y-40} Q${x+16} ${y-25} ${x+14} ${y-3}" fill="${color}"/>
      <rect x="${x-3}" y="${y+3}" width="6" height="18" fill="${C.gray}"/>
      <ellipse cx="${x}" cy="${y+22}" rx="14" ry="4" fill="${C.gray}"/>
    </g>`;
}

function laptop(x, y, s = 1, screenColor = C.accent.blue) {
  return `
    <g>
      <rect x="${x}" y="${y}" width="${50*s}" height="${32*s}" rx="3" fill="${C.dark}"/>
      <rect x="${x+2*s}" y="${y+2*s}" width="${46*s}" height="${28*s}" rx="2" fill="${screenColor}"/>
      <rect x="${x+6*s}" y="${y+8*s}" width="${25*s}" height="${3*s}" rx="1" fill="${C.white}" opacity="0.5"/>
      <rect x="${x+6*s}" y="${y+14*s}" width="${35*s}" height="${3*s}" rx="1" fill="${C.white}" opacity="0.4"/>
      <rect x="${x+6*s}" y="${y+20*s}" width="${20*s}" height="${3*s}" rx="1" fill="${C.white}" opacity="0.4"/>
      <path d="M${x-3*s} ${y+32*s} L${x+53*s} ${y+32*s} L${x+50*s} ${y+36*s} L${x} ${y+36*s} Z" fill="${C.gray}"/>
    </g>`;
}

function monitor(x, y, s = 1) {
  return `
    <g>
      <rect x="${x}" y="${y}" width="${60*s}" height="${40*s}" rx="3" fill="${C.dark}"/>
      <rect x="${x+3*s}" y="${y+3*s}" width="${54*s}" height="${34*s}" rx="2" fill="${C.accent.blue}"/>
      <rect x="${x+8*s}" y="${y+10*s}" width="${30*s}" height="${3*s}" rx="1" fill="${C.white}" opacity="0.5"/>
      <rect x="${x+8*s}" y="${y+16*s}" width="${40*s}" height="${3*s}" rx="1" fill="${C.white}" opacity="0.4"/>
      <rect x="${x+8*s}" y="${y+22*s}" width="${25*s}" height="${3*s}" rx="1" fill="${C.white}" opacity="0.4"/>
      <rect x="${x+25*s}" y="${y+40*s}" width="${10*s}" height="${12*s}" fill="${C.gray}"/>
      <ellipse cx="${x+30*s}" cy="${y+54*s}" rx="${15*s}" ry="${4*s}" fill="${C.gray}"/>
    </g>`;
}

function plant(x, y, s = 1) {
  return `
    <g>
      <path d="M${x} ${y} L${x+20*s} ${y} L${x+17*s} ${y+25*s} L${x+3*s} ${y+25*s} Z" fill="${C.accent.coral}"/>
      <ellipse cx="${x+10*s}" cy="${y-12*s}" rx="${14*s}" ry="${18*s}" fill="${C.accent.green}"/>
      <ellipse cx="${x+4*s}" cy="${y-8*s}" rx="${8*s}" ry="${12*s}" fill="#00A884" transform="rotate(-15 ${x+4*s} ${y-8*s})"/>
      <ellipse cx="${x+16*s}" cy="${y-6*s}" rx="${7*s}" ry="${10*s}" fill="#00D4A4" transform="rotate(15 ${x+16*s} ${y-6*s})"/>
    </g>`;
}

function whiteboard(x, y, w = 140, h = 90) {
  return `
    <g>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${C.white}" stroke="${C.light}" stroke-width="2"/>
      <rect x="${x+15}" y="${y+20}" width="${w*0.5}" height="5" rx="2" fill="${C.accent.blue}" opacity="0.7"/>
      <rect x="${x+15}" y="${y+35}" width="${w*0.7}" height="5" rx="2" fill="${C.accent.coral}" opacity="0.6"/>
      <rect x="${x+15}" y="${y+50}" width="${w*0.4}" height="5" rx="2" fill="${C.accent.teal}" opacity="0.6"/>
      <rect x="${x+w-50}" y="${y+h-30}" width="30" height="22" rx="2" fill="${C.accent.yellow}" opacity="0.8"/>
    </g>`;
}

function window(x, y, w = 80, h = 100) {
  return `
    <g>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="#87CEEB"/>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="none" stroke="${C.white}" stroke-width="6"/>
      <line x1="${x+w/2}" y1="${y}" x2="${x+w/2}" y2="${y+h}" stroke="${C.white}" stroke-width="3"/>
      <line x1="${x}" y1="${y+h/2}" x2="${x+w}" y2="${y+h/2}" stroke="${C.white}" stroke-width="3"/>
      <circle cx="${x+w*0.7}" cy="${y+h*0.25}" r="10" fill="#FFEAA7" opacity="0.8"/>
    </g>`;
}

function speechBubble(x, y, text, tailDir = 'left') {
  const w = Math.max(80, text.length * 7 + 20);
  const h = 30;
  const tailX = tailDir === 'left' ? x + 15 : x + w - 15;
  return `
    <g>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="15" fill="${C.white}" stroke="${C.light}" stroke-width="1.5"/>
      <polygon points="${tailX-8},${y+h} ${tailX},${y+h+12} ${tailX+8},${y+h}" fill="${C.white}" stroke="${C.light}" stroke-width="1.5"/>
      <rect x="${x}" y="${y+h-5}" width="${w}" height="8" fill="${C.white}"/>
      <text x="${x+w/2}" y="${y+h/2+4}" text-anchor="middle" fill="${C.dark}" font-size="11" font-family="system-ui, sans-serif">${text}</text>
    </g>`;
}

function floatShape(x, y, type, size, color, opacity = 0.6) {
  if (type === 'circle') return `<circle cx="${x}" cy="${y}" r="${size/2}" fill="${color}" opacity="${opacity}"/>`;
  if (type === 'square') return `<rect x="${x-size/2}" y="${y-size/2}" width="${size}" height="${size}" rx="3" fill="${color}" opacity="${opacity}"/>`;
  if (type === 'diamond') return `<rect x="${x-size/2}" y="${y-size/2}" width="${size}" height="${size}" rx="2" fill="${color}" opacity="${opacity}" transform="rotate(45 ${x} ${y})"/>`;
  return '';
}


// ============== LOGICAL SCENE COMPOSITIONS ==============

const SCENES = {
  // Team collaboration - people around a table/whiteboard
  collaboration: (title) => `
    <!-- Main workspace -->
    <rect x="40" y="35" width="380" height="300" rx="16" fill="${C.panel1}"/>
    ${whiteboard(70, 55, 150, 95)}
    ${desk(90, 220, 180)}
    ${chair(180, 270, C.accent.teal)}
    ${human(180, 320, { pose: 'sit', scale: 0.85 })}
    ${laptop(115, 195, 0.75)}
    ${plant(290, 200, 0.8)}
    
    <!-- Side panel - teammates -->
    <rect x="440" y="35" width="320" height="140" rx="12" fill="${C.panel2}"/>
    ${human(500, 150, { pose: 'wave', scale: 0.55 })}
    ${human(580, 150, { pose: 'stand', scale: 0.55 })}
    ${human(660, 150, { pose: 'stand', scale: 0.55 })}
    ${speechBubble(520, 45, 'Great idea! 💡')}
    
    <!-- Bottom panel -->
    <rect x="440" y="195" width="320" height="140" rx="12" fill="${C.panel3}"/>
    ${human(520, 310, { pose: 'point', scale: 0.55 })}
    ${human(620, 310, { pose: 'stand', scale: 0.55 })}
    ${laptop(680, 260, 0.6)}
    
    ${floatShape(30, 350, 'circle', 24, C.accent.coral)}
    ${floatShape(770, 45, 'diamond', 20, C.accent.teal)}
  `,

  // Remote work - home office setup
  remote: (title) => `
    <!-- Home office -->
    <rect x="40" y="35" width="400" height="300" rx="16" fill="${C.panel1}"/>
    ${window(70, 55, 90, 110)}
    ${desk(140, 230, 200)}
    ${chair(240, 280, C.accent.coral)}
    ${human(240, 330, { pose: 'sit', scale: 0.9 })}
    ${laptop(170, 205, 0.85)}
    ${plant(360, 210, 0.85)}
    
    <!-- Video call grid -->
    <rect x="460" y="35" width="145" height="100" rx="10" fill="${C.panel2}"/>
    ${human(532, 115, { pose: 'wave', scale: 0.4 })}
    
    <rect x="615" y="35" width="145" height="100" rx="10" fill="${C.panel4}"/>
    ${human(687, 115, { pose: 'stand', scale: 0.4 })}
    
    <rect x="460" y="145" width="145" height="100" rx="10" fill="${C.panel3}"/>
    ${human(532, 225, { pose: 'stand', scale: 0.4 })}
    
    <rect x="615" y="145" width="145" height="100" rx="10" fill="${C.panel2}"/>
    ${human(687, 225, { pose: 'wave', scale: 0.4 })}
    
    <!-- Status -->
    <rect x="460" y="260" width="300" height="75" rx="10" fill="${C.panel4}"/>
    <circle cx="490" cy="297" r="8" fill="${C.accent.green}"/>
    <text x="510" y="302" fill="${C.dark}" font-size="13" font-family="system-ui">4 team members online</text>
    
    ${floatShape(30, 350, 'square', 22, C.accent.yellow)}
    ${floatShape(770, 350, 'circle', 20, C.accent.coral)}
  `,

  // Meeting/presentation
  meeting: (title) => `
    <!-- Presentation area -->
    <rect x="40" y="35" width="440" height="300" rx="16" fill="${C.panel1}"/>
    ${whiteboard(70, 55, 200, 130)}
    ${human(190, 300, { pose: 'point', scale: 0.95 })}
    ${plant(400, 220, 0.85)}
    
    <!-- Audience -->
    <rect x="500" y="35" width="260" height="145" rx="12" fill="${C.panel2}"/>
    ${human(560, 155, { pose: 'sit', scale: 0.5 })}
    ${human(660, 155, { pose: 'sit', scale: 0.5 })}
    ${speechBubble(580, 45, '👏 Nice!')}
    
    <rect x="500" y="195" width="260" height="140" rx="12" fill="${C.panel4}"/>
    ${human(560, 310, { pose: 'sit', scale: 0.5 })}
    ${human(660, 310, { pose: 'sit', scale: 0.5 })}
    
    ${floatShape(30, 350, 'diamond', 22, C.accent.teal)}
    ${floatShape(770, 45, 'circle', 24, C.accent.coral)}
  `,

  // Coding/development
  coding: (title) => `
    <!-- Dev workspace -->
    <rect x="40" y="35" width="400" height="300" rx="16" fill="${C.panel2}"/>
    ${monitor(100, 80, 1.1)}
    ${desk(80, 230, 220)}
    ${chair(190, 280, C.accent.purple)}
    ${human(190, 330, { pose: 'sit', scale: 0.9 })}
    ${plant(320, 210, 0.8)}
    
    <!-- Code panel -->
    <rect x="460" y="35" width="300" height="170" rx="12" fill="${C.dark}"/>
    <rect x="480" y="60" width="80" height="6" rx="3" fill="${C.accent.purple}" opacity="0.8"/>
    <rect x="480" y="76" width="140" height="6" rx="3" fill="${C.accent.teal}" opacity="0.7"/>
    <rect x="480" y="92" width="60" height="6" rx="3" fill="${C.accent.coral}" opacity="0.7"/>
    <rect x="500" y="108" width="120" height="6" rx="3" fill="${C.accent.blue}" opacity="0.6"/>
    <rect x="500" y="124" width="80" height="6" rx="3" fill="${C.accent.yellow}" opacity="0.6"/>
    <rect x="480" y="140" width="100" height="6" rx="3" fill="${C.accent.green}" opacity="0.6"/>
    <rect x="480" y="156" width="150" height="6" rx="3" fill="${C.accent.purple}" opacity="0.5"/>
    <rect x="480" y="172" width="70" height="6" rx="3" fill="${C.accent.teal}" opacity="0.5"/>
    
    <!-- Team -->
    <rect x="460" y="220" width="300" height="115" rx="12" fill="${C.panel3}"/>
    ${human(530, 310, { pose: 'stand', scale: 0.45 })}
    ${human(610, 310, { pose: 'wave', scale: 0.45 })}
    ${human(690, 310, { pose: 'stand', scale: 0.45 })}
    ${speechBubble(550, 230, 'PR approved ✓')}
    
    ${floatShape(30, 350, 'circle', 24, C.accent.purple)}
    ${floatShape(770, 350, 'diamond', 20, C.accent.teal)}
  `,

  // Success/celebration
  success: (title) => `
    <!-- Celebration scene -->
    <rect x="40" y="35" width="720" height="300" rx="20" fill="${C.panel1}"/>
    
    <!-- Trophy -->
    <circle cx="400" cy="140" r="45" fill="${C.accent.yellow}" opacity="0.3"/>
    <circle cx="400" cy="140" r="30" fill="${C.accent.yellow}" opacity="0.5"/>
    <text x="400" y="152" text-anchor="middle" font-size="36">🏆</text>
    
    <!-- Celebrating team -->
    ${human(140, 300, { pose: 'wave', scale: 0.85 })}
    ${human(260, 300, { pose: 'wave', scale: 0.8 })}
    ${human(400, 300, { pose: 'wave', scale: 0.85 })}
    ${human(540, 300, { pose: 'wave', scale: 0.8 })}
    ${human(660, 300, { pose: 'wave', scale: 0.85 })}
    
    <!-- Confetti shapes -->
    ${floatShape(100, 70, 'circle', 16, C.accent.coral, 0.7)}
    ${floatShape(200, 55, 'diamond', 14, C.accent.teal, 0.7)}
    ${floatShape(300, 80, 'square', 12, C.accent.purple, 0.6)}
    ${floatShape(500, 65, 'circle', 14, C.accent.blue, 0.7)}
    ${floatShape(600, 75, 'diamond', 16, C.accent.yellow, 0.7)}
    ${floatShape(700, 60, 'square', 14, C.accent.green, 0.6)}
    ${floatShape(150, 110, 'diamond', 10, C.accent.yellow, 0.5)}
    ${floatShape(650, 100, 'circle', 12, C.accent.coral, 0.5)}
    
    ${speechBubble(320, 200, '🎉 We did it!')}
    
    ${floatShape(30, 350, 'circle', 26, C.accent.coral)}
    ${floatShape(770, 350, 'diamond', 24, C.accent.teal)}
  `,

  // Brainstorming
  brainstorm: (title) => `
    <!-- Brainstorm room -->
    <rect x="40" y="35" width="420" height="300" rx="16" fill="${C.panel4}"/>
    ${whiteboard(70, 55, 180, 110)}
    ${human(180, 300, { pose: 'point', scale: 0.85 })}
    ${human(320, 300, { pose: 'stand', scale: 0.8 })}
    ${plant(400, 220, 0.75)}
    
    <!-- Idea bubbles -->
    <circle cx="300" cy="75" r="25" fill="${C.accent.yellow}" opacity="0.7"/>
    <text x="300" y="82" text-anchor="middle" font-size="20">💡</text>
    <circle cx="360" cy="100" r="18" fill="${C.accent.coral}" opacity="0.6"/>
    <text x="360" y="106" text-anchor="middle" font-size="14">🚀</text>
    <circle cx="400" cy="65" r="14" fill="${C.accent.teal}" opacity="0.6"/>
    <text x="400" y="70" text-anchor="middle" font-size="11">✨</text>
    
    <!-- Sticky notes panel -->
    <rect x="480" y="35" width="280" height="300" rx="12" fill="${C.bgAlt}"/>
    <rect x="500" y="60" width="70" height="55" rx="3" fill="${C.accent.yellow}" opacity="0.85" transform="rotate(-2 535 87)"/>
    <rect x="590" y="55" width="70" height="55" rx="3" fill="${C.accent.coral}" opacity="0.8" transform="rotate(3 625 82)"/>
    <rect x="680" y="60" width="70" height="55" rx="3" fill="${C.accent.blue}" opacity="0.8" transform="rotate(-1 715 87)"/>
    <rect x="510" y="135" width="70" height="55" rx="3" fill="${C.accent.teal}" opacity="0.8" transform="rotate(2 545 162)"/>
    <rect x="600" y="130" width="70" height="55" rx="3" fill="${C.accent.purple}" opacity="0.8" transform="rotate(-3 635 157)"/>
    <rect x="690" y="135" width="70" height="55" rx="3" fill="${C.accent.green}" opacity="0.8" transform="rotate(1 725 162)"/>
    <rect x="520" y="210" width="70" height="55" rx="3" fill="${C.accent.coral}" opacity="0.75" transform="rotate(-2 555 237)"/>
    <rect x="610" y="205" width="70" height="55" rx="3" fill="${C.accent.yellow}" opacity="0.75" transform="rotate(2 645 232)"/>
    <rect x="700" y="210" width="70" height="55" rx="3" fill="${C.accent.blue}" opacity="0.75" transform="rotate(-1 735 237)"/>
    
    ${floatShape(30, 350, 'diamond', 22, C.accent.coral)}
    ${floatShape(770, 350, 'circle', 24, C.accent.yellow)}
  `,

  // Default
  default: (title) => `
    <!-- Main workspace -->
    <rect x="40" y="35" width="380" height="300" rx="16" fill="${C.panel1}"/>
    ${window(70, 55, 80, 100)}
    ${desk(100, 230, 180)}
    ${chair(190, 280, C.accent.blue)}
    ${human(190, 330, { pose: 'sit', scale: 0.9 })}
    ${laptop(125, 205, 0.8)}
    ${plant(300, 210, 0.8)}
    
    <!-- Side panels -->
    <rect x="440" y="35" width="320" height="145" rx="12" fill="${C.panel2}"/>
    ${human(510, 155, { pose: 'stand', scale: 0.55 })}
    ${human(590, 155, { pose: 'wave', scale: 0.55 })}
    ${human(670, 155, { pose: 'stand', scale: 0.55 })}
    
    <rect x="440" y="195" width="320" height="140" rx="12" fill="${C.panel3}"/>
    ${laptop(480, 250, 0.7)}
    ${laptop(580, 255, 0.65)}
    ${plant(700, 280, 0.6)}
    
    ${floatShape(30, 350, 'circle', 24, C.accent.coral)}
    ${floatShape(770, 45, 'diamond', 20, C.accent.teal)}
    ${floatShape(420, 350, 'square', 18, C.accent.yellow)}
  `,
};


// ============== GENERATION ==============

const KEYWORDS = {
  collaboration: ['collaboration', 'team', 'together', 'pair', 'group', 'teamwork'],
  remote: ['remote', 'home', 'wfh', 'distributed', 'virtual', 'video call', 'hybrid'],
  meeting: ['meeting', 'standup', 'presentation', 'demo', 'sync', 'planning'],
  coding: ['code', 'coding', 'programming', 'develop', 'software', 'engineer', 'api'],
  success: ['success', 'celebrate', 'win', 'achieve', 'launch', 'milestone', 'goal'],
  brainstorm: ['brainstorm', 'idea', 'ideation', 'creative', 'innovation', 'workshop'],
};

function detectScene(title, content = '') {
  const text = `${title} ${content}`.toLowerCase();
  let best = 'default', score = 0;
  for (const [scene, kws] of Object.entries(KEYWORDS)) {
    let s = kws.filter(k => text.includes(k)).length;
    if (s > score) { score = s; best = scene; }
  }
  return best;
}

function generateSVG(sceneType, title) {
  _id = 0;
  const scene = SCENES[sceneType] || SCENES.default;
  const content = scene(title);
  const esc = t => String(t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${C.bg}"/>
      <stop offset="100%" stop-color="${C.bgAlt}"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  ${content}
  <rect x="200" y="${H-60}" width="${W-400}" height="45" rx="22" fill="${C.white}" stroke="${C.light}" stroke-width="1.5"/>
  <text x="${W/2}" y="${H-32}" text-anchor="middle" fill="${C.dark}" font-size="14" font-family="system-ui, -apple-system, sans-serif" font-weight="600">${esc(title.substring(0,50))}</text>
</svg>`;
}

async function ensureDir() {
  try { await fs.promises.mkdir(IMAGES_DIR, { recursive: true }); } catch {}
}

// ============== EXPORTS ==============

export async function generateCleanIllustration(title, content = '', filename = null, options = {}) {
  await ensureDir();
  const sceneType = options.scene || detectScene(title, content);
  const svg = generateSVG(sceneType, title);
  const hash = crypto.createHash('md5').update(String(title)).digest('hex').slice(0, 8);
  const outputFilename = filename || `clean-${hash}`;
  const outputPath = path.join(IMAGES_DIR, `${outputFilename}.svg`);
  await fs.promises.writeFile(outputPath, svg, 'utf-8');
  return { path: outputPath, scene: sceneType, filename: `${outputFilename}.svg` };
}

export function generateCleanSceneSVG(sceneName, title = '') {
  _id = 0;
  return generateSVG(sceneName, title || `${sceneName.charAt(0).toUpperCase() + sceneName.slice(1)}`);
}

export function getAvailableCleanScenes() {
  return Object.keys(SCENES);
}

export { detectScene as detectCleanScene };

export default { generateCleanIllustration, generateCleanSceneSVG, getAvailableCleanScenes, detectCleanScene: detectScene };
