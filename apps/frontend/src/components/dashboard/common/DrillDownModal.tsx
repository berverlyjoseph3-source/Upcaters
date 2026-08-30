// enterprise-ai-agent-platform/apps/frontend/src/components/dashboard/common/DrillDownModal.tsx
import React, { useEffect, useRef } from 'react';
import { X, Download, TrendingUp, Users, DollarSign, Calendar } from 'lucide-react';

interface DrillDownModalProps {
  metric: string;
  data: any;
  onClose: () => void;
}

export const DrillDownModal: React.FC<DrillDownModalProps> = ({ metric, data, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const getMetricIcon = () => {
    switch (metric) {
      case 'highValue': return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'newSales': return <Users className="h-5 w-5 text-blue-500" />;
      case 'atRisk': return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'dormant': return <Moon className="h-5 w-5 text-gray-500" />;
      default: return <DollarSign className="h-5 w-5 text-primary-500" />;
    }
  };

  const getMetricTitle = () => {
    const titles: Record<string, string> = {
      highValue: 'High-Value Customers',
      newSales: 'New Sales Customers',
      atRisk: 'At-Risk Customers',
      dormant: 'Dormant Customers',
    };
    return titles[metric] || metric.charAt(0).toUpperCase() + metric.slice(1);
  };

  // Mock drill-down data – in production, fetch from API
  const drillData = {
    highValue: [
      { name: 'Acme Corp', revenue: 125000, lastOrder: '2024-03-15', segment: 'Enterprise' },
      { name: 'TechStart Inc', revenue: 89000, lastOrder: '2024-03-20', segment: 'SMB' },
      { name: 'Global Solutions', revenue: 210000, lastOrder: '2024-03-18', segment: 'Enterprise' },
    ],
    newSales: [
      { name: 'Innovate Ltd', revenue: 12000, signupDate: '2024-03-01', segment: 'Startup' },
      { name: 'Creative Agency', revenue: 8500, signupDate: '2024-03-05', segment: 'Agency' },
    ],
    atRisk: [
      { name: 'Old Client Co', revenue: 5000, lastOrder: '2024-01-10', riskScore: 85 },
      { name: 'Declining Inc', revenue: 3200, lastOrder: '2024-02-01', riskScore: 72 },
    ],
    dormant: [
      { name: 'Inactive Corp', revenue: 0, lastOrder: '2023-11-01', dormantDays: 140 },
      { name: 'Sleepy LLC', revenue: 0, lastOrder: '2023-12-15', dormantDays: 96 },
    ],
  };

  const currentData = drillData[metric as keyof typeof drillData] || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        ref={modalRef}
        className="bg-white dark:bg-secondary-800 rounded-xl shadow-xl max-w-3xl w-full max-h-[85vh] overflow-hidden animate-fade-in"
      >
        <div className="flex justify-between items-center p-5 border-b border-secondary-200 dark:border-secondary-700">
          <div className="flex items-center gap-2">
            {getMetricIcon()}
            <h2 className="text-xl font-semibold text-secondary-900 dark:text-white">{getMetricTitle()}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto max-h-[calc(85vh-80px)]">
          {currentData.length === 0 ? (
            <p className="text-secondary-500 text-center py-8">No detailed data available for this segment.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-secondary-50 dark:bg-secondary-700/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-secondary-900 dark:text-white">{currentData.length}</p>
                  <p className="text-xs text-secondary-500">Total Customers</p>
                </div>
                <div className="bg-secondary-50 dark:bg-secondary-700/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-secondary-900 dark:text-white">
                    ${currentData.reduce((sum, c) => sum + (c.revenue || 0), 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-secondary-500">Total Revenue</p>
                </div>
                <div className="bg-secondary-50 dark:bg-secondary-700/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-secondary-900 dark:text-white">
                    ${(currentData.reduce((sum, c) => sum + (c.revenue || 0), 0) / currentData.length || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-secondary-500">Average per Customer</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary-100 dark:bg-secondary-700">
                    <tr>
                      <th className="px-4 py-2 text-left">Customer</th>
                      <th className="px-4 py-2 text-left">Revenue</th>
                      <th className="px-4 py-2 text-left">Segment</th>
                      <th className="px-4 py-2 text-left">Last Activity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary-200 dark:divide-secondary-700">
                    {currentData.map((item, idx) => (
                      <tr key={idx} className="hover:bg-secondary-50 dark:hover:bg-secondary-700/50">
                        <td className="px-4 py-2 font-medium">{item.name}</td>
                        <td className="px-4 py-2">${(item.revenue || 0).toLocaleString()}</td>
                        <td className="px-4 py-2">{item.segment || (item.riskScore ? 'At-Risk' : 'Standard')}</td>
                        <td className="px-4 py-2">{item.lastOrder || item.signupDate || `${item.dormantDays} days ago`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end pt-4">
                <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-primary-600 hover:text-primary-700">
                  <Download className="h-4 w-4" />
                  Export to CSV
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Import missing icons
import { AlertCircle, Moon } from 'lucide-react';
export default DrillDownModal;
