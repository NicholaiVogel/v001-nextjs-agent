import { create } from 'zustand';
import type { FileSystemNode as WorkerFileSystemNode } from '../../worker/types';
// Re-declaring here to avoid direct dependency issues in frontend code
export type FileSystemNode = WorkerFileSystemNode;
export interface FileContent {
  [path: string]: string;
}
// Helper function to add a new file/directory node to the tree
const addNewFileNode = (tree: FileSystemNode[], path: string): FileSystemNode[] => {
  const pathParts = path.split('/').filter(p => p);
  let currentLevel = tree;
  for (let i = 0; i < pathParts.length; i++) {
    const part = pathParts[i];
    const isLastPart = i === pathParts.length - 1;
    let node = currentLevel.find(n => n.name === part);
    if (!node) {
      // Node doesn't exist, create it
      const newNode: FileSystemNode = {
        name: part,
        path: '/' + pathParts.slice(0, i + 1).join('/'),
        type: isLastPart ? 'file' : 'directory',
      };
      if (newNode.type === 'directory') {
        newNode.children = [];
      }
      currentLevel.push(newNode);
      node = newNode;
    }
    if (node.type === 'directory') {
      currentLevel = node.children!;
    } else if (!isLastPart) {
      // Path conflict: a file exists where a directory should be.
      console.error("Cannot create file/directory, path conflict with existing file:", path);
      return tree;
    }
  }
  return tree;
};
interface EditorState {
  repoUrl: string;
  fileTree: FileSystemNode[];
  fileContents: FileContent;
  activeFile: string | null;
  isLoadingTree: boolean;
  isFetchingFile: string | null; // path of the file being fetched
  error: string | null;
  setRepoUrl: (url: string) => void;
  setActiveFile: (path: string | null) => void;
  setFileContent: (path: string, content: string) => void;
  fetchRepoTree: () => Promise<void>;
  fetchFileContent: (path: string) => Promise<void>;
}
export const useEditorStore = create<EditorState>((set, get) => ({
  repoUrl: 'https://github.com/cloudflare/workers-sdk',
  fileTree: [],
  fileContents: {},
  activeFile: null,
  isLoadingTree: false,
  isFetchingFile: null,
  error: null,
  setRepoUrl: (url) => set({ repoUrl: url }),
  setActiveFile: (path) => {
    if (path) {
      const { fileContents, fetchFileContent } = get();
      if (!fileContents[path]) {
        fetchFileContent(path);
      }
    }
    set({ activeFile: path });
  },
  setFileContent: (path, content) => {
    set((state) => {
      const newFileContents = { ...state.fileContents, [path]: content };
      let newFileTree = state.fileTree;
      // Check if the file exists in the tree
      const pathExists = (nodes: FileSystemNode[], targetPath: string): boolean => {
        for (const node of nodes) {
          if (node.path === targetPath) return true;
          if (node.children && pathExists(node.children, targetPath)) return true;
        }
        return false;
      };
      if (!pathExists(state.fileTree, path)) {
        // Create a deep copy to avoid direct mutation
        const treeCopy = JSON.parse(JSON.stringify(state.fileTree));
        newFileTree = addNewFileNode(treeCopy, path.substring(1)); // remove leading '/'
      }
      return {
        fileContents: newFileContents,
        fileTree: newFileTree,
      };
    });
  },
  fetchRepoTree: async () => {
    const { repoUrl } = get();
    if (!repoUrl) {
      set({ error: 'Repository URL is required.' });
      return;
    }
    set({ isLoadingTree: true, error: null, fileTree: [], activeFile: null, fileContents: {} });
    try {
      const response = await fetch('/api/github/tree', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl }),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch repository tree.');
      }
      set({ fileTree: result.data });
    } catch (e) {
      const error = e instanceof Error ? e.message : 'An unknown error occurred.';
      set({ error });
    } finally {
      set({ isLoadingTree: false });
    }
  },
  fetchFileContent: async (path: string) => {
    const { repoUrl, isFetchingFile } = get();
    if (isFetchingFile === path) return; // Already fetching this file
    set({ isFetchingFile: path });
    try {
      const response = await fetch('/api/github/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl, path }),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || `Failed to fetch content for ${path}.`);
      }
      set((state) => ({
        fileContents: { ...state.fileContents, [path]: result.data.content },
      }));
    } catch (e) {
      const error = e instanceof Error ? e.message : 'An unknown error occurred.';
      set({ error });
    } finally {
      set({ isFetchingFile: null });
    }
  },
}));