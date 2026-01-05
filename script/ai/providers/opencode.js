/**
 * OpenCode Provider
 * Adapter for OpenCode CLI
 */

import { spawn } from 'child_process';
import config from '../config.js';

const TIMEOUT_MS = 300000; // 5 minutes

/**
 * Run OpenCode CLI with a prompt
 */
export async function call(prompt, options = {}) {
  const model = options.model || config.defaultModel;
  
  return new Promise((resolve, reject) => {
    let output = '';
    let resolved = false;
    
    const proc = spawn('opencode', ['run', '--model', model, '--format', 'json', prompt], {
      timeout: TIMEOUT_MS,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        proc.kill('SIGTERM');
        reject(new Error('OpenCode timeout'));
      }
    }, TIMEOUT_MS);
    
    proc.stdout.on('data', (data) => { output += data.toString(); });
    proc.stderr.on('data', (data) => { output += data.toString(); });
    
    proc.on('close', (code) => {
      clearTimeout(timeout);
      if (!resolved) {
        resolved = true;
        if (output) {
          resolve(output);
        } else {
          reject(new Error(`OpenCode exited with code ${code}`));
        }
      }
    });
    
    proc.on('error', (err) => {
      clearTimeout(timeout);
      if (!resolved) {
        resolved = true;
        reject(err);
      }
    });
  });
}

/**
 * Parse OpenCode JSON event stream response
 */
export function parseResponse(output) {
  if (!output) {
    console.log('⚠️ parseResponse: No output received');
    return null;
  }
  
  // Try to extract text from JSON events
  const lines = output.split('\n').filter(l => l.trim());
  let fullText = '';
  
  for (const line of lines) {
    try {
      const event = JSON.parse(line);
      if (event.type === 'text' && event.part?.text) {
        fullText += event.part.text;
      }
    } catch {
      // Not JSON, might be raw text
    }
  }
  
  const text = fullText || output;
  
  if (!text || text.trim().length === 0) {
    console.log('⚠️ parseResponse: No text extracted from events');
    console.log('   Raw output length:', output.length);
    console.log('   Lines found:', lines.length);
    return null;
  }
  
  // Try to parse as JSON
  try {
    const parsed = JSON.parse(text.trim());
    return parsed;
  } catch (e) {
    console.log('⚠️ parseResponse: Direct JSON parse failed:', e.message);
    console.log('   Text preview:', text.substring(0, 200));
  }
  
  // Try to extract JSON from code blocks
  const codeBlockPatterns = [/```json\s*([\s\S]*?)\s*```/, /```\s*([\s\S]*?)\s*```/];
  for (const p of codeBlockPatterns) {
    const m = text.match(p);
    if (m) {
      try { return JSON.parse(m[1].trim()); } catch {}
    }
  }
  
  // Try to extract JSON object
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try { return JSON.parse(text.substring(firstBrace, lastBrace + 1)); } catch {}
  }
  
  return null;
}

export default { call, parseResponse };
