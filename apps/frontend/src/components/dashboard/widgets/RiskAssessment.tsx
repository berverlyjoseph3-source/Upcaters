// enterprise-ai-agent-platform/apps/frontend/src/components/dashboard/widgets/RiskAssessment.tsx
import React from 'react';
import { AlertTriangle, Shield, TrendingUp, TrendingDown } from 'lucide-react';

interface RiskData {
  openTexts: number;
  aditiin: number;
}

interface RiskAssessmentProps {
  risks: RiskData;
}

export const RiskAssessment: React.FC<RiskAssessmentProps> = ({ risks }) => {
  const riskItems = [
    { name: 'Market Competition', level: 'High', score: 85, trend: 'up' },
    { name: 'Supply Chain', level: 'Medium', score: 45, trend: 'down' },
    { name: 'Regulatory Compliance', level: 'Low', score: 20, trend: 'stable' },
    { name: 'Cybersecurity', level: 'High', score: 78, trend: 'up' },
    { name: 'Economic Downturn', level: 'Medium', score: 55, trend: 'up' },
  ];

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'High': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
      case 'Medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
      default: return 'text-green-600 bg-green-100 dark:bg-green-900/30';
    }
  };

  return (
    <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-secondary-900 dark:text-white">Risk Assessment</h3>
        <Shield className="h-5 w-5 text-secondary-400" />
      </div>
      <div className="space-y-3">
        {riskItems.map((risk, idx) => (
          <div key={idx} className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-4 w-4 text-secondary-400" />
              <div>
                <p className="text-sm font-medium text-secondary-900 dark:text-white">{risk.name}</p>
                <p className="text-xs text-secondary-500">Risk Score: {risk.score}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRiskColor(risk.level)}`}>
                {risk.level}
              </span>
              {risk.trend === 'up' && <TrendingUp className="h-3 w-3 text-red-500" />}
              {risk.trend === 'down' && <TrendingDown className="h-3 w-3 text-green-500" />}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-secondary-200 dark:border-secondary-700">
        <div className="flex justify-between text-sm">
          <span className="text-secondary-600">Open Risks: {risks.openTexts}</span>
          <span className="text-secondary-600">Mitigated: {risks.aditiin}%</span>
        </div>
        <div className="mt-2 h-1.5 bg-secondary-200 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full" style={{ width: `${risks.aditiin}%` }} />
        </div>
      </div>
    </div>
  );
};
export default RiskAssessment;
