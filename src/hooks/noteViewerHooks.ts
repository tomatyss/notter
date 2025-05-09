import { useState, useEffect, useRef, useCallback, RefObject, MutableRefObject } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Note, NoteSummary } from '../types';

/**
 * Custom hook for note editing functionality
 * 
 * @param note The current note being edited
 * @param onNoteContentUpdate Callback for updating note content
 * @param onNoteRename Callback for renaming a note
 * @param onNotePathChange Callback for changing note path
 * @returns Object containing editing state and handlers
 */
export const useNoteEditing = (
  note: Note | null,
  onNoteContentUpdate?: (id: string, content: string) => void,
  onNoteRename?: (id: string, newName: string) => void,
  onNotePathChange?: (id: string, newPath: string) => void
) => {
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
  // State for cursor position
  const [clickPosition, setClickPosition] = useState<number | null>(null);
  
  // Refs for autosave timers
  const contentAutosaveTimerRef = useRef<number | null>(null);
  const titleAutosaveTimerRef = useRef<number | null>(null);
  const pathAutosaveTimerRef = useRef<number | null>(null);
  // Ref for the textarea element
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  
  // Reset states when note changes
  useEffect(() => {
    if (note) {
      setEditedContent(note.content);
      setEditedTitle(note.title);
      setEditedPath(note.path);
    }
    setIsEditing(false);
    setIsRenamingTitle(false);
    setIsEditingPath(false);
    setError(null);
    setClickPosition(null);
    
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
  
  // Set cursor position when textarea is rendered and focused
  useEffect(() => {
    if (isEditing && textareaRef.current && clickPosition !== null) {
      // Set cursor position
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(clickPosition, clickPosition);
    }
  }, [isEditing, clickPosition]);

  // Handle double click on content to edit
  const handleContentDoubleClick = (position?: number) => {
    if (!isEditing && note) {
      setIsEditing(true);
      if (position !== undefined) {
        setClickPosition(position);
      }
    }
  };
  
  // Handle double click on title to rename
  const handleTitleDoubleClick = () => {
    if (!isRenamingTitle && note) {
      setIsRenamingTitle(true);
    }
  };
  
  // Handle double click on path to edit
  const handlePathDoubleClick = () => {
    if (!isEditingPath && note) {
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
  
  return {
    isEditing, setIsEditing,
    isRenamingTitle, setIsRenamingTitle,
    isEditingPath, setIsEditingPath,
    editedContent, setEditedContent,
    editedTitle, setEditedTitle,
    editedPath, setEditedPath,
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
    saveContent,
    saveTitle,
    savePath
  };
};

/**
 * Custom hook for find and replace functionality
 * 
 * @param note The current note
 * @param contentRef Reference to the content element
 * @param isEditing Whether the note is in edit mode
 * @returns Object containing find/replace state and handlers
 */
export const useFindReplace = (
  note: Note | null,
  contentRef: RefObject<HTMLDivElement>,
  isEditing: boolean
) => {
  // Find and replace state
  const [findReplaceVisible, setFindReplaceVisible] = useState(false);
  const [matches, setMatches] = useState<number[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [lastSearchText, setLastSearchText] = useState('');
  const [lastSearchOptions, setLastSearchOptions] = useState<{
    caseSensitive: boolean;
    wholeWord: boolean;
  }>({
    caseSensitive: false,
    wholeWord: false
  });
  
  // Find text in content
  const handleFindTextInContent = useCallback((searchText: string, options: {
    caseSensitive: boolean;
    wholeWord: boolean;
  }) => {
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
    if (matches.length > 0 && !isEditing && contentRef.current) {
      scrollToMatch(contentRef.current, matches[0], searchText.length);
    }
  }, [note, isEditing, contentRef]);
  
  // Find next match
  const handleFindNextMatch = useCallback(() => {
    if (matches.length === 0 || !contentRef.current) return;
    
    const nextIndex = currentMatchIndex % matches.length + 1;
    setCurrentMatchIndex(nextIndex);
    
    if (!isEditing) {
      scrollToMatch(contentRef.current, matches[nextIndex - 1], lastSearchText.length);
    }
  }, [matches, currentMatchIndex, lastSearchText, isEditing, contentRef]);
  
  // Find previous match
  const handleFindPreviousMatch = useCallback(() => {
    if (matches.length === 0 || !contentRef.current) return;
    
    const prevIndex = currentMatchIndex > 1 ? currentMatchIndex - 1 : matches.length;
    setCurrentMatchIndex(prevIndex);
    
    if (!isEditing) {
      scrollToMatch(contentRef.current, matches[prevIndex - 1], lastSearchText.length);
    }
  }, [matches, currentMatchIndex, lastSearchText, isEditing, contentRef]);
  
  // Replace current match
  const handleReplaceMatch = useCallback((replacement: string) => {
    if (matches.length === 0 || !note) return;
    
    const matchIndex = matches[currentMatchIndex - 1];
    const matchLength = lastSearchText.length;
    
    // Create the new content with the replacement
    const newContent = 
      note.content.substring(0, matchIndex) + 
      replacement + 
      note.content.substring(matchIndex + matchLength);
    
    // Update the content
    // This would typically call a function from the editing hook
    // For now, we'll just return the new content
    return newContent;
  }, [matches, currentMatchIndex, lastSearchText, note]);
  
  // Replace all matches
  const handleReplaceAllMatches = useCallback((replacement: string) => {
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
    // This would typically call a function from the editing hook
    // For now, we'll just return the new content
    return newContent;
  }, [matches, lastSearchText, lastSearchOptions, note]);
  
  return {
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
  };
};

/**
 * Custom hook for backlinks functionality
 * 
 * @param note The current note
 * @returns Object containing backlinks state
 */
export const useBacklinks = (note: Note | null) => {
  // State for backlinks
  const [backlinks, setBacklinks] = useState<NoteSummary[]>([]);
  const [backlinksLoading, setBacklinksLoading] = useState(false);
  
  // Load backlinks when note changes
  useEffect(() => {
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
    
    if (note) {
      loadBacklinks(note.title);
    } else {
      setBacklinks([]);
    }
  }, [note]);
  
  return {
    backlinks,
    backlinksLoading
  };
};

/**
 * Custom hook for keyboard shortcuts
 * 
 * @param params Object containing required state and handlers
 * @returns void
 */
export const useKeyboardShortcuts = ({
  note,
  findReplaceVisible,
  setFindReplaceVisible,
  matches,
  handleFindNextMatch,
  handleFindPreviousMatch
}: {
  note: Note | null;
  findReplaceVisible: boolean;
  setFindReplaceVisible: (visible: boolean) => void;
  matches: number[];
  handleFindNextMatch: () => void;
  handleFindPreviousMatch: () => void;
}) => {
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
        handleFindNextMatch();
      }
      // Shift + F3 or Ctrl/Cmd + Shift + G to find previous
      else if ((e.shiftKey && e.key === 'F3') || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'g') && matches.length > 0) {
        e.preventDefault();
        handleFindPreviousMatch();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [findReplaceVisible, matches.length, note, setFindReplaceVisible, handleFindNextMatch, handleFindPreviousMatch]);
};

// Helper function to escape special characters in regex
export const escapeRegExp = (string: string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Helper function to scroll to a match
export const scrollToMatch = (
  container: HTMLElement,
  index: number,
  length: number
): void => {
  // Get all text nodes in the container
  const textNodes = getTextNodesIn(container);
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

// Helper function to get all text nodes in an element
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
