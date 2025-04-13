import React from 'react';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { Note } from '../types';

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
}

/**
 * Component for displaying a note's content
 * 
 * @param props Component props
 * @returns Note viewer UI component
 */
export const NoteViewer: React.FC<NoteViewerProps> = ({ note, loading }) => {
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
      <div className="note-header">
        <h1 className="note-title">{note.title}</h1>
        <div className="note-meta">
          <div className="note-dates">
            <span className="note-date">
              Created: {format(new Date(note.created), 'MMM d, yyyy h:mm a')}
            </span>
            <span className="note-date">
              Modified: {format(new Date(note.modified), 'MMM d, yyyy h:mm a')}
            </span>
          </div>
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
      
      <div className="note-content">
        <ReactMarkdown>{note.content}</ReactMarkdown>
      </div>
    </div>
  );
};
