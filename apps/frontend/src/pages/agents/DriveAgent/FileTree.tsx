// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/DriveAgent/FileTree.tsx
import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, File } from 'lucide-react';

interface TreeNode {
  id: string;
  name: string;
  type: 'folder' | 'file';
  children?: TreeNode[];
}

interface FileTreeProps {
  nodes: TreeNode[];
  selectedId?: string | null;
  onSelect: (node: TreeNode) => void;
}

const TreeNodeComponent: React.FC<{
  node: TreeNode;
  level: number;
  selectedId?: string | null;
  onSelect: (node: TreeNode) => void;
}> = ({ node, level, selectedId, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id;

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer hover:bg-secondary-100 dark:hover:bg-secondary-700 ${
          isSelected ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300' : ''
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelect(node)}
      >
        {hasChildren && (
          <button
            onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
            className="p-0.5 hover:bg-secondary-200 rounded"
          >
            {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        )}
        {!hasChildren && <div className="w-4" />}
        {node.type === 'folder' ? (
          isOpen ? <FolderOpen className="h-4 w-4 text-yellow-500" /> : <Folder className="h-4 w-4 text-yellow-500" />
        ) : (
          <File className="h-4 w-4 text-secondary-400" />
        )}
        <span className="text-sm truncate">{node.name}</span>
      </div>
      {hasChildren && isOpen && (
        <div>
          {node.children!.map(child => (
            <TreeNodeComponent
              key={child.id}
              node={child}
              level={level + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const FileTree: React.FC<FileTreeProps> = ({ nodes, selectedId, onSelect }) => {
  return (
    <div className="p-2 space-y-0.5">
      {nodes.map(node => (
        <TreeNodeComponent key={node.id} node={node} level={0} selectedId={selectedId} onSelect={onSelect} />
      ))}
    </div>
  );
};
export default FileTree;
