// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/DriveAgent/FileCard.tsx
import React from 'react';
import { File, Folder, Star, MoreVertical, Download, Trash2, Share2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface DriveFile {
  id: string;
  name: string;
  type: 'file' | 'folder';
  mimeType ? : string;
  size ? : number;
  starred: boolean;
  modifiedAt: Date;
}

interface FileCardProps {
  file: DriveFile;
  onSelect: (file: DriveFile) => void;
  onStar: (id: string) => void;
  onDelete: (id: string) => void;
  isSelected ? : boolean;
}

const formatFileSize = (bytes ? : number): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const getFileIcon = (mimeType ? : string) => {
  if (mimeType?.startsWith('image/')) return '🖼️';
  if (mimeType?.startsWith('video/')) return '🎬';
  if (mimeType?.startsWith('audio/')) return '🎵';
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType?.includes('presentation')) return '📊';
  if (mimeType?.includes('spreadsheet')) return '📈';
  if (mimeType?.includes('document')) return '📝';
  return '📁';
};

export const FileCard: React.FC < FileCardProps > = ({ file, onSelect, onStar, onDelete, isSelected }) => {
  const [showMenu, setShowMenu] = React.useState(false);
  
  return (
    <div
      className={`group relative p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md ${
        isSelected
          ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-700'
          : 'bg-white dark:bg-secondary-800 border-secondary-200 dark:border-secondary-700 hover:border-primary-300 dark:hover:border-primary-600'
      }`}
      onClick={() => onSelect(file)}
    >
      <div className="flex flex-col items-center text-center">
        <div className="text-4xl mb-2">
          {file.type === 'folder' ? '📁' : getFileIcon(file.mimeType)}
        </div>
        <p className="text-sm font-medium text-secondary-900 dark:text-white truncate w-full">
          {file.name}
        </p>
        {file.type === 'file' && (
          <p className="text-xs text-secondary-500 mt-1">{formatFileSize(file.size)}</p>
        )}
        <p className="text-xs text-secondary-400 mt-1">
          {formatDistanceToNow(file.modifiedAt, { addSuffix: true })}
        </p>
      </div>

      {/* Action buttons */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); onStar(file.id); }}
          className="p-1 rounded-md hover:bg-secondary-100 dark:hover:bg-secondary-700"
          title={file.starred ? 'Remove star' : 'Add star'}
        >
          <Star className={`h-3 w-3 ${file.starred ? 'fill-yellow-400 text-yellow-400' : 'text-secondary-400'}`} />
        </button>
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="p-1 rounded-md hover:bg-secondary-100 dark:hover:bg-secondary-700"
          >
            <MoreVertical className="h-3 w-3 text-secondary-400" />
          </button>
          {showMenu && (
            <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-secondary-800 rounded-lg shadow-lg border border-secondary-200 dark:border-secondary-700 z-10">
              <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-secondary-100 dark:hover:bg-secondary-700 flex items-center gap-2">
                <Download className="h-3 w-3" /> Download
              </button>
              <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-secondary-100 dark:hover:bg-secondary-700 flex items-center gap-2">
                <Share2 className="h-3 w-3" /> Share
              </button>
              <button
                onClick={() => { onDelete(file.id); setShowMenu(false); }}
                className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
              >
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default FileCard;
