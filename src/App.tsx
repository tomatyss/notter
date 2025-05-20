import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { invoke } from "@tauri-apps/api/core";
import { SettingsPanel } from "./components/SettingsPanel";
import { NoteList } from "./components/NoteList";
import { NewNoteButton, NewNoteButtonRef } from "./components/NewNoteButton";
import { OptimizedNoteViewer } from "./components/OptimizedNoteViewer";
import { SearchPanel } from "./components/SearchPanel";
import { TagFilter } from "./components/TagFilter";
import MobileLayout from "./components/MobileLayout";
import { Icon, IconName } from "./components/common";
import { AppConfig, Note, NoteSummary, SortOption } from "./types";
import { useNewNoteShortcut } from "./hooks/useNewNoteShortcut";
import { useCachedNotes } from "./hooks/useCachedNotes";
import "./App.css";

// Lazy load the ChatPanel component
const ChatPanel = React.lazy(() => import("./components/chat").then(module => ({
  default: module.ChatPanel
})));

/**
 * Main application component
 * 
 * @returns The main application UI
 */
function App() {
  // Ref for the NewNoteButton component
  const newNoteButtonRef = useRef<NewNoteButtonRef>(null);
  
  // Use the custom hook to set up the keyboard shortcut
  useNewNoteShortcut(newNoteButtonRef);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'notes' | 'settings'>('notes');
  
  // Chat state
  const [isChatVisible, setIsChatVisible] = useState<boolean>(false);
  
  // Application state
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | undefined>(undefined);
  const [sortOption, setSortOption] = useState<SortOption>(SortOption.ModifiedNewest);
  
  // Tag filtering state
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [matchAllTags, setMatchAllTags] = useState<boolean>(false);
  const [filteredNotes, setFilteredNotes] = useState<NoteSummary[]>([]);
  const [isFiltering, setIsFiltering] = useState<boolean>(false);
  
  // Loading states
  const [configLoading, setConfigLoading] = useState(true);
  const [notesLoading, setNotesLoading] = useState(false);
  
  // Error state
  const [error, setError] = useState<string | null>(null);
  
  // Use the cached notes hook
  const {
    selectedNote,
    noteLoading,
    error: noteError,
    loadNote,
    invalidateCache
  } = useCachedNotes();

  // Set error from note loading
  useEffect(() => {
    if (noteError) {
      setError(noteError);
    }
  }, [noteError]);

  // Collect all unique tags from notes
  const collectAllTags = useCallback((notesList: NoteSummary[]) => {
    const tagSet = new Set<string>();
    notesList.forEach(note => {
      note.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, []);

  // Load notes from configured directory
  const loadNotes = useCallback(async () => {
    try {
      setNotesLoading(true);
      const notes = await invoke<NoteSummary[]>('list_notes', { sort: sortOption });
      setNotes(notes);
      setAllTags(collectAllTags(notes));
      setNotesLoading(false);
      setConfigLoading(false); // Ensure configLoading is set to false after notes are loaded
    } catch (err) {
      setError(`Failed to load notes: ${err}`);
      setNotesLoading(false);
      setConfigLoading(false); // Ensure configLoading is set to false even if there's an error
    }
  }, [sortOption, collectAllTags]);

  // Load initial configuration
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setConfigLoading(true);
        const config = await invoke<AppConfig>('get_config');
        setConfig(config);
        
        // If notes directory is configured, load notes
        if (config.notes_dir) {
          loadNotes();
        } else {
          setConfigLoading(false);
        }
      } catch (err) {
        setError(`Failed to load configuration: ${err}`);
        setConfigLoading(false);
      }
    };
    
    loadConfig();
  }, [loadNotes]);

  // Reload notes when sort option changes
  useEffect(() => {
    if (config?.notes_dir) {
      loadNotes();
    }
  }, [config?.notes_dir, loadNotes]);

  // Filter notes by tags
  const filterNotesByTags = useCallback(async () => {
    if (selectedTags.length === 0) {
      setIsFiltering(false);
      setFilteredNotes([]);
      return;
    }
    
    try {
      // Set isFiltering to true to indicate that tag filtering is active
      setIsFiltering(true);
      
      // Show loading state while filtering
      setNotesLoading(true);
      
      const filtered = await invoke<NoteSummary[]>('filter_notes_by_tags', {
        tags: selectedTags,
        matchAll: matchAllTags,
        sort: sortOption
      });
      
      setFilteredNotes(filtered);
      setNotesLoading(false);
    } catch (err) {
      setError(`Failed to filter notes: ${err}`);
      setNotesLoading(false);
    }
  }, [selectedTags, matchAllTags, sortOption]);

  // Trigger filtering when selected tags or match option changes
  useEffect(() => {
    if (selectedTags.length > 0) {
      filterNotesByTags();
    } else {
      setIsFiltering(false);
      setFilteredNotes([]);
    }
  }, [selectedTags, matchAllTags, filterNotesByTags]);

  // Handle sort option change
  const handleSortChange = (sort: SortOption) => {
    setSortOption(sort);
    // loadNotes will be called by the useEffect when sortOption changes
    // If filtering is active, we need to reapply the filter with the new sort option
    if (selectedTags.length > 0) {
      filterNotesByTags();
    }
  };

  // Handle tag selection
  const handleTagSelect = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  // Handle tag click from note view
  const handleTagClick = (tag: string) => {
    setSelectedTags([tag]);
    setMatchAllTags(false);
    setActiveTab('notes');
  };

  // Handle configuration update
  const handleConfigUpdate = (updatedConfig: AppConfig) => {
    setConfig(updatedConfig);
    
    if (!updatedConfig.notes_dir) {
      setConfigLoading(false); // Ensure configLoading is set to false if no notes directory is configured
    }
    // loadNotes will be called by the useEffect when config changes
  };

  // Load a specific note
  const handleSelectNote = async (id: string) => {
    // Update the selected note ID
    setSelectedNoteId(id);
    
    // Load the note content using the cached notes hook
    await loadNote(id);
  };
  
  // Handle note content update
  const handleNoteContentUpdate = async (id: string, content: string) => {
    try {
      // Verify that we're updating the currently selected note
      if (id !== selectedNoteId) {
        console.warn('Attempting to update a note that is not currently selected');
        return;
      }
      
      // Update note content
      const updatedNote = await invoke<Note>('update_note_content', { id, content });
      
      // Verify that the selected ID hasn't changed during the update
      if (id === selectedNoteId) {
        // Invalidate the cache for this note
        invalidateCache(id);
        
        // Reload the note to update the cache
        await loadNote(id);
        
        // Update the note in the notes list in the background
        setTimeout(() => {
          setNotes(prevNotes => 
            prevNotes.map(note => 
              note.id === id 
                ? { 
                    ...note, 
                    modified: updatedNote.modified,
                    tags: updatedNote.tags // Tags might have changed if they were added/removed in the content
                  } 
                : note
            )
          );
        }, 100);
      }
    } catch (err) {
      setError(`Failed to update note: ${err}`);
      // Reload the note to ensure we have the latest version
      if (id === selectedNoteId) {
        handleSelectNote(id);
      }
    }
  };
  
  // Handle note rename
  const handleNoteRename = async (id: string, newName: string) => {
    try {
      // Verify that we're renaming the currently selected note
      if (id !== selectedNoteId) {
        console.warn('Attempting to rename a note that is not currently selected');
        return;
      }
      
      // Rename the note
      const updatedNote = await invoke<Note>('rename_note', { id, newName });
      
      // Invalidate the cache for this note
      invalidateCache(id);
      
      // Update the selected note ID (might have changed due to path change)
      setSelectedNoteId(updatedNote.id);
      
      // Reload the note to update the cache
      await loadNote(updatedNote.id);
      
      // Update the note in the notes list
      // We'll do this in the background to avoid UI refresh during editing
      setTimeout(() => {
        loadNotes();
      }, 100);
    } catch (err) {
      setError(`Failed to rename note: ${err}`);
      // Reload the note to ensure we have the latest version
      if (id === selectedNoteId) {
        handleSelectNote(id);
      }
    }
  };
  
  // Handle note path change
  const handleNoteMoveToPath = async (id: string, newPath: string) => {
    try {
      // Verify that we're moving the currently selected note
      if (id !== selectedNoteId) {
        console.warn('Attempting to move a note that is not currently selected');
        return;
      }
      
      // Move the note to the new path
      const updatedNote = await invoke<Note>('move_note', { id, newPath });
      
      // Invalidate the cache for this note
      invalidateCache(id);
      
      // Update the selected note ID (might have changed due to path change)
      setSelectedNoteId(updatedNote.id);
      
      // Reload the note to update the cache
      await loadNote(updatedNote.id);
      
      // Update the note in the notes list
      // We'll do this in the background to avoid UI refresh during editing
      setTimeout(() => {
        loadNotes();
      }, 100);
    } catch (err) {
      setError(`Failed to move note: ${err}`);
      // Reload the note to ensure we have the latest version
      if (id === selectedNoteId) {
        handleSelectNote(id);
      }
    }
  };
  
  // Handle new note creation
  const handleNoteCreated = (newNote: Note) => {
    // Update the notes list
    setNotes(prevNotes => [
      {
        id: newNote.id,
        title: newNote.title,
        created: newNote.created,
        modified: newNote.modified,
        tags: newNote.tags,
        file_type: newNote.file_type
      },
      ...prevNotes
    ]);
    
    // Select the new note
    setSelectedNoteId(newNote.id);
    loadNote(newNote.id);
    
    // Ensure we're on the notes tab
    setActiveTab('notes');
  };

  // Clear error message
  const clearError = () => setError(null);

  return (
    <MobileLayout>
      <div className="app">
        <main className="app-content">
          <div className="sidebar">
            <div className="tab-navigation">
              <button 
                className={`tab-button ${activeTab === 'notes' ? 'active' : ''}`}
                onClick={() => setActiveTab('notes')}
              >
                Notes
              </button>
              <button 
                className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => setActiveTab('settings')}
              >
                Settings
              </button>
            </div>
            
            {activeTab === 'notes' ? (
              <>
                <div className="note-list-header">
                  <h2>Notes</h2>
                  <NewNoteButton 
                    ref={newNoteButtonRef}
                    onNoteCreated={handleNoteCreated}
                    disabled={notesLoading}
                  />
                </div>
                <TagFilter
                  allTags={allTags}
                  selectedTags={selectedTags}
                  onTagsChange={setSelectedTags}
                  matchAll={matchAllTags}
                  onMatchAllChange={setMatchAllTags}
                />
                <SearchPanel
                  onSelectNote={handleSelectNote}
                  loading={configLoading || notesLoading}
                  showNoteList={(query) => {
                    // Only show note list when no search query is active
                    return !query || query.trim() === '';
                  }}
                >
                  <NoteList 
                    notes={notes} 
                    onSelectNote={handleSelectNote}
                    onNoteCreated={handleNoteCreated}
                    selectedNoteId={selectedNoteId}
                    loading={notesLoading}
                    currentSort={sortOption}
                    onSortChange={handleSortChange}
                    filteredNotes={filteredNotes}
                    isFiltering={isFiltering}
                    selectedTags={selectedTags}
                    onTagSelect={handleTagSelect}
                  />
                </SearchPanel>
              </>
            ) : (
              <SettingsPanel 
                config={config} 
                onConfigUpdate={handleConfigUpdate} 
                loading={configLoading} 
              />
            )}
          </div>
          
          <div className="main-content">
            <OptimizedNoteViewer 
              note={selectedNote} 
              loading={noteLoading}
              onNoteContentUpdate={handleNoteContentUpdate}
              onNoteRename={handleNoteRename}
              onNotePathChange={handleNoteMoveToPath}
              onTagClick={handleTagClick}
              onSelectNote={handleSelectNote}
            />
            
            {/* Chat toggle button */}
            <button 
              className="chat-toggle-button"
              onClick={() => setIsChatVisible(!isChatVisible)}
              title={isChatVisible ? "Hide chat" : "Show chat"}
            >
              {isChatVisible ? (
                <Icon 
                  name={IconName.Close} 
                  size={20} 
                  title="Hide chat" 
                />
              ) : (
                <Icon 
                  name={IconName.Chat} 
                  size={20} 
                  title="Show chat" 
                />
              )}
            </button>
          </div>
          
          {/* Chat sidebar */}
          {isChatVisible && (
            <div className="chat-sidebar">
              <Suspense fallback={<div className="loading-chat">Loading chat...</div>}>
                <ChatPanel 
                  isVisible={isChatVisible}
                  onClose={() => setIsChatVisible(false)}
                  currentNote={selectedNote}
                />
              </Suspense>
            </div>
          )}
        </main>
        
        {error && (
          <div className="error-banner">
            <p>{error}</p>
            <button onClick={clearError}>Dismiss</button>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}

export default App;
