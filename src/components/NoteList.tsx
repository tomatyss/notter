import React from 'react';
import { format } from 'date-fns';
import { NoteSummary } from '../types';

/**
 * Props for the NoteList component
 */
interface NoteListProps {
  /**
   * Array of note summaries to display
   */
  notes: NoteSummary[];
  
  /**
   * Callback when a note is selected
   */
  onSelectNote: (id: string) => void;
  
  /**
   * Currently selected note ID
   */
  selectedNoteId?: string;
  
  /**
   * Whether the component is in a loading state
   */
  loading: boolean;
}

/**
 * Component for displaying a list of notes
 * 
 * @param props Component props
 * @returns Note list UI component
 */
export const NoteList: React.FC<NoteListProps> = ({ 
  notes, 
  onSelectNote, 
  selectedNoteId,
  loading 
}) => {
  if (loading) {
    return (
      <div className="note-list loading">
        <h2>Notes</h2>
        <div className="loading-indicator">Loading notes...</div>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="note-list empty">
        <h2>Notes</h2>
        <div className="empty-state">No notes found</div>
      </div>
    );
  }

  return (
    <div className="note-list">
      <h2>Notes</h2>
      <ul className="notes-container">
        {notes.map(note => (
          <li 
            key={note.id} 
            className={`note-item ${note.id === selectedNoteId ? 'selected' : ''}`}
            onClick={() => onSelectNote(note.id)}
          >
            <div className="note-item-content">
              <h3 className="note-title">{note.title}</h3>
              <div className="note-meta">
                <span className="note-date">
                  {format(new Date(note.modified), 'MMM d, yyyy')}
                </span>
                {note.tags.length > 0 && (
                  <div className="note-tags">
                    {note.tags.map(tag => (
                      <span key={tag} className="note-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
