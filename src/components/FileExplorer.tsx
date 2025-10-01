import { useState } from 'react';
import { Folder, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useEditorStore, FileSystemNode } from '@/stores/editorStore';
import { cn, getFileIcon } from '@/lib/utils';
interface FileExplorerProps {
  nodes: FileSystemNode[];
  level?: number;
}
export function FileExplorer({ nodes, level = 0 }: FileExplorerProps) {
  const activeFile = useEditorStore((state) => state.activeFile);
  const setActiveFile = useEditorStore((state) => state.setActiveFile);
  // Sort nodes so directories come first, then files alphabetically
  const sortedNodes = [...nodes].sort((a, b) => {
    if (a.type === 'directory' && b.type === 'file') return -1;
    if (a.type === 'file' && b.type === 'directory') return 1;
    return a.name.localeCompare(b.name);
  });
  return (
    <div className="space-y-0.5">
      {sortedNodes.map((node) => (
        <div key={node.path} style={{ paddingLeft: `${level * 1}rem` }}>
          {node.type === 'directory' ? (
            <DirectoryNode node={node} level={level} />
          ) : (
            <FileNode node={node} isActive={activeFile === node.path} onClick={() => setActiveFile(node.path)} />
          )}
        </div>
      ))}
    </div>
  );
}
function DirectoryNode({ node, level }: { node: FileSystemNode; level: number }) {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full flex items-center space-x-2 px-2 py-1 text-left text-sm hover:bg-brutalist-yellow/50 transition-colors font-bold">
        <ChevronRight className={cn('h-4 w-4 transition-transform flex-shrink-0', isOpen && 'rotate-90')} />
        <Folder className="h-4 w-4 flex-shrink-0" />
        <span className="truncate">{node.name}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {node.children && <FileExplorer nodes={node.children} level={level + 1} />}
      </CollapsibleContent>
    </Collapsible>
  );
}
function FileNode({ node, isActive, onClick }: { node: FileSystemNode; isActive: boolean; onClick: () => void }) {
  const Icon = getFileIcon(node.name);
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center space-x-2 px-2 py-1 text-left text-sm hover:bg-brutalist-yellow/50 transition-colors',
        isActive ? 'bg-brutalist-yellow font-bold' : ''
      )}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span className="truncate">{node.name}</span>
    </button>
  );
}