import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Icon, IconName } from './common';
import { Note, NoteType, AppConfig } from '../types';
import './AddSubnoteButton.css';

/**
 * Props for the AddSubnoteButton component
 */
interface AddSubnoteButtonProps {
  /**
   * The current note being viewed
   */
  currentNote: Note;
  
  /**
   * Callback when a new subnote is created
   */
  onSubnoteCreated?: (note: Note) => void;
  
  /**
   * Whether the button is disabled
   */
  disabled?: boolean;
  
  /**
   * Additional CSS class names
   */
  className?: string;
}

/**
 * Smart button for adding subnotes with automatic ID calculation and premium interactions
 * 
 * @param props Component props
 * @returns AddSubnoteButton UI component
 */
export const AddSubnoteButton: React.FC<AddSubnoteButtonProps> = ({
  currentNote,
  onSubnoteCreated,
  disabled = false,
  className = ''
}) => {
  // State management
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestedId, setSuggestedId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [config, setConfig] = useState<AppConfig | null>(null);
  
  // Refs for animations and focus management
  const buttonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  
  // Load config on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const appConfig = await invoke<AppConfig>('get_config');
        setConfig(appConfig);
      } catch (err) {
        console.error('Failed to load configuration:', err);
      }
    };
    
    loadConfig();
  }, []);
  
  // Calculate suggested subnote ID when current note changes
  useEffect(() => {
    if (currentNote) {
      calculateSuggestedId();
    }
  }, [currentNote]);
  
  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + S for "Subnote"
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        if (!disabled && !isModalOpen) {
          handleOpenModal();
        }
      }
      
      // Escape to close modal
      if (e.key === 'Escape' && isModalOpen) {
        handleCloseModal();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [disabled, isModalOpen]);
  
  // Focus management for modal
  useEffect(() => {
    if (isModalOpen && titleInputRef.current) {
      // Small delay to ensure modal is rendered
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 100);
    }
  }, [isModalOpen]);
  
  /**
   * Calculates the next available subnote ID based on current note and existing subnotes
   */
  const calculateSuggestedId = async () => {
    try {
      // Extract the base ID from current note title
      const match = currentNote.title.match(/^(\d+(?:[a-z]\d*)*)/);
      if (!match) {
        setSuggestedId('1a');
        return;
      }
      
      const baseId = match[1];
      
      // Get existing subnotes to find the next available ID
      const subnotes = await invoke<any[]>('get_subnotes', {
        parentId: currentNote.id
      });
      
      // Calculate next ID in sequence
      const nextId = calculateNextSubnoteId(baseId, subnotes);
      setSuggestedId(nextId);
      
    } catch (err) {
      console.error('Failed to calculate suggested ID:', err);
      setSuggestedId('1a');
    }
  };
  
  /**
   * Calculates the next subnote ID in the Zettelkasten sequence
   */
  const calculateNextSubnoteId = (baseId: string, existingSubnotes: any[]): string => {
    // For a note like "1a", we want to find the next available "1a1", "1a2", etc.
    // For a note like "1", we want to find the next available "1a", "1b", etc.
    
    const existingIds = existingSubnotes.map(sub => {
      const match = sub.note.title.match(/^(\d+(?:[a-z]\d*)*)/);
      return match ? match[1] : '';
    }).filter(Boolean);
    
    // Determine if we're adding a letter suffix or number suffix
    const lastChar = baseId.charAt(baseId.length - 1);
    
    if (isNaN(parseInt(lastChar))) {
      // Last character is a letter, so add a number (e.g., "1a" -> "1a1")
      let nextNum = 1;
      while (existingIds.includes(`${baseId}${nextNum}`)) {
        nextNum++;
      }
      return `${baseId}${nextNum}`;
    } else {
      // Last character is a number, so add a letter (e.g., "1" -> "1a")
      let nextLetter = 'a';
      while (existingIds.includes(`${baseId}${nextLetter}`)) {
        nextLetter = String.fromCharCode(nextLetter.charCodeAt(0) + 1);
      }
      return `${baseId}${nextLetter}`;
    }
  };
  
  /**
   * Opens the subnote creation modal with animations
   */
  const handleOpenModal = () => {
    setIsModalOpen(true);
    setTitle('');
    setError(null);
    
    // Trigger button success animation
    if (buttonRef.current) {
      buttonRef.current.classList.add('button-activated');
      setTimeout(() => {
        buttonRef.current?.classList.remove('button-activated');
      }, 200);
    }
  };
  
  /**
   * Closes the modal and resets state
   */
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTitle('');
    setError(null);
  };
  
  /**
   * Creates the new subnote with the calculated ID
   */
  const handleCreateSubnote = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    
    try {
      setIsCreating(true);
      setError(null);
      
      // Create the full title with suggested ID
      const fullTitle = `${suggestedId}-${title.trim()}`;
      
      // Use the naming pattern from config or default
      const pattern = config?.note_naming_pattern || "{number}-{title}.{extension}";
      
      // Create the subnote
      const newNote = await invoke<Note>('create_note', {
        title: fullTitle,
        content: '', // Empty content initially
        fileType: config?.default_note_type || NoteType.Markdown,
        pattern
      });
      
      // Success animation
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 1000);
      
      // Call the callback
      if (onSubnoteCreated) {
        onSubnoteCreated(newNote);
      }
      
      // Close modal after brief delay
      setTimeout(() => {
        setIsModalOpen(false);
        setIsCreating(false);
      }, 500);
      
    } catch (err) {
      setError(`Failed to create subnote: ${err}`);
      setIsCreating(false);
    }
  };
  
  /**
   * Handles form submission
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleCreateSubnote();
  };
  
  return (
    <>
      <button
        ref={buttonRef}
        className={`add-subnote-button ${className} ${isSuccess ? 'success' : ''}`}
        onClick={handleOpenModal}
        disabled={disabled}
        title={`Add subnote (Ctrl+Shift+S)\nNext ID: ${suggestedId}`}
        aria-label={`Add subnote to ${currentNote.title}`}
      >
        <Icon 
          name={IconName.SubnoteAdd} 
          size={20}
          title="Add subnote"
        />
        <span className="button-text">Add Subnote</span>
        <span className="keyboard-hint">⌘⇧S</span>
      </button>
      
      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div 
            ref={modalRef}
            className="subnote-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Create Subnote</h3>
              <button
                className="close-button"
                onClick={handleCloseModal}
                aria-label="Close modal"
              >
                <Icon name={IconName.Close} size={16} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-content">
                {error && (
                  <div className="error-message" role="alert">
                    {error}
                  </div>
                )}
                
                <div className="id-preview">
                  <span className="id-label">Subnote ID:</span>
                  <span className="suggested-id">{suggestedId}</span>
                </div>
                
                <div className="form-group">
                  <label htmlFor="subnote-title">Title:</label>
                  <input
                    ref={titleInputRef}
                    type="text"
                    id="subnote-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter subnote title"
                    disabled={isCreating}
                    aria-describedby="title-help"
                  />
                  <small id="title-help" className="help-text">
                    Full title will be: <strong>{suggestedId}-{title || 'your-title'}</strong>
                  </small>
                </div>
              </div>
              
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="cancel-button"
                  disabled={isCreating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="create-button"
                  disabled={isCreating || !title.trim()}
                >
                  {isCreating ? (
                    <>
                      <span className="spinner"></span>
                      Creating...
                    </>
                  ) : (
                    'Create Subnote'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
