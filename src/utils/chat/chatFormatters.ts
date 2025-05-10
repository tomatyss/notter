import { ChatMessage, generateId } from '../../providers/llm/types';

/**
 * Convert a chat history to markdown format for saving as a note
 * 
 * @param messages - Array of chat messages
 * @param modelName - Name of the model used in the chat
 * @returns Markdown string representation of the chat
 */
export function chatToMarkdown(messages: ChatMessage[], modelName: string): string {
  const timestamp = new Date().toISOString().split('T')[0];
  let markdown = `# Chat with ${modelName} - ${timestamp}\n\n`;
  markdown += `#chat #${modelName.toLowerCase().replace(/\s+/g, '-')}\n\n`;
  
  for (const message of messages) {
    const role = message.role === 'user' ? 'User' : 'Assistant';
    markdown += `**${role}**: ${message.content}\n\n`;
  }
  
  return markdown;
}

/**
 * Parse a markdown note to extract chat history
 * 
 * @param markdown - Markdown content of the note
 * @returns Object containing the extracted messages and model name
 */
export function markdownToChat(markdown: string): {
  messages: ChatMessage[];
  modelName: string;
} {
  const lines = markdown.split('\n');
  const titleLine = lines[0];
  const modelMatch = titleLine.match(/Chat with (.*?) -/);
  const modelName = modelMatch ? modelMatch[1] : 'Unknown';
  
  const messages: ChatMessage[] = [];
  let currentRole: 'user' | 'assistant' | null = null;
  let currentContent = '';
  
  // Start from line 2 to skip the title and tags
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.startsWith('**User**:')) {
      // Save previous message if exists
      if (currentRole) {
        messages.push({
          id: generateId(),
          role: currentRole,
          content: currentContent.trim(),
          timestamp: new Date().toISOString()
        });
      }
      
      currentRole = 'user';
      currentContent = line.replace('**User**:', '').trim();
    } else if (line.startsWith('**Assistant**:')) {
      // Save previous message if exists
      if (currentRole) {
        messages.push({
          id: generateId(),
          role: currentRole,
          content: currentContent.trim(),
          timestamp: new Date().toISOString()
        });
      }
      
      currentRole = 'assistant';
      currentContent = line.replace('**Assistant**:', '').trim();
    } else {
      // Continue current message
      currentContent += '\n' + line;
    }
  }
  
  // Add the last message
  if (currentRole) {
    messages.push({
      id: generateId(),
      role: currentRole,
      content: currentContent.trim(),
      timestamp: new Date().toISOString()
    });
  }
  
  return { messages, modelName };
}

/**
 * Check if a note contains a chat history
 * 
 * @param content - Content of the note
 * @returns True if the note contains a chat history
 */
export function isChatNote(content: string): boolean {
  // Check if the note starts with a chat title
  const firstLine = content.split('\n')[0];
  return firstLine.startsWith('# Chat with ');
}
