import React from 'react';
import { format } from 'date-fns';
import { NoteSummary } from '../../types';

/**
 * Props for the BacklinksSection component
 */
interface BacklinksSectionProps {
  /**
   * Array of backlinks to display
   */
  backlinks: NoteSummary[];
  
  /**
   * Whether backlinks are loading
   */
  backlinksLoading: boolean;
  
  /**
   * Callback when a note is selected
   */
  onSelectNote?: (id: string) => void;
}

/**
 * Component for displaying backlinks to the current note
 * 
 * @param props Component props
 * @returns Backlinks section UI component
 */
export const BacklinksSection: React.FC<BacklinksSectionProps> = ({
  backlinks,
  backlinksLoading,
  onSelectNote
}) => {
  // If loading, show loading indicator
  if (backlinksLoading) {
    return (
      <div className="backlinks-section">
        <h3>Linked from</h3>
        <div className="loading-indicator">Loading backlinks...</div>
      </div>
    );
  }
  
  // If no backlinks, don't render anything
  if (backlinks.length === 0) {
    return null;
  }
  
  return (
    <div className="backlinks-section">
      <h3>Linked from</h3>
      <ul className="backlinks-list">
        {backlinks.map(link => (
          <li key={link.id} className="backlink-item">
            <span 
              className="backlink-title note-link"
              onClick={() => onSelectNote && onSelectNote(link.id)}
            >
              {link.title}
            </span>
            <span className="backlink-date">
              {format(new Date(link.modified), 'MMM d, yyyy')}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
