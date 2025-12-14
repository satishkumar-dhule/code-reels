# Test Converted Diagrams - Quick Guide

## What Was Created

I've created 4 test questions with different diagram types to demonstrate the rendering:

### 1. D3 Force Graph (test-d3-force)
**Question**: "How does a microservices architecture communicate between services?"

**Diagram Type**: Interactive force-directed graph  
**Shows**: API Gateway connecting to Auth, User, and Order services, each with their own databases  
**Features**:
- Draggable nodes
- Color-coded by layer (Gateway, Services, Databases)
- Connection labels
- Interactive physics simulation

### 2. D3 Hierarchy (test-d3-hierarchy)
**Question**: "What is the request processing flow in a web application?"

**Diagram Type**: Tree/hierarchy diagram  
**Shows**: Request processing pipeline from Validation → Security → Processing  
**Features**:
- Clear parent-child relationships
- Expandable structure
- Clean tree layout

### 3. D3 Timeline (test-d3-timeline)
**Question**: "How does OAuth 2.0 authentication flow work?"

**Diagram Type**: Sequence diagram  
**Shows**: OAuth 2.0 flow between Client, User, Auth Server, and Resource Server  
**Features**:
- Actor lifelines
- Message arrows with labels
- Chronological flow
- 8-step authentication process

### 4. Google Charts Line (test-google-charts)
**Question**: "How do you measure API performance and latency?"

**Diagram Type**: Line chart  
**Shows**: API latency percentiles (p50, p95, p99) over time  
**Features**:
- Smooth curves
- Multiple series
- Interactive tooltips
- Time-series data
- Performance metrics visualization

## How to View

### Option 1: Access Test Channel
1. Start the dev server: `npm run dev`
2. Navigate to: `http://localhost:5000`
3. Look for "Test Converted" channel in the home page
4. Click on any of the 4 test questions

### Option 2: Direct URLs
```
http://localhost:5000/channel/test-converted/0  # D3 Force Graph
http://localhost:5000/channel/test-converted/1  # D3 Hierarchy
http://localhost:5000/channel/test-converted/2  # D3 Timeline
http://localhost:5000/channel/test-converted/3  # Google Charts
```

## What to Look For

### D3 Force Graph
- ✅ Nodes should be draggable
- ✅ Connections should show labels
- ✅ Different colors for different node types
- ✅ Physics simulation (nodes bounce/settle)
- ✅ Hover shows node details

### D3 Hierarchy
- ✅ Tree structure clearly visible
- ✅ Parent-child relationships
- ✅ Clean layout
- ✅ Nodes connected with lines

### D3 Timeline
- ✅ Actors shown at top
- ✅ Vertical lifelines
- ✅ Arrows between actors
- ✅ Message labels
- ✅ Chronological order

### Google Charts
- ✅ Smooth line curves
- ✅ Multiple colored lines (p50, p95, p99)
- ✅ Interactive tooltips on hover
- ✅ Legend at bottom
- ✅ Grid lines and axes

## Fallback Testing

Each diagram has a Mermaid fallback. To test:

1. **Disable JavaScript** in browser
2. **Break the diagramData** (edit JSON to invalid format)
3. **Network issues** (disconnect internet for Google Charts)

In all cases, it should fall back to rendering the Mermaid diagram.

## File Locations

- **Test Questions**: `client/src/lib/questions/test-converted.json`
- **Components**:
  - `client/src/components/UnifiedDiagram.tsx` (Router)
  - `client/src/components/D3ForceGraph.tsx`
  - `client/src/components/D3HierarchyChart.tsx`
  - `client/src/components/D3Timeline.tsx`
  - `client/src/components/GoogleLineChart.tsx`

## Data Structure Example

```json
{
  "id": "test-d3-force",
  "question": "...",
  "diagram": "graph TD\n    ...",  // Mermaid fallback
  "diagramType": "d3-force",        // New field
  "diagramData": {                  // New field
    "nodes": [...],
    "links": [...]
  },
  "diagramConfig": {                // New field
    "width": 800,
    "height": 600
  }
}
```

## Troubleshooting

### D3 Not Rendering
```bash
# Check if D3 is installed
pnpm list d3

# Reinstall if needed
pnpm add d3 @types/d3

# Rebuild
npm run build
```

### Google Charts Not Loading
- Check internet connection (loads from CDN)
- Check browser console for errors
- Verify data format

### Fallback Not Working
- Check that `diagram` field exists
- Verify Mermaid syntax is valid
- Check browser console

## Next Steps

1. ✅ View the test questions
2. ✅ Verify all 4 diagram types render correctly
3. ✅ Test interactivity (drag nodes, hover tooltips)
4. ✅ Test fallback (break data, see Mermaid)
5. ⏳ Run conversion bot on real questions
6. ⏳ Deploy to production

## Performance Notes

- D3 components are **lazy-loaded** (only load when needed)
- Google Charts loads from **CDN** (cached by browser)
- Mermaid is **always available** as fallback
- Total bundle size impact: **~350KB** (lazy-loaded)

---

**Status**: ✅ Ready to Test  
**Build**: ✅ Successful  
**Dependencies**: ✅ Installed  
**Test Questions**: 4 examples created
