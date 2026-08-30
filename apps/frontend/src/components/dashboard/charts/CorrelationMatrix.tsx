// enterprise-ai-agent-platform/apps/frontend/src/components/dashboard/charts/CorrelationMatrix.tsx
import React from 'react';

interface CorrelationMatrixProps {
  data: number[][];
  labels: string[];
  height ? : number;
  width ? : number;
}

const getColor = (value: number): string => {
  // Red for negative, blue for positive, intensity based on absolute value
  const intensity = Math.min(1, Math.abs(value));
  if (value > 0) {
    const r = 59;
    const g = 130;
    const b = 246;
    const alpha = 0.3 + intensity * 0.6;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } else if (value < 0) {
    const r = 239;
    const g = 68;
    const b = 68;
    const alpha = 0.3 + intensity * 0.6;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return 'rgba(100, 116, 139, 0.1)';
};

const getTextColor = (value: number): string => {
  if (Math.abs(value) > 0.5) return 'white';
  return '#1e293b';
};

export const CorrelationMatrix: React.FC < CorrelationMatrixProps > = ({
  data,
  labels,
  height = 400,
  width = 400,
}) => {
  const cellSize = Math.min(60, Math.floor(width / labels.length));
  const matrixSize = labels.length * cellSize;
  
  return (
    <div className="overflow-x-auto">
      <div
        className="relative mx-auto"
        style={{ width: matrixSize + 80, height: matrixSize + 60 }}
      >
        {/* Y-axis labels */}
        <div className="absolute left-0 top-8 w-16 text-right">
          {labels.map((label, i) => (
            <div
              key={`y-${i}`}
              className="text-xs font-medium text-secondary-600 dark:text-secondary-400 truncate"
              style={{ height: cellSize, lineHeight: `${cellSize}px`, paddingRight: '8px' }}
              title={label}
            >
              {label}
            </div>
          ))}
        </div>

        {/* X-axis labels */}
        <div className="absolute left-16 top-0 flex">
          {labels.map((label, i) => (
            <div
              key={`x-${i}`}
              className="text-xs font-medium text-secondary-600 dark:text-secondary-400 text-center truncate"
              style={{ width: cellSize, paddingLeft: '4px', paddingRight: '4px' }}
              title={label}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Matrix cells */}
        <div className="absolute left-16 top-8">
          {data.map((row, i) => (
            <div key={`row-${i}`} className="flex">
              {row.map((value, j) => (
                <div
                  key={`cell-${i}-${j}`}
                  className="flex items-center justify-center text-xs font-mono font-medium transition-all duration-200 hover:scale-105"
                  style={{
                    width: cellSize,
                    height: cellSize,
                    backgroundColor: getColor(value),
                    color: getTextColor(value),
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                  }}
                  title={`${labels[i]} vs ${labels[j]}: ${value.toFixed(2)}`}
                >
                  {value.toFixed(2)}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="absolute -bottom-8 left-16 right-0 flex justify-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(59, 130, 246, 0.8)' }} />
            <span className="text-secondary-600">Positive</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.8)' }} />
            <span className="text-secondary-600">Negative</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(100, 116, 139, 0.1)' }} />
            <span className="text-secondary-600">Near zero</span>
          </div>
        </div>
      </div>
    </div>
  );
 };
export default CorrelationMatrix;
