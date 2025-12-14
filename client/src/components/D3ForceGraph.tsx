import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface Node {
  id: string;
  group: number;
  label: string;
}

interface Link {
  source: string;
  target: string;
  value: number;
  label?: string;
}

interface D3ForceGraphProps {
  data: {
    nodes: Node[];
    links: Link[];
  };
  config?: {
    width?: number;
    height?: number;
    chargeStrength?: number;
    linkDistance?: number;
  };
}

export function D3ForceGraph({ data, config = {} }: D3ForceGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const {
    width = 800,
    height = 600,
    chargeStrength = -300,
    linkDistance = 100
  } = config;

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('viewBox', [0, 0, width, height])
      .attr('style', 'max-width: 100%; height: auto;');

    // Create simulation
    const simulation = d3.forceSimulation(data.nodes as any)
      .force('link', d3.forceLink(data.links).id((d: any) => d.id).distance(linkDistance))
      .force('charge', d3.forceManyBody().strength(chargeStrength))
      .force('center', d3.forceCenter(width / 2, height / 2));

    // Add links
    const link = svg.append('g')
      .attr('stroke', '#666')
      .attr('stroke-opacity', 0.6)
      .selectAll('line')
      .data(data.links)
      .join('line')
      .attr('stroke-width', (d: any) => Math.sqrt(d.value));

    // Add link labels
    const linkLabel = svg.append('g')
      .selectAll('text')
      .data(data.links.filter(l => l.label))
      .join('text')
      .attr('font-size', 10)
      .attr('fill', '#999')
      .text((d: any) => d.label);

    // Add nodes
    const node = svg.append('g')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .selectAll('circle')
      .data(data.nodes)
      .join('circle')
      .attr('r', 8)
      .attr('fill', (d: any) => d3.schemeCategory10[d.group % 10])
      .call(drag(simulation) as any);

    // Add node labels
    const nodeLabel = svg.append('g')
      .selectAll('text')
      .data(data.nodes)
      .join('text')
      .attr('font-size', 12)
      .attr('fill', '#fff')
      .attr('text-anchor', 'middle')
      .attr('dy', 4)
      .text((d: any) => d.label);

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      linkLabel
        .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
        .attr('y', (d: any) => (d.source.y + d.target.y) / 2);

      node
        .attr('cx', (d: any) => d.x)
        .attr('cy', (d: any) => d.y);

      nodeLabel
        .attr('x', (d: any) => d.x)
        .attr('y', (d: any) => d.y);
    });

    // Drag behavior
    function drag(simulation: any) {
      function dragstarted(event: any) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }

      function dragged(event: any) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }

      function dragended(event: any) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }

      return d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended);
    }

    return () => {
      simulation.stop();
    };
  }, [data, width, height, chargeStrength, linkDistance]);

  return (
    <div className="w-full flex justify-center overflow-hidden rounded-lg border border-white/10 bg-black/20 p-4">
      <svg ref={svgRef} className="w-full h-auto" />
    </div>
  );
}
