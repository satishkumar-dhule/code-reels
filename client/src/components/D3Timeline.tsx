import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface Message {
  from: string;
  to: string;
  label: string;
  time: number;
}

interface D3TimelineProps {
  data: {
    actors: string[];
    messages: Message[];
  };
  config?: {
    width?: number;
    height?: number;
    actorSpacing?: number;
  };
}

export function D3Timeline({ data, config = {} }: D3TimelineProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const {
    width = 800,
    height = 400,
    actorSpacing = 200
  } = config;

  useEffect(() => {
    if (!svgRef.current || !data.actors.length) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('viewBox', [0, 0, width, height])
      .attr('style', 'max-width: 100%; height: auto;');

    const margin = { top: 50, right: 50, bottom: 50, left: 50 };
    const actorPositions = new Map(
      data.actors.map((actor, i) => [actor, margin.left + i * actorSpacing])
    );

    // Draw actor lifelines
    data.actors.forEach(actor => {
      const x = actorPositions.get(actor)!;
      
      // Actor box
      svg.append('rect')
        .attr('x', x - 40)
        .attr('y', 10)
        .attr('width', 80)
        .attr('height', 30)
        .attr('fill', '#22c55e')
        .attr('stroke', '#fff')
        .attr('stroke-width', 2);

      svg.append('text')
        .attr('x', x)
        .attr('y', 30)
        .attr('text-anchor', 'middle')
        .attr('fill', '#000')
        .attr('font-size', 12)
        .attr('font-weight', 'bold')
        .text(actor);

      // Lifeline
      svg.append('line')
        .attr('x1', x)
        .attr('y1', 40)
        .attr('x2', x)
        .attr('y2', height - margin.bottom)
        .attr('stroke', '#666')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5');
    });

    // Draw messages
    const messageSpacing = (height - margin.top - margin.bottom - 40) / (data.messages.length + 1);
    
    data.messages.forEach((msg, i) => {
      const fromX = actorPositions.get(msg.from)!;
      const toX = actorPositions.get(msg.to)!;
      const y = margin.top + 40 + (i + 1) * messageSpacing;

      // Arrow
      svg.append('line')
        .attr('x1', fromX)
        .attr('y1', y)
        .attr('x2', toX)
        .attr('y2', y)
        .attr('stroke', '#22c55e')
        .attr('stroke-width', 2)
        .attr('marker-end', 'url(#arrowhead)');

      // Label
      svg.append('text')
        .attr('x', (fromX + toX) / 2)
        .attr('y', y - 5)
        .attr('text-anchor', 'middle')
        .attr('fill', '#fff')
        .attr('font-size', 11)
        .text(msg.label);
    });

    // Define arrowhead marker
    svg.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('markerWidth', 10)
      .attr('markerHeight', 10)
      .attr('refX', 9)
      .attr('refY', 3)
      .attr('orient', 'auto')
      .append('polygon')
      .attr('points', '0 0, 10 3, 0 6')
      .attr('fill', '#22c55e');

  }, [data, width, height, actorSpacing]);

  return (
    <div className="w-full flex justify-center overflow-hidden rounded-lg border border-white/10 bg-black/20 p-4">
      <svg ref={svgRef} className="w-full h-auto" />
    </div>
  );
}
