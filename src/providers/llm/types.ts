/**
 * Interface for LLM providers
 * Defines the common methods that all LLM providers must implement
 */
export interface LLMProvider {
  /**
   * Unique identifier for the provider
   */
  id: string;
  
  /**
   * Display name for the provider
   */
  name: string;
  
  /**
   * Get available models from the provider
   * 
   * @returns Promise resolving to an array of model names
   */
  getModels(): Promise<string[]>;
  
  /**
   * Send a message to the LLM and get a response
   * 
   * @param message - The message to send
   * @param options - Provider-specific options (e.g., model name, temperature)
   * @returns Promise resolving to the LLM's response
   */
  sendMessage(message: string, options: any): Promise<string>;
  
  /**
   * Send a conversation to the LLM and get a response
   * 
   * @param messages - Array of chat messages representing the conversation
   * @param options - Provider-specific options (e.g., model name, temperature)
   * @returns Promise resolving to the LLM's response
   */
  sendConversation(messages: ChatMessage[], options: any): Promise<string>;
}

/**
 * Interface for chat messages
 */
export interface ChatMessage {
  /**
   * Unique identifier for the message
   */
  id: string;
  
  /**
   * Role of the message sender
   */
  role: 'user' | 'assistant' | 'system';
  
  /**
   * Content of the message
   */
  content: string;
  
  /**
   * Timestamp when the message was created
   */
  timestamp: string;
}

/**
 * Generates a unique ID for chat messages
 * 
 * @returns A unique string ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}
