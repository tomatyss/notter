import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { NoteType, Note, AppConfig } from '../types';

/**
 * Props for the NewNoteButton component
 */
interface NewNoteButtonProps {
  /**
   * Callback when a new note is created
   */
  onNoteCreated: (note: Note) => void;
  
  /**
   * Whether the component is in a loading state
   */
  disabled?: boolean;
}

/**
 * Component for creating a new note
 * 
 * @param props Component props
 * @returns New note button UI component
 */
export const NewNoteButton: React.FC<NewNoteButtonProps> = ({ 
  onNoteCreated,
  disabled = false
}) => {
  // State for modal visibility
  const [isModalOpen, setIsModalOpen] = useState(false);
  // State for new note title
  const [title, setTitle] = useState('');
  // State for new note type
  const [fileType, setFileType] = useState<NoteType>(NoteType.Markdown);
  // State for error message
  const [error, setError] = useState<string | null>(null);
  // State for loading
  const [isCreating, setIsCreating] = useState(false);
  // State for config
  const [config, setConfig] = useState<AppConfig | null>(null);
  
  // Load config when component mounts
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await invoke<AppConfig>('get_config');
        setConfig(config);
      } catch (err) {
        console.error('Failed to load configuration:', err);
      }
    };
    
    loadConfig();
  }, []);
  
  // Open the modal
  const handleOpenModal = () => {
    setIsModalOpen(true);
    setTitle('');
    setFileType(NoteType.Markdown);
    setError(null);
  };
  
  // Close the modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
  };
  
  // Handle title change
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };
  
  // Handle file type change
  const handleFileTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFileType(e.target.value as NoteType);
  };
  
  // Create a new note
  const handleCreateNote = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    
    try {
      setIsCreating(true);
      setError(null);
      
      // Use the naming pattern from config or default to "{number}-{title}.{extension}"
      const pattern = config?.note_naming_pattern || "{number}-{title}.{extension}";
      
      // Create the note
      const newNote = await invoke<Note>('create_note', {
        title: title.trim(),
        content: '', // Empty content
        fileType,
        pattern
      });
      
      // Call the callback
      onNoteCreated(newNote);
      
      // Close the modal
      setIsModalOpen(false);
      setIsCreating(false);
    } catch (err) {
      setError(`Failed to create note: ${err}`);
      setIsCreating(false);
    }
  };
  
  return (
    <>
      <button 
        className="new-note-button"
        onClick={handleOpenModal}
        disabled={disabled}
        title="Create a new note"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
      
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Create New Note</h2>
            
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}
            
            <div className="form-group">
              <label htmlFor="note-title">Title:</label>
              <input
                type="text"
                id="note-title"
                value={title}
                onChange={handleTitleChange}
                placeholder="Enter note title"
                autoFocus
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="note-type">Type:</label>
              <select
                id="note-type"
                value={fileType}
                onChange={handleFileTypeChange}
              >
                <option value={NoteType.Markdown}>Markdown</option>
                <option value={NoteType.PlainText}>Plain Text</option>
              </select>
            </div>
            
            <div className="modal-actions">
              <button 
                onClick={handleCloseModal}
                className="cancel-button"
                disabled={isCreating}
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateNote}
                className="create-button"
                disabled={isCreating}
              >
                {isCreating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
