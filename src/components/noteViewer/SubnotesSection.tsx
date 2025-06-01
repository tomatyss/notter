import React, { useEffect, useState } from 'react';
import './SubnotesSection.css';
import { invoke } from '@tauri-apps/api/core';
import { SubnoteInfo, Note } from '../../types';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface SubnotesSectionProps {
  noteId: string;
  onSelectNote?: (id: string) => void;
}

/**
 * Displays a list of subnotes for a parent note with content previews
 * 
 * @param props Component props
 * @returns Subnotes section UI component
 */
export const SubnotesSection: React.FC<SubnotesSectionProps> = ({
  noteId,
  onSelectNote
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

  if (loading) {
    return (
      <div className="subnotes-section">
        <h3>Subnotes</h3>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="subnotes-section">
        <h3>Subnotes</h3>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  if (subnotes.length === 0) {
    return null;
  }

  return (
    <div className="subnotes-section">
      <h3>Subnotes ({subnotes.length})</h3>
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
    </div>
  );
};
