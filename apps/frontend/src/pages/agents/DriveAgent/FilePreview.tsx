// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/DriveAgent/FilePreview.tsx
import React, { useState, useEffect } from 'react';
import { X, Download, Star, Trash2, Share2, FileText, Image, File, Video, Music, Archive } from 'lucide-react';

interface DriveFile {
  id: string;
  name: string;
  type: 'file' | 'folder';
  mimeType ? : string;
  size ? : number;
  starred: boolean;
  url ? : string;
  modifiedAt: Date;
}

interface FilePreviewProps {
  file: DriveFile;
  onClose: () => void;
  onStar ? : (id: string) => void;
  onDelete ? : (id: string) => void;
  onDownload ? : (id: string) => void;
}

const getFileIcon = (mimeType ? : string) => {
  if (mimeType?.startsWith('image/')) return <Image className="h-16 w-16 text-blue-500" />;
  if (mimeType?.startsWith('video/')) return <Video className="h-16 w-16 text-purple-500" />;
  if (mimeType?.startsWith('audio/')) return <Music className="h-16 w-16 text-green-500" />;
  if (mimeType === 'application/pdf') return <FileText className="h-16 w-16 text-red-500" />;
  if (mimeType?.includes('zip') || mimeType?.includes('compressed')) return <Archive className="h-16 w-16 text-yellow-500" />;
  return <File className="h-16 w-16 text-secondary-400" />;
};

const formatFileSize = (bytes ? : number): string => {
  if (!bytes) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

export const FilePreview: React.FC < FilePreviewProps > = ({ file, onClose, onStar, onDelete, onDownload }) => {
  const [isImage, setIsImage] = useState(false);
  const [imageUrl, setImageUrl] = useState < string | null > (null);
  
  useEffect(() => {
    if (file.mimeType?.startsWith('image/') && file.url) {
      setIsImage(true);
      setImageUrl(file.url);
    }
  }, [file]);
  
  const handleDownload = () => {
    if (onDownload) onDownload(file.id);
    else if (file.url) window.open(file.url, '_blank');
  };
  
  return (
    <div className="h-full flex flex-col bg-white dark:bg-secondary-800">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-secondary-200 dark:border-secondary-700">
        <div className="flex items-center gap-2 min-w-0">
          {getFileIcon(file.mimeType)}
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-secondary-900 dark:text-white truncate">{file.name}</h3>
            <p className="text-xs text-secondary-500">{formatFileSize(file.size)} • {file.mimeType?.split('/')[1]?.toUpperCase() || 'File'}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded-md hover:bg-secondary-100 dark:hover:bg-secondary-700">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Preview area */}
      <div className="flex-1 overflow-auto p-4">
        {isImage && imageUrl ? (
          <img src={imageUrl} alt={file.name} className="max-w-full max-h-full object-contain mx-auto" />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-secondary-400">
            {getFileIcon(file.mimeType)}
            <p className="mt-4 text-sm">Preview not available for this file type</p>
            <button
              onClick={handleDownload}
              className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center p-4 border-t border-secondary-200 dark:border-secondary-700">
        <div className="flex gap-2">
          <button
            onClick={() => onStar?.(file.id)}
            className="p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700"
            title={file.starred ? 'Remove star' : 'Add star'}
          >
            <Star className={`h-5 w-5 ${file.starred ? 'fill-yellow-400 text-yellow-400' : 'text-secondary-500'}`} />
          </button>
          <button
            onClick={() => onDelete?.(file.id)}
            className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500"
            title="Delete"
          >
            <Trash2 className="h-5 w-5" />
          </button>
          <button
            onClick={handleDownload}
            className="p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 text-secondary-500"
            title="Download"
          >
            <Download className="h-5 w-5" />
          </button>
          <button
            className="p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 text-secondary-500"
            title="Share"
          >
            <Share2 className="h-5 w-5" />
          </button>
        </div>
        <p className="text-xs text-secondary-400">Modified {new Date(file.modifiedAt).toLocaleString()}</p>
      </div>
    </div>
  );
};
export default FilePreview;
