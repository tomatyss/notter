import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Note } from '../types';

/**
 * Size of the LRU cache for notes
 */
const CACHE_SIZE = 20;

/**
 * Interface for the note cache entry
 */
interface NoteCacheEntry {
  /**
   * The note data
   */
  note: Note;
  
  /**
   * Timestamp when the note was last accessed
   */
  lastAccessed: number;
}

/**
 * Global note cache shared across hook instances
 */
const noteCache: Map<string, NoteCacheEntry> = new Map();

/**
 * Custom hook for loading and caching notes
 * 
 * @returns Object containing note loading state and functions
 */
export const useCachedNotes = () => {
  // State for the currently selected note
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  
  // State for loading status
  const [noteLoading, setNoteLoading] = useState(false);
  
  // State for error message
  const [error, setError] = useState<string | null>(null);
  
  /**
   * Adds a note to the cache
   * 
   * @param note The note to cache
   */
  const addToCache = useCallback((note: Note) => {
    // If the cache is full, remove the least recently accessed entry
    if (noteCache.size >= CACHE_SIZE) {
      let oldestKey: string | null = null;
      let oldestTime = Infinity;
      
      // Find the least recently accessed entry
      noteCache.forEach((entry, key) => {
        if (entry.lastAccessed < oldestTime) {
          oldestTime = entry.lastAccessed;
          oldestKey = key;
        }
      });
      
      // Remove the oldest entry
      if (oldestKey) {
        noteCache.delete(oldestKey);
      }
    }
    
    // Add the new entry to the cache
    noteCache.set(note.id, {
      note,
      lastAccessed: Date.now()
    });
  }, []);
  
  /**
   * Gets a note from the cache
   * 
   * @param id The ID of the note to get
   * @returns The note if found in cache, null otherwise
   */
  const getFromCache = useCallback((id: string): Note | null => {
    const entry = noteCache.get(id);
    
    if (entry) {
      // Update the last accessed time
      entry.lastAccessed = Date.now();
      return entry.note;
    }
    
    return null;
  }, []);
  
  /**
   * Loads a note by ID, using cache if available
   * 
   * @param id The ID of the note to load
   * @returns Promise that resolves when the note is loaded
   */
  const loadNote = useCallback(async (id: string): Promise<void> => {
    try {
      // Set loading state first
      setNoteLoading(true);
      setError(null);
      
      // Check if the note is in the cache
      const cachedNote = getFromCache(id);
      
      if (cachedNote) {
        // Use the cached note
        console.log('Using cached note:', id);
        setSelectedNote(cachedNote);
        setNoteLoading(false);
        return;
      }
      
      // Load the note from the backend
      console.log('Loading note from backend:', id);
      const note = await invoke<Note>('get_note', { id });
      
      // Update the selected note
      setSelectedNote(note);
      
      // Add the note to the cache
      addToCache(note);
      
      // Clear loading state
      setNoteLoading(false);
    } catch (err) {
      setError(`Failed to load note: ${err}`);
      setNoteLoading(false);
    }
  }, [getFromCache, addToCache]);
  
  /**
   * Invalidates a note in the cache
   * 
   * @param id The ID of the note to invalidate
   */
  const invalidateCache = useCallback((id: string): void => {
    noteCache.delete(id);
  }, []);
  
  /**
   * Clears the entire note cache
   */
  const clearCache = useCallback((): void => {
    noteCache.clear();
  }, []);

  /**
   * Updates the currently selected note and refreshes the cache
   *
   * @param note The updated note
   */
  const updateNote = useCallback((note: Note): void => {
    setSelectedNote(note);
    addToCache(note);
  }, [addToCache]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      // No cleanup needed for now
    };
  }, []);
  
  return {
    selectedNote,
    noteLoading,
    error,
    loadNote,
    invalidateCache,
    clearCache,
    updateNote
  };
};
