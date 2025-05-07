import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { invoke } from '@tauri-apps/api/core';
import { Note, NoteType, NoteSummary } from '../types';
import { FindReplacePanel, FindOptions } from './FindReplacePanel';

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
  // State for edit mode
  const [isEditing, setIsEditing] = useState(false);
  // State for edited content
  const [editedContent, setEditedContent] = useState('');
  // State for edited title (for renaming)
  const [isRenamingTitle, setIsRenamingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  // State for edited path
  const [isEditingPath, setIsEditingPath] = useState(false);
  const [editedPath, setEditedPath] = useState('');
  // State for saving status
  const [isSaving, setIsSaving] = useState(false);
  // State for error message
  const [error, setError] = useState<string | null>(null);
  // State for backlinks
  const [backlinks, setBacklinks] = useState<NoteSummary[]>([]);
  const [backlinksLoading, setBacklinksLoading] = useState(false);
  // Refs for autosave timers
  const contentAutosaveTimerRef = useRef<number | null>(null);
  const titleAutosaveTimerRef = useRef<number | null>(null);
  const pathAutosaveTimerRef = useRef<number | null>(null);
  // Refs for content and title elements
  const contentRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const pathRef = useRef<HTMLDivElement>(null);
  
  // Reset states when note changes
  useEffect(() => {
    if (note) {
      setEditedContent(note.content);
      setEditedTitle(note.title);
      setEditedPath(note.path);
      
      // Load backlinks for the current note
      loadBacklinks(note.title);
    }
    setIsEditing(false);
    setIsRenamingTitle(false);
    setIsEditingPath(false);
    setError(null);
    
    // Clear any pending autosave timers
    if (contentAutosaveTimerRef.current) {
      clearTimeout(contentAutosaveTimerRef.current);
    }
    if (titleAutosaveTimerRef.current) {
      clearTimeout(titleAutosaveTimerRef.current);
    }
    if (pathAutosaveTimerRef.current) {
      clearTimeout(pathAutosaveTimerRef.current);
    }
  }, [note]);
  
  // Load backlinks for the current note
  const loadBacklinks = async (noteTitle: string) => {
    try {
      setBacklinksLoading(true);
      const backlinks = await invoke<NoteSummary[]>('find_backlinks', { noteTitle });
      setBacklinks(backlinks);
      setBacklinksLoading(false);
    } catch (err) {
      console.error('Failed to load backlinks:', err);
      setBacklinks([]);
      setBacklinksLoading(false);
    }
  };
  
  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (contentAutosaveTimerRef.current) {
        clearTimeout(contentAutosaveTimerRef.current);
      }
      if (titleAutosaveTimerRef.current) {
        clearTimeout(titleAutosaveTimerRef.current);
      }
      if (pathAutosaveTimerRef.current) {
        clearTimeout(pathAutosaveTimerRef.current);
      }
    };
  }, []);
  
  // Find and replace state
  const [findReplaceVisible, setFindReplaceVisible] = useState(false);
  const [matches, setMatches] = useState<number[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [lastSearchText, setLastSearchText] = useState('');
  const [lastSearchOptions, setLastSearchOptions] = useState<FindOptions>({
    caseSensitive: false,
    wholeWord: false
  });
  
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
  
  // Handle path changes - only save on blur, not during typing
  const handlePathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPath = e.target.value;
    setEditedPath(newPath);
    
    // Clear any existing timer to prevent autosave during path editing
    if (pathAutosaveTimerRef.current) {
      clearTimeout(pathAutosaveTimerRef.current);
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
  
  // Handle double click on path to edit
  const handlePathDoubleClick = () => {
    if (!isEditingPath && !loading && note) {
      setIsEditingPath(true);
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
  
  // Save path changes
  const savePath = async (path = editedPath) => {
    if (!note) return;
    
    try {
      setIsSaving(true);
      setError(null);
      
      if (onNotePathChange) {
        // Use the callback to change the note path
        await onNotePathChange(note.id, path);
      } else {
        // Fallback to direct API call if no callback provided
        await invoke<Note>('move_note', {
          id: note.id,
          newPath: path
        });
      }
      
      setIsSaving(false);
    } catch (err) {
      setError(`Failed to change note path: ${err}`);
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
  
  // Handle blur events to exit path edit mode and save
  const handlePathBlur = () => {
    // Save the path when the input loses focus
    savePath();
    // Exit path edit mode after saving
    setIsEditingPath(false);
  };
  
  // Handle key press in path input
  const handlePathKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Save and exit on Enter key
    if (e.key === 'Enter') {
      savePath();
      setIsEditingPath(false);
    }
    // Cancel on Escape key
    else if (e.key === 'Escape') {
      setEditedPath(note?.path || '');
      setIsEditingPath(false);
    }
  };
  
  // Find text in content
  const findTextInContent = useCallback((searchText: string, options: FindOptions) => {
    if (!note || !searchText) {
      setMatches([]);
      setCurrentMatchIndex(0);
      return;
    }
    
    // Save the search text and options for later use
    setLastSearchText(searchText);
    setLastSearchOptions(options);
    
    const content = note.content;
    const matches: number[] = [];
    
    // Create a regex for the search
    let flags = 'g';
    if (!options.caseSensitive) {
      flags += 'i';
    }
    
    let regex: RegExp;
    if (options.wholeWord) {
      regex = new RegExp(`\\b${escapeRegExp(searchText)}\\b`, flags);
    } else {
      regex = new RegExp(escapeRegExp(searchText), flags);
    }
    
    // Find all matches
    let match;
    while ((match = regex.exec(content)) !== null) {
      matches.push(match.index);
    }
    
    setMatches(matches);
    setCurrentMatchIndex(matches.length > 0 ? 1 : 0);
    
    // Scroll to the first match if there are any
    if (matches.length > 0 && !isEditing) {
      scrollToMatch(matches[0], searchText.length);
    }
  }, [note, isEditing]);
  
  // Escape special characters in regex
  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };
  
  // Scroll to a specific match
  const scrollToMatch = (index: number, length: number) => {
    if (!contentRef.current || isEditing) return;
    
    // Get all text nodes in the content element
    const textNodes = getTextNodesIn(contentRef.current);
    let currentIndex = 0;
    let targetNode = null;
    let targetOffset = 0;
    
    // Find the text node containing the match
    for (const node of textNodes) {
      const nodeLength = node.textContent?.length || 0;
      
      if (currentIndex + nodeLength > index) {
        targetNode = node;
        targetOffset = index - currentIndex;
        break;
      }
      
      currentIndex += nodeLength;
    }
    
    if (targetNode) {
      // Create a range to select the match
      const range = document.createRange();
      range.setStart(targetNode, targetOffset);
      range.setEnd(targetNode, targetOffset + length);
      
      // Scroll to the range
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Scroll the match into view
        const rect = range.getBoundingClientRect();
        const container = contentRef.current;
        const containerRect = container.getBoundingClientRect();
        
        if (rect.top < containerRect.top || rect.bottom > containerRect.bottom) {
          container.scrollTo({
            top: container.scrollTop + (rect.top - containerRect.top) - 100,
            behavior: 'smooth'
          });
        }
      }
    }
  };
  
  // Get all text nodes in an element
  const getTextNodesIn = (node: Node): Text[] => {
    const textNodes: Text[] = [];
    const walker = document.createTreeWalker(
      node,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let currentNode: Node | null = walker.nextNode();
    while (currentNode) {
      textNodes.push(currentNode as Text);
      currentNode = walker.nextNode();
    }
    
    return textNodes;
  };
  
  // Find next match
  const findNextMatch = () => {
    if (matches.length === 0) return;
    
    const nextIndex = currentMatchIndex % matches.length + 1;
    setCurrentMatchIndex(nextIndex);
    
    if (!isEditing) {
      scrollToMatch(matches[nextIndex - 1], lastSearchText.length);
    }
  };
  
  // Find previous match
  const findPreviousMatch = () => {
    if (matches.length === 0) return;
    
    const prevIndex = currentMatchIndex > 1 ? currentMatchIndex - 1 : matches.length;
    setCurrentMatchIndex(prevIndex);
    
    if (!isEditing) {
      scrollToMatch(matches[prevIndex - 1], lastSearchText.length);
    }
  };
  
  // Replace current match
  const replaceMatch = (replacement: string) => {
    if (matches.length === 0 || !note) return;
    
    const matchIndex = matches[currentMatchIndex - 1];
    const matchLength = lastSearchText.length;
    
    // Create the new content with the replacement
    const newContent = 
      note.content.substring(0, matchIndex) + 
      replacement + 
      note.content.substring(matchIndex + matchLength);
    
    // Update the content
    setEditedContent(newContent);
    saveContent(newContent);
    
    // Update matches after replacement
    setTimeout(() => {
      findTextInContent(lastSearchText, lastSearchOptions);
    }, 100);
  };
  
  // Replace all matches
  const replaceAllMatches = (replacement: string) => {
    if (matches.length === 0 || !note) return;
    
    // Create a regex for the search
    let flags = 'g';
    if (!lastSearchOptions.caseSensitive) {
      flags += 'i';
    }
    
    let regex: RegExp;
    if (lastSearchOptions.wholeWord) {
      regex = new RegExp(`\\b${escapeRegExp(lastSearchText)}\\b`, flags);
    } else {
      regex = new RegExp(escapeRegExp(lastSearchText), flags);
    }
    
    // Replace all matches
    const newContent = note.content.replace(regex, replacement);
    
    // Update the content
    setEditedContent(newContent);
    saveContent(newContent);
    
    // Clear matches after replacing all
    setMatches([]);
    setCurrentMatchIndex(0);
  };
  
  // Highlight matches in content
  
  // Handle note link click
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
  
  // Render plain text with note links
  const renderPlainTextWithLinks = (content: string) => {
    if (!content) return null;
    
    // Regular expression to find [[Note Title]] patterns
    const linkRegex = /\[\[(.*?)\]\]/g;
    
    // Split content by link patterns
    const parts = [];
    let lastIndex = 0;
    let match;
    
    // Find all matches and build an array of text and link elements
    while ((match = linkRegex.exec(content)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {content.substring(lastIndex, match.index)}
          </span>
        );
      }
      
      // Add the link
      const noteTitle = match[1];
      parts.push(
        <span 
          key={`link-${match.index}`}
          className="note-link"
          onClick={() => handleNoteLinkClick(noteTitle)}
          style={{ color: '#0366d6', cursor: 'pointer', textDecoration: 'underline' }}
        >
          {noteTitle}
        </span>
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text after the last match
    if (lastIndex < content.length) {
      parts.push(
        <span key={`text-end`}>
          {content.substring(lastIndex)}
        </span>
      );
    }
    
    return parts;
  };
  
  // Custom component for ReactMarkdown to handle [[Note Title]] syntax
  const MarkdownWithLinks = ({ content }: { content: string }) => {
  // Process the content to handle [[Note Title]] patterns
  // We'll replace [[Note Title]] with a custom link format that ReactMarkdown can process
  const processedContent = content.replace(
    /\[\[(.*?)\]\]/g, 
    (_, noteTitle) => `[${noteTitle}](#note-link-${encodeURIComponent(noteTitle)})`
  );
    
    return (
      <ReactMarkdown
        components={{
          a: ({ node, ...props }) => {
            const href = props.href || '';
            
            // Check if this is one of our note links
            if (href.startsWith('#note-link-')) {
              const noteTitle = decodeURIComponent(href.substring('#note-link-'.length));
              return (
                <span 
                  className="note-link"
                  onClick={() => handleNoteLinkClick(noteTitle)}
                  style={{ color: '#0366d6', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  {props.children}
                </span>
              );
            }
            
            // Regular link handling
            return <a {...props} />;
          }
        }}
      >
        {processedContent}
      </ReactMarkdown>
    );
  };
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + F to open find panel
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && note) {
        e.preventDefault();
        setFindReplaceVisible(true);
      }
      // Ctrl/Cmd + H to open find and replace panel
      else if ((e.ctrlKey || e.metaKey) && e.key === 'h' && note) {
        e.preventDefault();
        setFindReplaceVisible(true);
      }
      // Escape to close find panel
      else if (e.key === 'Escape' && findReplaceVisible) {
        setFindReplaceVisible(false);
      }
      // F3 or Ctrl/Cmd + G to find next
      else if ((e.key === 'F3' || ((e.ctrlKey || e.metaKey) && e.key === 'g')) && matches.length > 0) {
        e.preventDefault();
        findNextMatch();
      }
      // Shift + F3 or Ctrl/Cmd + Shift + G to find previous
      else if ((e.shiftKey && e.key === 'F3') || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'g') && matches.length > 0) {
        e.preventDefault();
        findPreviousMatch();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [findReplaceVisible, matches.length, note]);
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
      {/* Find and Replace Panel */}
      <FindReplacePanel
        isVisible={findReplaceVisible}
        onClose={() => setFindReplaceVisible(false)}
        onFind={findTextInContent}
        onFindNext={findNextMatch}
        onFindPrevious={findPreviousMatch}
        onReplace={replaceMatch}
        onReplaceAll={replaceAllMatches}
        totalMatches={matches.length}
        currentMatchIndex={currentMatchIndex}
      />
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
          {isEditingPath ? (
            <div className="note-path-edit">
              <span className="path-label">Path:</span>
              <input
                type="text"
                value={editedPath}
                onChange={handlePathChange}
                onBlur={handlePathBlur}
                onKeyDown={handlePathKeyPress}
                className="path-input"
                autoFocus
              />
              {isSaving && <span className="autosave-indicator">Saving...</span>}
            </div>
          ) : (
            <div 
              className="note-path editable" 
              onDoubleClick={handlePathDoubleClick}
              ref={pathRef}
              title="Double-click to edit"
            >
              <span className="path-label">Path:</span> {note.path}
            </div>
          )}
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
      
      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)} className="dismiss-error">
            Dismiss
          </button>
        </div>
      )}
      
      <div className="note-viewer-content" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div 
          className="note-content" 
          onDoubleClick={handleContentDoubleClick}
          ref={contentRef}
          title="Double-click to edit"
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
              <MarkdownWithLinks content={note.content} />
            </div>
          ) : (
            <pre className="plain-text-content editable">
              {!isEditing && matches.length > 0 ? (
                <>
                  {(() => {
                    let result = [];
                    let lastIndex = 0;
                    
                    // Process each match
                    for (let i = 0; i < matches.length; i++) {
                      const position = matches[i];
                      const isCurrentMatch = i === currentMatchIndex - 1;
                      
                      // Add text before the match
                      if (position > lastIndex) {
                        result.push(
                          <span key={`text-${i}`}>
                            {note.content.substring(lastIndex, position)}
                          </span>
                        );
                      }
                      
                      // Add the match with appropriate highlighting
                      result.push(
                        <span 
                          key={`match-${i}`} 
                          className={`highlight-match${isCurrentMatch ? ' current' : ''}`}
                        >
                          {note.content.substring(position, position + lastSearchText.length)}
                        </span>
                      );
                      
                      // Update last index
                      lastIndex = position + lastSearchText.length;
                    }
                    
                    // Add remaining text after the last match
                    if (lastIndex < note.content.length) {
                      result.push(
                        <span key="text-end">
                          {note.content.substring(lastIndex)}
                        </span>
                      );
                    }
                    
                    return result;
                  })()}
                </>
              ) : (
                renderPlainTextWithLinks(note.content)
              )}
            </pre>
          )}
        </div>
        
        {/* Backlinks section */}
        {backlinksLoading ? (
          <div className="backlinks-section">
            <h3>Linked from</h3>
            <div className="loading-indicator">Loading backlinks...</div>
          </div>
        ) : backlinks.length > 0 && (
          <div className="backlinks-section">
            <h3>Linked from</h3>
            <ul className="backlinks-list">
              {backlinks.map(link => (
                <li key={link.id} className="backlink-item">
                  <span 
                    className="backlink-title note-link"
                    onClick={() => onSelectNote && onSelectNote(link.id)}
                  >
                    {link.title}
                  </span>
                  <span className="backlink-date">
                    {format(new Date(link.modified), 'MMM d, yyyy')}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
