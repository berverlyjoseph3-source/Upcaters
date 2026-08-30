// enterprise-ai-agent-platform/apps/frontend/src/components/billing/InvoiceRow.tsx
import React, { useState } from 'react';
import { Download, Eye, ChevronDown, ChevronUp, FileText, Calendar, DollarSign, CreditCard } from 'lucide-react';
import { Invoice } from '../../types/billing.types';

interface InvoiceRowProps {
  invoice: Invoice;
  onDownload: (invoiceId: string) => void;
  onView ? : (invoiceId: string) => void;
  isExpanded ? : boolean;
  onToggleExpand ? : (invoiceId: string) => void;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount / 100);
};

const formatDate = (date: Date): string => {
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const getStatusBadge = (status: Invoice['status']) => {
  switch (status) {
    case 'paid':
      return { label: 'Paid', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: '✅' };
    case 'open':
      return { label: 'Pending', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: '⏳' };
    case 'void':
      return { label: 'Void', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400', icon: '❌' };
    case 'uncollectible':
      return { label: 'Uncollectible', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: '⚠️' };
    default:
      return { label: status, className: 'bg-gray-100 text-gray-700', icon: '📄' };
  }
};

export const InvoiceRow: React.FC < InvoiceRowProps > = ({
  invoice,
  onDownload,
  onView,
  isExpanded = false,
  onToggleExpand,
}) => {
  const statusBadge = getStatusBadge(invoice.status);
  const [isHovered, setIsHovered] = useState(false);
  
  const handleToggleExpand = () => {
    onToggleExpand?.(invoice.id);
  };
  
  return (
    <div
      className="border-b border-secondary-200 dark:border-secondary-700 last:border-b-0"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main Row */}
      <div
        className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-secondary-50 dark:hover:bg-secondary-700/50 transition-colors"
        onClick={handleToggleExpand}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 bg-secondary-100 dark:bg-secondary-700 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileText className="h-4 w-4 text-secondary-500" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-secondary-900 dark:text-white truncate">
              {invoice.number}
            </p>
            <p className="text-xs text-secondary-500">
              {formatDate(invoice.created)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-semibold text-secondary-900 dark:text-white">
              {formatCurrency(invoice.amount)}
            </p>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.className}`}>
              <span>{statusBadge.icon}</span>
              {statusBadge.label}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {isHovered && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); onDownload(invoice.id); }}
                  className="p-1.5 rounded-md hover:bg-secondary-200 dark:hover:bg-secondary-600 transition-colors"
                  title="Download PDF"
                >
                  <Download className="h-4 w-4 text-secondary-500" />
                </button>
                {onView && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onView(invoice.id); }}
                    className="p-1.5 rounded-md hover:bg-secondary-200 dark:hover:bg-secondary-600 transition-colors"
                    title="View Details"
                  >
                    <Eye className="h-4 w-4 text-secondary-500" />
                  </button>
                )}
              </>
            )}
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-secondary-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-secondary-400" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 py-4 bg-secondary-50 dark:bg-secondary-700/30 border-t border-secondary-200 dark:border-secondary-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-secondary-400" />
              <div>
                <p className="text-xs text-secondary-500">Invoice Date</p>
                <p className="text-sm font-medium">{formatDate(invoice.created)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-secondary-400" />
              <div>
                <p className="text-xs text-secondary-500">Due Date</p>
                <p className="text-sm font-medium">{invoice.dueDate ? formatDate(invoice.dueDate) : '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-secondary-400" />
              <div>
                <p className="text-xs text-secondary-500">Payment Date</p>
                <p className="text-sm font-medium">{invoice.paidAt ? formatDate(invoice.paidAt) : '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-secondary-400" />
              <div>
                <p className="text-xs text-secondary-500">Amount</p>
                <p className="text-sm font-medium">{formatCurrency(invoice.amount)}</p>
              </div>
            </div>
          </div>

          {invoice.description && (
            <div className="mt-3 pt-3 border-t border-secondary-200 dark:border-secondary-600">
              <p className="text-sm text-secondary-600 dark:text-secondary-400">{invoice.description}</p>
            </div>
          )}

          <div className="mt-3 flex gap-2 justify-end">
            <button
              onClick={() => onDownload(invoice.id)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-secondary-300 dark:border-secondary-600 rounded-lg hover:bg-white dark:hover:bg-secondary-600 transition-colors"
            >
              <Download className="h-3 w-3" />
              Download PDF
            </button>
            {invoice.pdfUrl && (
              <a
                href={invoice.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 text-sm border border-secondary-300 dark:border-secondary-600 rounded-lg hover:bg-white dark:hover:bg-secondary-600 transition-colors"
              >
                <Eye className="h-3 w-3" />
                View Online
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default InvoiceRow;
