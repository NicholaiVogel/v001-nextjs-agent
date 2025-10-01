import OpenAI from 'openai';
import type { Message, ToolCall, ProjectContext, FileSystemNode } from './types';
import { getToolDefinitions, executeTool } from './tools';
import { ChatCompletionMessageFunctionToolCall } from 'openai/resources/index.mjs';
/**
 * ChatHandler - Handles all chat-related operations
 *
 * This class encapsulates the OpenAI integration and tool execution logic,
 * making it easy for AI developers to understand and extend the functionality.
 */
export class ChatHandler {
  private client: OpenAI;
  private model: string;
  constructor(aiGatewayUrl: string, apiKey: string, model: string) {
    this.client = new OpenAI({
      baseURL: aiGatewayUrl,
      apiKey: apiKey
    });
    console.log("BASE URL", aiGatewayUrl);
    this.model = model;
  }
  /**
   * Process a user message and generate AI response with optional tool usage
   */
  async processMessage(
    message: string,
    conversationHistory: Message[],
    context?: ProjectContext,
    onChunk?: (chunk: string) => void
  ): Promise<{
    content: string;
    toolCalls?: ToolCall[];
  }> {
    const messages = this.buildConversationMessages(message, conversationHistory, context);
    const toolDefinitions = await getToolDefinitions();
    if (onChunk) {
      // Use streaming with callback
      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages,
        tools: toolDefinitions,
        tool_choice: 'auto',
        max_tokens: 16000,
        stream: true,
        // reasoning_effort: 'low'
      });
      return this.handleStreamResponse(stream, message, conversationHistory, onChunk);
    }
    // Non-streaming response
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages,
      tools: toolDefinitions,
      tool_choice: 'auto',
      max_tokens: 16000,
      stream: false
    });
    return this.handleNonStreamResponse(completion, message, conversationHistory);
  }
  private async handleStreamResponse(
    stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>,
    message: string,
    conversationHistory: Message[],
    onChunk: (chunk: string) => void
  ) {
    let fullContent = '';
    const accumulatedToolCalls: ChatCompletionMessageFunctionToolCall[] = [];
    try {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (delta?.content) {
          fullContent += delta.content;
          onChunk(delta.content);
        }
        // Accumulate tool calls from streaming chunks
        if (delta?.tool_calls) {
          for (let i = 0; i < delta.tool_calls.length; i++) {
            const deltaToolCall = delta.tool_calls[i];
            if (!accumulatedToolCalls[i]) {
              accumulatedToolCalls[i] = {
                id: deltaToolCall.id || `tool_${Date.now()}_${i}`,
                type: 'function',
                function: {
                  name: deltaToolCall.function?.name || '',
                  arguments: deltaToolCall.function?.arguments || ''
                }
              };
            } else {
              // Append to existing tool call
              if (deltaToolCall.function?.name && !accumulatedToolCalls[i].function.name) {
                accumulatedToolCalls[i].function.name = deltaToolCall.function.name;
              }
              if (deltaToolCall.function?.arguments) {
                accumulatedToolCalls[i].function.arguments += deltaToolCall.function.arguments;
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Stream processing error:', error);
      throw new Error('Stream processing failed');
    }
    if (accumulatedToolCalls.length > 0) {
      const executedTools = await this.executeToolCalls(accumulatedToolCalls);
      const finalResponse = await this.generateToolResponse(message, conversationHistory, accumulatedToolCalls, executedTools);
      return { content: finalResponse, toolCalls: executedTools };
    }
    return { content: fullContent };
  }
  private async handleNonStreamResponse(
    completion: OpenAI.Chat.Completions.ChatCompletion,
    message: string,
    conversationHistory: Message[]
  ) {
    const responseMessage = completion.choices[0]?.message;
    if (!responseMessage) {
      return { content: 'I apologize, but I encountered an issue processing your request.' };
    }
    if (!responseMessage.tool_calls) {
      return {
        content: responseMessage.content || 'I apologize, but I encountered an issue.'
      };
    }
    const toolCalls = await this.executeToolCalls(responseMessage.tool_calls as ChatCompletionMessageFunctionToolCall[]);
    const finalResponse = await this.generateToolResponse(
      message,
      conversationHistory,
      responseMessage.tool_calls,
      toolCalls
    );
    return { content: finalResponse, toolCalls };
  }
  /**
   * Execute all tool calls from OpenAI response
   */
  private async executeToolCalls(openAiToolCalls: ChatCompletionMessageFunctionToolCall[]): Promise<ToolCall[]> {
    return Promise.all(
      openAiToolCalls.map(async (tc) => {
        try {
          const args = tc.function.arguments ? JSON.parse(tc.function.arguments) : {};
          const result = await executeTool(tc.function.name, args);
          return {
            id: tc.id,
            name: tc.function.name,
            arguments: args,
            result
          };
        } catch (error) {
          console.error(`Tool execution failed for ${tc.function.name}:`, error);
          return {
            id: tc.id,
            name: tc.function.name,
            arguments: {},
            result: { error: `Failed to execute ${tc.function.name}: ${error instanceof Error ? error.message : 'Unknown error'}` }
          };
        }
      })
    );
  }
  /**
   * Generate final response after tool execution
   */
  private async generateToolResponse(
    userMessage: string,
    history: Message[],
    openAiToolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[],
    toolResults: ToolCall[]
  ): Promise<string> {
    const followUpCompletion = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: 'You are a helpful AI assistant. Respond naturally to the tool results.' },
        ...history.slice(-3).map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage },
        {
          role: 'assistant',
          content: null,
          tool_calls: openAiToolCalls
        },
        ...toolResults.map((result, index) => ({
          role: 'tool' as const,
          content: JSON.stringify(result.result),
          tool_call_id: openAiToolCalls[index]?.id || result.id
        }))
      ],
      max_tokens: 16000
    });
    return followUpCompletion.choices[0]?.message?.content || 'Tool results processed successfully.';
  }
  private formatFileTree(nodes: FileSystemNode[], prefix = ''): string {
    let treeString = '';
    nodes.forEach((node, index) => {
      const isLast = index === nodes.length - 1;
      const linePrefix = prefix + (isLast ? '└── ' : '├── ');
      treeString += `${linePrefix}${node.name}\n`;
      if (node.type === 'directory' && node.children) {
        const childPrefix = prefix + (isLast ? '    ' : '│   ');
        treeString += this.formatFileTree(node.children, childPrefix);
      }
    });
    return treeString;
  }
  private buildContextString(context: ProjectContext): string {
    let contextString = '### PROJECT CONTEXT ###\n\n';
    contextString += 'File Structure:\n```\n';
    contextString += this.formatFileTree(context.fileTree);
    contextString += '```\n\n';
    if (Object.keys(context.fileContents).length > 0) {
      contextString += 'Currently Open/Active File Contents:\n';
      for (const [path, content] of Object.entries(context.fileContents)) {
        const lang = path.split('.').pop() || '';
        contextString += `\`\`\`${lang} // ${path}\n${content}\n\`\`\`\n\n`;
      }
    }
    return contextString;
  }
  /**
   * Build conversation messages for OpenAI API
   */
  private buildConversationMessages(userMessage: string, history: Message[], context?: ProjectContext) {
    const baseSystemPrompt = "You are 'Agent Brutale', a specialized coding agent. Your sole purpose is to build and modify web applications using a strict stack: Next.js, Tailwind CSS, and Shadcn/UI. You follow the BMAD (Blueprint, Model, Assemble, Deploy) method. You are direct, efficient, and your communication style is as raw and utilitarian as a Brutalist building. Provide only code, diffs, and necessary commands. No pleasantries. CRITICAL INSTRUCTIONS: 1. For EVERY code block you generate, whether for a new or existing file, you MUST include a comment on the first line with the relative file path, like this: `// src/components/NewComponent.tsx`. 2. As you progress, you MUST announce your current BMAD stage by outputting a comment on its own line, like this: `// BMAD_STAGE: ASSEMBLE`. The valid stages are BLUEPRINT, MODEL, ASSEMBLE, DEPLOY.";
    let systemPrompt = baseSystemPrompt;
    if (context && context.fileTree.length > 0) {
      systemPrompt += '\n\n' + this.buildContextString(context);
    }
    return [
      {
        role: 'system' as const,
        content: systemPrompt
      },
      ...history.slice(-5).map(m => ({
        role: m.role,
        content: m.content
      })),
      { role: 'user' as const, content: userMessage }
    ];
  }
  /**
   * Update the model for this chat handler
   */
  updateModel(newModel: string): void {
    this.model = newModel;
  }
}