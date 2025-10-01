import { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { useEditorStore } from '@/stores/editorStore';
import { useDebounce } from '@/hooks/useDebounce';
import { Loader2 } from 'lucide-react';
export function IdePanel() {
  const { activeFile, fileContents, isFetchingFile, setFileContent } = useEditorStore((state) => ({
    activeFile: state.activeFile,
    fileContents: state.fileContents,
    isFetchingFile: state.isFetchingFile,
    setFileContent: state.setFileContent,
  }));
  const isLoading = isFetchingFile === activeFile;
  const currentContent = activeFile ? fileContents[activeFile] : null;
  const [localContent, setLocalContent] = useState(currentContent ?? '');
  const debouncedContent = useDebounce(localContent, 500);
  useEffect(() => {
    if (activeFile) {
      setLocalContent(currentContent ?? '');
    }
  }, [activeFile, currentContent]);
  useEffect(() => {
    if (activeFile && debouncedContent !== currentContent) {
      setFileContent(activeFile, debouncedContent);
    }
  }, [debouncedContent, activeFile, currentContent, setFileContent]);
  const handleEditorChange = (value: string | undefined) => {
    setLocalContent(value ?? '');
  };
  const language = activeFile?.split('.').pop() === 'tsx' ? 'typescript' : 'javascript';
  let displayContent;
  if (isLoading) {
    displayContent = `// Loading ${activeFile}...`;
  } else if (currentContent !== null && currentContent !== undefined) {
    displayContent = localContent;
  } else if (activeFile) {
    displayContent = `// Could not load content for ${activeFile}.`;
  } else {
    displayContent = '// Select a file to view its content';
  }
  return (
    <div className="h-full flex flex-col bg-brutalist-gray brutalist-border">
      <header className="p-4 brutalist-border border-b-2 flex justify-between items-center bg-white">
        <h2 className="text-sm font-extrabold uppercase tracking-wider truncate">
          IDE // {activeFile || 'No file selected'}
        </h2>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      </header>
      <div className="flex-1 overflow-hidden relative">
        <Editor
          key={activeFile} // Force re-mount on file change to reset editor state
          height="100%"
          language={language}
          value={displayContent}
          onChange={handleEditorChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "'JetBrains Mono', monospace",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on',
            readOnly: isLoading || !activeFile,
          }}
        />
      </div>
      <footer className="p-2 border-t-2 brutalist-border text-xs text-center bg-white">
        <p>AGENT BRUTALE // IDE</p>
      </footer>
    </div>
  );
}