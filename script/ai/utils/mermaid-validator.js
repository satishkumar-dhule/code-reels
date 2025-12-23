/**
 * Mermaid Diagram Validator
 * 
 * Validates mermaid diagram syntax locally before saving to database.
 * This prevents invalid diagrams from being stored and displayed.
 */

// Valid mermaid diagram type prefixes
const VALID_DIAGRAM_TYPES = [
  'graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 
  'stateDiagram', 'erDiagram', 'journey', 'gantt', 'pie', 
  'gitGraph', 'mindmap', 'timeline', 'quadrantChart', 'sankey', 
  'xychart', 'block'
];

// Patterns that indicate code/config instead of diagrams
const CODE_INDICATORS = [
  'name:', 'hosts:', 'tasks:', 'become:', 'vars:', // YAML/Ansible
  '```', '~~~', // Markdown code blocks
  'import ', 'from ', 'export ', 'const ', 'let ', 'var ', 'function ', // JS/TS
  'def ', 'class ', 'if __name__', 'print(', // Python
  '<?php', '<?xml', '<!DOCTYPE', '<html', '<div', // PHP/XML/HTML
  'package ', 'public class', 'private ', 'protected ', // Java
  '"$schema"', '"type":', // JSON Schema
  'apiVersion:', 'kind:', 'metadata:', // Kubernetes YAML
  'version:', 'services:', // Docker Compose
  'resource ', 'provider ', 'module ', // Terraform
  'SELECT ', 'INSERT ', 'UPDATE ', 'DELETE ', 'CREATE ', // SQL
];

// Patterns that indicate valid mermaid diagram syntax
const DIAGRAM_PATTERNS = [
  /-->/,           // Arrow
  /==>/,           // Thick arrow
  /-\.->/,         // Dotted arrow
  /--[>|]/,        // Arrow variations
  /->/,            // Simple arrow
  /<--/,           // Reverse arrow
  /===/,           // Thick line
  /---/,           // Line
  /\[\[.*\]\]/,    // Double brackets
  /\[.*\]/,        // Brackets (nodes)
  /\(.*\)/,        // Parentheses (nodes)
  /\{.*\}/,        // Braces (nodes)
  /participant\s+/i,  // Sequence diagram
  /actor\s+/i,        // Sequence diagram
  /subgraph\s+/i,     // Subgraph
  /style\s+\w+/i,     // Style directive
  /classDef\s+/i,     // Class definition
  /click\s+/i,        // Click handler
  /note\s+/i,         // Note
  /loop\s+/i,         // Loop
  /alt\s+/i,          // Alternative
  /opt\s+/i,          // Optional
  /par\s+/i,          // Parallel
  /rect\s+/i,         // Rectangle
  /activate\s+/i,     // Activation
  /deactivate\s+/i,   // Deactivation
];

/**
 * Validate if content is a valid Mermaid diagram
 * @param {string} diagram - The diagram content to validate
 * @returns {{ valid: boolean, error?: string, warnings?: string[] }}
 */
export function validateMermaidDiagram(diagram) {
  const warnings = [];
  
  // Check for null/undefined/empty
  if (!diagram || typeof diagram !== 'string') {
    return { valid: false, error: 'Diagram is empty or not a string' };
  }
  
  const trimmed = diagram.trim();
  
  // Check minimum length
  if (trimmed.length < 20) {
    return { valid: false, error: `Diagram too short (${trimmed.length} chars, need 20+)` };
  }
  
  // Check for valid diagram type prefix
  const firstLine = trimmed.split('\n')[0].toLowerCase().trim();
  const hasValidStart = VALID_DIAGRAM_TYPES.some(type => 
    firstLine.startsWith(type.toLowerCase())
  );
  
  if (!hasValidStart) {
    return { 
      valid: false, 
      error: `Invalid diagram type. Must start with: ${VALID_DIAGRAM_TYPES.slice(0, 5).join(', ')}...` 
    };
  }
  
  // Check for code/config indicators (should NOT be present)
  const lowerContent = trimmed.toLowerCase();
  for (const indicator of CODE_INDICATORS) {
    if (lowerContent.includes(indicator.toLowerCase())) {
      return { 
        valid: false, 
        error: `Contains code/config syntax: "${indicator}". This is not a valid Mermaid diagram.` 
      };
    }
  }
  
  // Get content lines (excluding diagram type declaration and comments)
  const contentLines = trimmed.split('\n').filter(line => {
    const l = line.trim();
    if (!l) return false;
    if (l.startsWith('%%')) return false; // Mermaid comment
    if (VALID_DIAGRAM_TYPES.some(t => l.toLowerCase().startsWith(t.toLowerCase()))) return false;
    return true;
  });
  
  // Check minimum content - at least 1 meaningful line with diagram syntax
  if (contentLines.length < 1) {
    return { 
      valid: false, 
      error: `Diagram has no content lines` 
    };
  }
  
  // Check for diagram-like patterns
  const hasDiagramSyntax = contentLines.some(line => 
    DIAGRAM_PATTERNS.some(pattern => pattern.test(line))
  );
  
  if (!hasDiagramSyntax) {
    return { 
      valid: false, 
      error: 'No valid diagram syntax found (arrows, nodes, etc.)' 
    };
  }
  
  // Check for trivial diagrams (Start -> End only)
  const nodeCount = countNodes(trimmed);
  if (nodeCount < 3) {
    return { 
      valid: false, 
      error: `Diagram too simple (${nodeCount} nodes, need 3+)` 
    };
  }
  
  // Check for trivial "Start -> End" patterns
  if (isTrivialDiagram(trimmed)) {
    return { 
      valid: false, 
      error: 'Diagram is too trivial (just Start -> End or similar)' 
    };
  }
  
  // Warnings for potential issues
  if (nodeCount > 15) {
    warnings.push(`Diagram may be too complex (${nodeCount} nodes)`);
  }
  
  if (trimmed.includes('LR') || trimmed.includes('RL')) {
    warnings.push('Left-right layout may not fit well in narrow panels');
  }
  
  // Check for very long node labels
  const longLabels = contentLines.filter(line => {
    const match = line.match(/\[([^\]]+)\]/);
    return match && match[1].length > 30;
  });
  if (longLabels.length > 0) {
    warnings.push(`${longLabels.length} node(s) have long labels (>30 chars)`);
  }
  
  return { 
    valid: true, 
    warnings: warnings.length > 0 ? warnings : undefined,
    stats: {
      nodeCount,
      lineCount: contentLines.length,
      charCount: trimmed.length
    }
  };
}

/**
 * Count approximate number of nodes in a diagram
 */
function countNodes(diagram) {
  const nodePatterns = [
    /\w+\s*\[/g,           // node[label]
    /\w+\s*\(/g,           // node(label)
    /\w+\s*\{/g,           // node{label}
    /\w+\s*\[\[/g,         // node[[label]]
    /\w+\s*\(\(/g,         // node((label))
    /\w+\s*\[\(/g,         // node[(label)]
    /participant\s+\w+/gi, // sequence diagram participants
    /actor\s+\w+/gi,       // sequence diagram actors
  ];
  
  const nodes = new Set();
  
  for (const pattern of nodePatterns) {
    const matches = diagram.match(pattern) || [];
    matches.forEach(m => {
      const nodeName = m.replace(/[\[\(\{]/g, '').trim();
      if (nodeName && nodeName.length > 0) {
        nodes.add(nodeName.toLowerCase());
      }
    });
  }
  
  // Also count nodes from arrow definitions (A --> B)
  const arrowMatches = diagram.match(/(\w+)\s*[-=]+>?\s*(\w+)/g) || [];
  arrowMatches.forEach(m => {
    const parts = m.split(/[-=]+>?/);
    parts.forEach(p => {
      const nodeName = p.trim();
      if (nodeName && nodeName.length > 0 && !['style', 'class', 'click'].includes(nodeName.toLowerCase())) {
        nodes.add(nodeName.toLowerCase());
      }
    });
  });
  
  return nodes.size;
}

/**
 * Check if diagram is trivially simple
 */
function isTrivialDiagram(diagram) {
  const lower = diagram.toLowerCase();
  
  // Check for Start -> End only patterns
  const trivialPatterns = [
    /start\s*[-=]+>\s*end/i,
    /begin\s*[-=]+>\s*end/i,
    /input\s*[-=]+>\s*output/i,
    /a\s*[-=]+>\s*b\s*$/im,
  ];
  
  for (const pattern of trivialPatterns) {
    if (pattern.test(lower)) {
      // Count total arrows - if only 1-2, it's trivial
      const arrowCount = (diagram.match(/[-=]+>/g) || []).length;
      if (arrowCount <= 2) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Attempt to fix common diagram issues
 * @param {string} diagram - The diagram to fix
 * @returns {{ fixed: string, changes: string[] }}
 */
export function fixCommonIssues(diagram) {
  const changes = [];
  let fixed = diagram;
  
  // Remove markdown code blocks if present
  if (fixed.includes('```')) {
    fixed = fixed.replace(/```mermaid\n?/gi, '').replace(/```\n?/g, '');
    changes.push('Removed markdown code blocks');
  }
  
  // Trim whitespace
  fixed = fixed.trim();
  
  // Ensure proper line endings
  fixed = fixed.replace(/\r\n/g, '\n');
  
  // Remove empty lines at start
  fixed = fixed.replace(/^\n+/, '');
  
  return { fixed, changes };
}

export default { validateMermaidDiagram, fixCommonIssues };
