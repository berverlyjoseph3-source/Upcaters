// enterprise-ai-agent-platform/apps/frontend/src/pages/billing/InvoiceHistory.tsx
import React, { useState } from 'react';
import { Download, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { Invoice } from '../../types/billing.types';

interface InvoiceHistoryProps {
  invoices: Invoice[];
  onDownload: (invoiceId: string) => void;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount / 100);
};

const getStatusBadge = (status: Invoice['status']) => {
  switch (status) {
    case 'paid':
      return <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">Paid</span>;
    case 'open':
      return <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700">Pending</span>;
    case 'void':
      return <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">Void</span>;
    case 'uncollectible':
      return <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">Uncollectible</span>;
    default:
      return <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100">{status}</span>;
  }
};

export const InvoiceHistory: React.FC < InvoiceHistoryProps > = ({ invoices, onDownload }) => {
  const [expandedInvoice, setExpandedInvoice] = useState < string | null > (null);
  
  if (invoices.length === 0) {
    return (
      <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-8 text-center">
        <div className="text-secondary-400">
          <p>No invoices yet</p>
          <p className="text-sm mt-1">Invoices will appear here after your first payment</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
        <h3 className="text-sm font-semibold text-secondary-900 dark:text-white">Invoice History</h3>
      </div>
      <div className="divide-y divide-secondary-200 dark:divide-secondary-700">
        {invoices.map(invoice => (
          <div key={invoice.id} className="hover:bg-secondary-50 dark:hover:bg-secondary-700/50 transition-colors">
            <div
              className="px-6 py-4 flex flex-wrap items-center justify-between gap-3 cursor-pointer"
              onClick={() => setExpandedInvoice(expandedInvoice === invoice.id ? null : invoice.id)}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div>
                  <p className="font-medium text-secondary-900 dark:text-white">{invoice.number}</p>
                  <p className="text-xs text-secondary-500">{new Date(invoice.created).toLocaleDateString()}</p>
                </div>
                {getStatusBadge(invoice.status)}
              </div>
              <div className="flex items-center gap-4">
                <p className="font-semibold">{formatCurrency(invoice.amount)}</p>
                <button
                  onClick={(e) => { e.stopPropagation(); onDownload(invoice.id); }}
                  className="p-1.5 rounded-md hover:bg-secondary-100 dark:hover:bg-secondary-600"
                  title="Download PDF"
                >
                  <Download className="h-4 w-4" />
                </button>
                {expandedInvoice === invoice.id ? (
                  <ChevronUp className="h-4 w-4 text-secondary-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-secondary-400" />
                )}
              </div>
            </div>
            {expandedInvoice === invoice.id && (
              <div className="px-6 py-4 bg-secondary-50 dark:bg-secondary-700/30 border-t border-secondary-200 dark:border-secondary-700">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-secondary-500">Invoice Date</p>
                    <p className="font-medium">{new Date(invoice.created).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-secondary-500">Due Date</p>
                    <p className="font-medium">{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '—'}</p>
                  </div>
                  <div>
                    <p className="text-secondary-500">Payment Date</p>
                    <p className="font-medium">{invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString() : '—'}</p>
                  </div>
                  <div>
                    <p className="text-secondary-500">Amount</p>
                    <p className="font-medium">{formatCurrency(invoice.amount)}</p>
                  </div>
                </div>
                {invoice.description && (
                  <p className="mt-3 text-sm text-secondary-500">{invoice.description}</p>
                )}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => onDownload(invoice.id)}
                    className="flex items-center gap-1 px-3 py-1 text-sm border rounded-lg hover:bg-white"
                  >
                    <Download className="h-3 w-3" />
                    Download PDF
                  </button>
                  {invoice.pdfUrl && (
                    <a
                      href={invoice.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-1 text-sm border rounded-lg hover:bg-white"
                    >
                      <Eye className="h-3 w-3" />
                      View
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
export default InvoiceHistory;
