import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ProjectSidebar } from "@/components/ProjectSidebar";
import { ChatPanel } from "@/components/ChatPanel";
import { IdePanel } from "@/components/IdePanel";
export function HomePage() {
  return (
    <main className="h-screen w-screen bg-brutalist-gray font-mono">
      <ResizablePanelGroup direction="horizontal" className="w-full h-full">
        <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
          <ProjectSidebar />
        </ResizablePanel>
        <ResizableHandle className="bg-brutalist-black w-2 hover:bg-brutalist-yellow transition-colors" />
        <ResizablePanel defaultSize={50} minSize={30}>
          <ChatPanel />
        </ResizablePanel>
        <ResizableHandle className="bg-brutalist-black w-2 hover:bg-brutalist-yellow transition-colors" />
        <ResizablePanel defaultSize={30} minSize={20}>
          <IdePanel />
        </ResizablePanel>
      </ResizablePanelGroup>
    </main>
  );
}