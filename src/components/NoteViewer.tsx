import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { invoke } from '@tauri-apps/api/core';
import { Note, NoteType } from '../types';

/**
 * Props for the NoteViewer component
 */
interface NoteViewerProps {
  /**
   * The note to display
   */
  note: Note | null;
  
  /**
   * Whether the component is in a loading state
   */
  loading: boolean;
  
  /**
   * Callback when note content is updated
   */
  onNoteContentUpdate?: (id: string, content: string) => void;
  
  /**
   * Callback when note is renamed
   */
  onNoteRename?: (id: string, newName: string) => void;
}

/**
 * Component for displaying and editing a note's content
 * 
 * @param props Component props
 * @returns Note viewer UI component
 */
export const NoteViewer: React.FC<NoteViewerProps> = ({ 
  note, 
  loading, 
  onNoteContentUpdate,
  onNoteRename
}) => {
  // State for edit mode
  const [isEditing, setIsEditing] = useState(false);
  // State for edited content
  const [editedContent, setEditedContent] = useState('');
  // State for edited title (for renaming)
  const [isRenamingTitle, setIsRenamingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  // State for saving status
  const [isSaving, setIsSaving] = useState(false);
  // State for error message
  const [error, setError] = useState<string | null>(null);
  
  // Reset states when note changes
  useEffect(() => {
    if (note) {
      setEditedContent(note.content);
      setEditedTitle(note.title);
    }
    setIsEditing(false);
    setIsRenamingTitle(false);
    setError(null);
  }, [note]);
  
  // Handle content changes
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedContent(e.target.value);
  };
  
  // Handle title changes
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedTitle(e.target.value);
  };
  
  // Save edited content
  const saveContent = async () => {
    if (!note) return;
    
    try {
      setIsSaving(true);
      setError(null);
      
      if (onNoteContentUpdate) {
        // Use the callback to update the note content
        onNoteContentUpdate(note.id, editedContent);
      } else {
        // Fallback to direct API call if no callback provided
        await invoke<Note>('update_note_content', {
          id: note.id,
          content: editedContent
        });
      }
      
      // Exit edit mode
      setIsEditing(false);
      setIsSaving(false);
    } catch (err) {
      setError(`Failed to save note: ${err}`);
      setIsSaving(false);
    }
  };
  
  // Save renamed title
  const saveTitle = async () => {
    if (!note) return;
    
    try {
      setIsSaving(true);
      setError(null);
      
      if (onNoteRename) {
        // Use the callback to rename the note
        onNoteRename(note.id, editedTitle);
      } else {
        // Fallback to direct API call if no callback provided
        await invoke<Note>('rename_note', {
          id: note.id,
          newName: editedTitle
        });
      }
      
      // Exit rename mode
      setIsRenamingTitle(false);
      setIsSaving(false);
    } catch (err) {
      setError(`Failed to rename note: ${err}`);
      setIsSaving(false);
    }
  };
  if (loading) {
    return (
      <div className="note-viewer loading">
        <div className="loading-indicator">Loading note...</div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="note-viewer empty">
        <div className="empty-state">
          <p>Select a note to view its content</p>
        </div>
      </div>
    );
  }

  return (
    <div className="note-viewer">
      <div className="note-header">
        {isRenamingTitle ? (
          <div className="note-title-edit">
            <input
              type="text"
              value={editedTitle}
              onChange={handleTitleChange}
              className="title-input"
              autoFocus
            />
            <div className="title-actions">
              <button 
                onClick={saveTitle}
                disabled={isSaving}
                className="save-button"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button 
                onClick={() => {
                  setIsRenamingTitle(false);
                  setEditedTitle(note.title);
                }}
                className="cancel-button"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="note-title-container">
            <h1 className="note-title">{note.title}</h1>
            <button 
              onClick={() => setIsRenamingTitle(true)}
              className="edit-title-button"
              title="Rename note"
            >
              Rename
            </button>
          </div>
        )}
        
        <div className="note-meta">
          <div className="note-dates">
            <span className="note-date">
              Created: {format(new Date(note.created), 'MMM d, yyyy h:mm a')}
            </span>
            <span className="note-date">
              Modified: {format(new Date(note.modified), 'MMM d, yyyy h:mm a')}
            </span>
          </div>
          {note.tags.length > 0 && (
            <div className="note-tags">
              {note.tags.map(tag => (
                <span key={tag} className="note-tag">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className="note-actions">
        {isEditing ? (
          <>
            <button 
              onClick={saveContent}
              disabled={isSaving}
              className="save-button"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button 
              onClick={() => {
                setIsEditing(false);
                setEditedContent(note.content);
              }}
              className="cancel-button"
            >
              Cancel
            </button>
          </>
        ) : (
          <button 
            onClick={() => setIsEditing(true)}
            className="edit-button"
          >
            Edit
          </button>
        )}
      </div>
      
      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)} className="dismiss-error">
            Dismiss
          </button>
        </div>
      )}
      
      <div className="note-content">
        {isEditing ? (
          <textarea
            value={editedContent}
            onChange={handleContentChange}
            className="content-editor"
            rows={20}
          />
        ) : note.file_type === NoteType.Markdown ? (
          <ReactMarkdown>{note.content}</ReactMarkdown>
        ) : (
          <pre className="plain-text-content">{note.content}</pre>
        )}
      </div>
    </div>
  );
};
