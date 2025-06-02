import { useState, useCallback, useEffect } from 'react';

/**
 * Interface for navigation history entry
 */
interface NavigationEntry {
  noteId: string;
  timestamp: number;
  title?: string;
}

/**
 * Configuration for navigation history
 */
interface NavigationHistoryConfig {
  maxEntries?: number;
  persistKey?: string;
}

/**
 * Hook for managing navigation history with back/forward functionality
 * 
 * @param config Configuration options
 * @returns Navigation history state and methods
 */
export const useNavigationHistory = (config: NavigationHistoryConfig = {}) => {
  const { maxEntries = 50, persistKey = 'notter-navigation-history' } = config;
  
  // Load initial history from localStorage
  const loadPersistedHistory = useCallback((): NavigationEntry[] => {
    try {
      const stored = localStorage.getItem(persistKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed.slice(0, maxEntries) : [];
      }
    } catch (error) {
      console.warn('Failed to load navigation history from localStorage:', error);
    }
    return [];
  }, [persistKey, maxEntries]);

  const [history, setHistory] = useState<NavigationEntry[]>(loadPersistedHistory);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);

  // Persist history to localStorage
  const persistHistory = useCallback((newHistory: NavigationEntry[]) => {
    try {
      localStorage.setItem(persistKey, JSON.stringify(newHistory));
    } catch (error) {
      console.warn('Failed to persist navigation history:', error);
    }
  }, [persistKey]);

  /**
   * Add a new entry to navigation history
   * 
   * @param noteId The ID of the note to add
   * @param title Optional title of the note
   */
  const pushToHistory = useCallback((noteId: string, title?: string) => {
    setHistory(prevHistory => {
      // Don't add if it's the same as the current entry
      if (prevHistory.length > 0 && prevHistory[prevHistory.length - 1]?.noteId === noteId) {
        return prevHistory;
      }

      const newEntry: NavigationEntry = {
        noteId,
        timestamp: Date.now(),
        title
      };

      // Remove any existing entries for this note to avoid duplicates
      const filteredHistory = prevHistory.filter(entry => entry.noteId !== noteId);
      
      // Add new entry and limit size
      const newHistory = [...filteredHistory, newEntry].slice(-maxEntries);
      
      // Persist to localStorage
      persistHistory(newHistory);
      
      return newHistory;
    });
    
    // Reset current index when adding new entry
    setCurrentIndex(-1);
  }, [maxEntries, persistHistory]);

  /**
   * Navigate back to the previous note
   * 
   * @returns The previous note ID or null if no previous note
   */
  const goBack = useCallback((): string | null => {
    if (history.length < 2) return null;
    
    const newIndex = currentIndex === -1 ? history.length - 2 : Math.max(0, currentIndex - 1);
    setCurrentIndex(newIndex);
    
    return history[newIndex]?.noteId || null;
  }, [history, currentIndex]);

  /**
   * Navigate forward to the next note (if we've gone back)
   * 
   * @returns The next note ID or null if no next note
   */
  const goForward = useCallback((): string | null => {
    if (currentIndex === -1 || currentIndex >= history.length - 1) return null;
    
    const newIndex = currentIndex + 1;
    setCurrentIndex(newIndex);
    
    return history[newIndex]?.noteId || null;
  }, [history, currentIndex]);

  /**
   * Get the previous note entry without navigating
   * 
   * @returns The previous navigation entry or null
   */
  const getPreviousEntry = useCallback((): NavigationEntry | null => {
    if (history.length < 2) return null;
    
    const prevIndex = currentIndex === -1 ? history.length - 2 : Math.max(0, currentIndex - 1);
    return history[prevIndex] || null;
  }, [history, currentIndex]);

  /**
   * Get the next note entry without navigating
   * 
   * @returns The next navigation entry or null
   */
  const getNextEntry = useCallback((): NavigationEntry | null => {
    if (currentIndex === -1 || currentIndex >= history.length - 1) return null;
    
    return history[currentIndex + 1] || null;
  }, [history, currentIndex]);

  /**
   * Check if we can navigate back
   * 
   * @returns True if back navigation is possible
   */
  const canGoBack = useCallback((): boolean => {
    return history.length >= 2 && (currentIndex === -1 ? true : currentIndex > 0);
  }, [history.length, currentIndex]);

  /**
   * Check if we can navigate forward
   * 
   * @returns True if forward navigation is possible
   */
  const canGoForward = useCallback((): boolean => {
    return currentIndex !== -1 && currentIndex < history.length - 1;
  }, [currentIndex, history.length]);

  /**
   * Clear all navigation history
   */
  const clearHistory = useCallback(() => {
    setHistory([]);
    setCurrentIndex(-1);
    try {
      localStorage.removeItem(persistKey);
    } catch (error) {
      console.warn('Failed to clear navigation history from localStorage:', error);
    }
  }, [persistKey]);

  /**
   * Update the title of a specific entry in history
   * 
   * @param noteId The note ID to update
   * @param title The new title
   */
  const updateEntryTitle = useCallback((noteId: string, title: string) => {
    setHistory(prevHistory => {
      const newHistory = prevHistory.map(entry => 
        entry.noteId === noteId ? { ...entry, title } : entry
      );
      persistHistory(newHistory);
      return newHistory;
    });
  }, [persistHistory]);

  // Effect to handle browser back/forward buttons (if running in browser context)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.noteId) {
        // Handle browser navigation if needed
        // This would require additional integration with the app's routing
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, []);

  return {
    history,
    currentIndex,
    pushToHistory,
    goBack,
    goForward,
    getPreviousEntry,
    getNextEntry,
    canGoBack,
    canGoForward,
    clearHistory,
    updateEntryTitle
  };
};
