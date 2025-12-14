import { useEffect, useRef } from 'react';

interface GoogleSankeyProps {
  data: Array<Array<string | number>>;
  config?: {
    title?: string;
    width?: number;
    height?: number;
  };
}

declare global {
  interface Window {
    google: any;
  }
}

export function GoogleSankey({ data, config = {} }: GoogleSankeyProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const {
    width = 800,
    height = 600
  } = config;

  useEffect(() => {
    if (!chartRef.current) return;

    const loadGoogleCharts = () => {
      if (window.google && window.google.charts) {
        drawChart();
      } else {
        const script = document.createElement('script');
        script.src = 'https://www.gstatic.com/charts/loader.js';
        script.onload = () => {
          window.google.charts.load('current', { packages: ['sankey'] });
          window.google.charts.setOnLoadCallback(drawChart);
        };
        document.head.appendChild(script);
      }
    };

    const drawChart = () => {
      if (!window.google || !window.google.visualization) return;

      const dataTable = new window.google.visualization.DataTable();
      dataTable.addColumn('string', 'From');
      dataTable.addColumn('string', 'To');
      dataTable.addColumn('number', 'Weight');

      dataTable.addRows(data);

      const options = {
        width,
        height,
        sankey: {
          node: {
            colors: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
            label: {
              color: '#fff',
              fontSize: 14,
              bold: true
            },
            nodePadding: 20,
            width: 8
          },
          link: {
            colorMode: 'gradient',
            colors: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
          }
        },
        backgroundColor: 'transparent'
      };

      const chart = new window.google.visualization.Sankey(chartRef.current);
      chart.draw(dataTable, options);
    };

    loadGoogleCharts();
  }, [data, width, height]);

  return (
    <div className="w-full flex justify-center overflow-hidden rounded-lg border border-white/10 bg-black/20 p-4">
      <div ref={chartRef} className="w-full" style={{ width, height }} />
    </div>
  );
}
