import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Note, NoteSummary } from '../types';

/**
 * Size of the backlinks cache
 */
const CACHE_SIZE = 20;

/**
 * Interface for the backlinks cache entry
 */
interface BacklinksCacheEntry {
  /**
   * The backlinks data
   */
  backlinks: NoteSummary[];
  
  /**
   * Timestamp when the backlinks were last accessed
   */
  lastAccessed: number;
}

/**
 * Global backlinks cache shared across hook instances
 */
const backlinksCache: Map<string, BacklinksCacheEntry> = new Map();

/**
 * Custom hook for optimized backlinks loading
 * 
 * @param note The current note
 * @param deferLoading Whether to defer loading backlinks (default: true)
 * @returns Object containing backlinks state and functions
 */
export const useOptimizedBacklinks = (
  note: Note | null,
  deferLoading: boolean = true
) => {
  // State for backlinks
  const [backlinks, setBacklinks] = useState<NoteSummary[]>([]);
  const [backlinksLoading, setBacklinksLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  /**
   * Adds backlinks to the cache
   * 
   * @param noteTitle The title of the note
   * @param backlinks The backlinks to cache
   */
  const addToCache = useCallback((noteTitle: string, backlinks: NoteSummary[]) => {
    // If the cache is full, remove the least recently accessed entry
    if (backlinksCache.size >= CACHE_SIZE) {
      let oldestKey: string | null = null;
      let oldestTime = Infinity;
      
      // Find the least recently accessed entry
      backlinksCache.forEach((entry, key) => {
        if (entry.lastAccessed < oldestTime) {
          oldestTime = entry.lastAccessed;
          oldestKey = key;
        }
      });
      
      // Remove the oldest entry
      if (oldestKey) {
        backlinksCache.delete(oldestKey);
      }
    }
    
    // Add the new entry to the cache
    backlinksCache.set(noteTitle, {
      backlinks,
      lastAccessed: Date.now()
    });
  }, []);
  
  /**
   * Gets backlinks from the cache
   * 
   * @param noteTitle The title of the note
   * @returns The backlinks if found in cache, null otherwise
   */
  const getFromCache = useCallback((noteTitle: string): NoteSummary[] | null => {
    const entry = backlinksCache.get(noteTitle);
    
    if (entry) {
      // Update the last accessed time
      entry.lastAccessed = Date.now();
      return entry.backlinks;
    }
    
    return null;
  }, []);
  
  /**
   * Loads backlinks for a note
   * 
   * @param noteTitle The title of the note
   * @returns Promise that resolves when backlinks are loaded
   */
  const loadBacklinks = useCallback(async (noteTitle: string): Promise<void> => {
    try {
      setBacklinksLoading(true);
      setError(null);
      
      // Check if backlinks are in the cache
      const cachedBacklinks = getFromCache(noteTitle);
      
      if (cachedBacklinks) {
        // Use the cached backlinks
        console.log('Using cached backlinks for:', noteTitle);
        setBacklinks(cachedBacklinks);
        setBacklinksLoading(false);
        return;
      }
      
      // Load backlinks from the backend
      console.log('Loading backlinks from backend for:', noteTitle);
      const backlinks = await invoke<NoteSummary[]>('find_backlinks', { noteTitle });
      
      // Update the backlinks
      setBacklinks(backlinks);
      
      // Add the backlinks to the cache
      addToCache(noteTitle, backlinks);
      
      // Clear loading state
      setBacklinksLoading(false);
    } catch (err) {
      console.error('Failed to load backlinks:', err);
      setError(`Failed to load backlinks: ${err}`);
      setBacklinks([]);
      setBacklinksLoading(false);
    }
  }, [getFromCache, addToCache]);
  
  /**
   * Invalidates backlinks in the cache
   * 
   * @param noteTitle The title of the note
   */
  const invalidateCache = useCallback((noteTitle: string): void => {
    backlinksCache.delete(noteTitle);
  }, []);
  
  /**
   * Clears the entire backlinks cache
   */
  const clearCache = useCallback((): void => {
    backlinksCache.clear();
  }, []);
  
  // Load backlinks when note changes
  useEffect(() => {
    if (!note) {
      setBacklinks([]);
      return;
    }
    
    if (deferLoading) {
      // Defer loading backlinks until after the note content is displayed
      const timer = setTimeout(() => {
        loadBacklinks(note.title);
      }, 100); // Small delay to prioritize note content rendering
      
      return () => {
        clearTimeout(timer);
      };
    } else {
      // Load backlinks immediately
      loadBacklinks(note.title);
    }
  }, [note, loadBacklinks, deferLoading]);
  
  return {
    backlinks,
    backlinksLoading,
    error,
    loadBacklinks,
    invalidateCache,
    clearCache
  };
};
