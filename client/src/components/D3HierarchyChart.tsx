import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface HierarchyNode {
  name: string;
  children?: HierarchyNode[];
}

interface D3HierarchyChartProps {
  data: HierarchyNode;
  config?: {
    width?: number;
    height?: number;
    nodeRadius?: number;
    linkColor?: string;
  };
}

export function D3HierarchyChart({ data, config = {} }: D3HierarchyChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const {
    width = 800,
    height = 600,
    nodeRadius = 5,
    linkColor = '#22c55e'
  } = config;

  useEffect(() => {
    if (!svgRef.current || !data) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('viewBox', [0, 0, width, height])
      .attr('style', 'max-width: 100%; height: auto;');

    // Create hierarchy
    const root = d3.hierarchy(data);
    const treeLayout = d3.tree().size([width - 100, height - 100]);
    treeLayout(root);

    // Add links
    svg.append('g')
      .attr('fill', 'none')
      .attr('stroke', linkColor)
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 2)
      .selectAll('path')
      .data(root.links())
      .join('path')
      .attr('d', d3.linkVertical()
        .x((d: any) => d.x + 50)
        .y((d: any) => d.y + 50) as any);

    // Add nodes
    const node = svg.append('g')
      .selectAll('g')
      .data(root.descendants())
      .join('g')
      .attr('transform', (d: any) => `translate(${d.x + 50},${d.y + 50})`);

    node.append('circle')
      .attr('r', nodeRadius)
      .attr('fill', (d: any) => d.children ? linkColor : '#fff')
      .attr('stroke', linkColor)
      .attr('stroke-width', 2);

    node.append('text')
      .attr('dy', -10)
      .attr('text-anchor', 'middle')
      .attr('font-size', 12)
      .attr('fill', '#fff')
      .text((d: any) => d.data.name);

  }, [data, width, height, nodeRadius, linkColor]);

  return (
    <div className="w-full flex justify-center overflow-hidden rounded-lg border border-white/10 bg-black/20 p-4">
      <svg ref={svgRef} className="w-full h-auto" />
    </div>
  );
}
