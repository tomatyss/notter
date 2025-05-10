import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ChatMessage, generateId } from '../providers/llm/types';
import { defaultProviderRegistry } from '../providers/llm/ProviderRegistry';
import { defaultToolRegistry } from '../tools';
import { chatToMarkdown, markdownToChat } from '../utils/chat';
import { Note, NoteType } from '../types';

/**
 * Interface for the chat state
 */
interface ChatState {
  /**
   * Array of chat messages
   */
  messages: ChatMessage[];
  
  /**
   * Whether a message is currently being sent
   */
  isLoading: boolean;
  
  /**
   * ID of the selected LLM provider
   */
  selectedProviderId: string;
  
  /**
   * Name of the selected model
   */
  selectedModel: string;
  
  /**
   * Array of available models for the selected provider
   */
  availableModels: string[];
  
  /**
   * Error message, if any
   */
  error: string | null;
}

/**
 * Custom hook for managing chat state and interactions
 * 
 * @param initialProviderId - Initial provider ID (default: 'ollama')
 * @returns Chat state and functions for interacting with the chat
 */
export function useChat(initialProviderId = 'ollama') {
  // Chat state
  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    selectedProviderId: initialProviderId,
    selectedModel: '',
    availableModels: [],
    error: null
  });
  
  // Load available models when the provider changes
  useEffect(() => {
    const loadModels = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        
        const provider = defaultProviderRegistry.getProvider(state.selectedProviderId);
        if (!provider) {
          throw new Error(`Provider ${state.selectedProviderId} not found`);
        }
        
        const models = await provider.getModels();
        
        setState(prev => ({
          ...prev,
          availableModels: models,
          selectedModel: models.length > 0 ? models[0] : '',
          isLoading: false
        }));
      } catch (error) {
        console.error('Error loading models:', error);
        setState(prev => ({
          ...prev,
          error: `Failed to load models: ${error}`,
          isLoading: false
        }));
      }
    };
    
    loadModels();
  }, [state.selectedProviderId]);
  
  /**
   * Send a message to the LLM
   * 
   * @param content - Content of the message to send
   */
  const sendMessage = useCallback(async (content: string) => {
    try {
      // Don't send empty messages
      if (!content.trim()) return;
      
      // Get the provider
      const provider = defaultProviderRegistry.getProvider(state.selectedProviderId);
      if (!provider) {
        throw new Error(`Provider ${state.selectedProviderId} not found`);
      }
      
      // Check if a model is selected
      if (!state.selectedModel) {
        throw new Error('No model selected');
      }
      
      // Create user message
      const userMessage: ChatMessage = {
        id: generateId(),
        role: 'user',
        content,
        timestamp: new Date().toISOString()
      };
      
      // Update state with user message and loading state
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, userMessage],
        isLoading: true,
        error: null
      }));
      
      // Send the conversation to the provider
      const messages = [
        ...state.messages,
        userMessage
      ];
      
      const response = await provider.sendConversation(messages, {
        model: state.selectedModel
      });
      
      // Create assistant message
      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString()
      };
      
      // Update state with assistant message
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isLoading: false
      }));
    } catch (error) {
      console.error('Error sending message:', error);
      setState(prev => ({
        ...prev,
        error: `Failed to send message: ${error}`,
        isLoading: false
      }));
    }
  }, [state.selectedProviderId, state.selectedModel, state.messages]);
  
  /**
   * Change the selected provider
   * 
   * @param providerId - ID of the provider to select
   */
  const changeProvider = useCallback((providerId: string) => {
    setState(prev => ({
      ...prev,
      selectedProviderId: providerId,
      selectedModel: '',
      availableModels: []
    }));
  }, []);
  
  /**
   * Change the selected model
   * 
   * @param model - Name of the model to select
   */
  const changeModel = useCallback((model: string) => {
    setState(prev => ({
      ...prev,
      selectedModel: model
    }));
  }, []);
  
  /**
   * Clear the chat history
   */
  const clearChat = useCallback(() => {
    setState(prev => ({
      ...prev,
      messages: [],
      error: null
    }));
  }, []);
  
  /**
   * Save the chat history as a note
   * 
   * @returns Promise resolving to the created note
   */
  const saveChat = useCallback(async (): Promise<Note> => {
    try {
      // Don't save empty chats
      if (state.messages.length === 0) {
        throw new Error('Cannot save empty chat');
      }
      
      // Convert chat to markdown
      const markdown = chatToMarkdown(state.messages, state.selectedModel);
      
      // Create a new note with the chat content
      const title = `Chat with ${state.selectedModel} - ${new Date().toISOString().split('T')[0]}`;
      
      const note = await invoke<Note>('create_note', {
        title,
        content: markdown,
        fileType: NoteType.Markdown,
        pattern: null
      });
      
      return note;
    } catch (error) {
      console.error('Error saving chat:', error);
      setState(prev => ({
        ...prev,
        error: `Failed to save chat: ${error}`
      }));
      throw error;
    }
  }, [state.messages, state.selectedModel]);
  
  /**
   * Load a chat history from a note
   * 
   * @param noteContent - Content of the note containing the chat history
   */
  const loadChat = useCallback((noteContent: string) => {
    try {
      // Parse the note content to extract chat history
      const { messages, modelName } = markdownToChat(noteContent);
      
      // Update state with the loaded chat
      setState(prev => ({
        ...prev,
        messages,
        selectedModel: modelName,
        error: null
      }));
    } catch (error) {
      console.error('Error loading chat:', error);
      setState(prev => ({
        ...prev,
        error: `Failed to load chat: ${error}`
      }));
    }
  }, []);
  
  /**
   * Execute a tool
   * 
   * @param toolId - ID of the tool to execute
   * @param params - Parameters for the tool
   * @returns Promise resolving to the result of the tool execution
   */
  const executeTool = useCallback(async (toolId: string, params: any) => {
    try {
      const tool = defaultToolRegistry.getTool(toolId);
      if (!tool) {
        throw new Error(`Tool ${toolId} not found`);
      }
      
      return await tool.execute(params);
    } catch (error) {
      console.error(`Error executing tool ${toolId}:`, error);
      setState(prev => ({
        ...prev,
        error: `Failed to execute tool: ${error}`
      }));
      throw error;
    }
  }, []);
  
  return {
    // State
    messages: state.messages,
    isLoading: state.isLoading,
    selectedProviderId: state.selectedProviderId,
    selectedModel: state.selectedModel,
    availableModels: state.availableModels,
    error: state.error,
    
    // Actions
    sendMessage,
    changeProvider,
    changeModel,
    clearChat,
    saveChat,
    loadChat,
    executeTool
  };
}
