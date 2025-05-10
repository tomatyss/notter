import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../../hooks/useChat';
import { ChatMessage } from '../../providers/llm/types';
import { defaultProviderRegistry } from '../../providers/llm/ProviderRegistry';
import { defaultToolRegistry } from '../../tools';
import { Icon, IconName } from '../../components/common';
import './ChatPanel.css';

/**
 * Props for the ChatPanel component
 */
interface ChatPanelProps {
  /**
   * Whether the chat panel is visible
   */
  isVisible: boolean;
  
  /**
   * Callback when the chat panel is closed
   */
  onClose: () => void;
  
  /**
   * The currently selected note (if any)
   */
  currentNote: any | null;
}

/**
 * Chat panel component
 * Displays the chat interface and handles interactions with the LLM
 * 
 * @param props Component props
 * @returns Chat panel UI component
 */
export const ChatPanel: React.FC<ChatPanelProps> = ({ 
  isVisible, 
  onClose,
  currentNote
}) => {
  // Use the chat hook
  const chat = useChat();
  
  // Local state
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chat.messages]);
  
  // Handle send message
  const handleSendMessage = async () => {
    if (!inputValue.trim() || chat.isLoading) return;
    
    await chat.sendMessage(inputValue);
    setInputValue('');
  };
  
  // Handle key press in input
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // Handle save chat
  const handleSaveChat = async () => {
    try {
      const note = await chat.saveChat();
      console.log('Chat saved as note:', note);
      // Could show a notification here
    } catch (error) {
      console.error('Failed to save chat:', error);
    }
  };
  
  // Handle create note tool
  const handleCreateNote = async () => {
    try {
      // Get the last assistant message
      const lastAssistantMessage = [...chat.messages]
        .reverse()
        .find(msg => msg.role === 'assistant');
      
      if (!lastAssistantMessage) {
        throw new Error('No assistant message to create note from');
      }
      
      // Execute the create note tool
      await chat.executeTool('create-note', {
        title: `Note from chat - ${new Date().toISOString().split('T')[0]}`,
        content: lastAssistantMessage.content
      });
      
      // Could show a notification here
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };
  
  // Handle update current note tool
  const handleUpdateCurrentNote = async () => {
    try {
      if (!currentNote) {
        throw new Error('No note selected');
      }
      
      // Get the last assistant message
      const lastAssistantMessage = [...chat.messages]
        .reverse()
        .find(msg => msg.role === 'assistant');
      
      if (!lastAssistantMessage) {
        throw new Error('No assistant message to update note with');
      }
      
      // Execute the update note tool
      await chat.executeTool('update-note', {
        id: currentNote.id,
        content: currentNote.content + '\n\n' + lastAssistantMessage.content
      });
      
      // Could show a notification here
    } catch (error) {
      console.error('Failed to update note:', error);
    }
  };
  
  // Handle search notes tool
  const handleSearchNotes = async () => {
    try {
      // Get the last assistant message
      const lastAssistantMessage = [...chat.messages]
        .reverse()
        .find(msg => msg.role === 'assistant');
      
      if (!lastAssistantMessage) {
        throw new Error('No assistant message to search with');
      }
      
      // Extract a search query from the assistant message
      // This is a simple approach - in a real app, you might want to
      // ask the user for a query or use NLP to extract keywords
      const query = lastAssistantMessage.content.split(' ').slice(0, 5).join(' ');
      
      // Execute the search notes tool
      const results = await chat.executeTool('search-notes', {
        query,
        limit: 5
      });
      
      // Add the results to the chat
      const resultsMessage = `Found ${results.length} notes matching "${query}":\n\n` +
        results.map((result: any, index: number) => 
          `${index + 1}. ${result.note.title}`
        ).join('\n');
      
      await chat.sendMessage(resultsMessage);
    } catch (error) {
      console.error('Failed to search notes:', error);
    }
  };
  
  // Render message
  const renderMessage = (message: ChatMessage) => {
    return (
      <div 
        key={message.id} 
        className={`chat-message ${message.role === 'user' ? 'user' : 'assistant'}`}
      >
        <div className="message-content">{message.content}</div>
        <div className="message-timestamp">
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    );
  };
  
  if (!isVisible) return null;
  
  return (
    <div className="chat-panel">
      <div className="chat-header">
        <h3>Chat</h3>
        <div className="model-selector">
          <select 
            value={chat.selectedModel} 
            onChange={e => chat.changeModel(e.target.value)}
            disabled={chat.isLoading || chat.availableModels.length === 0}
          >
            {chat.availableModels.length === 0 ? (
              <option value="">Loading models...</option>
            ) : (
              chat.availableModels.map(model => (
                <option key={model} value={model}>{model}</option>
              ))
            )}
          </select>
        </div>
        <button onClick={onClose} className="close-button" title="Close chat">
          <Icon name={IconName.Close} title="Close chat" />
        </button>
      </div>
      
      <div className="chat-messages">
        {chat.messages.length === 0 ? (
          <div className="empty-chat">
            <p>Start a conversation with the AI assistant</p>
          </div>
        ) : (
          chat.messages.map(renderMessage)
        )}
        {chat.isLoading && (
          <div className="loading-indicator">
            <div className="loading-dots">
              <div className="dot"></div>
              <div className="dot"></div>
              <div className="dot"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {chat.error && (
        <div className="chat-error">
          <p>{chat.error}</p>
          <button onClick={() => chat.clearChat()}>Clear Chat</button>
        </div>
      )}
      
      <div className="chat-tools">
        <button 
          onClick={handleCreateNote}
          disabled={chat.isLoading || chat.messages.length === 0}
          title="Create a new note from the last assistant message"
        >
          Create Note
        </button>
        <button 
          onClick={handleUpdateCurrentNote}
          disabled={chat.isLoading || chat.messages.length === 0 || !currentNote}
          title="Append the last assistant message to the current note"
        >
          Update Note
        </button>
        <button 
          onClick={handleSearchNotes}
          disabled={chat.isLoading || chat.messages.length === 0}
          title="Search notes using the last assistant message"
        >
          Search Notes
        </button>
        <button 
          onClick={handleSaveChat}
          disabled={chat.isLoading || chat.messages.length === 0}
          title="Save this conversation as a note"
        >
          Save Chat
        </button>
        <button 
          onClick={() => chat.clearChat()}
          disabled={chat.isLoading || chat.messages.length === 0}
          title="Clear the conversation"
        >
          Clear Chat
        </button>
      </div>
      
      <div className="chat-input">
        <textarea
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Type your message..."
          disabled={chat.isLoading}
        />
        <button 
          onClick={handleSendMessage}
          disabled={chat.isLoading || !inputValue.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
};
