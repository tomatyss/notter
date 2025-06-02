import React, { useRef, Suspense, lazy } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { Note } from '../types';
import { 
  useNoteEditing, 
  useFindReplace, 
  useKeyboardShortcuts 
} from '../hooks/noteViewerHooks';
import { useOptimizedBacklinks } from '../hooks/useOptimizedBacklinks';
import { NoteHeader } from './noteViewer/NoteHeader';
import { NoteContent } from './noteViewer/NoteContent';

// Lazy load components that aren't needed immediately
const FindReplacePanel = lazy(() => import('./FindReplacePanel').then(module => ({
  default: module.FindReplacePanel
})));

const BacklinksSection = lazy(() => import('./noteViewer/BacklinksSection').then(module => ({
  default: module.BacklinksSection
})));

const SubnotesSection = lazy(() => import('./noteViewer/SubnotesSection').then(module => ({
  default: module.SubnotesSection
})));

/**
 * Props for the OptimizedNoteViewer component
 */
interface OptimizedNoteViewerProps {
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
 * Optimized component for displaying and editing a note's content
 * Uses optimized hooks for better performance
 * 
 * @param props Component props
 * @returns Note viewer UI component
 */
export const OptimizedNoteViewer: React.FC<OptimizedNoteViewerProps> = ({ 
  note, 
  loading, 
  onNoteContentUpdate,
  onNoteRename,
  onNotePathChange,
  onTagClick,
  onSelectNote,
  showBackButton,
  backButtonDisabled,
  onBackClick,
  backButtonTooltip
}) => {
  // Content ref for scrolling and highlighting
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Get editing functionality from custom hook
  const {
    isEditing,
    isRenamingTitle,
    isEditingPath,
    editedContent,
    editedTitle,
    editedPath,
    isSaving,
    error, setError,
    textareaRef,
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
    setEditedContent,
    saveContent
  } = useNoteEditing(note, onNoteContentUpdate, onNoteRename, onNotePathChange);
  
  // Get find/replace functionality from custom hook
  const {
    findReplaceVisible, setFindReplaceVisible,
    matches,
    currentMatchIndex,
    lastSearchText,
    handleFindTextInContent,
    handleFindNextMatch,
    handleFindPreviousMatch,
    handleReplaceMatch,
    handleReplaceAllMatches
  } = useFindReplace(note, contentRef, isEditing, setEditedContent, saveContent);
  
  // Get optimized backlinks functionality
  // Defer loading backlinks until after note content is displayed
  const {
    backlinks,
    backlinksLoading
  } = useOptimizedBacklinks(note, true);
  
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
  
  // Loading state - show a minimal loading indicator
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
      {findReplaceVisible && (
        <Suspense fallback={<div className="loading-find-replace">Loading find/replace...</div>}>
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
        </Suspense>
      )}
      
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
        showBackButton={showBackButton}
        backButtonDisabled={backButtonDisabled}
        onBackClick={onBackClick}
        backButtonTooltip={backButtonTooltip}
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
          textareaRef={textareaRef}
          onNoteLinkClick={handleNoteLinkClick}
          onExternalLinkClick={handleExternalLinkClick}
        />
        
        {/* Backlinks Section - lazy loaded with a delay */}
        <Suspense fallback={<div className="loading-backlinks">Loading backlinks...</div>}>
          <BacklinksSection
            backlinks={backlinks}
            backlinksLoading={backlinksLoading}
            onSelectNote={onSelectNote}
          />
        </Suspense>
        
        {note && (
          <Suspense fallback={<div className="loading-subnotes">Loading subnotes...</div>}>
            <SubnotesSection
              noteId={note.id}
              currentNote={note}
              onSelectNote={onSelectNote}
              onSubnoteCreated={(newNote) => {
                // Navigate to the newly created subnote
                if (onSelectNote) {
                  onSelectNote(newNote.id);
                }
              }}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
};
