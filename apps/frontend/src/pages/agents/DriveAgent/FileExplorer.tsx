// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/DriveAgent/FileExplorer.tsx
import React from 'react';
import { Folder, File, Star, MoreVertical, Download, Trash2, Share2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface DriveFile {
  id: string;
  name: string;
  type: 'file' | 'folder';
  mimeType ? : string;
  size ? : number;
  starred: boolean;
  trashed: boolean;
  modifiedAt: Date;
}

interface FileExplorerProps {
  files: DriveFile[];
  viewMode: 'grid' | 'list';
  onFileClick: (file: DriveFile) => void;
  onStar: (id: string) => void;
  onDelete: (id: string) => void;
  selectedFileId ? : string | null;
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

export const FileExplorer: React.FC < FileExplorerProps > = ({
  files,
  viewMode,
  onFileClick,
  onStar,
  onDelete,
  selectedFileId,
}) => {
  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-secondary-400">
        <Folder className="h-12 w-12 mb-2 opacity-50" />
        <p>This folder is empty</p>
      </div>
    );
  }
  
  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {files.map(file => (
          <div
            key={file.id}
            onClick={() => onFileClick(file)}
            className={`group relative p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md ${
              selectedFileId === file.id
                ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-700'
                : 'bg-white dark:bg-secondary-800 border-secondary-200 dark:border-secondary-700 hover:border-primary-300 dark:hover:border-primary-600'
            }`}
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
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); onStar(file.id); }}
                className="p-1 rounded-md hover:bg-secondary-100 dark:hover:bg-secondary-700"
              >
                <Star className={`h-3 w-3 ${file.starred ? 'fill-yellow-400 text-yellow-400' : 'text-secondary-400'}`} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(file.id); }}
                className="p-1 rounded-md hover:bg-secondary-100 dark:hover:bg-secondary-700 text-red-500"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  // List view
  return (
    <div className="border border-secondary-200 dark:border-secondary-700 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-secondary-50 dark:bg-secondary-800/50">
          <tr>
            <th className="px-4 py-2 text-left">Name</th>
            <th className="px-4 py-2 text-left">Type</th>
            <th className="px-4 py-2 text-left">Size</th>
            <th className="px-4 py-2 text-left">Modified</th>
            <th className="px-4 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-secondary-200 dark:divide-secondary-700">
          {files.map(file => (
            <tr
              key={file.id}
              onClick={() => onFileClick(file)}
              className={`cursor-pointer hover:bg-secondary-50 dark:hover:bg-secondary-700/50 transition-colors ${
                selectedFileId === file.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''
              }`}
            >
              <td className="px-4 py-2 flex items-center gap-2">
                <span className="text-lg">{file.type === 'folder' ? '📁' : getFileIcon(file.mimeType)}</span>
                <span className="font-medium text-secondary-900 dark:text-white">{file.name}</span>
                {file.starred && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
              </td>
              <td className="px-4 py-2 text-secondary-500">{file.type === 'folder' ? 'Folder' : file.mimeType?.split('/')[1]?.toUpperCase() || 'File'}</td>
              <td className="px-4 py-2 text-secondary-500">{file.type === 'file' ? formatFileSize(file.size) : '—'}</td>
              <td className="px-4 py-2 text-secondary-500">{formatDistanceToNow(file.modifiedAt, { addSuffix: true })}</td>
              <td className="px-4 py-2 text-right">
                <div className="flex justify-end gap-1">
                  <button onClick={(e) => { e.stopPropagation(); onStar(file.id); }} className="p-1 rounded hover:bg-secondary-100">
                    <Star className={`h-4 w-4 ${file.starred ? 'fill-yellow-400 text-yellow-400' : 'text-secondary-400'}`} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onDelete(file.id); }} className="p-1 rounded hover:bg-secondary-100 text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
export default FileExplorer;
