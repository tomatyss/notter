// Import the browser-compatible version of Ollama
import { LLMProvider, ChatMessage } from './types';

// Define a minimal interface for the Ollama client
interface OllamaClient {
  list(): Promise<{ models: { name: string }[] }>;
  chat(params: { model: string; messages: { role: string; content: string }[] }): Promise<{ message: { content: string } }>;
}

// Create a browser-compatible Ollama client
class BrowserOllamaClient implements OllamaClient {
  private host: string;

  constructor(host: string) {
    this.host = host;
  }

  async list(): Promise<{ models: { name: string }[] }> {
    try {
      const response = await fetch(`${this.host}/api/tags`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return { models: data.models || [] };
    } catch (error) {
      console.error('Failed to fetch Ollama models:', error);
      return { models: [] };
    }
  }

  async chat(params: { model: string; messages: { role: string; content: string }[] }): Promise<{ message: { content: string } }> {
    try {
      const response = await fetch(`${this.host}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return { message: { content: data.message?.content || '' } };
    } catch (error) {
      console.error('Error sending message to Ollama:', error);
      throw new Error(`Failed to communicate with Ollama: ${error}`);
    }
  }
}

/**
 * Ollama LLM provider implementation
 * Communicates with a locally running Ollama instance
 */
export class OllamaProvider implements LLMProvider {
  /**
   * Unique identifier for the provider
   */
  id = 'ollama';
  
  /**
   * Display name for the provider
   */
  name = 'Ollama';
  
  /**
   * Custom Ollama client instance
   */
  private ollamaClient: OllamaClient;
  
  /**
   * Creates a new OllamaProvider instance
   * 
   * @param host - The host URL for the Ollama API (default: http://127.0.0.1:11434)
   */
  constructor(host = 'http://127.0.0.1:11434') {
    // Create a browser-compatible Ollama client
    this.ollamaClient = new BrowserOllamaClient(host);
  }
  
  /**
   * Get available models from Ollama
   * 
   * @returns Promise resolving to an array of model names
   */
  async getModels(): Promise<string[]> {
    try {
      const response = await this.ollamaClient.list();
      return response.models.map((model: any) => model.name);
    } catch (error) {
      console.error('Failed to fetch Ollama models:', error);
      return [];
    }
  }
  
  /**
   * Send a message to Ollama and get a response
   * 
   * @param message - The message to send
   * @param options - Provider-specific options (e.g., model name)
   * @returns Promise resolving to the LLM's response
   */
  async sendMessage(message: string, options: { model: string }): Promise<string> {
    try {
      const response = await this.ollamaClient.chat({
        model: options.model,
        messages: [{ role: 'user', content: message }],
      });
      
      return response.message.content;
    } catch (error) {
      console.error('Error sending message to Ollama:', error);
      throw new Error(`Failed to communicate with Ollama: ${error}`);
    }
  }
  
  /**
   * Send a conversation to Ollama and get a response
   * 
   * @param messages - Array of chat messages representing the conversation
   * @param options - Provider-specific options (e.g., model name)
   * @returns Promise resolving to the LLM's response
   */
  async sendConversation(messages: ChatMessage[], options: { model: string }): Promise<string> {
    try {
      // Convert our ChatMessage format to Ollama's format
      const ollamaMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      const response = await this.ollamaClient.chat({
        model: options.model,
        messages: ollamaMessages,
      });
      
      return response.message.content;
    } catch (error) {
      console.error('Error sending conversation to Ollama:', error);
      throw new Error(`Failed to communicate with Ollama: ${error}`);
    }
  }
}
