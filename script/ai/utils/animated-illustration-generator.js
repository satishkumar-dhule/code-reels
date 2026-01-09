/**
 * Animated Illustration Generator v3
 * Next-level SVG animations for LinkedIn and social media
 * 
 * Features:
 * - CSS keyframe animations embedded in SVG
 * - Dynamic character movements (typing, waving, nodding)
 * - Floating elements with parallax effect
 * - Pulsing highlights and glowing effects
 * - Screen content animations (code typing, charts growing)
 * - Particle effects (confetti, sparkles)
 * - Smooth transitions and easing
 * - GIF export support via external tools
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const IMAGES_DIR = 'blog-output/images';
const W = 800, H = 500;

// Modern color palette
const COLORS = {
  bg: { cream: '#FBF8F4', warmGray: '#F5F3F0', softBlue: '#F0F4F8', softPink: '#FDF2F4', softGreen: '#F0F7F4' },
  accent: { coral: '#FF6B6B', orange: '#FF9F43', yellow: '#FECA57', teal: '#00D2D3', blue: '#54A0FF', purple: '#9B59B6', pink: '#FD79A8', green: '#26DE81' },
  skin: { light: '#FFE4C9', fair: '#F5D0B5', medium: '#D4A574', tan: '#C68642', brown: '#8D5524', dark: '#5C3D2E' },
  hair: { black: '#2D3436', darkBrown: '#5D4037', brown: '#8D6E63', auburn: '#A1543F', blonde: '#DEB887', gray: '#95A5A6' },
  clothing: { navy: '#2C3E50', charcoal: '#34495E', slate: '#5D6D7E', rust: '#E17055', sage: '#81B29A', lavender: '#A29BFE', teal: '#00B894', coral: '#FF7675' },
  white: '#FFFFFF',
  shadow: 'rgba(0,0,0,0.08)',
};

const pick = (obj) => Object.values(obj)[Math.floor(Math.random() * Object.values(obj).length)];
let idCounter = 0;
const uid = (prefix) => `${prefix}_${++idCounter}`;


// ============== ANIMATION KEYFRAMES ==============

const ANIMATIONS = {
  // Floating animation for decorative elements
  float: (id, amplitude = 10, duration = 3) => `
    @keyframes float_${id} {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-${amplitude}px); }
    }
  `,
  
  // Gentle bobbing for characters
  bob: (id, amplitude = 5, duration = 2) => `
    @keyframes bob_${id} {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-${amplitude}px); }
    }
  `,
  
  // Waving hand animation
  wave: (id) => `
    @keyframes wave_${id} {
      0%, 100% { transform: rotate(0deg); }
      25% { transform: rotate(20deg); }
      75% { transform: rotate(-10deg); }
    }
  `,
  
  // Typing animation (for hands)
  typing: (id) => `
    @keyframes typing_${id} {
      0%, 100% { transform: translateY(0px); }
      10% { transform: translateY(-2px); }
      20% { transform: translateY(0px); }
      30% { transform: translateY(-2px); }
      40% { transform: translateY(0px); }
      50% { transform: translateY(-2px); }
      60% { transform: translateY(0px); }
    }
  `,
  
  // Nodding head
  nod: (id) => `
    @keyframes nod_${id} {
      0%, 100% { transform: rotate(0deg); }
      30% { transform: rotate(5deg); }
      60% { transform: rotate(-3deg); }
    }
  `,
  
  // Pulse/glow effect
  pulse: (id) => `
    @keyframes pulse_${id} {
      0%, 100% { opacity: 0.6; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.05); }
    }
  `,
  
  // Screen content typing effect
  typewriter: (id, chars = 20) => `
    @keyframes typewriter_${id} {
      from { width: 0; }
      to { width: 100%; }
    }
  `,
  
  // Fade in animation
  fadeIn: (id, delay = 0) => `
    @keyframes fadeIn_${id} {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `,
  
  // Slide in from side
  slideIn: (id, direction = 'left') => `
    @keyframes slideIn_${id} {
      from { opacity: 0; transform: translateX(${direction === 'left' ? '-30px' : '30px'}); }
      to { opacity: 1; transform: translateX(0); }
    }
  `,
  
  // Chart bar growing
  growBar: (id) => `
    @keyframes growBar_${id} {
      from { transform: scaleY(0); }
      to { transform: scaleY(1); }
    }
  `,
  
  // Confetti falling
  confetti: (id, startX, endX) => `
    @keyframes confetti_${id} {
      0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
      100% { transform: translate(${endX - startX}px, 300px) rotate(720deg); opacity: 0; }
    }
  `,
  
  // Sparkle effect
  sparkle: (id) => `
    @keyframes sparkle_${id} {
      0%, 100% { opacity: 0; transform: scale(0); }
      50% { opacity: 1; transform: scale(1); }
    }
  `,
  
  // Cursor blink
  blink: (id) => `
    @keyframes blink_${id} {
      0%, 50% { opacity: 1; }
      51%, 100% { opacity: 0; }
    }
  `,
  
  // Bounce effect
  bounce: (id) => `
    @keyframes bounce_${id} {
      0%, 100% { transform: translateY(0); }
      40% { transform: translateY(-15px); }
      60% { transform: translateY(-7px); }
    }
  `,
  
  // Rotate continuously
  rotate: (id) => `
    @keyframes rotate_${id} {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `,
  
  // Scale pulse
  scalePulse: (id) => `
    @keyframes scalePulse_${id} {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }
  `,
};

// Animation style generator
function animStyle(animName, id, duration = 2, delay = 0, easing = 'ease-in-out', iterations = 'infinite') {
  return `animation: ${animName}_${id} ${duration}s ${easing} ${delay}s ${iterations}; transform-origin: center;`;
}


// ============== ANIMATED HUMAN FIGURES ==============

function animatedPerson(x, y, options = {}) {
  const {
    scale = 1,
    skin = pick(COLORS.skin),
    hair = pick(COLORS.hair),
    shirt = pick(COLORS.clothing),
    pose = 'standing',
    animation = 'idle', // idle, typing, waving, nodding, presenting
    animDelay = 0,
  } = options;

  const s = scale;
  const id = uid('person');
  
  const headSize = 28 * s;
  const bodyHeight = 35 * s;
  const legLength = 40 * s;
  const totalHeight = headSize * 2 + bodyHeight + legLength;
  
  const headY = y - totalHeight + headSize;
  const shoulderY = headY + headSize + 4 * s;
  const hipY = shoulderY + bodyHeight;
  
  let keyframes = '';
  let headStyle = '';
  let leftArmStyle = '';
  let rightArmStyle = '';
  let bodyStyle = '';
  
  // Add animations based on type
  if (animation === 'typing') {
    keyframes += ANIMATIONS.typing(id);
    leftArmStyle = animStyle('typing', id, 0.8, animDelay, 'ease-in-out');
    rightArmStyle = animStyle('typing', id, 0.8, animDelay + 0.1, 'ease-in-out');
  } else if (animation === 'waving') {
    keyframes += ANIMATIONS.wave(id);
    rightArmStyle = animStyle('wave', id, 0.6, animDelay, 'ease-in-out');
  } else if (animation === 'nodding') {
    keyframes += ANIMATIONS.nod(id);
    headStyle = animStyle('nod', id, 2, animDelay, 'ease-in-out');
  } else if (animation === 'idle') {
    keyframes += ANIMATIONS.bob(id, 3, 3);
    bodyStyle = animStyle('bob', id, 3, animDelay, 'ease-in-out');
  }
  
  let svg = `<style>${keyframes}</style>`;
  svg += `<g class="animated-person" transform="translate(${x}, 0)">`;
  
  // Shadow
  svg += `<ellipse cx="0" cy="${y + 3 * s}" rx="${18 * s}" ry="${4 * s}" fill="${COLORS.shadow}"/>`;
  
  // Body group with animation
  svg += `<g style="${bodyStyle}">`;
  
  // Legs
  if (pose === 'sitting') {
    svg += `<path d="M${-8 * s} ${hipY} Q${-12 * s} ${hipY + 15 * s} ${-22 * s} ${hipY + 18 * s}" stroke="${COLORS.clothing.charcoal}" stroke-width="${10 * s}" stroke-linecap="round" fill="none"/>`;
    svg += `<path d="M${8 * s} ${hipY} Q${12 * s} ${hipY + 15 * s} ${22 * s} ${hipY + 18 * s}" stroke="${COLORS.clothing.charcoal}" stroke-width="${10 * s}" stroke-linecap="round" fill="none"/>`;
  } else {
    svg += `<path d="M${-6 * s} ${hipY} L${-8 * s} ${y - 4 * s}" stroke="${COLORS.clothing.charcoal}" stroke-width="${10 * s}" stroke-linecap="round" fill="none"/>`;
    svg += `<path d="M${6 * s} ${hipY} L${8 * s} ${y - 4 * s}" stroke="${COLORS.clothing.charcoal}" stroke-width="${10 * s}" stroke-linecap="round" fill="none"/>`;
    svg += `<ellipse cx="${-8 * s}" cy="${y}" rx="${8 * s}" ry="${4 * s}" fill="${COLORS.clothing.charcoal}"/>`;
    svg += `<ellipse cx="${8 * s}" cy="${y}" rx="${8 * s}" ry="${4 * s}" fill="${COLORS.clothing.charcoal}"/>`;
  }
  
  // Torso
  svg += `<path d="M${-12 * s} ${shoulderY + 4 * s} Q${-14 * s} ${(shoulderY + hipY) / 2} ${-10 * s} ${hipY} L${10 * s} ${hipY} Q${14 * s} ${(shoulderY + hipY) / 2} ${12 * s} ${shoulderY + 4 * s} Q0 ${shoulderY} ${-12 * s} ${shoulderY + 4 * s} Z" fill="${shirt}"/>`;
  
  // Arms
  const armY = shoulderY + 6 * s;
  if (pose === 'sitting' || animation === 'typing') {
    // Arms forward for typing
    svg += `<g style="${leftArmStyle}"><path d="M${-12 * s} ${armY} Q${-16 * s} ${armY + 8 * s} ${-10 * s} ${armY + 18 * s}" stroke="${shirt}" stroke-width="${7 * s}" stroke-linecap="round" fill="none"/><circle cx="${-10 * s}" cy="${armY + 20 * s}" r="${5 * s}" fill="${skin}"/></g>`;
    svg += `<g style="${rightArmStyle}"><path d="M${12 * s} ${armY} Q${16 * s} ${armY + 8 * s} ${10 * s} ${armY + 18 * s}" stroke="${shirt}" stroke-width="${7 * s}" stroke-linecap="round" fill="none"/><circle cx="${10 * s}" cy="${armY + 20 * s}" r="${5 * s}" fill="${skin}"/></g>`;
  } else if (animation === 'waving') {
    // Left arm down, right arm waving
    svg += `<path d="M${-12 * s} ${armY} Q${-18 * s} ${armY + 12 * s} ${-14 * s} ${armY + 25 * s}" stroke="${shirt}" stroke-width="${7 * s}" stroke-linecap="round" fill="none"/>`;
    svg += `<circle cx="${-14 * s}" cy="${armY + 27 * s}" r="${5 * s}" fill="${skin}"/>`;
    svg += `<g style="${rightArmStyle}" transform-origin="${12 * s}px ${armY}px"><path d="M${12 * s} ${armY} Q${20 * s} ${armY - 15 * s} ${18 * s} ${armY - 30 * s}" stroke="${shirt}" stroke-width="${7 * s}" stroke-linecap="round" fill="none"/><circle cx="${18 * s}" cy="${armY - 32 * s}" r="${5 * s}" fill="${skin}"/></g>`;
  } else if (pose === 'presenting') {
    // Right arm pointing
    svg += `<path d="M${-12 * s} ${armY} Q${-16 * s} ${armY + 10 * s} ${-12 * s} ${armY + 22 * s}" stroke="${shirt}" stroke-width="${7 * s}" stroke-linecap="round" fill="none"/>`;
    svg += `<circle cx="${-12 * s}" cy="${armY + 24 * s}" r="${5 * s}" fill="${skin}"/>`;
    svg += `<path d="M${12 * s} ${armY} Q${28 * s} ${armY - 8 * s} ${35 * s} ${armY - 12 * s}" stroke="${shirt}" stroke-width="${7 * s}" stroke-linecap="round" fill="none"/>`;
    svg += `<circle cx="${37 * s}" cy="${armY - 13 * s}" r="${5 * s}" fill="${skin}"/>`;
  } else {
    // Default standing arms
    svg += `<path d="M${-12 * s} ${armY} Q${-18 * s} ${armY + 12 * s} ${-14 * s} ${armY + 25 * s}" stroke="${shirt}" stroke-width="${7 * s}" stroke-linecap="round" fill="none"/>`;
    svg += `<circle cx="${-14 * s}" cy="${armY + 27 * s}" r="${5 * s}" fill="${skin}"/>`;
    svg += `<path d="M${12 * s} ${armY} Q${18 * s} ${armY + 12 * s} ${14 * s} ${armY + 25 * s}" stroke="${shirt}" stroke-width="${7 * s}" stroke-linecap="round" fill="none"/>`;
    svg += `<circle cx="${14 * s}" cy="${armY + 27 * s}" r="${5 * s}" fill="${skin}"/>`;
  }
  
  // Head with optional animation
  svg += `<g style="${headStyle}" transform-origin="0px ${headY}px">`;
  svg += `<circle cx="0" cy="${headY}" r="${headSize}" fill="${skin}"/>`;
  
  // Hair
  const hairStyle = Math.floor(Math.random() * 4);
  if (hairStyle === 0) {
    svg += `<path d="M${-headSize * 0.8} ${headY - headSize * 0.15} Q${-headSize * 0.4} ${headY - headSize * 1.05} 0 ${headY - headSize * 0.9} Q${headSize * 0.4} ${headY - headSize * 1.05} ${headSize * 0.8} ${headY - headSize * 0.15} Q${headSize * 0.5} ${headY - headSize * 0.45} 0 ${headY - headSize * 0.55} Q${-headSize * 0.5} ${headY - headSize * 0.45} ${-headSize * 0.8} ${headY - headSize * 0.15} Z" fill="${hair}"/>`;
  } else if (hairStyle === 1) {
    svg += `<ellipse cx="0" cy="${headY - headSize * 0.25}" rx="${headSize * 1.05}" ry="${headSize * 0.75}" fill="${hair}"/>`;
  } else if (hairStyle === 2) {
    svg += `<circle cx="0" cy="${headY - headSize - 4 * s}" r="${10 * s}" fill="${hair}"/>`;
    svg += `<path d="M${-headSize * 0.65} ${headY - headSize * 0.35} Q0 ${headY - headSize * 1.05} ${headSize * 0.65} ${headY - headSize * 0.35}" fill="${hair}"/>`;
  } else {
    svg += `<circle cx="0" cy="${headY - headSize * 0.15}" r="${headSize * 1.1}" fill="${hair}"/>`;
  }
  
  // Face
  const eyeY = headY - 2 * s;
  const eyeSpacing = 8 * s;
  svg += `<circle cx="${-eyeSpacing}" cy="${eyeY}" r="${3.5 * s}" fill="${COLORS.clothing.charcoal}"/>`;
  svg += `<circle cx="${eyeSpacing}" cy="${eyeY}" r="${3.5 * s}" fill="${COLORS.clothing.charcoal}"/>`;
  svg += `<circle cx="${-eyeSpacing + 1 * s}" cy="${eyeY - 1 * s}" r="${1.2 * s}" fill="${COLORS.white}"/>`;
  svg += `<circle cx="${eyeSpacing + 1 * s}" cy="${eyeY - 1 * s}" r="${1.2 * s}" fill="${COLORS.white}"/>`;
  svg += `<path d="M${-6 * s} ${headY + 8 * s} Q0 ${headY + 14 * s} ${6 * s} ${headY + 8 * s}" stroke="${COLORS.clothing.charcoal}" stroke-width="${2 * s}" fill="none" stroke-linecap="round"/>`;
  svg += `<circle cx="${-eyeSpacing - 4 * s}" cy="${headY + 4 * s}" r="${4 * s}" fill="#FFB6B6" opacity="0.3"/>`;
  svg += `<circle cx="${eyeSpacing + 4 * s}" cy="${headY + 4 * s}" r="${4 * s}" fill="#FFB6B6" opacity="0.3"/>`;
  
  svg += '</g>'; // head
  svg += '</g>'; // body
  svg += '</g>'; // person
  
  return svg;
}


// ============== ANIMATED OBJECTS ==============

function animatedLaptop(x, y, scale = 1, options = {}) {
  const { screenColor = COLORS.accent.blue, showTyping = true, animDelay = 0 } = options;
  const s = scale;
  const id = uid('laptop');
  
  let keyframes = '';
  if (showTyping) {
    keyframes += ANIMATIONS.typewriter(id);
    keyframes += ANIMATIONS.blink(id);
  }
  
  return `
    <style>${keyframes}</style>
    <g class="animated-laptop">
      <rect x="${x}" y="${y}" width="${65 * s}" height="${42 * s}" rx="4" fill="#2D3436"/>
      <rect x="${x + 3 * s}" y="${y + 3 * s}" width="${59 * s}" height="${36 * s}" rx="2" fill="${screenColor}"/>
      ${showTyping ? `
        <g clip-path="url(#clip_${id})">
          <rect x="${x + 8 * s}" y="${y + 10 * s}" width="${40 * s}" height="4" rx="2" fill="${COLORS.white}" opacity="0.5" style="animation: typewriter_${id} 2s steps(20) ${animDelay}s infinite;"/>
          <rect x="${x + 8 * s}" y="${y + 18 * s}" width="${35 * s}" height="4" rx="2" fill="${COLORS.white}" opacity="0.4" style="animation: typewriter_${id} 2s steps(20) ${animDelay + 0.3}s infinite;"/>
          <rect x="${x + 8 * s}" y="${y + 26 * s}" width="${45 * s}" height="4" rx="2" fill="${COLORS.white}" opacity="0.4" style="animation: typewriter_${id} 2s steps(20) ${animDelay + 0.6}s infinite;"/>
        </g>
        <rect x="${x + 50 * s}" y="${y + 10 * s}" width="2" height="12" fill="${COLORS.white}" style="animation: blink_${id} 1s step-end infinite;"/>
      ` : ''}
      <path d="M${x - 4 * s} ${y + 42 * s} L${x + 69 * s} ${y + 42 * s} L${x + 65 * s} ${y + 47 * s} L${x} ${y + 47 * s} Z" fill="#5D6D7E"/>
    </g>
  `;
}

function animatedChart(x, y, width = 120, height = 80, options = {}) {
  const { animDelay = 0 } = options;
  const id = uid('chart');
  const barHeights = [0.6, 0.8, 0.5, 0.9, 0.7];
  const barWidth = width / (barHeights.length * 2);
  const colors = [COLORS.accent.blue, COLORS.accent.teal, COLORS.accent.coral, COLORS.accent.purple, COLORS.accent.green];
  
  let keyframes = ANIMATIONS.growBar(id);
  
  let bars = '';
  barHeights.forEach((h, i) => {
    const barH = height * h;
    const barX = x + i * barWidth * 2 + barWidth / 2;
    const barY = y + height - barH;
    bars += `<rect x="${barX}" y="${barY}" width="${barWidth}" height="${barH}" rx="3" fill="${colors[i]}" style="animation: growBar_${id} 1s ease-out ${animDelay + i * 0.15}s both; transform-origin: bottom;"/>`;
  });
  
  return `
    <style>${keyframes}</style>
    <g class="animated-chart">
      <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="6" fill="${COLORS.white}" stroke="#E8E8E8" stroke-width="2"/>
      ${bars}
    </g>
  `;
}

function animatedNotification(x, y, text = 'New message!', options = {}) {
  const { color = COLORS.accent.coral, animDelay = 0 } = options;
  const id = uid('notif');
  
  const keyframes = ANIMATIONS.slideIn(id, 'right') + ANIMATIONS.scalePulse(id);
  
  return `
    <style>${keyframes}</style>
    <g class="animated-notification" style="animation: slideIn_${id} 0.5s ease-out ${animDelay}s both;">
      <rect x="${x}" y="${y}" width="${text.length * 8 + 30}" height="32" rx="16" fill="${color}"/>
      <circle cx="${x + 16}" cy="${y + 16}" r="8" fill="${COLORS.white}" style="animation: scalePulse_${id} 1s ease-in-out ${animDelay + 0.5}s infinite;"/>
      <text x="${x + 32}" y="${y + 21}" fill="${COLORS.white}" font-size="12" font-family="system-ui, sans-serif" font-weight="600">${text}</text>
    </g>
  `;
}

function floatingElement(x, y, type = 'circle', size = 25, color = COLORS.accent.coral, options = {}) {
  const { animDelay = 0, amplitude = 10 } = options;
  const id = uid('float');
  
  const keyframes = ANIMATIONS.float(id, amplitude, 3 + Math.random() * 2);
  
  let shape = '';
  if (type === 'circle') {
    shape = `<circle cx="${x}" cy="${y}" r="${size / 2}" fill="${color}" opacity="0.6"/>`;
  } else if (type === 'square') {
    shape = `<rect x="${x - size / 2}" y="${y - size / 2}" width="${size}" height="${size}" rx="${size * 0.15}" fill="${color}" opacity="0.6"/>`;
  } else if (type === 'diamond') {
    shape = `<rect x="${x - size / 2}" y="${y - size / 2}" width="${size}" height="${size}" rx="3" fill="${color}" opacity="0.6" transform="rotate(45 ${x} ${y})"/>`;
  } else if (type === 'star') {
    shape = `<polygon points="${x},${y - size / 2} ${x + size * 0.15},${y - size * 0.15} ${x + size / 2},${y - size * 0.15} ${x + size * 0.2},${y + size * 0.1} ${x + size * 0.3},${y + size / 2} ${x},${y + size * 0.25} ${x - size * 0.3},${y + size / 2} ${x - size * 0.2},${y + size * 0.1} ${x - size / 2},${y - size * 0.15} ${x - size * 0.15},${y - size * 0.15}" fill="${color}" opacity="0.7"/>`;
  }
  
  return `
    <style>${keyframes}</style>
    <g style="animation: float_${id} ${3 + Math.random() * 2}s ease-in-out ${animDelay}s infinite;">
      ${shape}
    </g>
  `;
}

function confettiParticles(centerX, centerY, count = 20) {
  let particles = '';
  let keyframes = '';
  const colors = Object.values(COLORS.accent);
  
  for (let i = 0; i < count; i++) {
    const id = uid('confetti');
    const startX = centerX + (Math.random() - 0.5) * 100;
    const endX = startX + (Math.random() - 0.5) * 200;
    const size = 6 + Math.random() * 8;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const delay = Math.random() * 2;
    const duration = 2 + Math.random() * 2;
    
    keyframes += ANIMATIONS.confetti(id, startX, endX);
    
    const shape = Math.random() > 0.5 
      ? `<rect x="${startX}" y="${centerY}" width="${size}" height="${size * 0.6}" rx="1" fill="${color}" style="animation: confetti_${id} ${duration}s ease-out ${delay}s infinite;"/>`
      : `<circle cx="${startX}" cy="${centerY}" r="${size / 2}" fill="${color}" style="animation: confetti_${id} ${duration}s ease-out ${delay}s infinite;"/>`;
    
    particles += shape;
  }
  
  return `<style>${keyframes}</style><g class="confetti">${particles}</g>`;
}

function sparkleEffect(x, y, count = 5) {
  let sparkles = '';
  let keyframes = '';
  
  for (let i = 0; i < count; i++) {
    const id = uid('sparkle');
    const sx = x + (Math.random() - 0.5) * 60;
    const sy = y + (Math.random() - 0.5) * 60;
    const size = 4 + Math.random() * 6;
    const delay = Math.random() * 2;
    
    keyframes += ANIMATIONS.sparkle(id);
    sparkles += `<circle cx="${sx}" cy="${sy}" r="${size}" fill="${COLORS.accent.yellow}" style="animation: sparkle_${id} ${1 + Math.random()}s ease-in-out ${delay}s infinite;"/>`;
  }
  
  return `<style>${keyframes}</style><g class="sparkles">${sparkles}</g>`;
}

function animatedWhiteboard(x, y, width = 180, height = 120, options = {}) {
  const { animDelay = 0 } = options;
  const id = uid('board');
  
  const keyframes = ANIMATIONS.typewriter(id);
  
  return `
    <style>${keyframes}</style>
    <g class="animated-whiteboard">
      <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="8" fill="${COLORS.white}" stroke="#E8E8E8" stroke-width="3"/>
      <rect x="${x + 20}" y="${y + 25}" width="${width * 0.5}" height="6" rx="3" fill="${COLORS.accent.blue}" opacity="0.7" style="animation: typewriter_${id} 1.5s ease-out ${animDelay}s both;"/>
      <rect x="${x + 20}" y="${y + 45}" width="${width * 0.7}" height="6" rx="3" fill="${COLORS.accent.coral}" opacity="0.6" style="animation: typewriter_${id} 1.5s ease-out ${animDelay + 0.3}s both;"/>
      <rect x="${x + 20}" y="${y + 65}" width="${width * 0.4}" height="6" rx="3" fill="${COLORS.accent.teal}" opacity="0.6" style="animation: typewriter_${id} 1.5s ease-out ${animDelay + 0.6}s both;"/>
      <rect x="${x + width - 60}" y="${y + 80}" width="35" height="30" rx="2" fill="${COLORS.accent.yellow}" opacity="0.8" transform="rotate(-5 ${x + width - 42} ${y + 95})"/>
    </g>
  `;
}

function animatedDesk(x, y, width = 140) {
  return `
    <g class="desk">
      <rect x="${x}" y="${y}" width="${width}" height="8" rx="4" fill="#E8D5C4"/>
      <rect x="${x}" y="${y}" width="${width}" height="3" rx="2" fill="#DEC9B8" opacity="0.5"/>
      <rect x="${x + 15}" y="${y + 8}" width="8" height="45" rx="2" fill="#C4B5A5"/>
      <rect x="${x + width - 23}" y="${y + 8}" width="8" height="45" rx="2" fill="#C4B5A5"/>
    </g>
  `;
}

function animatedPlant(x, y, scale = 1) {
  const s = scale;
  const id = uid('plant');
  const keyframes = ANIMATIONS.bob(id, 3, 4);
  
  return `
    <style>${keyframes}</style>
    <g class="plant" style="animation: bob_${id} 4s ease-in-out infinite; transform-origin: ${x + 15 * s}px ${y + 35 * s}px;">
      <path d="M${x} ${y} L${x + 30 * s} ${y} L${x + 25 * s} ${y + 35 * s} L${x + 5 * s} ${y + 35 * s} Z" fill="${COLORS.accent.coral}"/>
      <ellipse cx="${x + 15 * s}" cy="${y - 20 * s}" rx="${18 * s}" ry="${25 * s}" fill="${COLORS.accent.green}"/>
      <ellipse cx="${x + 5 * s}" cy="${y - 12 * s}" rx="${12 * s}" ry="${18 * s}" fill="#1ABC9C" transform="rotate(-15 ${x + 5 * s} ${y - 12 * s})"/>
      <ellipse cx="${x + 25 * s}" cy="${y - 10 * s}" rx="${10 * s}" ry="${15 * s}" fill="#2ECC71" transform="rotate(15 ${x + 25 * s} ${y - 10 * s})"/>
    </g>
  `;
}


// ============== ANIMATED SCENE COMPOSITIONS ==============

const ANIMATED_SCENES = {
  // Collaborative coding session with typing animations
  collaboration: (title) => `
    <rect x="50" y="40" width="380" height="320" rx="20" fill="${COLORS.bg.warmGray}"/>
    ${animatedWhiteboard(80, 60, 160, 100, { animDelay: 0 })}
    ${animatedDesk(100, 240, 180)}
    ${animatedPerson(190, 340, { pose: 'sitting', animation: 'typing', scale: 0.85, animDelay: 0 })}
    ${animatedLaptop(130, 215, 0.7, { animDelay: 0.5 })}
    ${animatedPlant(300, 220, 0.8)}
    
    <rect x="450" y="40" width="300" height="150" rx="16" fill="${COLORS.bg.softBlue}"/>
    ${animatedPerson(520, 160, { animation: 'waving', scale: 0.6, animDelay: 1 })}
    ${animatedPerson(620, 160, { animation: 'nodding', scale: 0.55, animDelay: 1.5 })}
    ${animatedPerson(700, 160, { animation: 'idle', scale: 0.5, animDelay: 2 })}
    ${animatedNotification(480, 50, 'Great idea! 💡', { animDelay: 2 })}
    
    <rect x="450" y="210" width="300" height="150" rx="16" fill="${COLORS.bg.softPink}"/>
    ${animatedChart(480, 240, 120, 80, { animDelay: 0.5 })}
    ${animatedPerson(680, 330, { animation: 'idle', scale: 0.55, animDelay: 0.8 })}
    
    ${floatingElement(40, 380, 'circle', 30, COLORS.accent.coral, { animDelay: 0 })}
    ${floatingElement(760, 50, 'diamond', 25, COLORS.accent.teal, { animDelay: 0.5 })}
    ${floatingElement(430, 380, 'square', 22, COLORS.accent.yellow, { animDelay: 1 })}
    ${sparkleEffect(350, 100, 4)}
  `,

  // Remote work with video call animations
  remote: (title) => `
    <rect x="50" y="40" width="400" height="320" rx="20" fill="${COLORS.bg.softPink}"/>
    ${animatedDesk(150, 250, 200)}
    ${animatedPerson(250, 350, { pose: 'sitting', animation: 'typing', scale: 0.9, animDelay: 0 })}
    ${animatedLaptop(180, 225, 0.85, { animDelay: 0.3 })}
    ${animatedPlant(380, 230, 0.9)}
    
    <rect x="80" y="60" width="100" height="120" rx="8" fill="#74B9FF"/>
    <rect x="80" y="60" width="100" height="120" rx="8" fill="none" stroke="${COLORS.white}" stroke-width="8"/>
    <circle cx="130" cy="90" r="15" fill="#FFEAA7" opacity="0.8"/>
    
    <rect x="470" y="40" width="140" height="100" rx="12" fill="${COLORS.bg.softBlue}"/>
    ${animatedPerson(540, 120, { animation: 'waving', scale: 0.45, animDelay: 0.5 })}
    
    <rect x="620" y="40" width="140" height="100" rx="12" fill="${COLORS.bg.softGreen}"/>
    ${animatedPerson(690, 120, { animation: 'nodding', scale: 0.45, animDelay: 1 })}
    
    <rect x="470" y="150" width="140" height="100" rx="12" fill="${COLORS.bg.warmGray}"/>
    ${animatedPerson(540, 230, { animation: 'idle', scale: 0.45, animDelay: 1.5 })}
    
    <rect x="620" y="150" width="140" height="100" rx="12" fill="${COLORS.bg.cream}"/>
    ${animatedPerson(690, 230, { animation: 'typing', scale: 0.45, animDelay: 2 })}
    
    ${animatedNotification(470, 270, '4 people online', { color: COLORS.accent.green, animDelay: 1.5 })}
    
    ${floatingElement(45, 380, 'star', 28, COLORS.accent.yellow, { animDelay: 0 })}
    ${floatingElement(765, 380, 'circle', 25, COLORS.accent.coral, { animDelay: 0.7 })}
  `,

  // Meeting/presentation with presenter animation
  meeting: (title) => `
    <rect x="50" y="40" width="450" height="320" rx="20" fill="${COLORS.bg.warmGray}"/>
    ${animatedWhiteboard(80, 60, 220, 150, { animDelay: 0 })}
    ${animatedPerson(200, 320, { pose: 'presenting', animation: 'idle', scale: 0.95, animDelay: 0 })}
    ${animatedPlant(420, 240, 0.85)}
    ${sparkleEffect(200, 100, 3)}
    
    <rect x="520" y="40" width="240" height="150" rx="16" fill="${COLORS.bg.softBlue}"/>
    ${animatedPerson(580, 160, { pose: 'sitting', animation: 'nodding', scale: 0.55, animDelay: 0.5 })}
    ${animatedPerson(680, 160, { pose: 'sitting', animation: 'nodding', scale: 0.55, animDelay: 1 })}
    ${animatedNotification(540, 50, '👏 Great point!', { animDelay: 2 })}
    
    <rect x="520" y="210" width="240" height="150" rx="16" fill="${COLORS.bg.softGreen}"/>
    ${animatedPerson(580, 330, { pose: 'sitting', animation: 'idle', scale: 0.55, animDelay: 1.5 })}
    ${animatedPerson(680, 330, { pose: 'sitting', animation: 'typing', scale: 0.55, animDelay: 2 })}
    
    ${floatingElement(40, 380, 'diamond', 25, COLORS.accent.teal, { animDelay: 0 })}
    ${floatingElement(770, 50, 'circle', 30, COLORS.accent.coral, { animDelay: 0.5 })}
  `,

  // Coding with live code animation
  coding: (title) => `
    <rect x="50" y="40" width="420" height="320" rx="20" fill="${COLORS.bg.softBlue}"/>
    ${animatedDesk(100, 250, 280)}
    ${animatedPerson(240, 350, { pose: 'sitting', animation: 'typing', scale: 0.9, animDelay: 0 })}
    ${animatedLaptop(140, 220, 1.0, { screenColor: COLORS.accent.purple, animDelay: 0 })}
    ${animatedLaptop(250, 225, 0.8, { screenColor: COLORS.accent.teal, animDelay: 0.5 })}
    ${animatedPlant(400, 230, 0.75)}
    
    <rect x="490" y="40" width="270" height="180" rx="16" fill="#2D3436"/>
    ${(() => {
      const id = uid('code');
      return `
        <style>${ANIMATIONS.typewriter(id)}${ANIMATIONS.blink(id)}</style>
        <rect x="510" y="65" width="100" height="8" rx="4" fill="${COLORS.accent.purple}" opacity="0.7" style="animation: typewriter_${id} 1.5s ease-out 0s both;"/>
        <rect x="510" y="85" width="150" height="8" rx="4" fill="${COLORS.accent.teal}" opacity="0.6" style="animation: typewriter_${id} 1.5s ease-out 0.3s both;"/>
        <rect x="510" y="105" width="80" height="8" rx="4" fill="${COLORS.accent.coral}" opacity="0.6" style="animation: typewriter_${id} 1.5s ease-out 0.6s both;"/>
        <rect x="530" y="125" width="120" height="8" rx="4" fill="${COLORS.accent.blue}" opacity="0.5" style="animation: typewriter_${id} 1.5s ease-out 0.9s both;"/>
        <rect x="530" y="145" width="90" height="8" rx="4" fill="${COLORS.accent.yellow}" opacity="0.5" style="animation: typewriter_${id} 1.5s ease-out 1.2s both;"/>
        <rect x="510" y="165" width="60" height="8" rx="4" fill="${COLORS.accent.purple}" opacity="0.6" style="animation: typewriter_${id} 1.5s ease-out 1.5s both;"/>
        <rect x="510" y="185" width="140" height="8" rx="4" fill="${COLORS.accent.green}" opacity="0.5" style="animation: typewriter_${id} 1.5s ease-out 1.8s both;"/>
        <rect x="${510 + 145}" y="65" width="3" height="12" fill="${COLORS.white}" style="animation: blink_${id} 1s step-end infinite;"/>
      `;
    })()}
    
    <rect x="490" y="240" width="270" height="120" rx="16" fill="${COLORS.bg.softPink}"/>
    ${animatedPerson(550, 330, { animation: 'idle', scale: 0.5, animDelay: 0.5 })}
    ${animatedPerson(630, 330, { animation: 'waving', scale: 0.5, animDelay: 1 })}
    ${animatedPerson(710, 330, { animation: 'nodding', scale: 0.5, animDelay: 1.5 })}
    ${animatedNotification(510, 250, 'PR Approved ✓', { color: COLORS.accent.green, animDelay: 2 })}
    
    ${floatingElement(40, 380, 'circle', 28, COLORS.accent.purple, { animDelay: 0 })}
    ${floatingElement(770, 380, 'diamond', 22, COLORS.accent.teal, { animDelay: 0.5 })}
  `,

  // Success celebration with confetti
  success: (title) => `
    <rect x="50" y="40" width="700" height="320" rx="24" fill="${COLORS.bg.softPink}"/>
    
    ${confettiParticles(400, 50, 30)}
    ${sparkleEffect(400, 150, 8)}
    
    ${animatedPerson(150, 320, { animation: 'waving', scale: 0.9, animDelay: 0 })}
    ${animatedPerson(280, 320, { animation: 'waving', scale: 0.85, animDelay: 0.2 })}
    ${animatedPerson(400, 320, { animation: 'waving', scale: 0.9, animDelay: 0.4 })}
    ${animatedPerson(520, 320, { animation: 'waving', scale: 0.85, animDelay: 0.6 })}
    ${animatedPerson(650, 320, { animation: 'waving', scale: 0.9, animDelay: 0.8 })}
    
    ${(() => {
      const id = uid('trophy');
      return `
        <style>${ANIMATIONS.bounce(id)}${ANIMATIONS.scalePulse(id)}</style>
        <g style="animation: bounce_${id} 2s ease-in-out infinite;">
          <circle cx="400" cy="160" r="50" fill="${COLORS.accent.yellow}" opacity="0.3"/>
          <circle cx="400" cy="160" r="35" fill="${COLORS.accent.yellow}" opacity="0.5" style="animation: scalePulse_${id} 1.5s ease-in-out infinite;"/>
          <text x="400" y="175" text-anchor="middle" font-size="45">🏆</text>
        </g>
      `;
    })()}
    
    ${animatedNotification(300, 250, '🎉 Goal Achieved!', { color: COLORS.accent.green, animDelay: 1 })}
    
    ${floatingElement(80, 80, 'star', 25, COLORS.accent.coral, { animDelay: 0 })}
    ${floatingElement(200, 60, 'diamond', 20, COLORS.accent.yellow, { animDelay: 0.3 })}
    ${floatingElement(600, 70, 'circle', 22, COLORS.accent.teal, { animDelay: 0.6 })}
    ${floatingElement(720, 90, 'star', 18, COLORS.accent.purple, { animDelay: 0.9 })}
  `,

  // Brainstorming with idea bubbles
  brainstorm: (title) => `
    <rect x="50" y="40" width="450" height="320" rx="20" fill="${COLORS.bg.softGreen}"/>
    ${animatedWhiteboard(80, 60, 200, 130, { animDelay: 0 })}
    ${animatedPerson(200, 320, { pose: 'presenting', animation: 'idle', scale: 0.85, animDelay: 0 })}
    ${animatedPerson(350, 320, { animation: 'nodding', scale: 0.8, animDelay: 0.5 })}
    ${animatedPlant(420, 240, 0.75)}
    
    ${(() => {
      const id = uid('idea');
      return `
        <style>${ANIMATIONS.float(id, 8, 3)}${ANIMATIONS.scalePulse(id)}</style>
        <g style="animation: float_${id} 3s ease-in-out infinite;">
          <circle cx="320" cy="80" r="30" fill="${COLORS.accent.yellow}" opacity="0.7" style="animation: scalePulse_${id} 2s ease-in-out infinite;"/>
          <text x="320" y="88" text-anchor="middle" font-size="24">💡</text>
        </g>
        <g style="animation: float_${id} 3.5s ease-in-out 0.5s infinite;">
          <circle cx="380" cy="110" r="22" fill="${COLORS.accent.coral}" opacity="0.6"/>
          <text x="380" y="117" text-anchor="middle" font-size="18">🚀</text>
        </g>
        <g style="animation: float_${id} 4s ease-in-out 1s infinite;">
          <circle cx="420" cy="70" r="18" fill="${COLORS.accent.teal}" opacity="0.6"/>
          <text x="420" y="76" text-anchor="middle" font-size="14">✨</text>
        </g>
      `;
    })()}
    
    <rect x="520" y="40" width="240" height="320" rx="16" fill="${COLORS.bg.warmGray}"/>
    ${(() => {
      const colors = [COLORS.accent.yellow, COLORS.accent.pink, COLORS.accent.blue, COLORS.accent.green, COLORS.accent.coral, COLORS.accent.purple];
      const id = uid('sticky');
      let stickies = `<style>${ANIMATIONS.fadeIn(id)}</style>`;
      const positions = [[540, 70], [640, 65], [550, 160], [650, 155], [560, 250], [660, 245]];
      positions.forEach((pos, i) => {
        stickies += `<rect x="${pos[0]}" y="${pos[1]}" width="80" height="70" rx="4" fill="${colors[i]}" opacity="0.8" transform="rotate(${(Math.random() - 0.5) * 8} ${pos[0] + 40} ${pos[1] + 35})" style="animation: fadeIn_${id} 0.5s ease-out ${i * 0.2}s both;"/>`;
      });
      return stickies;
    })()}
    
    ${floatingElement(40, 380, 'diamond', 25, COLORS.accent.coral, { animDelay: 0 })}
    ${floatingElement(770, 380, 'star', 28, COLORS.accent.teal, { animDelay: 0.5 })}
  `,

  // Default animated scene
  default: (title) => `
    <rect x="50" y="40" width="380" height="320" rx="20" fill="${COLORS.bg.warmGray}"/>
    ${animatedDesk(100, 250, 200)}
    ${animatedPerson(200, 350, { pose: 'sitting', animation: 'typing', scale: 0.9, animDelay: 0 })}
    ${animatedLaptop(130, 225, 0.85, { animDelay: 0.3 })}
    ${animatedPlant(320, 230, 0.8)}
    
    <rect x="80" y="60" width="90" height="110" rx="8" fill="#74B9FF"/>
    <rect x="80" y="60" width="90" height="110" rx="8" fill="none" stroke="${COLORS.white}" stroke-width="6"/>
    
    <rect x="450" y="40" width="310" height="150" rx="16" fill="${COLORS.bg.softBlue}"/>
    ${animatedPerson(530, 160, { animation: 'idle', scale: 0.55, animDelay: 0.5 })}
    ${animatedPerson(620, 160, { animation: 'waving', scale: 0.55, animDelay: 1 })}
    ${animatedPerson(710, 160, { animation: 'nodding', scale: 0.55, animDelay: 1.5 })}
    
    <rect x="450" y="210" width="310" height="150" rx="16" fill="${COLORS.bg.softPink}"/>
    ${animatedChart(480, 240, 130, 90, { animDelay: 0.5 })}
    ${animatedNotification(630, 280, 'New update!', { animDelay: 2 })}
    
    ${floatingElement(40, 380, 'circle', 28, COLORS.accent.coral, { animDelay: 0 })}
    ${floatingElement(770, 50, 'diamond', 25, COLORS.accent.teal, { animDelay: 0.5 })}
    ${floatingElement(430, 380, 'star', 22, COLORS.accent.yellow, { animDelay: 1 })}
  `,
};


// ============== KEYWORD DETECTION ==============

const KEYWORDS = {
  collaboration: ['collaboration', 'team', 'together', 'pair', 'group', 'collective', 'shared', 'cooperative', 'teamwork'],
  remote: ['remote', 'home', 'wfh', 'distributed', 'async', 'virtual', 'zoom', 'video call', 'hybrid'],
  meeting: ['meeting', 'standup', 'sync', 'discuss', 'agenda', 'scrum', 'sprint', 'planning', 'presentation', 'demo'],
  coding: ['code', 'coding', 'programming', 'develop', 'software', 'engineer', 'debug', 'build', 'api', 'developer'],
  success: ['success', 'celebrate', 'win', 'achieve', 'launch', 'ship', 'complete', 'milestone', 'goal', 'congratulations'],
  brainstorm: ['brainstorm', 'idea', 'ideation', 'creative', 'innovation', 'think', 'concept', 'workshop'],
};

function detectSceneType(title, content = '') {
  const text = `${title} ${content}`.toLowerCase();
  let best = 'default', score = 0;
  for (const [scene, kws] of Object.entries(KEYWORDS)) {
    let s = 0;
    for (const kw of kws) {
      if (text.includes(kw)) s += title.toLowerCase().includes(kw) ? 3 : 1;
    }
    if (s > score) { score = s; best = scene; }
  }
  return best;
}

// ============== SVG GENERATION ==============

function generateAnimatedSVG(sceneType, title) {
  idCounter = 0;
  const scene = ANIMATED_SCENES[sceneType] || ANIMATED_SCENES.default;
  const content = scene(title);
  
  const escapeXml = (t) => String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  
  const titleBar = `
    <rect x="180" y="${H - 65}" width="${W - 360}" height="50" rx="25" fill="${COLORS.white}" filter="url(#titleShadow)"/>
    <text x="${W / 2}" y="${H - 35}" text-anchor="middle" fill="${COLORS.clothing.charcoal}" font-size="15" font-family="system-ui, -apple-system, sans-serif" font-weight="600">${escapeXml(title.substring(0, 55))}</text>
  `;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <linearGradient id="mainBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${COLORS.bg.cream}"/>
      <stop offset="50%" stop-color="${COLORS.bg.warmGray}"/>
      <stop offset="100%" stop-color="${COLORS.bg.cream}"/>
    </linearGradient>
    <filter id="titleShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000" flood-opacity="0.08"/>
    </filter>
  </defs>
  
  <rect width="${W}" height="${H}" fill="url(#mainBg)"/>
  ${content}
  ${titleBar}
</svg>`;
}

async function ensureImagesDir() {
  try { await fs.promises.mkdir(IMAGES_DIR, { recursive: true }); } catch {}
}

// ============== EXPORTS ==============

export async function generateAnimatedIllustration(title, content = '', filename = null, options = {}) {
  await ensureImagesDir();
  const sceneType = options.scene || detectSceneType(title, content);
  const svg = generateAnimatedSVG(sceneType, title);
  const hash = crypto.createHash('md5').update(String(title)).digest('hex').slice(0, 8);
  const outputFilename = filename || `animated-${hash}`;
  const outputPath = path.join(IMAGES_DIR, `${outputFilename}.svg`);
  await fs.promises.writeFile(outputPath, svg, 'utf-8');
  return { path: outputPath, scene: sceneType, filename: `${outputFilename}.svg` };
}

export function generateAnimatedSceneSVG(sceneName, title = '') {
  idCounter = 0;
  const displayTitle = title || `${sceneName.charAt(0).toUpperCase() + sceneName.slice(1)} Scene`;
  return generateAnimatedSVG(sceneName, displayTitle);
}

export function getAvailableAnimatedScenes() {
  return Object.keys(ANIMATED_SCENES);
}

export { detectSceneType as detectAnimatedScene };

export default { 
  generateAnimatedIllustration, 
  generateAnimatedSceneSVG, 
  getAvailableAnimatedScenes, 
  detectAnimatedScene: detectSceneType 
};
