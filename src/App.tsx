import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { SettingsPanel } from "./components/SettingsPanel";
import { NoteList } from "./components/NoteList";
import { NoteViewer } from "./components/NoteViewer";
import { SearchPanel } from "./components/SearchPanel";
import MobileLayout from "./components/MobileLayout";
import { AppConfig, Note, NoteSummary, SortOption } from "./types";
import "./App.css";

/**
 * Main application component
 * 
 * @returns The main application UI
 */
function App() {
  // Tab state
  const [activeTab, setActiveTab] = useState<'notes' | 'settings'>('notes');
  // Application state
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | undefined>(undefined);
  const [sortOption, setSortOption] = useState<SortOption>(SortOption.ModifiedNewest);
  
  // Loading states
  const [configLoading, setConfigLoading] = useState(true);
  const [notesLoading, setNotesLoading] = useState(false);
  const [noteLoading, setNoteLoading] = useState(false);
  
  // Error state
  const [error, setError] = useState<string | null>(null);

  // Load notes from configured directory
  const loadNotes = useCallback(async () => {
    try {
      setNotesLoading(true);
      const notes = await invoke<NoteSummary[]>('list_notes', { sort: sortOption });
      setNotes(notes);
      setNotesLoading(false);
      setConfigLoading(false); // Ensure configLoading is set to false after notes are loaded
    } catch (err) {
      setError(`Failed to load notes: ${err}`);
      setNotesLoading(false);
      setConfigLoading(false); // Ensure configLoading is set to false even if there's an error
    }
  }, [sortOption]);

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

  // Handle sort option change
  const handleSortChange = (sort: SortOption) => {
    setSortOption(sort);
    // loadNotes will be called by the useEffect when sortOption changes
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
    try {
      setSelectedNoteId(id);
      setNoteLoading(true);
      const note = await invoke<Note>('get_note', { id });
      setSelectedNote(note);
      setNoteLoading(false);
    } catch (err) {
      setError(`Failed to load note: ${err}`);
      setNoteLoading(false);
    }
  };
  
  // Handle note content update
  const handleNoteContentUpdate = async (id: string, content: string) => {
    try {
      // Don't set loading state to avoid UI flicker during editing
      // setNoteLoading(true);
      
      // Update note content
      const updatedNote = await invoke<Note>('update_note_content', { id, content });
      
      // Update the selected note
      setSelectedNote(updatedNote);
      
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
      
      // Don't set loading state to false here to avoid UI flicker
      // setNoteLoading(false);
    } catch (err) {
      setError(`Failed to update note: ${err}`);
      setNoteLoading(false);
    }
  };
  
  // Handle note rename
  const handleNoteRename = async (id: string, newName: string) => {
    try {
      // Don't set loading state to avoid UI flicker during rename
      // setNoteLoading(true);
      
      // Rename the note
      const updatedNote = await invoke<Note>('rename_note', { id, newName });
      
      // Update the selected note
      setSelectedNote(updatedNote);
      setSelectedNoteId(updatedNote.id); // ID might have changed due to path change
      
      // Update the note in the notes list
      // We'll do this in the background to avoid UI refresh during editing
      setTimeout(() => {
        loadNotes();
      }, 100);
      
      // Don't set loading state to false here to avoid UI flicker
      // setNoteLoading(false);
    } catch (err) {
      setError(`Failed to rename note: ${err}`);
      setNoteLoading(false);
    }
  };
  
  // Handle note path change
  const handleNoteMoveToPath = async (id: string, newPath: string) => {
    try {
      // Don't set loading state to avoid UI flicker during path change
      // setNoteLoading(true);
      
      // Move the note to the new path
      const updatedNote = await invoke<Note>('move_note', { id, newPath });
      
      // Update the selected note
      setSelectedNote(updatedNote);
      setSelectedNoteId(updatedNote.id); // ID might have changed due to path change
      
      // Update the note in the notes list
      // We'll do this in the background to avoid UI refresh during editing
      setTimeout(() => {
        loadNotes();
      }, 100);
      
      // Don't set loading state to false here to avoid UI flicker
      // setNoteLoading(false);
    } catch (err) {
      setError(`Failed to move note: ${err}`);
      setNoteLoading(false);
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
    setSelectedNote(newNote);
    
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
            <NoteViewer 
              note={selectedNote} 
              loading={noteLoading}
              onNoteContentUpdate={handleNoteContentUpdate}
              onNoteRename={handleNoteRename}
              onNotePathChange={handleNoteMoveToPath}
            />
          </div>
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
