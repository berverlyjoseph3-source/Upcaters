// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/DriveAgent/FileUploader.tsx
import React, { useState, useRef } from 'react';
import { X, Upload, File, CheckCircle, AlertCircle } from 'lucide-react';

interface FileUploaderProps {
  onClose: () => void;
  onUploadComplete: (files: any[]) => void;
  currentFolderId ? : string | null;
}

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error ? : string;
}

export const FileUploader: React.FC < FileUploaderProps > = ({ onClose, onUploadComplete, currentFolderId }) => {
  const [files, setFiles] = useState < UploadingFile[] > ([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef < HTMLInputElement > (null);
  
  const handleFilesSelected = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    const newFiles: UploadingFile[] = Array.from(selectedFiles).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      progress: 0,
      status: 'pending',
    }));
    setFiles(prev => [...prev, ...newFiles]);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFilesSelected(e.dataTransfer.files);
  };
  
  const handleUpload = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    for (const file of pendingFiles) {
      setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'uploading' } : f));
      // Simulate upload progress
      for (let p = 0; p <= 100; p += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setFiles(prev => prev.map(f => f.id === file.id ? { ...f, progress: p } : f));
      }
      // Simulate success
      setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'success', progress: 100 } : f));
    }
    // After all uploads complete, notify parent
    const successful = files.filter(f => f.status === 'success');
    if (successful.length > 0) {
      const uploadedFiles = successful.map(f => ({
        id: f.id,
        name: f.file.name,
        type: 'file',
        size: f.file.size,
        modifiedAt: new Date(),
      }));
      onUploadComplete(uploadedFiles);
      onClose();
    }
  };
  
  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };
  
  const totalFiles = files.length;
  const completedFiles = files.filter(f => f.status === 'success').length;
  const isUploading = files.some(f => f.status === 'uploading');
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-secondary-200 dark:border-secondary-700">
          <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Upload Files</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-secondary-100 dark:hover:bg-secondary-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drop area */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`m-4 p-8 border-2 border-dashed rounded-xl text-center transition-colors cursor-pointer ${
            isDragging ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-secondary-300 dark:border-secondary-600'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-10 w-10 mx-auto text-secondary-400 mb-2" />
          <p className="text-secondary-600 dark:text-secondary-300">Drag & drop files here or click to browse</p>
          <p className="text-xs text-secondary-400 mt-1">Supports any file type up to 100MB</p>
          <input type="file" ref={fileInputRef} multiple className="hidden" onChange={(e) => handleFilesSelected(e.target.files)} />
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="flex-1 overflow-y-auto p-4 space-y-2 border-t border-secondary-200 dark:border-secondary-700">
            {files.map(file => (
              <div key={file.id} className="flex items-center justify-between p-2 bg-secondary-50 dark:bg-secondary-700/50 rounded-lg">
                <div className="flex items-center gap-3 min-w-0">
                  <File className="h-5 w-5 text-secondary-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-secondary-900 dark:text-white truncate">{file.file.name}</p>
                    <p className="text-xs text-secondary-500">{(file.file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {file.status === 'uploading' && (
                    <div className="w-24 h-1.5 bg-secondary-200 rounded-full overflow-hidden">
                      <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${file.progress}%` }} />
                    </div>
                  )}
                  {file.status === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
                  {file.status === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
                  {file.status !== 'uploading' && (
                    <button onClick={() => removeFile(file.id)} className="p-1 rounded hover:bg-secondary-200">
                      <X className="h-4 w-4 text-secondary-500" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center p-4 border-t border-secondary-200 dark:border-secondary-700">
          <div className="text-sm text-secondary-500">
            {totalFiles > 0 ? `${completedFiles} of ${totalFiles} files uploaded` : 'No files selected'}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 hover:bg-secondary-50">
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={totalFiles === 0 || isUploading}
              className="px-4 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
            >
              {isUploading ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Uploading...</> : 'Upload'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default FileUploader;
