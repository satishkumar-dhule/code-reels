import { useEffect, useRef } from 'react';

interface GoogleLineChartProps {
  data: {
    cols: Array<{ label: string; type: string }>;
    rows: Array<{ c: Array<{ v: string | number }> }>;
  };
  config?: {
    title?: string;
    width?: number;
    height?: number;
    curveType?: string;
  };
}

declare global {
  interface Window {
    google: any;
  }
}

export function GoogleLineChart({ data, config = {} }: GoogleLineChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const {
    title = 'Performance Metrics',
    width = 800,
    height = 400,
    curveType = 'function'
  } = config;

  useEffect(() => {
    if (!chartRef.current) return;

    // Load Google Charts
    const loadGoogleCharts = () => {
      if (window.google && window.google.charts) {
        drawChart();
      } else {
        const script = document.createElement('script');
        script.src = 'https://www.gstatic.com/charts/loader.js';
        script.onload = () => {
          window.google.charts.load('current', { packages: ['corechart'] });
          window.google.charts.setOnLoadCallback(drawChart);
        };
        document.head.appendChild(script);
      }
    };

    const drawChart = () => {
      if (!window.google || !window.google.visualization) return;

      const dataTable = new window.google.visualization.DataTable();
      
      // Add columns
      data.cols.forEach(col => {
        dataTable.addColumn(col.type, col.label);
      });

      // Add rows
      data.rows.forEach(row => {
        dataTable.addRow(row.c.map(cell => cell.v));
      });

      const options = {
        title,
        width,
        height,
        curveType,
        backgroundColor: 'transparent',
        legend: { position: 'bottom', textStyle: { color: '#fff' } },
        titleTextStyle: { color: '#fff' },
        hAxis: {
          textStyle: { color: '#999' },
          gridlines: { color: '#333' }
        },
        vAxis: {
          textStyle: { color: '#999' },
          gridlines: { color: '#333' }
        },
        colors: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444']
      };

      const chart = new window.google.visualization.LineChart(chartRef.current);
      chart.draw(dataTable, options);
    };

    loadGoogleCharts();
  }, [data, title, width, height, curveType]);

  return (
    <div className="w-full flex justify-center overflow-hidden rounded-lg border border-white/10 bg-black/20 p-4">
      <div ref={chartRef} className="w-full" />
    </div>
  );
}
