import React from 'react';
import { format } from 'date-fns';
import { NoteSummary, SortOption, Note } from '../types';
import { SortSelector } from './SortSelector';
import { NewNoteButton } from './NewNoteButton';

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
   * Callback when a new note is created
   */
  onNoteCreated: (note: Note) => void;
  
  /**
   * Currently selected note ID
   */
  selectedNoteId?: string;
  
  /**
   * Whether the component is in a loading state
   */
  loading: boolean;
  
  /**
   * The currently selected sort option
   */
  currentSort: SortOption;
  
  /**
   * Callback when the sort option changes
   */
  onSortChange: (sort: SortOption) => void;
  
  /**
   * Filtered notes when tag filtering is active
   */
  filteredNotes?: NoteSummary[];
  
  /**
   * Whether tag filtering is currently active
   */
  isFiltering?: boolean;
  
  /**
   * Currently selected tags for filtering
   */
  selectedTags?: string[];
  
  /**
   * Callback when a tag is selected for filtering
   */
  onTagSelect?: (tag: string) => void;
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
  onNoteCreated,
  selectedNoteId,
  loading,
  currentSort,
  onSortChange,
  filteredNotes,
  isFiltering = false,
  selectedTags = [],
  onTagSelect
}) => {
  // Determine which notes to display
  const displayNotes = isFiltering && filteredNotes ? filteredNotes : notes;
  return (
    <div className="note-list">
      <div className="note-list-header">
        <h2>Notes</h2>
        <NewNoteButton 
          onNoteCreated={onNoteCreated}
          disabled={loading}
        />
      </div>
      <div className="sort-container">
        <SortSelector 
          currentSort={currentSort} 
          onSortChange={onSortChange} 
        />
      </div>
      
      {selectedTags.length > 0 && (
        <div className="active-filters">
          <span>Filtered by: </span>
          {selectedTags.map(tag => (
            <span key={tag} className="active-filter-tag">
              {tag}
            </span>
          ))}
        </div>
      )}
      
      {loading ? (
        <div className="loading-indicator">Loading notes...</div>
      ) : displayNotes.length === 0 ? (
        <div className="empty-state">
          {selectedTags.length > 0 ? 'No notes match the selected tags' : 'No notes found'}
        </div>
      ) : (
        <ul className="notes-container">
          {displayNotes.map(note => (
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
                        <span 
                          key={tag} 
                          className={`note-tag ${selectedTags.includes(tag) ? 'selected' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onTagSelect) {
                              onTagSelect(tag);
                            }
                          }}
                        >
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
      )}
    </div>
  );
};
