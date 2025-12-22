/**
 * Validator Middleware
 * Validates AI responses against schemas and quality thresholds
 */

import config from '../config.js';

/**
 * Validate response against a JSON schema
 */
export function validateSchema(response, schema) {
  if (!response || typeof response !== 'object') {
    return { valid: false, errors: ['Response is not an object'] };
  }
  
  const errors = [];
  
  // Check required fields from schema
  for (const [key, expectedType] of Object.entries(schema)) {
    if (!(key in response)) {
      errors.push(`Missing required field: ${key}`);
      continue;
    }
    
    const value = response[key];
    
    // Type checking
    if (expectedType === 'string' && typeof value !== 'string') {
      errors.push(`Field ${key} should be string, got ${typeof value}`);
    } else if (expectedType === 'number' && typeof value !== 'number') {
      errors.push(`Field ${key} should be number, got ${typeof value}`);
    } else if (expectedType === 'array' && !Array.isArray(value)) {
      errors.push(`Field ${key} should be array, got ${typeof value}`);
    } else if (expectedType === 'object' && (typeof value !== 'object' || Array.isArray(value))) {
      errors.push(`Field ${key} should be object, got ${typeof value}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate response quality based on task type
 */
export function validateQuality(taskType, response) {
  const thresholds = config.qualityThresholds[taskType];
  if (!thresholds) return { valid: true, warnings: [] };
  
  const warnings = [];
  
  // ELI5 validation
  if (taskType === 'eli5' && response.eli5) {
    if (response.eli5.length < thresholds.minLength) {
      warnings.push(`ELI5 too short (${response.eli5.length} < ${thresholds.minLength})`);
    }
    if (response.eli5.length > thresholds.maxLength) {
      warnings.push(`ELI5 too long (${response.eli5.length} > ${thresholds.maxLength})`);
    }
  }
  
  // TLDR validation
  if (taskType === 'tldr' && response.tldr) {
    if (response.tldr.length < thresholds.minLength) {
      warnings.push(`TLDR too short (${response.tldr.length} < ${thresholds.minLength})`);
    }
    if (response.tldr.length > thresholds.maxLength) {
      warnings.push(`TLDR too long (${response.tldr.length} > ${thresholds.maxLength})`);
    }
  }
  
  // Diagram validation
  if (taskType === 'diagram' && response.diagram) {
    if (response.diagram.length < thresholds.minLength) {
      warnings.push(`Diagram too short`);
    }
    // Count nodes in diagram
    const nodeCount = (response.diagram.match(/\[.*?\]|\(.*?\)|{.*?}/g) || []).length;
    if (nodeCount < thresholds.minNodes) {
      warnings.push(`Diagram has too few nodes (${nodeCount} < ${thresholds.minNodes})`);
    }
    // Check for trivial patterns
    if (isTrivialDiagram(response.diagram)) {
      warnings.push('Diagram appears to be trivial/placeholder');
    }
  }
  
  return {
    valid: warnings.length === 0,
    warnings
  };
}

/**
 * Check if a diagram is trivial/placeholder
 */
function isTrivialDiagram(diagram) {
  const trivialPatterns = [
    /\bstart\b.*\bend\b/i,
    /\bstep\s*1\b.*\bstep\s*2\b.*\bstep\s*3\b/i,
    /\bconcept\b.*\bimplementation\b/i,
    /\binput\b.*\boutput\b/i,
    /\bbegin\b.*\bfinish\b/i
  ];
  
  const lower = diagram.toLowerCase();
  return trivialPatterns.some(p => p.test(lower));
}

/**
 * Full validation pipeline
 */
export function validate(taskType, response, schema) {
  const schemaResult = validateSchema(response, schema);
  const qualityResult = validateQuality(taskType, response);
  
  return {
    valid: schemaResult.valid && qualityResult.valid,
    schemaErrors: schemaResult.errors,
    qualityWarnings: qualityResult.warnings
  };
}

export default { validateSchema, validateQuality, validate };
