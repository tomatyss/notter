import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { Note, NoteType, NoteSummary } from '../types';
import { FindReplacePanel, FindOptions } from './FindReplacePanel';
import { 
  useNoteEditing, 
  useFindReplace, 
  useBacklinks, 
  useKeyboardShortcuts 
} from '../hooks/noteViewerHooks';
import { 
  NoteHeader, 
  NoteContent, 
  BacklinksSection 
} from './noteViewer/';
import { 
  findTextInContent, 
  scrollToMatch, 
  escapeRegExp, 
  getTextNodesIn 
} from '../utils/textUtils';

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
  
  /**
   * Callback when note path is changed
   */
  onNotePathChange?: (id: string, newPath: string) => void;
  
  /**
   * Callback when a tag is clicked
   */
  onTagClick?: (tag: string) => void;
  
  /**
   * Callback when a note is selected
   */
  onSelectNote?: (id: string) => void;
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
  onNoteRename,
  onNotePathChange,
  onTagClick,
  onSelectNote
}) => {
  // Content ref for scrolling and highlighting
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Get editing functionality from custom hook
  const {
    isEditing, setIsEditing,
    isRenamingTitle, setIsRenamingTitle,
    isEditingPath, setIsEditingPath,
    editedContent, setEditedContent,
    editedTitle, setEditedTitle,
    editedPath, setEditedPath,
    isSaving,
    error, setError,
    handleContentChange,
    handleTitleChange,
    handlePathChange,
    handleContentDoubleClick,
    handleTitleDoubleClick,
    handlePathDoubleClick,
    handleContentBlur,
    handleTitleBlur,
    handlePathBlur,
    handleContentKeyDown,
    handleTitleKeyPress,
    handlePathKeyPress,
    saveContent,
    saveTitle,
    savePath
  } = useNoteEditing(note, onNoteContentUpdate, onNoteRename, onNotePathChange);
  
  // Get find/replace functionality from custom hook
  const {
    findReplaceVisible, setFindReplaceVisible,
    matches, setMatches,
    currentMatchIndex, setCurrentMatchIndex,
    lastSearchText, setLastSearchText,
    lastSearchOptions, setLastSearchOptions,
    handleFindTextInContent,
    handleFindNextMatch,
    handleFindPreviousMatch,
    handleReplaceMatch,
    handleReplaceAllMatches
  } = useFindReplace(note, contentRef, isEditing);
  
  // Get backlinks functionality from custom hook
  const {
    backlinks,
    backlinksLoading
  } = useBacklinks(note);
  
  // Set up keyboard shortcuts
  useKeyboardShortcuts({
    note,
    findReplaceVisible,
    setFindReplaceVisible,
    matches,
    handleFindNextMatch,
    handleFindPreviousMatch
  });
  
  /**
   * Handles note link click
   * 
   * @param noteTitle The title of the note to navigate to
   */
  const handleNoteLinkClick = async (noteTitle: string) => {
    if (!onSelectNote) return;
    
    try {
      setError(null);
      
      // Find the note by title
      const noteId = await invoke<string | null>('find_note_by_title', { title: noteTitle });
      
      if (noteId) {
        // Navigate to the linked note
        onSelectNote(noteId);
      } else {
        setError(`Note "${noteTitle}" not found`);
      }
    } catch (err) {
      setError(`Failed to navigate to note: ${err}`);
    }
  };
  
  /**
   * Opens a URL in the default browser
   * 
   * @param url The URL to open
   */
  const handleExternalLinkClick = async (url: string) => {
    try {
      await openUrl(url);
    } catch (err) {
      setError(`Failed to open link: ${err}`);
    }
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="note-viewer loading">
        <div className="loading-indicator">Loading note...</div>
      </div>
    );
  }

  // Empty state
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
      {/* Find and Replace Panel */}
      <FindReplacePanel
        isVisible={findReplaceVisible}
        onClose={() => setFindReplaceVisible(false)}
        onFind={handleFindTextInContent}
        onFindNext={handleFindNextMatch}
        onFindPrevious={handleFindPreviousMatch}
        onReplace={handleReplaceMatch}
        onReplaceAll={handleReplaceAllMatches}
        totalMatches={matches.length}
        currentMatchIndex={currentMatchIndex}
      />
      
      {/* Note Header */}
      <NoteHeader
        note={note}
        isRenamingTitle={isRenamingTitle}
        isEditingPath={isEditingPath}
        editedTitle={editedTitle}
        editedPath={editedPath}
        isSaving={isSaving}
        onTitleChange={handleTitleChange}
        onPathChange={handlePathChange}
        onTitleBlur={handleTitleBlur}
        onPathBlur={handlePathBlur}
        onTitleKeyPress={handleTitleKeyPress}
        onPathKeyPress={handlePathKeyPress}
        onTitleDoubleClick={handleTitleDoubleClick}
        onPathDoubleClick={handlePathDoubleClick}
        onTagClick={onTagClick}
      />
      
      {/* Error Message */}
      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)} className="dismiss-error">
            Dismiss
          </button>
        </div>
      )}
      
      <div className="note-viewer-content" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Note Content */}
        <NoteContent
          note={note}
          isEditing={isEditing}
          editedContent={editedContent}
          isSaving={isSaving}
          contentRef={contentRef}
          matches={matches}
          currentMatchIndex={currentMatchIndex}
          lastSearchText={lastSearchText}
          onContentChange={handleContentChange}
          onContentBlur={handleContentBlur}
          onContentKeyDown={handleContentKeyDown}
          onContentDoubleClick={handleContentDoubleClick}
          onNoteLinkClick={handleNoteLinkClick}
          onExternalLinkClick={handleExternalLinkClick}
        />
        
        {/* Backlinks Section */}
        <BacklinksSection
          backlinks={backlinks}
          backlinksLoading={backlinksLoading}
          onSelectNote={onSelectNote}
        />
      </div>
    </div>
  );
};

// Export sub-components for direct use if needed
export * from './noteViewer/';
