import React, { useState, useEffect, useRef } from 'react';
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
  // Refs for autosave timers
  const contentAutosaveTimerRef = useRef<number | null>(null);
  const titleAutosaveTimerRef = useRef<number | null>(null);
  // Refs for content and title elements
  const contentRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  
  // Reset states when note changes
  useEffect(() => {
    if (note) {
      setEditedContent(note.content);
      setEditedTitle(note.title);
    }
    setIsEditing(false);
    setIsRenamingTitle(false);
    setError(null);
    
    // Clear any pending autosave timers
    if (contentAutosaveTimerRef.current) {
      clearTimeout(contentAutosaveTimerRef.current);
    }
    if (titleAutosaveTimerRef.current) {
      clearTimeout(titleAutosaveTimerRef.current);
    }
  }, [note]);
  
  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (contentAutosaveTimerRef.current) {
        clearTimeout(contentAutosaveTimerRef.current);
      }
      if (titleAutosaveTimerRef.current) {
        clearTimeout(titleAutosaveTimerRef.current);
      }
    };
  }, []);
  
  // Handle content changes - only save on blur, not during typing
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setEditedContent(newContent);
    
    // Clear any existing timer to prevent autosave during content editing
    if (contentAutosaveTimerRef.current) {
      clearTimeout(contentAutosaveTimerRef.current);
    }
  };
  
  // Handle title changes - only save on blur, not during typing
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setEditedTitle(newTitle);
    
    // Clear any existing timer to prevent autosave during title editing
    if (titleAutosaveTimerRef.current) {
      clearTimeout(titleAutosaveTimerRef.current);
    }
  };
  
  // Handle double click on content to edit
  const handleContentDoubleClick = () => {
    if (!isEditing && !loading && note) {
      setIsEditing(true);
    }
  };
  
  // Handle double click on title to rename
  const handleTitleDoubleClick = () => {
    if (!isRenamingTitle && !loading && note) {
      setIsRenamingTitle(true);
    }
  };
  
  // Save edited content
  const saveContent = async (content = editedContent) => {
    if (!note) return;
    
    try {
      setIsSaving(true);
      setError(null);
      
      if (onNoteContentUpdate) {
        // Use the callback to update the note content
        await onNoteContentUpdate(note.id, content);
      } else {
        // Fallback to direct API call if no callback provided
        await invoke<Note>('update_note_content', {
          id: note.id,
          content: content
        });
      }
      
      setIsSaving(false);
    } catch (err) {
      setError(`Failed to save note: ${err}`);
      setIsSaving(false);
    }
  };
  
  // Save renamed title
  const saveTitle = async (title = editedTitle) => {
    if (!note) return;
    
    try {
      setIsSaving(true);
      setError(null);
      
      if (onNoteRename) {
        // Use the callback to rename the note
        await onNoteRename(note.id, title);
      } else {
        // Fallback to direct API call if no callback provided
        await invoke<Note>('rename_note', {
          id: note.id,
          newName: title
        });
      }
      
      setIsSaving(false);
    } catch (err) {
      setError(`Failed to rename note: ${err}`);
      setIsSaving(false);
    }
  };
  
  // Handle blur events to exit edit mode and save
  const handleContentBlur = () => {
    // Save the content when the textarea loses focus
    saveContent();
    // Exit edit mode after saving
    setIsEditing(false);
  };
  
  // Handle key press in content textarea
  const handleContentKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Check for Ctrl+Enter or Cmd+Enter to save and exit
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      saveContent();
      setIsEditing(false);
    }
    // Cancel on Escape key
    else if (e.key === 'Escape') {
      e.preventDefault();
      setEditedContent(note?.content || '');
      setIsEditing(false);
    }
  };
  
  // Handle blur events to exit rename mode and save
  const handleTitleBlur = () => {
    // Save the title when the input loses focus
    saveTitle();
    // Exit rename mode after saving
    setIsRenamingTitle(false);
  };
  
  // Handle key press in title input
  const handleTitleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Save and exit on Enter key
    if (e.key === 'Enter') {
      saveTitle();
      setIsRenamingTitle(false);
    }
    // Cancel on Escape key
    else if (e.key === 'Escape') {
      setEditedTitle(note?.title || '');
      setIsRenamingTitle(false);
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
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyPress}
              className="title-input"
              autoFocus
            />
            {isSaving && <span className="autosave-indicator">Saving...</span>}
          </div>
        ) : (
          <div className="note-title-container">
            <h1 
              className="note-title editable" 
              onDoubleClick={handleTitleDoubleClick}
              ref={titleRef}
              title="Double-click to edit"
            >
              {note.title}
            </h1>
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
      
      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)} className="dismiss-error">
            Dismiss
          </button>
        </div>
      )}
      
      <div 
        className="note-content" 
        onDoubleClick={handleContentDoubleClick}
        ref={contentRef}
        title="Double-click to edit"
        style={{ display: 'flex', flexDirection: 'column', flex: 1 }}
      >
        {isEditing ? (
          <div className="editor-container">
            <textarea
              value={editedContent}
              onChange={handleContentChange}
              onBlur={handleContentBlur}
              onKeyDown={handleContentKeyDown}
              className="content-editor"
              autoFocus
            />
            {isSaving && <span className="autosave-indicator">Saving...</span>}
          </div>
        ) : note.file_type === NoteType.Markdown ? (
          <div className="markdown-content editable">
            <ReactMarkdown>{note.content}</ReactMarkdown>
          </div>
        ) : (
          <pre className="plain-text-content editable">{note.content}</pre>
        )}
      </div>
    </div>
  );
};
