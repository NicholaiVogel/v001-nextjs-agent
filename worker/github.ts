import { Hono } from 'hono';
import type { FileSystemNode } from './types';
const GITHUB_API_BASE = 'https://api.github.com';
// Interfaces for GitHub API responses
interface RepoDetails {
  default_branch: string;
}
interface GitTreeItem {
  path: string;
  type: 'blob' | 'tree';
  // Other properties exist but are not needed for our use case
}
interface GitTreeResponse {
  tree: GitTreeItem[];
  truncated: boolean;
}
// Helper to parse GitHub URL
function parseRepoUrl(url: string): { owner: string; repo: string } | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    if (urlObj.hostname === 'github.com' && pathParts.length >= 2) {
      return { owner: pathParts[0], repo: pathParts[1] };
    }
    return null;
  } catch (e) {
    return null;
  }
}
// Fetch the default branch for a repository
async function getDefaultBranch(owner: string, repo: string): Promise<string> {
  const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, {
    headers: { 'User-Agent': 'AgentBrutale-CF-Worker' },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch repo details: ${response.statusText}`);
  }
  const data = await response.json<RepoDetails>();
  return data.default_branch;
}
// Recursively fetch the file tree
async function getRepoTree(owner: string, repo: string): Promise<FileSystemNode[]> {
  const branch = await getDefaultBranch(owner, repo);
  const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, {
    headers: { 'User-Agent': 'AgentBrutale-CF-Worker' },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch repo tree: ${response.statusText}`);
  }
  const { tree, truncated } = await response.json<GitTreeResponse>();
  if (truncated) {
    console.warn(`Repository tree for ${owner}/${repo} was truncated.`);
  }
  const root: FileSystemNode = { name: repo, type: 'directory', path: `/${repo}`, children: [] };
  const nodeMap: { [key: string]: FileSystemNode } = { [`/${repo}`]: root };
  for (const item of tree) {
    const pathParts = item.path.split('/');
    let currentPath = `/${repo}`;
    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      const parentPath = currentPath;
      currentPath = `${currentPath}/${part}`;
      if (!nodeMap[currentPath]) {
        const parentNode = nodeMap[parentPath];
        if (parentNode && parentNode.type === 'directory') {
          const newNode: FileSystemNode = {
            name: part,
            path: currentPath,
            type: item.type === 'tree' ? 'directory' : 'file',
          };
          if (newNode.type === 'directory') {
            newNode.children = [];
          }
          parentNode.children!.push(newNode);
          nodeMap[currentPath] = newNode;
        }
      }
    }
  }
  return root.children || [];
}
// Fetch content of a specific file
async function getFileContent(owner: string, repo: string, path: string): Promise<string> {
  // The path from the frontend will be like `/{repo}/src/file.ts`, we need to strip `/{repo}/`
  const repoNameIndex = path.indexOf('/', 1);
  const filePathInRepo = path.substring(repoNameIndex + 1);
  const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${filePathInRepo}`, {
    headers: {
      'User-Agent': 'AgentBrutale-CF-Worker',
      'Accept': 'application/vnd.github.v3.raw',
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch file content: ${response.statusText}`);
  }
  return await response.text();
}
const githubApp = new Hono();
githubApp.post('/tree', async (c) => {
  try {
    const { repoUrl } = await c.req.json();
    if (!repoUrl) {
      return c.json({ success: false, error: 'repoUrl is required' }, 400);
    }
    const repoInfo = parseRepoUrl(repoUrl);
    if (!repoInfo) {
      return c.json({ success: false, error: 'Invalid GitHub repository URL' }, 400);
    }
    const tree = await getRepoTree(repoInfo.owner, repoInfo.repo);
    return c.json({ success: true, data: tree });
  } catch (error) {
    console.error('Error fetching repo tree:', error);
    return c.json({ success: false, error: error instanceof Error ? error.message : 'An unknown error occurred' }, 500);
  }
});
githubApp.post('/content', async (c) => {
  try {
    const { repoUrl, path } = await c.req.json();
    if (!repoUrl || !path) {
      return c.json({ success: false, error: 'repoUrl and path are required' }, 400);
    }
    const repoInfo = parseRepoUrl(repoUrl);
    if (!repoInfo) {
      return c.json({ success: false, error: 'Invalid GitHub repository URL' }, 400);
    }
    const content = await getFileContent(repoInfo.owner, repoInfo.repo, path);
    return c.json({ success: true, data: { content } });
  } catch (error) {
    console.error('Error fetching file content:', error);
    return c.json({ success: false, error: error instanceof Error ? error.message : 'An unknown error occurred' }, 500);
  }
});
export default githubApp;