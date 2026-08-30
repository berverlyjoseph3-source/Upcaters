// enterprise-ai-agent-platform/apps/frontend/src/components/dashboard/charts/HeatMap.tsx
import React from 'react';

interface HeatMapDataPoint {
  x: string;
  y: string;
  value: number;
}

interface HeatMapProps {
  data: HeatMapDataPoint[];
  xKey: string;
  yKey: string;
  valueKey: string;
  height?: number;
  width?: number;
  colorScale?: (value: number, min: number, max: number) => string;
}

const defaultColorScale = (value: number, min: number, max: number): string => {
  const intensity = (value - min) / (max - min);
  // Blue (low) → Yellow (medium) → Red (high)
  const r = Math.min(255, Math.floor(255 * intensity));
  const g = Math.min(255, Math.floor(255 * (1 - Math.abs(intensity - 0.5) * 2)));
  const b = Math.min(255, Math.floor(255 * (1 - intensity)));
  return `rgb(${r}, ${g}, ${b})`;
};

export const HeatMap: React.FC<HeatMapProps> = ({
  data,
  xKey,
  yKey,
  valueKey,
  height = 300,
  width = 600,
  colorScale = defaultColorScale,
}) => {
  // Extract unique x and y values
  const xValues = [...new Set(data.map(d => d[xKey]))];
  const yValues = [...new Set(data.map(d => d[yKey]))];

  const valueMap = new Map<string, number>();
  data.forEach(d => {
    valueMap.set(`${d[xKey]}|${d[yKey]}`, d[valueKey]);
  });

  const allValues = data.map(d => d[valueKey]);
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);

  const cellWidth = Math.min(80, width / xValues.length);
  const cellHeight = Math.min(60, height / yValues.length);

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: xValues.length * cellWidth + 80 }}>
        {/* X-axis labels */}
        <div className="flex ml-20 mb-1">
          {xValues.map(x => (
            <div
              key={x}
              className="text-xs text-secondary-600 dark:text-secondary-400 text-center truncate"
              style={{ width: cellWidth, padding: '0 4px' }}
              title={x}
            >
              {x}
            </div>
          ))}
        </div>

        {/* Y-axis labels and cells */}
        {yValues.map(y => (
          <div key={y} className="flex items-center mb-1">
            <div className="w-20 text-right pr-3 text-xs text-secondary-600 dark:text-secondary-400 truncate" title={y}>
              {y}
            </div>
            {xValues.map(x => {
              const value = valueMap.get(`${x}|${y}`);
              const displayValue = value !== undefined ? value : 0;
              const bgColor = value !== undefined ? colorScale(displayValue, minValue, maxValue) : '#e2e8f0';

              return (
                <div
                  key={`${x}|${y}`}
                  className="flex items-center justify-center transition-all duration-200 hover:scale-105"
                  style={{
                    width: cellWidth,
                    height: cellHeight,
                    backgroundColor: bgColor,
                    margin: '1px',
                    borderRadius: '4px',
                  }}
                  title={`${x} / ${y}: ${displayValue.toFixed(2)}`}
                >
                  <span className="text-xs font-medium text-white drop-shadow-sm">
                    {value !== undefined ? displayValue.toFixed(1) : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        ))}

        {/* Legend */}
        <div className="flex justify-end mt-4 gap-2 items-center">
          <span className="text-xs text-secondary-500">Low</span>
          <div className="w-32 h-2 rounded-full bg-gradient-to-r from-blue-500 via-yellow-500 to-red-500" />
          <span className="text-xs text-secondary-500">High</span>
        </div>
      </div>
    </div>
  );
};
export default HeatMap;
