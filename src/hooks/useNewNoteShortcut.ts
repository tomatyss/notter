import { useEffect } from 'react';
import { NewNoteButtonRef } from '../components/NewNoteButton';

/**
 * Custom hook for handling Ctrl/Cmd+N keyboard shortcut to create a new note
 * 
 * @param newNoteButtonRef Reference to the NewNoteButton component
 */
export const useNewNoteShortcut = (newNoteButtonRef: React.RefObject<NewNoteButtonRef | null>) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+N or Cmd+N
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault(); // Prevent browser's default "new window" action
        if (newNoteButtonRef.current) {
          newNoteButtonRef.current.openModal();
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [newNoteButtonRef]);
};
