import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Bot, User, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { chatService, formatTime } from '../lib/chat';
import type { ChatState } from '../../worker/types';
import { useEditorStore } from '@/stores/editorStore';
import { cn } from '@/lib/utils';
import { BMADStatus, BmadStage } from './BMADStatus';
export function ChatPanel() {
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    sessionId: chatService.getSessionId(),
    isProcessing: false,
    model: 'google-ai-studio/gemini-2.5-flash',
    streamingMessage: ''
  });
  const [input, setInput] = useState('');
  const [bmadStage, setBmadStage] = useState<BmadStage>('IDLE');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileTree = useEditorStore((state) => state.fileTree);
  const fileContents = useEditorStore((state) => state.fileContents);
  const activeFile = useEditorStore((state) => state.activeFile);
  const setFileContent = useEditorStore((state) => state.setFileContent);
  const repoUrl = useEditorStore((state) => state.repoUrl);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(scrollToBottom, [chatState.messages, chatState.streamingMessage]);
  const loadCurrentSession = useCallback(async () => {
    const response = await chatService.getMessages();
    if (response.success && response.data) {
      setChatState(prev => ({ ...prev, ...response.data }));
    }
  }, []);
  useEffect(() => {
    loadCurrentSession();
  }, [loadCurrentSession]);
  const handleAgentResponse = (response: string) => {
    const codeBlockRegex = /```(?<lang>[\w]*)\s*\/\/\s*(?<path>[/\w.-]+)\n(?<code>[\s\S]*?)\n```/g;
    const matches = response.matchAll(codeBlockRegex);
    for (const match of matches) {
      if (match.groups) {
        const { path, code } = match.groups;
        const repoName = repoUrl.split('/').pop() || '';
        const fullPath = `/${repoName}/${path}`;
        console.log(`Agent generated code for path: ${fullPath}`);
        setFileContent(fullPath, code);
      }
    }
    const bmadStageRegex = /\/\/\s*BMAD_STAGE:\s*(BLUEPRINT|MODEL|ASSEMBLE|DEPLOY)/;
    const stageMatch = response.match(bmadStageRegex);
    if (stageMatch && stageMatch[1]) {
      setBmadStage(stageMatch[1] as BmadStage);
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || chatState.isProcessing) return;
    const message = input.trim();
    setInput('');
    setBmadStage('BLUEPRINT'); // Start process on new message
    const userMessage = {
      id: crypto.randomUUID(),
      role: 'user' as const,
      content: message,
      timestamp: Date.now()
    };
    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isProcessing: true,
      streamingMessage: ''
    }));
    const context = {
      fileTree,
      fileContents: activeFile ? { [activeFile]: fileContents[activeFile] } : {},
    };
    let fullResponse = '';
    await chatService.sendMessage(message, chatState.model, context, (chunk) => {
      fullResponse += chunk;
      handleAgentResponse(fullResponse); // Process chunks for real-time updates
      setChatState(prev => ({
        ...prev,
        streamingMessage: (prev.streamingMessage || '') + chunk
      }));
    });
    await loadCurrentSession();
    setChatState(prev => ({ ...prev, isProcessing: false, streamingMessage: '' }));
    setBmadStage('IDLE'); // Reset after completion
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  const handleClear = async () => {
    await chatService.clearMessages();
    await loadCurrentSession();
    setBmadStage('IDLE');
  };
  return (
    <div className="h-full flex flex-col bg-brutalist-gray brutalist-border">
      <header className="p-4 brutalist-border border-b-2 flex justify-between items-center">
        <BMADStatus currentStage={bmadStage} />
        <Button variant="secondary" size="icon" onClick={handleClear} className="bg-white hover:bg-gray-200 brutalist-shadow-sm">
          <Trash2 className="w-4 h-4" />
        </Button>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {chatState.messages.map((msg) => (
          <div key={msg.id} className={cn('flex items-start gap-4', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            {msg.role === 'assistant' && <Bot className="w-6 h-6 flex-shrink-0 mt-2" />}
            <div className={cn(
              'max-w-[80%] p-4 brutalist-border',
              msg.role === 'user' ? 'bg-brutalist-yellow brutalist-shadow' : 'bg-white brutalist-shadow'
            )}>
              <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
              <p className="text-xs text-muted-foreground mt-2 text-right">{formatTime(msg.timestamp)}</p>
            </div>
            {msg.role === 'user' && <User className="w-6 h-6 flex-shrink-0 mt-2" />}
          </div>
        ))}
        {chatState.streamingMessage && (
          <div className="flex items-start gap-4 justify-start">
            <Bot className="w-6 h-6 flex-shrink-0 mt-2" />
            <div className="max-w-[80%] p-4 bg-white brutalist-border brutalist-shadow">
              <p className="whitespace-pre-wrap text-sm">{chatState.streamingMessage}<span className="animate-pulse">_</span></p>
            </div>
          </div>
        )}
        {chatState.isProcessing && !chatState.streamingMessage && (
          <div className="flex items-start gap-4 justify-start">
            <Bot className="w-6 h-6 flex-shrink-0 mt-2" />
            <div className="max-w-[80%] p-4 bg-white brutalist-border brutalist-shadow">
              <div className="flex space-x-1.5">
                <div className="w-2 h-2 bg-black rounded-full animate-pulse" />
                <div className="w-2 h-2 bg-black rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
                <div className="w-2 h-2 bg-black rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="p-4 border-t-2 brutalist-border bg-white">
        <div className="flex gap-2 items-start">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Instruct Agent Brutale..."
            className="flex-1 min-h-[48px] max-h-48 resize-none text-base bg-brutalist-gray focus-visible:ring-inset focus-visible:ring-2"
            rows={1}
            disabled={chatState.isProcessing}
          />
          <Button
            type="submit"
            className="h-[48px] bg-black text-brutalist-yellow hover:bg-gray-800 brutalist-shadow"
            disabled={!input.trim() || chatState.isProcessing}
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </form>
    </div>
  );
}