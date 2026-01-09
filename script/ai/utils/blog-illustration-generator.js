/**
 * Blog Illustration Generator v8
 * Clean, Professional SVG Illustrations
 * Fixed grid layouts - no overlaps
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const IMAGES_DIR = 'blog-output/images';
const W = 700, H = 420;  // Increased height for multi-line title

// GitHub dark theme
const C = {
  bg: '#0d1117',
  card: '#161b22',
  elevated: '#21262d',
  border: '#30363d',
  text: '#e6edf3',
  muted: '#8b949e',
  dim: '#6e7681',
  blue: '#58a6ff',
  purple: '#a371f7',
  green: '#3fb950',
  cyan: '#39c5cf',
  orange: '#d29922',
  red: '#f85149',
  pink: '#f778ba',
};

// Use monospace font everywhere for consistency
const FONT = "'SF Mono', Menlo, Monaco, 'Courier New', monospace";

// Simple icon paths (24x24 viewBox)
const ICONS = {
  server: 'M4 6h16M4 12h16M4 18h16M8 6v12M16 6v12',
  database: 'M12 3c4.97 0 9 1.34 9 3s-4.03 3-9 3-9-1.34-9-3 4.03-3 9-3m9 3v12c0 1.66-4.03 3-9 3s-9-1.34-9-3V6m18 6c0 1.66-4.03 3-9 3s-9-1.34-9-3',
  cloud: 'M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z',
  code: 'M16 18l6-6-6-6M8 6l-6 6 6 6',
  terminal: 'M4 17l6-6-6-6M12 19h8',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  zap: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  check: 'M20 6L9 17l-5-5',
  x: 'M18 6L6 18M6 6l12 12',
  alert: 'M12 9v4m0 4h.01M12 2L2 22h20L12 2z',
  globe: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z',
  layers: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  rocket: 'M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z',
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  target: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  cpu: 'M9 9h6v6H9zM9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3',
  activity: 'M22 12h-4l-3 9L9 3l-3 9H2',
  lock: 'M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  git: 'M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22',
};

const esc = t => String(t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');


// ============== SVG PRIMITIVES ==============

const icon = (name, x, y, size = 24, color = C.text) => {
  const p = ICONS[name];
  if (!p) return '';
  const s = size / 24;
  return `<g transform="translate(${x - size/2}, ${y - size/2}) scale(${s})">
    <path d="${p}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;
};

// Card with icon and label - main building block
const card = (x, y, w, h, iconName, label, color = C.blue, sublabel = '') => `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${C.card}" stroke="${color}" stroke-width="2"/>
  ${icon(iconName, x + w/2, y + h/2 - (sublabel ? 8 : 0), Math.min(w, h) * 0.35, color)}
  <text x="${x + w/2}" y="${y + h - 16}" text-anchor="middle" fill="${C.text}" font-size="12" font-family="${FONT}">${esc(label.substring(0, 12))}</text>
  ${sublabel ? `<text x="${x + w/2}" y="${y + h - 4}" text-anchor="middle" fill="${C.muted}" font-size="10" font-family="${FONT}">${esc(sublabel.substring(0, 15))}</text>` : ''}
`;

// Metric display
const metric = (x, y, label, value, unit = '', color = C.blue) => `
  <rect x="${x}" y="${y}" width="110" height="60" rx="8" fill="${C.card}" stroke="${C.border}"/>
  <text x="${x + 55}" y="${y + 22}" text-anchor="middle" fill="${C.muted}" font-size="11" font-family="${FONT}">${esc(label.substring(0, 12))}</text>
  <text x="${x + 55}" y="${y + 46}" text-anchor="middle" fill="${color}" font-size="18" font-family="${FONT}">${esc(value)}<tspan fill="${C.muted}" font-size="11">${esc(unit)}</tspan></text>
`;

// Status indicator
const status = (x, y, state, text) => {
  const col = { ok: C.green, warn: C.orange, error: C.red, info: C.cyan }[state] || C.muted;
  return `
  <circle cx="${x}" cy="${y}" r="6" fill="${col}"/>
  <text x="${x + 14}" y="${y + 4}" fill="${C.text}" font-size="11" font-family="${FONT}">${esc(text.substring(0, 30))}</text>`;
};

// Arrow connector
const arrow = (x1, y1, x2, y2, color = C.blue, label = '', dashed = false) => {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const dash = dashed ? 'stroke-dasharray="6 4"' : '';
  return `
  <defs><marker id="ah${x1}${y1}" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
    <path d="M0,0 L8,4 L0,8 Z" fill="${color}"/>
  </marker></defs>
  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="2" ${dash} marker-end="url(#ah${x1}${y1})"/>
  ${label ? `<rect x="${mx - 25}" y="${my - 10}" width="50" height="20" rx="4" fill="${C.card}"/>
  <text x="${mx}" y="${my + 4}" text-anchor="middle" fill="${C.muted}" font-size="10" font-family="${FONT}">${esc(label.substring(0, 8))}</text>` : ''}`;
};

// Code snippet block
const codeSnippet = (x, y, w, h, lines, title = 'code.ts') => `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${C.elevated}" stroke="${C.border}"/>
  <rect x="${x}" y="${y}" width="${w}" height="28" rx="8" fill="${C.card}"/>
  <circle cx="${x + 16}" cy="${y + 14}" r="5" fill="${C.red}" opacity="0.8"/>
  <circle cx="${x + 32}" cy="${y + 14}" r="5" fill="${C.orange}" opacity="0.8"/>
  <circle cx="${x + 48}" cy="${y + 14}" r="5" fill="${C.green}" opacity="0.8"/>
  <text x="${x + w/2}" y="${y + 18}" text-anchor="middle" fill="${C.dim}" font-size="10" font-family="${FONT}">${esc(title.substring(0, 20))}</text>
  ${lines.slice(0, 5).map((l, i) => `<text x="${x + 12}" y="${y + 48 + i * 18}" fill="${l.hl ? C.cyan : C.text}" font-size="11" font-family="${FONT}">${esc(l.t.substring(0, 32))}</text>`).join('')}
`;

// Terminal block
const terminalBlock = (x, y, w, h, lines) => `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${C.bg}" stroke="${C.green}"/>
  <text x="${x + 12}" y="${y + 20}" fill="${C.green}" font-size="11" font-family="${FONT}">$ terminal</text>
  ${lines.slice(0, 4).map((l, i) => {
    const col = l.err ? C.red : l.ok ? C.green : C.text;
    return `<text x="${x + 12}" y="${y + 44 + i * 18}" fill="${col}" font-size="11" font-family="${FONT}">${esc(l.t.substring(0, 35))}</text>`;
  }).join('')}
`;

// Title bar at bottom - multi-line support for long titles
const titleBar = (text) => {
  const maxCharsPerLine = 60;
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  
  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  
  // Limit to 2 lines max
  if (lines.length > 2) {
    lines[1] = lines[1].substring(0, maxCharsPerLine - 3) + '...';
    lines.length = 2;
  }
  
  const boxHeight = lines.length === 1 ? 36 : 50;
  const startY = H - boxHeight - 8;
  
  return `
  <rect x="30" y="${startY}" width="${W - 60}" height="${boxHeight}" rx="8" fill="${C.card}" stroke="${C.border}"/>
  ${lines.map((line, i) => `<text x="${W/2}" y="${startY + 22 + i * 16}" text-anchor="middle" fill="${C.text}" font-size="11" font-family="${FONT}">${esc(line)}</text>`).join('')}`;
};


// ============== SCENE LAYOUTS ==============
// Each scene uses a fixed grid - NO OVERLAPS

const SCENES = {
  // Architecture: 3 cards in a row with arrows
  architecture: (title) => `
    ${card(80, 100, 120, 100, 'globe', 'Client', C.cyan)}
    ${card(290, 100, 120, 100, 'server', 'Server', C.blue)}
    ${card(500, 100, 120, 100, 'database', 'Database', C.purple)}
    ${arrow(200, 150, 290, 150, C.cyan, 'HTTP')}
    ${arrow(410, 150, 500, 150, C.purple, 'SQL')}
    ${metric(80, 250, 'Latency', '12', 'ms', C.green)}
    ${metric(210, 250, 'Uptime', '99.9', '%', C.green)}
    ${status(360, 280, 'ok', 'All systems operational')}
    ${titleBar(title)}
  `,

  // Scaling: Load balancer + multiple nodes
  scaling: (title) => `
    ${card(290, 50, 120, 80, 'cloud', 'Load Balancer', C.cyan)}
    ${card(80, 180, 100, 80, 'server', 'Node 1', C.green)}
    ${card(220, 180, 100, 80, 'server', 'Node 2', C.green)}
    ${card(360, 180, 100, 80, 'server', 'Node 3', C.green)}
    ${card(500, 180, 100, 80, 'server', 'Node 4', C.orange)}
    ${arrow(350, 130, 130, 180, C.cyan)}
    ${arrow(350, 130, 270, 180, C.cyan)}
    ${arrow(350, 130, 410, 180, C.cyan)}
    ${arrow(350, 130, 550, 180, C.cyan)}
    ${metric(150, 290, 'RPS', '45K', '', C.blue)}
    ${metric(290, 290, 'Nodes', '4', '', C.green)}
    ${metric(430, 290, 'CPU', '72', '%', C.orange)}
    ${titleBar(title)}
  `,

  // Database: Primary + Replicas
  database: (title) => `
    ${card(180, 80, 140, 100, 'database', 'Primary', C.purple)}
    ${card(380, 80, 140, 100, 'database', 'Replica', C.cyan)}
    ${arrow(320, 130, 380, 130, C.green, 'sync')}
    ${metric(80, 220, 'QPS', '2.3K', '', C.purple)}
    ${metric(210, 220, 'Latency', '4', 'ms', C.green)}
    ${metric(340, 220, 'Connections', '128', '', C.blue)}
    ${metric(470, 220, 'Cache Hit', '94', '%', C.green)}
    ${status(200, 320, 'ok', 'Replication healthy')}
    ${status(400, 320, 'ok', 'Replica in sync')}
    ${titleBar(title)}
  `,

  // Deployment: CI/CD Pipeline
  deployment: (title) => `
    ${card(60, 120, 100, 80, 'code', 'Code', C.muted)}
    ${card(200, 120, 100, 80, 'git', 'Build', C.orange)}
    ${card(340, 120, 100, 80, 'target', 'Test', C.blue)}
    ${card(480, 120, 100, 80, 'rocket', 'Deploy', C.green)}
    ${arrow(160, 160, 200, 160, C.muted)}
    ${arrow(300, 160, 340, 160, C.orange)}
    ${arrow(440, 160, 480, 160, C.blue)}
    ${metric(140, 240, 'Build', '2.3', 'min', C.orange)}
    ${metric(290, 240, 'Tests', '141', '', C.green)}
    ${metric(440, 240, 'Coverage', '87', '%', C.blue)}
    ${status(280, 330, 'ok', 'Pipeline passed • Ready for production')}
    ${titleBar(title)}
  `,

  // Security: Firewall flow
  security: (title) => `
    ${card(80, 120, 120, 90, 'globe', 'Internet', C.muted)}
    ${card(290, 120, 120, 90, 'shield', 'Firewall', C.green)}
    ${card(500, 120, 120, 90, 'lock', 'Auth', C.purple)}
    ${arrow(200, 165, 290, 165, C.muted, 'HTTPS')}
    ${arrow(410, 165, 500, 165, C.green, 'mTLS')}
    ${metric(100, 250, 'Blocked', '847', '', C.red)}
    ${metric(250, 250, 'Auth Rate', '99.2', '%', C.green)}
    ${metric(400, 250, 'Threats', '0', '', C.green)}
    ${status(280, 340, 'ok', 'Zero Trust • All traffic encrypted')}
    ${titleBar(title)}
  `,


  // Debugging: Code + Terminal side by side
  debugging: (title) => `
    ${codeSnippet(40, 50, 300, 130, [
      { t: 'async function fetch() {' },
      { t: '  const res = await api.get();', hl: true },
      { t: '  return res.data;' },
      { t: '}' }
    ], 'debug.ts')}
    ${terminalBlock(360, 50, 300, 130, [
      { t: 'node debug.ts' },
      { t: 'TypeError: Cannot read undefined', err: true },
      { t: '    at fetch (debug.ts:2)', err: true }
    ])}
    ${card(150, 220, 120, 80, 'alert', 'Bug Found', C.red)}
    ${card(430, 220, 120, 80, 'check', 'Fixed', C.green)}
    ${arrow(270, 260, 430, 260, C.orange, 'debug')}
    ${status(280, 340, 'ok', 'Issue resolved')}
    ${titleBar(title)}
  `,

  // Testing: Test results
  testing: (title) => `
    ${codeSnippet(40, 50, 280, 120, [
      { t: 'describe("API", () => {' },
      { t: '  it("returns 200", async () => {', hl: true },
      { t: '    expect(res.status).toBe(200);' },
      { t: '  });' }
    ], 'api.test.ts')}
    ${metric(360, 50, 'Passed', '141', '', C.green)}
    ${metric(490, 50, 'Failed', '1', '', C.red)}
    ${metric(360, 120, 'Coverage', '87', '%', C.blue)}
    ${metric(490, 120, 'Duration', '4.2', 's', C.muted)}
    ${card(150, 220, 120, 80, 'target', 'Unit', C.green)}
    ${card(310, 220, 120, 80, 'layers', 'Integration', C.blue)}
    ${card(470, 220, 120, 80, 'globe', 'E2E', C.purple)}
    ${status(280, 340, 'ok', 'All test suites passed')}
    ${titleBar(title)}
  `,

  // Performance: Metrics focused
  performance: (title) => `
    ${metric(80, 60, 'P99 Latency', '23', 'ms', C.green)}
    ${metric(210, 60, 'RPS', '45K', '', C.blue)}
    ${metric(340, 60, 'Error Rate', '0.1', '%', C.green)}
    ${metric(470, 60, 'CPU', '45', '%', C.orange)}
    ${terminalBlock(120, 150, 460, 100, [
      { t: '$ perf analyze --profile' },
      { t: 'Hotspot: db.query() - 45% CPU', err: true },
      { t: '✓ Optimized: -65% latency', ok: true }
    ])}
    ${card(200, 280, 120, 70, 'zap', 'Optimized', C.green)}
    ${card(380, 280, 120, 70, 'activity', 'Monitoring', C.blue)}
    ${titleBar(title)}
  `,

  // API: Request/Response
  api: (title) => `
    ${codeSnippet(40, 50, 300, 120, [
      { t: 'GET /api/v2/users HTTP/1.1' },
      { t: 'Authorization: Bearer ***', hl: true },
      { t: 'Accept: application/json' }
    ], 'request.http')}
    ${codeSnippet(360, 50, 300, 120, [
      { t: '200 OK (12ms)' },
      { t: '{ "users": [...] }', hl: true },
      { t: 'Content-Type: application/json' }
    ], 'response')}
    ${metric(80, 200, 'RPS', '8.4K', '', C.blue)}
    ${metric(210, 200, 'P99', '45', 'ms', C.green)}
    ${metric(340, 200, 'Errors', '0.01', '%', C.green)}
    ${metric(470, 200, 'Cache', '78', '%', C.cyan)}
    ${status(280, 300, 'ok', 'API healthy • Rate limit OK')}
    ${titleBar(title)}
  `,

  // Monitoring: Dashboard
  monitoring: (title) => `
    ${metric(80, 50, 'Uptime', '99.99', '%', C.green)}
    ${metric(210, 50, 'Alerts', '0', '', C.green)}
    ${metric(340, 50, 'P95', '23', 'ms', C.blue)}
    ${metric(470, 50, 'Memory', '62', '%', C.orange)}
    ${card(120, 150, 120, 80, 'activity', 'Metrics', C.blue)}
    ${card(290, 150, 120, 80, 'eye', 'Traces', C.purple)}
    ${card(460, 150, 120, 80, 'terminal', 'Logs', C.cyan)}
    ${metric(80, 270, 'Events', '1.2M', '/day', C.muted)}
    ${metric(210, 270, 'Retention', '30', 'days', C.muted)}
    ${status(380, 300, 'ok', 'All systems healthy')}
    ${titleBar(title)}
  `,


  // Frontend: Web vitals
  frontend: (title) => `
    ${metric(80, 50, 'LCP', '1.2', 's', C.green)}
    ${metric(210, 50, 'FID', '45', 'ms', C.green)}
    ${metric(340, 50, 'CLS', '0.02', '', C.green)}
    ${metric(470, 50, 'TTI', '2.1', 's', C.orange)}
    ${codeSnippet(150, 140, 400, 100, [
      { t: 'const App = () => {' },
      { t: '  return <Suspense fallback={<Loader />}>', hl: true },
      { t: '    <MainContent />' },
      { t: '  </Suspense>;' }
    ], 'App.tsx')}
    ${card(200, 280, 120, 70, 'globe', 'Browser', C.cyan)}
    ${card(380, 280, 120, 70, 'zap', 'Optimized', C.green)}
    ${titleBar(title)}
  `,

  // Success: Celebration
  success: (title) => `
    ${card(290, 60, 120, 100, 'check', 'Success!', C.green)}
    ${metric(80, 200, 'Uptime', '100', '%', C.green)}
    ${metric(210, 200, 'Users', '12.4K', '', C.blue)}
    ${metric(340, 200, 'Revenue', '+24', '%', C.green)}
    ${metric(470, 200, 'NPS', '72', '', C.purple)}
    ${status(200, 320, 'ok', 'Deployment successful')}
    ${status(400, 320, 'ok', 'Zero downtime')}
    ${titleBar(title)}
  `,

  // Error: Incident
  error: (title) => `
    ${card(290, 50, 120, 90, 'alert', 'Incident', C.red)}
    ${terminalBlock(150, 160, 400, 100, [
      { t: '$ kubectl logs pod/api-7d8f9' },
      { t: 'ERROR: OOMKilled - Exit code 137', err: true },
      { t: 'Memory limit exceeded: 512Mi', err: true }
    ])}
    ${metric(100, 290, 'Status', '503', '', C.red)}
    ${metric(240, 290, 'Errors', '2.3K', '', C.red)}
    ${metric(380, 290, 'MTTR', '4.2', 'min', C.orange)}
    ${status(280, 370, 'error', 'Service degraded • Investigating')}
    ${titleBar(title)}
  `,

  // Default: Simple overview
  default: (title) => `
    ${card(290, 80, 120, 100, 'layers', 'System', C.blue)}
    ${metric(80, 220, 'Requests', '8.2K', '/s', C.blue)}
    ${metric(220, 220, 'Latency', '12', 'ms', C.green)}
    ${metric(360, 220, 'Errors', '0.1', '%', C.green)}
    ${metric(500, 220, 'Uptime', '99.9', '%', C.green)}
    ${status(280, 340, 'ok', 'All systems operational')}
    ${titleBar(title)}
  `,
};


// ============== KEYWORD DETECTION ==============

const KEYWORDS = {
  architecture: ['architecture', 'design', 'pattern', 'system', 'infrastructure', 'microservice', 'distributed'],
  scaling: ['scale', 'load', 'traffic', 'kubernetes', 'k8s', 'container', 'docker', 'cluster', 'replicas', 'horizontal', 'auto-scaling'],
  database: ['database', 'sql', 'postgres', 'mysql', 'mongo', 'query', 'migration', 'schema', 'orm', 'redis', 'cache', 'replication'],
  deployment: ['deploy', 'ci', 'cd', 'pipeline', 'release', 'ship', 'production', 'staging', 'github actions', 'jenkins', 'devops'],
  security: ['security', 'auth', 'authentication', 'jwt', 'oauth', 'encrypt', 'ssl', 'tls', 'firewall', 'vulnerability', 'zero trust'],
  debugging: ['debug', 'bug', 'error', 'fix', 'issue', 'trace', 'breakpoint', 'crash', 'exception', 'troubleshoot', 'root cause'],
  testing: ['test', 'jest', 'vitest', 'playwright', 'cypress', 'coverage', 'unit', 'integration', 'e2e', 'tdd', 'mock'],
  performance: ['performance', 'optimize', 'speed', 'latency', 'cache', 'profil', 'benchmark', 'bottleneck', 'memory', 'cpu'],
  api: ['api', 'rest', 'graphql', 'endpoint', 'gateway', 'grpc', 'webhook', 'http', 'request', 'response'],
  monitoring: ['monitor', 'observ', 'metric', 'log', 'alert', 'grafana', 'datadog', 'prometheus', 'dashboard', 'trace'],
  frontend: ['frontend', 'react', 'vue', 'angular', 'svelte', 'css', 'tailwind', 'component', 'ui', 'web vitals', 'lcp', 'fid'],
  success: ['success', 'complete', 'done', 'achieve', 'launch', 'milestone', 'shipped', 'celebrate', 'win'],
  error: ['fail', 'crash', 'down', 'outage', 'incident', '500', '503', 'timeout', 'oom', 'killed', 'alert'],
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

function generateSVG(sceneType, title) {
  const scene = SCENES[sceneType] || SCENES.default;
  const content = scene(title);
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${C.bg}"/>
      <stop offset="100%" stop-color="${C.card}"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  ${content}
</svg>`;
}

async function ensureImagesDir() {
  try { await fs.promises.mkdir(IMAGES_DIR, { recursive: true }); } catch {}
}

// ============== EXPORTS ==============

export async function generateIllustration(title, content = '', filename = null, options = {}) {
  await ensureImagesDir();
  
  const sceneType = detectSceneType(title, content);
  const svg = generateSVG(sceneType, title);
  
  const hash = crypto.createHash('md5').update(String(title)).digest('hex').slice(0, 8);
  const outputFilename = filename || `img-${hash}`;
  const outputPath = path.join(IMAGES_DIR, `${outputFilename}.svg`);
  
  await fs.promises.writeFile(outputPath, svg, 'utf-8');
  
  return { path: outputPath, scene: sceneType, filename: `${outputFilename}.svg`, aiGenerated: false };
}

export async function generateBlogIllustrations(posts) {
  await ensureImagesDir();
  const results = [];
  
  for (const post of posts) {
    try {
      const result = await generateIllustration(post.title, post.content || '', post.slug ? `img-${post.slug}` : null);
      results.push({ slug: post.slug, ...result });
    } catch (err) {
      results.push({ slug: post.slug, error: err.message });
    }
  }
  return results;
}

export function generateSceneSVG(sceneName) {
  return generateSVG(sceneName, `${sceneName.charAt(0).toUpperCase() + sceneName.slice(1)} Overview`);
}

export function getAvailableScenes() {
  return Object.keys(SCENES);
}

export { detectSceneType as detectScene };

// Import alternative style generators
import cartoonGenerator from './cartoon-illustration-generator.js';
import modernGenerator from './modern-illustration-generator.js';
import animatedGenerator from './animated-illustration-generator.js';
import pixelGenerator from './pixel-illustration-generator.js';

// Re-export cartoon functions
export const generateCartoonIllustration = cartoonGenerator.generateCartoonIllustration;
export const generateCartoonSceneSVG = cartoonGenerator.generateCartoonSceneSVG;
export const getAvailableCartoonScenes = cartoonGenerator.getAvailableCartoonScenes;
export const detectCartoonScene = cartoonGenerator.detectCartoonScene;

// Re-export modern functions (recommended)
export const generateModernIllustration = modernGenerator.generateModernIllustration;
export const generateModernSceneSVG = modernGenerator.generateModernSceneSVG;
export const getAvailableModernScenes = modernGenerator.getAvailableModernScenes;
export const detectModernScene = modernGenerator.detectModernScene;

// Re-export animated functions (for LinkedIn/social media)
export const generateAnimatedIllustration = animatedGenerator.generateAnimatedIllustration;
export const generateAnimatedSceneSVG = animatedGenerator.generateAnimatedSceneSVG;
export const getAvailableAnimatedScenes = animatedGenerator.getAvailableAnimatedScenes;
export const detectAnimatedScene = animatedGenerator.detectAnimatedScene;

// Re-export pixel art functions (16-bit NES style - recommended for social)
export const generatePixelIllustration = pixelGenerator.generatePixelIllustration;
export const generatePixelSceneSVG = pixelGenerator.generatePixelSceneSVG;
export const getAvailablePixelScenes = pixelGenerator.getAvailablePixelScenes;
export const detectPixelScene = pixelGenerator.detectPixelScene;

export default { 
  generateIllustration, 
  generateBlogIllustrations, 
  generateSceneSVG, 
  getAvailableScenes, 
  detectScene: detectSceneType,
  // Cartoon style exports
  generateCartoonIllustration: cartoonGenerator.generateCartoonIllustration,
  generateCartoonSceneSVG: cartoonGenerator.generateCartoonSceneSVG,
  getAvailableCartoonScenes: cartoonGenerator.getAvailableCartoonScenes,
  detectCartoonScene: cartoonGenerator.detectCartoonScene,
  // Modern style exports (recommended)
  generateModernIllustration: modernGenerator.generateModernIllustration,
  generateModernSceneSVG: modernGenerator.generateModernSceneSVG,
  getAvailableModernScenes: modernGenerator.getAvailableModernScenes,
  detectModernScene: modernGenerator.detectModernScene,
  // Animated style exports (for LinkedIn/social)
  generateAnimatedIllustration: animatedGenerator.generateAnimatedIllustration,
  generateAnimatedSceneSVG: animatedGenerator.generateAnimatedSceneSVG,
  getAvailableAnimatedScenes: animatedGenerator.getAvailableAnimatedScenes,
  detectAnimatedScene: animatedGenerator.detectAnimatedScene,
  // Pixel art style exports (16-bit NES style - recommended for social)
  generatePixelIllustration: pixelGenerator.generatePixelIllustration,
  generatePixelSceneSVG: pixelGenerator.generatePixelSceneSVG,
  getAvailablePixelScenes: pixelGenerator.getAvailablePixelScenes,
  detectPixelScene: pixelGenerator.detectPixelScene,
};
