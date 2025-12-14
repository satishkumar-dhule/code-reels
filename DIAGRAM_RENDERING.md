# Diagram Rendering System - Frontend Implementation

## Overview

The diagram rendering system supports multiple visualization libraries:
- **Mermaid** - Default, always available as fallback
- **D3.js** - Force-directed graphs, hierarchies, timelines, trees
- **Google Charts** - Line charts, performance metrics

## Architecture

### Component Hierarchy

```
UnifiedDiagram (Smart Router)
├── EnhancedMermaid (Default/Fallback)
├── D3ForceGraph (Architecture diagrams)
├── D3HierarchyChart (Flowcharts, trees)
├── D3Timeline (Sequence diagrams)
└── GoogleLineChart (Performance metrics)
```

### Data Flow

```
Question Data
  ├── diagram: string (Mermaid - always present)
  ├── diagramType?: string (optional)
  ├── diagramData?: object (optional)
  └── diagramConfig?: object (optional)
        ↓
  UnifiedDiagram
        ↓
  Render appropriate component
        ↓
  Fallback to Mermaid on error
```

## Components

### 1. UnifiedDiagram (Router)

**File**: `client/src/components/UnifiedDiagram.tsx`

**Purpose**: Smart router that selects the appropriate diagram renderer

**Features**:
- Lazy loads D3/Google Charts components
- Automatic fallback to Mermaid on error
- Loading states
- Error handling

**Usage**:
```tsx
<UnifiedDiagram question={question} compact={false} />
```

### 2. D3ForceGraph

**File**: `client/src/components/D3ForceGraph.tsx`

**Purpose**: Renders force-directed graphs for system architecture

**Data Format**:
```json
{
  "type": "d3-force",
  "data": {
    "nodes": [
      {"id": "node1", "group": 1, "label": "Service A"},
      {"id": "node2", "group": 2, "label": "Service B"}
    ],
    "links": [
      {"source": "node1", "target": "node2", "value": 1, "label": "API"}
    ]
  },
  "config": {
    "width": 800,
    "height": 600,
    "chargeStrength": -300,
    "linkDistance": 100
  }
}
```

**Features**:
- Interactive dragging
- Force simulation
- Node grouping with colors
- Link labels
- Responsive sizing

### 3. D3HierarchyChart

**File**: `client/src/components/D3HierarchyChart.tsx`

**Purpose**: Renders hierarchical tree structures

**Data Format**:
```json
{
  "type": "d3-hierarchy",
  "data": {
    "name": "Root",
    "children": [
      {
        "name": "Child 1",
        "children": [
          {"name": "Grandchild 1"},
          {"name": "Grandchild 2"}
        ]
      },
      {"name": "Child 2"}
    ]
  },
  "config": {
    "width": 800,
    "height": 600,
    "nodeRadius": 5,
    "linkColor": "#22c55e"
  }
}
```

**Features**:
- Tree layout
- Collapsible nodes (future)
- Custom styling
- Responsive sizing

### 4. D3Timeline

**File**: `client/src/components/D3Timeline.tsx`

**Purpose**: Renders sequence diagrams and timelines

**Data Format**:
```json
{
  "type": "d3-timeline",
  "data": {
    "actors": ["Client", "Server", "Database"],
    "messages": [
      {"from": "Client", "to": "Server", "label": "Request", "time": 0},
      {"from": "Server", "to": "Database", "label": "Query", "time": 1},
      {"from": "Database", "to": "Server", "label": "Result", "time": 2},
      {"from": "Server", "to": "Client", "label": "Response", "time": 3}
    ]
  },
  "config": {
    "width": 800,
    "height": 400,
    "actorSpacing": 200
  }
}
```

**Features**:
- Actor lifelines
- Message arrows
- Labels
- Responsive sizing

### 5. GoogleLineChart

**File**: `client/src/components/GoogleLineChart.tsx`

**Purpose**: Renders performance metrics and time-series data

**Data Format**:
```json
{
  "type": "google-charts-line",
  "data": {
    "cols": [
      {"label": "Time", "type": "string"},
      {"label": "CPU", "type": "number"},
      {"label": "Memory", "type": "number"}
    ],
    "rows": [
      {"c": [{"v": "0s"}, {"v": 10}, {"v": 20}]},
      {"c": [{"v": "1s"}, {"v": 15}, {"v": 25}]},
      {"c": [{"v": "2s"}, {"v": 20}, {"v": 30}]}
    ]
  },
  "config": {
    "title": "Performance Metrics",
    "width": 800,
    "height": 400,
    "curveType": "function"
  }
}
```

**Features**:
- Smooth curves
- Multiple series
- Interactive tooltips
- Responsive sizing
- Dark theme support

## Integration

### AnswerPanel Integration

**Before**:
```tsx
<EnhancedMermaid chart={question.diagram} />
```

**After**:
```tsx
<UnifiedDiagram question={question} />
```

**Features Added**:
- Shows diagram type badge (e.g., "d3-force")
- Automatic fallback to Mermaid
- Lazy loading for performance
- Error handling

## Backward Compatibility

### 100% Backward Compatible

**Old Questions (Mermaid only)**:
```json
{
  "diagram": "graph TD\n    A --> B"
}
```
→ Renders with EnhancedMermaid ✅

**New Questions (D3/Google Charts)**:
```json
{
  "diagram": "graph TD\n    A --> B",
  "diagramType": "d3-force",
  "diagramData": {...},
  "diagramConfig": {...}
}
```
→ Renders with D3ForceGraph, falls back to Mermaid on error ✅

## Performance

### Lazy Loading

All D3 and Google Charts components are lazy-loaded:
```tsx
const D3ForceGraph = lazy(() => import('./D3ForceGraph'));
```

**Benefits**:
- Smaller initial bundle
- Faster page load
- Only loads what's needed

### Bundle Size Impact

| Component | Size | When Loaded |
|-----------|------|-------------|
| Mermaid | ~200KB | Always |
| D3.js | ~250KB | On first D3 diagram |
| Google Charts | ~100KB | On first Google chart |

## Error Handling

### Fallback Strategy

```
Try to render with specified type
  ↓
Error? → Log warning
  ↓
Fallback to Mermaid
  ↓
Still error? → Show error message
```

### Error Scenarios

1. **Missing diagramData**: Falls back to Mermaid
2. **Invalid data format**: Falls back to Mermaid
3. **D3 load failure**: Falls back to Mermaid
4. **Google Charts load failure**: Falls back to Mermaid
5. **Mermaid failure**: Shows error message

## Testing

### Test Each Diagram Type

```tsx
// Test Mermaid (default)
<UnifiedDiagram question={{
  diagram: "graph TD\n    A --> B"
}} />

// Test D3 Force
<UnifiedDiagram question={{
  diagram: "graph TD\n    A --> B",
  diagramType: "d3-force",
  diagramData: {
    nodes: [...],
    links: [...]
  }
}} />

// Test D3 Hierarchy
<UnifiedDiagram question={{
  diagram: "graph TD\n    A --> B",
  diagramType: "d3-hierarchy",
  diagramData: {
    name: "Root",
    children: [...]
  }
}} />

// Test D3 Timeline
<UnifiedDiagram question={{
  diagram: "sequenceDiagram\n    A->>B: msg",
  diagramType: "d3-timeline",
  diagramData: {
    actors: [...],
    messages: [...]
  }
}} />

// Test Google Charts
<UnifiedDiagram question={{
  diagram: "graph TD\n    A --> B",
  diagramType: "google-charts-line",
  diagramData: {
    cols: [...],
    rows: [...]
  }
}} />
```

### Test Fallback

```tsx
// Invalid data → should fallback to Mermaid
<UnifiedDiagram question={{
  diagram: "graph TD\n    A --> B",
  diagramType: "d3-force",
  diagramData: null  // Invalid!
}} />
```

## Installation

### Dependencies Added

```json
{
  "dependencies": {
    "d3": "^7.9.0"
  },
  "devDependencies": {
    "@types/d3": "^7.4.3"
  }
}
```

### Install

```bash
npm install d3 @types/d3
# or
pnpm install d3 @types/d3
```

## Usage Examples

### Example 1: System Architecture (D3 Force)

```typescript
const question = {
  diagram: "graph TD\n    A --> B",  // Fallback
  diagramType: "d3-force",
  diagramData: {
    nodes: [
      { id: "api", group: 1, label: "API Gateway" },
      { id: "auth", group: 2, label: "Auth Service" },
      { id: "db", group: 3, label: "Database" }
    ],
    links: [
      { source: "api", target: "auth", value: 1, label: "Authenticate" },
      { source: "auth", target: "db", value: 1, label: "Query" }
    ]
  },
  diagramConfig: {
    width: 800,
    height: 600,
    chargeStrength: -400,
    linkDistance: 150
  }
};
```

### Example 2: Process Flow (D3 Hierarchy)

```typescript
const question = {
  diagram: "graph TD\n    Start --> Process",  // Fallback
  diagramType: "d3-hierarchy",
  diagramData: {
    name: "Request Processing",
    children: [
      {
        name: "Validation",
        children: [
          { name: "Schema Check" },
          { name: "Auth Check" }
        ]
      },
      {
        name: "Processing",
        children: [
          { name: "Business Logic" },
          { name: "Data Transform" }
        ]
      },
      { name: "Response" }
    ]
  }
};
```

### Example 3: Performance Metrics (Google Charts)

```typescript
const question = {
  diagram: "graph TD\n    Time --> Metrics",  // Fallback
  diagramType: "google-charts-line",
  diagramData: {
    cols: [
      { label: "Time", type: "string" },
      { label: "Latency (ms)", type: "number" },
      { label: "Throughput (req/s)", type: "number" }
    ],
    rows: [
      { c: [{ v: "0s" }, { v: 100 }, { v: 1000 }] },
      { c: [{ v: "10s" }, { v: 120 }, { v: 1200 }] },
      { c: [{ v: "20s" }, { v: 90 }, { v: 1500 }] }
    ]
  },
  diagramConfig: {
    title: "System Performance",
    curveType: "function"
  }
};
```

## Future Enhancements

### Short-term
- [ ] Add more D3 layouts (radial, pack, partition)
- [ ] Add Google Charts bar/pie charts
- [ ] Add diagram zoom/pan controls
- [ ] Add export to PNG/SVG

### Medium-term
- [ ] Interactive diagram editing
- [ ] Real-time collaboration
- [ ] Diagram versioning
- [ ] Custom themes

### Long-term
- [ ] AI-powered diagram generation
- [ ] Diagram animations
- [ ] 3D visualizations
- [ ] VR/AR support

---

**Status**: ✅ Complete and Ready for Testing  
**Version**: 1.0  
**Date**: December 14, 2024  
**Backward Compatible**: Yes
