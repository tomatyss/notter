import React from 'react';
import { format } from 'date-fns';
import { Note } from '../../types';
import { BackButton } from '../common';

/**
 * Props for the NoteHeader component
 */
interface NoteHeaderProps {
  /**
   * The note to display
   */
  note: Note;
  
  /**
   * Whether the title is being renamed
   */
  isRenamingTitle: boolean;
  
  /**
   * Whether the path is being edited
   */
  isEditingPath: boolean;
  
  /**
   * The edited title value
   */
  editedTitle: string;
  
  /**
   * The edited path value
   */
  editedPath: string;
  
  /**
   * Whether the note is being saved
   */
  isSaving: boolean;
  
  /**
   * Callback when title is changed
   */
  onTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  
  /**
   * Callback when path is changed
   */
  onPathChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  
  /**
   * Callback when title input loses focus
   */
  onTitleBlur: () => void;
  
  /**
   * Callback when path input loses focus
   */
  onPathBlur: () => void;
  
  /**
   * Callback when key is pressed in title input
   */
  onTitleKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  
  /**
   * Callback when key is pressed in path input
   */
  onPathKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  
  /**
   * Callback when title is double-clicked
   */
  onTitleDoubleClick: () => void;
  
  /**
   * Callback when path is double-clicked
   */
  onPathDoubleClick: () => void;
  
  /**
   * Callback when a tag is clicked
   */
  onTagClick?: (tag: string) => void;
  
  /**
   * Whether the back button should be shown
   */
  showBackButton?: boolean;
  
  /**
   * Whether the back button is disabled
   */
  backButtonDisabled?: boolean;
  
  /**
   * Callback when back button is clicked
   */
  onBackClick?: () => void;
  
  /**
   * Tooltip text for the back button
   */
  backButtonTooltip?: string;
}

/**
 * Component for displaying the header of a note, including title, metadata, and tags
 * 
 * @param props Component props
 * @returns Note header UI component
 */
export const NoteHeader: React.FC<NoteHeaderProps> = ({
  note,
  isRenamingTitle,
  isEditingPath,
  editedTitle,
  editedPath,
  isSaving,
  onTitleChange,
  onPathChange,
  onTitleBlur,
  onPathBlur,
  onTitleKeyPress,
  onPathKeyPress,
  onTitleDoubleClick,
  onPathDoubleClick,
  onTagClick,
  showBackButton = false,
  backButtonDisabled = false,
  onBackClick,
  backButtonTooltip
}) => {
  return (
    <div className="note-header">
      {/* Title (editable or display) */}
      {isRenamingTitle ? (
        <div className="note-title-edit">
          <input
            type="text"
            value={editedTitle}
            onChange={onTitleChange}
            onBlur={onTitleBlur}
            onKeyDown={onTitleKeyPress}
            className="title-input"
            autoFocus
          />
          {isSaving && <span className="autosave-indicator">Saving...</span>}
        </div>
      ) : (
        <div className="note-title-container">
          {/* Back Button */}
          {showBackButton && (
            <BackButton
              disabled={backButtonDisabled}
              onClick={onBackClick}
              tooltip={backButtonTooltip}
              size="medium"
              className="note-header-back-button"
            />
          )}
          
          <h1 
            className="note-title editable" 
            onDoubleClick={onTitleDoubleClick}
            title="Double-click to edit"
          >
            {note.title}
          </h1>
        </div>
      )}
      
      {/* Note metadata */}
      <div className="note-meta">
        {/* Creation and modification dates */}
        <div className="note-dates">
          <span className="note-date">
            Created: {format(new Date(note.created), 'MMM d, yyyy h:mm a')}
          </span>
          <span className="note-date">
            Modified: {format(new Date(note.modified), 'MMM d, yyyy h:mm a')}
          </span>
        </div>
        
        {/* Path (editable or display) */}
        {isEditingPath ? (
          <div className="note-path-edit">
            <span className="path-label">Path:</span>
            <input
              type="text"
              value={editedPath}
              onChange={onPathChange}
              onBlur={onPathBlur}
              onKeyDown={onPathKeyPress}
              className="path-input"
              autoFocus
            />
            {isSaving && <span className="autosave-indicator">Saving...</span>}
          </div>
        ) : (
          <div 
            className="note-path editable" 
            onDoubleClick={onPathDoubleClick}
            title="Double-click to edit"
          >
            <span className="path-label">Path:</span> {note.path}
          </div>
        )}
        
        {/* Tags */}
        {note.tags.length > 0 && (
          <div className="note-tags">
            {note.tags.map(tag => (
              <span 
                key={tag} 
                className="note-tag clickable"
                onClick={() => onTagClick && onTagClick(tag)}
                title="Click to filter by this tag"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
