import { useEffect, useRef } from 'react';

interface GoogleOrgChartProps {
  data: Array<Array<string | { v: string; f: string }>>;
  config?: {
    title?: string;
    width?: number;
    height?: number;
    allowHtml?: boolean;
  };
}

declare global {
  interface Window {
    google: any;
  }
}

export function GoogleOrgChart({ data, config = {} }: GoogleOrgChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const {
    width = 800,
    height = 600,
    allowHtml = true
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
          window.google.charts.load('current', { packages: ['orgchart'] });
          window.google.charts.setOnLoadCallback(drawChart);
        };
        document.head.appendChild(script);
      }
    };

    const drawChart = () => {
      if (!window.google || !window.google.visualization) return;

      const dataTable = new window.google.visualization.DataTable();
      dataTable.addColumn('string', 'Name');
      dataTable.addColumn('string', 'Parent');
      dataTable.addColumn('string', 'Tooltip');

      dataTable.addRows(data);

      const options = {
        allowHtml,
        size: 'large',
        nodeClass: 'google-org-node',
        selectedNodeClass: 'google-org-node-selected'
      };

      const chart = new window.google.visualization.OrgChart(chartRef.current);
      chart.draw(dataTable, options);
    };

    loadGoogleCharts();
  }, [data, width, height, allowHtml]);

  return (
    <div className="w-full flex justify-center overflow-auto rounded-lg border border-white/10 bg-black/20 p-4">
      <div ref={chartRef} className="w-full min-h-[400px]" style={{ width, height }} />
      <style>{`
        .google-org-node {
          background: #1a1a1a;
          border: 2px solid #22c55e;
          border-radius: 8px;
          padding: 12px 20px;
          color: #fff;
          font-size: 14px;
          font-weight: 500;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
        }
        .google-org-node-selected {
          background: #22c55e;
          color: #000;
        }
      `}</style>
    </div>
  );
}
