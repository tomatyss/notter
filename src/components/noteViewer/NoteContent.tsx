import React, { RefObject } from 'react';
import ReactMarkdown from 'react-markdown';
import { Note, NoteType } from '../../types';
import { createMatchSegments, noteLinkRegex, urlRegex, isValidUrl, normalizeUrl, getTextNodesIn } from '../../utils/textUtils';

/**
 * Props for the NoteContent component
 */
interface NoteContentProps {
  /**
   * The note to display
   */
  note: Note;
  
  /**
   * Whether the note is in edit mode
   */
  isEditing: boolean;
  
  /**
   * The edited content value
   */
  editedContent: string;
  
  /**
   * Whether the note is being saved
   */
  isSaving: boolean;
  
  /**
   * Reference to the content element
   */
  contentRef: RefObject<HTMLDivElement>;
  
  /**
   * Array of match positions for search
   */
  matches: number[];
  
  /**
   * Current match index (1-based)
   */
  currentMatchIndex: number;
  
  /**
   * Last search text
   */
  lastSearchText: string;
  
  /**
   * Callback when content is changed
   */
  onContentChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  
  /**
   * Callback when content loses focus
   */
  onContentBlur: () => void;
  
  /**
   * Callback when key is pressed in content
   */
  onContentKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  
  /**
   * Callback when content is double-clicked
   */
  onContentDoubleClick: (position?: number) => void;
  
  /**
   * Reference to the textarea element
   */
  textareaRef?: RefObject<HTMLTextAreaElement>;
  
  /**
   * Callback when a note link is clicked
   */
  onNoteLinkClick: (noteTitle: string) => void;
  
  /**
   * Callback when an external link is clicked
   */
  onExternalLinkClick: (url: string) => void;
}

/**
 * Component for displaying and editing note content
 * 
 * @param props Component props
 * @returns Note content UI component
 */
export const NoteContent: React.FC<NoteContentProps> = ({
  note,
  isEditing,
  editedContent,
  isSaving,
  contentRef,
  matches,
  currentMatchIndex,
  lastSearchText,
  onContentChange,
  onContentBlur,
  onContentKeyDown,
  onContentDoubleClick,
  textareaRef,
  onNoteLinkClick,
  onExternalLinkClick
}) => {
  /**
   * Render plain text with note links and external URLs
   * 
   * @param content The note content to render
   * @returns React elements with clickable links
   */
  const renderPlainTextWithLinks = (content: string) => {
    if (!content) return null;
    
    // No need to create a copy of the content
    const parts: React.ReactNode[] = [];
    
    // Step 1: Extract all note links and replace with placeholders
    const noteLinks: {index: number, title: string, length: number}[] = [];
    
    let match;
    while ((match = noteLinkRegex.exec(content)) !== null) {
      noteLinks.push({
        index: match.index,
        title: match[1],
        length: match[0].length
      });
    }
    
    // Step 2: Extract all URLs and replace with placeholders
    const urlMatches = [...content.matchAll(urlRegex)];
    const urls: {index: number, url: string, length: number}[] = [];
    
    for (const match of urlMatches) {
      // Skip URLs that are part of note links
      const isInsideNoteLink = noteLinks.some(link => 
        match.index >= link.index && 
        match.index < link.index + link.length
      );
      
      if (!isInsideNoteLink && match.index !== undefined) {
        urls.push({
          index: match.index,
          url: match[0],
          length: match[0].length
        });
      }
    }
    
    // Step 3: Sort all links by their position in the text
    const allLinks = [
      ...noteLinks.map(link => ({
        type: 'note' as const,
        index: link.index,
        content: link.title,
        length: link.length
      })),
      ...urls.map(url => ({
        type: 'url' as const,
        index: url.index,
        content: url.url,
        length: url.length
      }))
    ].sort((a, b) => a.index - b.index);
    
    // Step 4: Build the final content with all links properly handled
    let lastIndex = 0;
    
    for (const link of allLinks) {
      // Add text before the link
      if (link.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {content.substring(lastIndex, link.index)}
          </span>
        );
      }
      
      // Add the link with appropriate handler and styling
      if (link.type === 'note') {
        parts.push(
          <span 
            key={`note-link-${link.index}`}
            className="note-link"
            onClick={() => onNoteLinkClick(link.content)}
            style={{ color: '#0366d6', cursor: 'pointer', textDecoration: 'underline' }}
            title={`Open note: ${link.content}`}
          >
            {link.content}
          </span>
        );
      } else { // URL link
        parts.push(
          <span 
            key={`url-${link.index}`}
            className="external-link"
            onClick={() => onExternalLinkClick(normalizeUrl(link.content))}
            style={{ color: '#0366d6', cursor: 'pointer', textDecoration: 'underline' }}
            title={`Open ${link.content} in browser`}
          >
            {link.content}
          </span>
        );
      }
      
      // Update lastIndex to after the link
      lastIndex = link.index + link.length;
    }
    
    // Add remaining text after the last link
    if (lastIndex < content.length) {
      parts.push(
        <span key={`text-end`}>
          {content.substring(lastIndex)}
        </span>
      );
    }
    
    return parts.length > 0 ? parts : <span>{content}</span>;
  };
  
  /**
   * Custom component for ReactMarkdown to handle [[Note Title]] syntax and external links
   */
  const MarkdownWithLinks = ({ content }: { content: string }) => {
    // Process the content to handle [[Note Title]] patterns
    // We'll replace [[Note Title]] with a custom link format that ReactMarkdown can process
    const processedContent = content.replace(
      /\[\[(.*?)\]\]/g, 
      (_, noteTitle) => `[${noteTitle}](#note-link-${encodeURIComponent(noteTitle)})`
    );
      
    return (
      <ReactMarkdown
        components={{
          a: ({ node, ...props }) => {
            const href = props.href || '';
            
            // Check if this is one of our note links
            if (href.startsWith('#note-link-')) {
              const noteTitle = decodeURIComponent(href.substring('#note-link-'.length));
              return (
                <span 
                  className="note-link"
                  onClick={() => onNoteLinkClick(noteTitle)}
                  style={{ color: '#0366d6', cursor: 'pointer', textDecoration: 'underline' }}
                  title={`Open note: ${noteTitle}`}
                >
                  {props.children}
                </span>
              );
            }
            
            // External link handling - open in default browser
            if (isValidUrl(href)) {
              return (
                <span 
                  className="external-link"
                  onClick={() => onExternalLinkClick(href)}
                  style={{ color: '#0366d6', cursor: 'pointer', textDecoration: 'underline' }}
                  title={`Open ${href} in browser`}
                >
                  {props.children}
                </span>
              );
            }
            
            // Regular link handling for other links
            return <a {...props} />;
          }
        }}
      >
        {processedContent}
      </ReactMarkdown>
    );
  };
  
  /**
   * Render content with highlighted search matches
   */
  const renderContentWithHighlightedMatches = () => {
    // Create segments with match information
    const segments = createMatchSegments(note.content, matches, lastSearchText.length, currentMatchIndex);
    
    // Render segments with appropriate highlighting
    return segments.map(segment => {
      if (segment.isMatch) {
        return (
          <span 
            key={segment.key} 
            className={`highlight-match${segment.isCurrentMatch ? ' current' : ''}`}
          >
            {segment.text}
          </span>
        );
      } else {
        return <span key={segment.key}>{segment.text}</span>;
      }
    });
  };
  
  /**
   * Calculate the text position from a mouse event
   * 
   * @param e The mouse event
   * @returns The position in the text
   */
  const calculateTextPosition = (e: React.MouseEvent) => {
    if (!contentRef.current || !note) return 0;
    
    // Get all text nodes in the content element
    const textNodes = getTextNodesIn(contentRef.current);
    const range = document.caretRangeFromPoint(e.clientX, e.clientY);
    
    if (!range) return 0;
    
    // Find the clicked node and offset
    const clickedNode = range.startContainer;
    const clickedOffset = range.startOffset;
    
    // Calculate the total offset by summing the lengths of all nodes before the clicked node
    let totalOffset = 0;
    for (const node of textNodes) {
      if (node === clickedNode) {
        totalOffset += clickedOffset;
        break;
      }
      totalOffset += node.textContent?.length || 0;
    }
    
    return totalOffset;
  };
  
  /**
   * Handle double click with position calculation
   */
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!isEditing && note) {
      const position = calculateTextPosition(e);
      onContentDoubleClick(position);
    }
  };

  return (
    <div 
      className="note-content" 
      onDoubleClick={handleDoubleClick}
      ref={contentRef}
      title="Double-click to edit"
    >
      {isEditing ? (
        <div className="editor-container">
          <textarea
            ref={textareaRef}
            value={editedContent}
            onChange={onContentChange}
            onBlur={onContentBlur}
            onKeyDown={onContentKeyDown}
            className="content-editor"
            autoFocus
          />
          {isSaving && <span className="autosave-indicator">Saving...</span>}
        </div>
      ) : note.file_type === NoteType.Markdown ? (
        <div className="markdown-content editable">
          <MarkdownWithLinks content={note.content} />
        </div>
      ) : (
        <pre className="plain-text-content editable">
          {!isEditing && matches.length > 0 ? (
            renderContentWithHighlightedMatches()
          ) : (
            renderPlainTextWithLinks(note.content)
          )}
        </pre>
      )}
    </div>
  );
};
