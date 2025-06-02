import React, { useEffect, useState } from 'react';
import './SubnotesSection.css';
import { invoke } from '@tauri-apps/api/core';
import { SubnoteInfo, Note } from '../../types';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { AddSubnoteButton } from '../AddSubnoteButton';

interface SubnotesSectionProps {
  noteId: string;
  currentNote: Note;
  onSelectNote?: (id: string) => void;
  onSubnoteCreated?: (note: Note) => void;
}

/**
 * Displays a list of subnotes for a parent note with content previews
 * 
 * @param props Component props
 * @returns Subnotes section UI component
 */
export const SubnotesSection: React.FC<SubnotesSectionProps> = ({
  noteId,
  currentNote,
  onSelectNote,
  onSubnoteCreated
}) => {
  const [subnotes, setSubnotes] = useState<SubnoteInfo[]>([]);
  const [subnoteContents, setSubnoteContents] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSubnotes = async () => {
      try {
        setLoading(true);
        setError(null);

        const subnotes = await invoke<SubnoteInfo[]>('get_subnotes', {
          parentId: noteId
        });

        setSubnotes(subnotes);

        // Load content previews for each subnote
        const contentPromises = subnotes.map(async (subnoteInfo) => {
          try {
            const note = await invoke<Note>('get_note', { id: subnoteInfo.note.id });
            return { id: subnoteInfo.note.id, content: note.content };
          } catch {
            return { id: subnoteInfo.note.id, content: '' };
          }
        });

        const contents = await Promise.all(contentPromises);
        const contentMap = contents.reduce((acc, { id, content }) => {
          acc[id] = content;
          return acc;
        }, {} as Record<string, string>);

        setSubnoteContents(contentMap);
      } catch (err) {
        setError(`Failed to load subnotes: ${err}`);
      } finally {
        setLoading(false);
      }
    };

    loadSubnotes();
  }, [noteId]);

  /**
   * Truncates content for preview display
   */
  const getContentPreview = (content: string, maxLength: number = 300): string => {
    if (!content) return '';

    // Remove markdown formatting for cleaner preview
    const cleanContent = content
      .replace(/#{1,6}\s+/g, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links, keep text
      .replace(/`(.*?)`/g, '$1') // Remove inline code
      .trim();

    return cleanContent.length > maxLength
      ? cleanContent.substring(0, maxLength) + '...'
      : cleanContent;
  };

  /**
   * Handles when a new subnote is created
   */
  const handleSubnoteCreated = (newNote: Note) => {
    // Refresh the subnotes list
    const loadSubnotes = async () => {
      try {
        const subnotes = await invoke<SubnoteInfo[]>('get_subnotes', {
          parentId: noteId
        });
        setSubnotes(subnotes);
      } catch (err) {
        console.error('Failed to refresh subnotes:', err);
      }
    };
    
    loadSubnotes();
    
    // Call the parent callback
    if (onSubnoteCreated) {
      onSubnoteCreated(newNote);
    }
    
    // Navigate to the new subnote
    if (onSelectNote) {
      onSelectNote(newNote.id);
    }
  };

  if (loading) {
    return (
      <div className="subnotes-section">
        <div className="subnotes-header">
          <h3>Subnotes</h3>
          <AddSubnoteButton
            currentNote={currentNote}
            onSubnoteCreated={handleSubnoteCreated}
            disabled={true}
          />
        </div>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="subnotes-section">
        <div className="subnotes-header">
          <h3>Subnotes</h3>
          <AddSubnoteButton
            currentNote={currentNote}
            onSubnoteCreated={handleSubnoteCreated}
          />
        </div>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="subnotes-section">
      <div className="subnotes-header">
        <h3>Subnotes ({subnotes.length})</h3>
        <AddSubnoteButton
          currentNote={currentNote}
          onSubnoteCreated={handleSubnoteCreated}
        />
      </div>
      
      {subnotes.length > 0 ? (
        <ul className="subnotes-list">
          {subnotes.map((subnoteInfo) => {
            const content = subnoteContents[subnoteInfo.note.id] || '';
            const preview = getContentPreview(content);

            return (
              <li
                key={subnoteInfo.note.id}
                className={`subnote-item depth-${subnoteInfo.depth}`}
                onClick={() => onSelectNote?.(subnoteInfo.note.id)}
              >
                <div className="subnote-header">
                  <span className="subnote-title">{subnoteInfo.note.title}</span>
                  <span className="subnote-depth">Level {subnoteInfo.depth}</span>
                </div>

                {preview && (
                  <div className="subnote-preview">
                    {preview}
                  </div>
                )}

                <div className="subnote-meta">
                  <span className="subnote-modified">
                    Modified: {new Date(subnoteInfo.note.modified).toLocaleDateString()}
                  </span>
                  {subnoteInfo.note.tags.length > 0 && (
                    <div className="subnote-tags">
                      {subnoteInfo.note.tags.map(tag => (
                        <span key={tag} className="subnote-tag">#{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="no-subnotes">
          <p>No subnotes yet. Click the button above to create your first subnote!</p>
        </div>
      )}
    </div>
  );
};
