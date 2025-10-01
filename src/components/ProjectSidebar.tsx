import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CloudUpload, FileText, FolderSearch } from "lucide-react";
import { useEditorStore } from '@/stores/editorStore';
import { FileExplorer } from './FileExplorer';
import { deploymentService } from '@/lib/deployment';
import { toast } from 'sonner';
export function ProjectSidebar() {
  const {
    fileTree,
    isLoadingTree,
    error,
    fetchRepoTree,
    repoUrl,
    setRepoUrl
  } = useEditorStore((state) => ({
    fileTree: state.fileTree,
    isLoadingTree: state.isLoadingTree,
    error: state.error,
    fetchRepoTree: state.fetchRepoTree,
    repoUrl: state.repoUrl,
    setRepoUrl: state.setRepoUrl,
  }));
  const [isDeployingCf, setIsDeployingCf] = useState(false);
  const [isGeneratingDockerfile, setIsGeneratingDockerfile] = useState(false);
  const handleLoadRepo = () => {
    fetchRepoTree();
  };
  const handleDeployCf = async () => {
    setIsDeployingCf(true);
    toast.loading('Starting Cloudflare deployment...');
    const result = await deploymentService.deployToCloudflare();
    toast.dismiss();
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
    setIsDeployingCf(false);
  };
  const handleGenerateDockerfile = async () => {
    setIsGeneratingDockerfile(true);
    toast.loading('Generating Dockerfile...');
    const result = await deploymentService.generateDockerfile();
    toast.dismiss();
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
    setIsGeneratingDockerfile(false);
  };
  const repoName = repoUrl.split('/').pop() || 'NONE';
  return (
    <div className="h-full flex flex-col bg-brutalist-gray p-4 space-y-4 brutalist-border">
      <header className="text-center py-2">
        <h1 className="text-2xl font-extrabold uppercase tracking-widest">
          Agent Brutale
        </h1>
      </header>
      <div className="flex flex-col space-y-2 border-b-2 border-black pb-4">
        <label htmlFor="repoUrl" className="text-sm font-extrabold uppercase tracking-widest">
          Public Github Repo
        </label>
        <div className="flex space-x-2">
          <Input
            id="repoUrl"
            type="text"
            placeholder="https://github.com/user/repo"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            className="bg-white brutalist-border focus-visible:ring-inset focus-visible:ring-2"
            disabled={isLoadingTree}
          />
          <Button
            onClick={handleLoadRepo}
            className="bg-brutalist-yellow text-black hover:bg-brutalist-yellow/90 brutalist-shadow"
            disabled={isLoadingTree || !repoUrl}
          >
            {isLoadingTree ? <Loader2 className="h-4 w-4 animate-spin" /> : "LOAD"}
          </Button>
        </div>
        {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
      </div>
      <div className="flex-1 flex flex-col overflow-y-auto space-y-2">
        <div className="border-b-2 border-black pb-2 mb-2">
          <h2 className="text-sm font-extrabold uppercase tracking-widest py-2 px-2">
            Project: <span className="text-brutalist-yellow bg-black px-2 py-1">{repoName}</span>
          </h2>
        </div>
        {isLoadingTree ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Loader2 className="h-8 w-8 animate-spin mb-2" />
            <p className="text-xs text-muted-foreground">Loading Repository...</p>
          </div>
        ) : fileTree.length > 0 ? (
          <FileExplorer nodes={fileTree} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <FolderSearch className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">Load a repository to explore its files.</p>
          </div>
        )}
      </div>
      <div className="border-y-2 border-black py-4 space-y-2">
        <h2 className="text-sm font-extrabold uppercase tracking-widest px-2">
          Deployment
        </h2>
        <div className="flex flex-col space-y-2 px-2">
          <Button onClick={handleDeployCf} className="w-full justify-start bg-white hover:bg-gray-200 brutalist-shadow-sm" disabled={isDeployingCf || isGeneratingDockerfile}>
            {isDeployingCf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CloudUpload className="mr-2 h-4 w-4" />}
            Deploy to Cloudflare
          </Button>
          <Button onClick={handleGenerateDockerfile} className="w-full justify-start bg-white hover:bg-gray-200 brutalist-shadow-sm" disabled={isDeployingCf || isGeneratingDockerfile}>
            {isGeneratingDockerfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
            Generate Dockerfile
          </Button>
        </div>
      </div>
      <footer className="text-center text-xs text-muted-foreground pt-2">
        <p>Built with ❤️ at Cloudflare</p>
        <p className="font-bold mt-2">AI capabilities are not enabled.</p>
        <p>Export to GitHub and deploy to enable.</p>
      </footer>
    </div>
  );
}