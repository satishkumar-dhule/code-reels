import { Suspense, lazy } from 'react';
import { EnhancedMermaid } from './EnhancedMermaid';
import type { Question } from '../lib/data';

// Lazy load D3 and Google Charts components
const D3ForceGraph = lazy(() => import('./D3ForceGraph').then(m => ({ default: m.D3ForceGraph })));
const D3HierarchyChart = lazy(() => import('./D3HierarchyChart').then(m => ({ default: m.D3HierarchyChart })));
const D3Timeline = lazy(() => import('./D3Timeline').then(m => ({ default: m.D3Timeline })));
const GoogleLineChart = lazy(() => import('./GoogleLineChart').then(m => ({ default: m.GoogleLineChart })));
const GoogleOrgChart = lazy(() => import('./GoogleOrgChart').then(m => ({ default: m.GoogleOrgChart })));
const GoogleSankey = lazy(() => import('./GoogleSankey').then(m => ({ default: m.GoogleSankey })));

interface UnifiedDiagramProps {
  question: Question;
  compact?: boolean;
}

export function UnifiedDiagram({ question, compact = false }: UnifiedDiagramProps) {
  const diagramType = (question as any).diagramType || 'mermaid';
  const diagramData = (question as any).diagramData;
  const diagramConfig = (question as any).diagramConfig;

  // Loading fallback
  const LoadingFallback = () => (
    <div className="w-full flex justify-center items-center py-12">
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <div className="text-xs text-white/30">Loading diagram...</div>
      </div>
    </div>
  );

  // Error fallback - use Mermaid
  const ErrorFallback = () => {
    console.warn(`Failed to render ${diagramType}, falling back to Mermaid`);
    return <EnhancedMermaid chart={question.diagram || ''} compact={compact} />;
  };

  // Render based on diagram type
  try {
    switch (diagramType) {
      case 'd3-force':
        if (!diagramData) return <ErrorFallback />;
        return (
          <Suspense fallback={<LoadingFallback />}>
            <D3ForceGraph data={diagramData} config={diagramConfig} />
          </Suspense>
        );

      case 'd3-hierarchy':
        if (!diagramData) return <ErrorFallback />;
        return (
          <Suspense fallback={<LoadingFallback />}>
            <D3HierarchyChart data={diagramData} config={diagramConfig} />
          </Suspense>
        );

      case 'd3-timeline':
        if (!diagramData) return <ErrorFallback />;
        return (
          <Suspense fallback={<LoadingFallback />}>
            <D3Timeline data={diagramData} config={diagramConfig} />
          </Suspense>
        );

      case 'd3-tree':
        // Use hierarchy chart for tree layout
        if (!diagramData) return <ErrorFallback />;
        return (
          <Suspense fallback={<LoadingFallback />}>
            <D3HierarchyChart data={diagramData} config={diagramConfig} />
          </Suspense>
        );

      case 'google-charts-line':
        if (!diagramData) return <ErrorFallback />;
        return (
          <Suspense fallback={<LoadingFallback />}>
            <GoogleLineChart data={diagramData} config={diagramConfig} />
          </Suspense>
        );

      case 'google-orgchart':
        if (!diagramData) return <ErrorFallback />;
        return (
          <Suspense fallback={<LoadingFallback />}>
            <GoogleOrgChart data={diagramData} config={diagramConfig} />
          </Suspense>
        );

      case 'google-sankey':
        if (!diagramData) return <ErrorFallback />;
        return (
          <Suspense fallback={<LoadingFallback />}>
            <GoogleSankey data={diagramData} config={diagramConfig} />
          </Suspense>
        );

      case 'mermaid':
      default:
        // Default to Mermaid
        return <EnhancedMermaid chart={question.diagram || ''} compact={compact} />;
    }
  } catch (error) {
    console.error('Error rendering diagram:', error);
    return <ErrorFallback />;
  }
}
