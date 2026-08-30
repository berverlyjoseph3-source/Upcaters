// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/DriveAgent/DriveAgent.tsx
import React, { useState, useEffect } from 'react';
import { HardDrive, Folder, File, Upload, Search, Trash2, Star, Share2, Download, RefreshCw, Settings } from 'lucide-react';
import { AgentHeader } from '../shared/AgentHeader';
import { FileExplorer } from './FileExplorer';
import { FileUploader } from './FileUploader';
import { FilePreview } from './FilePreview';

interface DriveFile {
  id: string;
  name: string;
  type: 'file' | 'folder';
  mimeType ? : string;
  size ? : number;
  parentId ? : string;
  starred: boolean;
  trashed: boolean;
  modifiedAt: Date;
  url ? : string;
}

export const DriveAgent: React.FC = () => {
  const [files, setFiles] = useState < DriveFile[] > ([]);
  const [currentFolderId, setCurrentFolderId] = useState < string | null > (null);
  const [selectedFileId, setSelectedFileId] = useState < string | null > (null);
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState < string | null > (null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState < 'grid' | 'list' > ('grid');
  
  useEffect(() => {
    fetchFiles();
  }, [currentFolderId, searchQuery]);
  
  const fetchFiles = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      const mockFiles: DriveFile[] = [
        { id: '1', name: 'Documents', type: 'folder', starred: false, trashed: false, modifiedAt: new Date() },
        { id: '2', name: 'Images', type: 'folder', starred: true, trashed: false, modifiedAt: new Date() },
        { id: '3', name: 'resume.pdf', type: 'file', mimeType: 'application/pdf', size: 245000, starred: false, trashed: false, modifiedAt: new Date() },
        { id: '4', name: 'presentation.pptx', type: 'file', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', size: 1800000, starred: true, trashed: false, modifiedAt: new Date() },
        { id: '5', name: 'photo.jpg', type: 'file', mimeType: 'image/jpeg', size: 3200000, starred: false, trashed: false, modifiedAt: new Date() },
      ];
      let filtered = mockFiles;
      if (searchQuery) {
        filtered = filtered.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
      }
      setFiles(filtered);
    } catch (err) {
      setError('Failed to load files');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRefresh = () => fetchFiles();
  
  const handleFileClick = (file: DriveFile) => {
    if (file.type === 'folder') {
      setCurrentFolderId(file.id);
      setSelectedFileId(null);
    } else {
      setSelectedFileId(file.id);
    }
  };
  
  const handleUploadComplete = (newFiles: DriveFile[]) => {
    setFiles(prev => [...newFiles, ...prev]);
    setIsUploaderOpen(false);
  };
  
  const handleDelete = async (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };
  
  const handleStar = async (fileId: string) => {
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, starred: !f.starred } : f));
  };
  
  const selectedFile = files.find(f => f.id === selectedFileId);
  
  return (
    <div className="h-full flex flex-col">
      <AgentHeader
        title="Drive Agent"
        description="File management, search, sharing, and organization across Google Drive"
        icon={<HardDrive className="h-6 w-6" />}
        gradient="bg-gradient-to-br from-green-500 to-green-600"
        onRefresh={handleRefresh}
        isLoading={isLoading}
        actions={
          <>
            <button
              onClick={() => setIsUploaderOpen(true)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Upload
            </button>
            <button className="p-2 rounded-lg text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700">
              <Settings className="h-5 w-5" />
            </button>
          </>
        }
      />

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0 space-y-1">
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700">
            <HardDrive className="h-4 w-4" />
            <span>My Drive</span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700">
            <Star className="h-4 w-4" />
            <span>Starred</span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700">
            <Trash2 className="h-4 w-4" />
            <span>Trash</span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700">
            <Share2 className="h-4 w-4" />
            <span>Shared with me</span>
          </button>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search bar */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* View toggle */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-1 bg-secondary-100 dark:bg-secondary-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-secondary-600 shadow-sm' : ''}`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-secondary-600 shadow-sm' : ''}`}
              >
                List
              </button>
            </div>
            <button onClick={handleRefresh} className="p-1.5 rounded-md text-secondary-500 hover:bg-secondary-100">
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* File explorer */}
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
            </div>
          ) : error ? (
            <div className="text-center text-red-500 p-4">{error}</div>
          ) : (
            <FileExplorer
              files={files}
              viewMode={viewMode}
              onFileClick={handleFileClick}
              onStar={handleStar}
              onDelete={handleDelete}
              selectedFileId={selectedFileId}
            />
          )}
        </div>

        {/* Preview panel */}
        {selectedFile && selectedFile.type === 'file' && (
          <div className="w-96 flex-shrink-0 border-l border-secondary-200 dark:border-secondary-700 overflow-y-auto">
            <FilePreview file={selectedFile} onClose={() => setSelectedFileId(null)} />
          </div>
        )}
      </div>

      {isUploaderOpen && (
        <FileUploader
          onClose={() => setIsUploaderOpen(false)}
          onUploadComplete={handleUploadComplete}
          currentFolderId={currentFolderId}
        />
      )}
    </div>
  );
};
export default DriveAgent;
