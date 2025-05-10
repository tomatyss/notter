# Chat Integration with LLM Agents

This document provides an overview of the chat integration with LLM agents in the Notter application, including how to use it and how to extend it with new providers.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Using the Chat Interface](#using-the-chat-interface)
4. [Available Tools](#available-tools)
5. [Adding New Providers](#adding-new-providers)
6. [Adding New Tools](#adding-new-tools)
7. [Chat Persistence](#chat-persistence)

## Overview

The chat integration allows users to interact with LLM (Large Language Model) agents directly within the Notter application. Users can ask questions, get assistance with note-taking, and use various tools to enhance their note-taking workflow.

Key features include:
- Chat with different LLM providers (Ollama, with support for adding more)
- Create new notes from chat responses
- Update existing notes with chat content
- Search for notes using natural language
- Save chat conversations as notes for future reference

## Architecture

The chat integration is built with a modular architecture that allows for easy extension with new providers and tools. The main components are:

1. **LLM Providers**: Classes that implement the `LLMProvider` interface to communicate with different LLM backends.
2. **Provider Registry**: A registry that manages available providers and allows switching between them.
3. **Tools**: Classes that implement the `Tool` interface to provide specific functionality to the LLM.
4. **Tool Registry**: A registry that manages available tools and allows the LLM to use them.
5. **Chat UI**: React components that provide the user interface for the chat functionality.
6. **Chat Persistence**: Utilities for saving and loading chat conversations as notes.

## Using the Chat Interface

1. Click the chat icon button in the top-right corner of the application to open the chat panel.
2. Select a model from the dropdown menu (requires the corresponding provider to be running).
3. Type your message in the input field and press Enter or click the Send button.
4. Use the tools at the bottom of the chat panel to:
   - Create a new note from the assistant's response
   - Update the current note with the assistant's response
   - Search for notes using the assistant's response
   - Save the entire conversation as a note
   - Clear the chat history

## Available Tools

The following tools are available for the LLM to use:

1. **Create Note**: Creates a new note with content from the chat.
2. **Update Note**: Updates the currently selected note with content from the chat.
3. **Search Notes**: Searches for notes based on a query derived from the chat.

## Adding New Providers

The system is designed to be easily extensible with new LLM providers. To add a new provider, follow these steps:

1. **Create a new provider class** that implements the `LLMProvider` interface:

```typescript
// src/providers/llm/NewProvider.ts
import { LLMProvider, ChatMessage } from './types';

export class NewProvider implements LLMProvider {
  id = 'new-provider-id';
  name = 'New Provider Name';
  
  // Constructor with any necessary configuration
  constructor(config: any) {
    // Initialize the provider
  }
  
  // Implement required methods
  async getModels(): Promise<string[]> {
    // Return available models from this provider
    return ['model1', 'model2'];
  }
  
  async sendMessage(message: string, options: any): Promise<string> {
    // Send a single message to the LLM and return the response
    return 'Response from LLM';
  }
  
  async sendConversation(messages: ChatMessage[], options: any): Promise<string> {
    // Send a conversation to the LLM and return the response
    return 'Response from LLM';
  }
}
```

2. **Register the provider** in the provider registry:

```typescript
// src/providers/llm/ProviderRegistry.ts
import { NewProvider } from './NewProvider';

// In the initializeDefaultProviders method:
private initializeDefaultProviders(): void {
  // Existing providers
  const ollamaProvider = new OllamaProvider();
  this.registerProvider(ollamaProvider);
  
  // Add your new provider
  const newProvider = new NewProvider(/* config */);
  this.registerProvider(newProvider);
}
```

3. **Export the provider** in the index file:

```typescript
// src/providers/llm/index.ts
export * from './NewProvider';
```

### Example: Adding an Anthropic Provider

Here's an example of how to add an Anthropic provider:

```typescript
// src/providers/llm/AnthropicProvider.ts
import { LLMProvider, ChatMessage } from './types';

export class AnthropicProvider implements LLMProvider {
  id = 'anthropic';
  name = 'Anthropic';
  private apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async getModels(): Promise<string[]> {
    // Return available Anthropic models
    return ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'];
  }
  
  async sendMessage(message: string, options: { model: string }): Promise<string> {
    // Implementation to send a message to Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: options.model,
        messages: [{ role: 'user', content: message }],
        max_tokens: 1000
      })
    });
    
    const data = await response.json();
    return data.content[0].text;
  }
  
  async sendConversation(messages: ChatMessage[], options: { model: string }): Promise<string> {
    // Convert our ChatMessage format to Anthropic's format
    const anthropicMessages = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));
    
    // Implementation to send a conversation to Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: options.model,
        messages: anthropicMessages,
        max_tokens: 1000
      })
    });
    
    const data = await response.json();
    return data.content[0].text;
  }
}
```

Then register it in the provider registry:

```typescript
// In ProviderRegistry.ts
private initializeDefaultProviders(): void {
  // Add Ollama provider
  const ollamaProvider = new OllamaProvider();
  this.registerProvider(ollamaProvider);
  
  // Add Anthropic provider (if API key is available)
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    const anthropicProvider = new AnthropicProvider(apiKey);
    this.registerProvider(anthropicProvider);
  }
}
```

## Adding New Tools

To add a new tool for the LLM to use, follow these steps:

1. **Create a new tool** that implements the `Tool` interface:

```typescript
// src/tools/newTool.ts
import { Tool } from './types';

export const newTool: Tool = {
  id: 'new-tool-id',
  name: 'New Tool Name',
  description: 'Description of what the tool does',
  
  async execute(params: any): Promise<any> {
    // Implementation of the tool functionality
    return { result: 'Tool execution result' };
  }
};
```

2. **Register the tool** in the tool registry:

```typescript
// src/tools/index.ts
import { newTool } from './newTool';

// Register the tool with the registry
defaultToolRegistry.registerTool(newTool);
```

## Chat Persistence

Chat conversations can be saved as notes for future reference. The system provides utilities for converting between chat format and markdown notes:

- `chatToMarkdown`: Converts a chat conversation to a markdown note.
- `markdownToChat`: Parses a markdown note to extract a chat conversation.
- `isChatNote`: Checks if a note contains a chat conversation.

These utilities are used by the chat interface to save and load chat conversations.

Example of a saved chat note:

```markdown
# Chat with llama3.1 - 2025-05-09

#chat #llama3.1

**User**: What is the capital of France?

**Assistant**: The capital of France is Paris. It's not only the capital but also the largest city in France, known for landmarks like the Eiffel Tower, the Louvre Museum, and Notre-Dame Cathedral.

**User**: Can you tell me more about its history?

**Assistant**: Paris has a rich and fascinating history that spans over 2,000 years. Here's a brief overview:

1. **Ancient Origins**: Paris was originally a settlement of the Parisii, a Celtic tribe, around 250 BC. They settled on the Île de la Cité, an island in the Seine River.

2. **Roman Period**: The Romans conquered the area in 52 BC and established a city called Lutetia. Roman ruins can still be found in the city today.

3. **Medieval Paris**: By the 12th century, Paris had become the political, economic, and cultural capital of France. The construction of Notre-Dame Cathedral began in 1163.

4. **Renaissance**: During the 16th century, Paris flourished as a center of art, architecture, and learning. The Louvre palace was expanded during this time.

5. **French Revolution**: Paris was the center of the French Revolution (1789-1799), which overthrew the monarchy and established a republic.

6. **Haussmann's Renovation**: In the mid-19th century, Napoleon III and Baron Haussmann transformed Paris with wide boulevards, parks, and distinctive apartment buildings that define the city's look today.

7. **Belle Époque**: The late 19th and early 20th centuries were known as the "Beautiful Era," a time of peace, prosperity, and cultural innovation.

8. **World Wars**: Paris was occupied by Germany during World War II from 1940 to 1944.

9. **Modern Era**: After the war, Paris rebuilt and continued to develop as a global center of art, fashion, gastronomy, and culture.

Throughout its history, Paris has been a center of intellectual thought, artistic movements, and political revolutions that have influenced the world.
```

This note can be loaded back into the chat interface to continue the conversation.
