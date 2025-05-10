import { LLMProvider, ChatMessage } from './types';
import { GoogleGenAI } from '@google/genai';

/**
 * Google Gemini LLM provider implementation
 * Communicates with the Google Gemini API
 */
export class GeminiProvider implements LLMProvider {
  /**
   * Unique identifier for the provider
   */
  id = 'gemini';
  
  /**
   * Display name for the provider
   */
  name = 'Google Gemini';
  
  /**
   * Google Gemini client instance
   */
  private genAI: GoogleGenAI;
  
  /**
   * Creates a new GeminiProvider instance
   * 
   * @param apiKey - The API key for the Google Gemini API
   */
  constructor(apiKey: string) {
    this.genAI = new GoogleGenAI({ apiKey });
  }
  
  /**
   * Get available models from Google Gemini
   * 
   * @returns Promise resolving to an array of model names
   */
  async getModels(): Promise<string[]> {
    // Gemini currently offers these models
    return ['gemini-2.0-flash', 'gemini-2.0-pro', 'gemini-2.5-pro-preview-05-06'];
  }
  
  /**
   * Send a message to Google Gemini and get a response
   * 
   * @param message - The message to send
   * @param options - Provider-specific options (e.g., model name)
   * @returns Promise resolving to the LLM's response
   */
  async sendMessage(message: string, options: { model: string }): Promise<string> {
    try {
      const response = await this.genAI.models.generateContent({
        model: options.model,
        contents: message
      });
      
      return response.text || '';
    } catch (error) {
      console.error('Error sending message to Google Gemini:', error);
      throw new Error(`Failed to communicate with Google Gemini: ${error}`);
    }
  }
  
  /**
   * Send a conversation to Google Gemini and get a response
   * 
   * @param messages - Array of chat messages representing the conversation
   * @param options - Provider-specific options (e.g., model name)
   * @returns Promise resolving to the LLM's response
   */
  async sendConversation(messages: ChatMessage[], options: { model: string }): Promise<string> {
    try {
      // For chat functionality, we need to format the messages correctly
      const formattedMessages = messages.slice(0, -1).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));
      
      // Create a chat session
      const chat = this.genAI.chats.create({
        model: options.model,
        history: formattedMessages
      });
      
      // Send the last message and get the response
      const lastMessage = messages[messages.length - 1];
      const response = await chat.sendMessage({
        message: lastMessage.content
      });
      
      return response.text || '';
    } catch (error) {
      console.error('Error sending conversation to Google Gemini:', error);
      throw new Error(`Failed to communicate with Google Gemini: ${error}`);
    }
  }
}
