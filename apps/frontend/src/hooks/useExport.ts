// enterprise-ai-agent-platform/apps/frontend/src/hooks/useExport.ts
import { useState, useCallback } from 'react';
import { analyticsService } from '../services/analytics.service';
import { ExportOptions, ExportResult } from '../types/analytics.types';

interface UseExportReturn {
  isExporting: boolean;
  error: string | null;
  exportData: (options: ExportOptions) => Promise < boolean > ;
  exportToCSV: (data: any[], filename: string) => void;
  exportToJSON: (data: any, filename: string) => void;
  exportToPDF: (elementId: string, filename: string) => Promise < boolean > ;
  downloadBlob: (blob: Blob, filename: string) => void;
}

export const useExport = (): UseExportReturn => {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState < string | null > (null);
  
  const downloadBlob = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);
  
  const exportToCSV = useCallback((data: any[], filename: string) => {
    if (!data || data.length === 0) {
      setError('No data to export');
      return;
    }
    
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header];
        if (value === undefined || value === null) return '';
        if (typeof value === 'object') return JSON.stringify(value).replace(/,/g, ';');
        return String(value).replace(/,/g, ';');
      }).join(','))
    ];
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  }, [downloadBlob]);
  
  const exportToJSON = useCallback((data: any, filename: string) => {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    downloadBlob(blob, `${filename}_${new Date().toISOString().split('T')[0]}.json`);
  }, [downloadBlob]);
  
  const exportToPDF = useCallback(async (elementId: string, filename: string): Promise < boolean > => {
    try {
      const element = document.getElementById(elementId);
      if (!element) {
        setError(`Element with id "${elementId}" not found`);
        return false;
      }
      
      // Dynamically import html2pdf for PDF generation
      const html2pdf = (await import('html2pdf.js')).default;
      
      const opt = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: `${filename}_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      };
      
      await html2pdf().set(opt).from(element).save();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'PDF export failed';
      setError(message);
      console.error('PDF export error:', err);
      return false;
    }
  }, []);
  
  const exportData = useCallback(async (options: ExportOptions): Promise < boolean > => {
    setIsExporting(true);
    setError(null);
    
    try {
      const result = await analyticsService.exportData(options);
      if (result.url) {
        await analyticsService.downloadExport(result.url);
        return true;
      }
      if (result.error) {
        throw new Error(result.error);
      }
      return false;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed';
      setError(message);
      return false;
    } finally {
      setIsExporting(false);
    }
  }, []);
  
  return {
    isExporting,
    error,
    exportData,
    exportToCSV,
    exportToJSON,
    exportToPDF,
    downloadBlob,
  };
};