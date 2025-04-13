/**
 * Application configuration
 */
export interface AppConfig {
  /**
   * Path to the directory containing notes
   */
  notes_dir: string | null;
}

/**
 * Represents the type of a note file
 */
export enum NoteType {
  /**
   * Markdown formatted note
   */
  Markdown = "Markdown",
  
  /**
   * Plain text note
   */
  PlainText = "PlainText"
}

/**
 * Represents a note in the system
 */
export interface Note {
  /**
   * Unique identifier for the note
   */
  id: string;
  
  /**
   * Title of the note
   */
  title: string;
  
  /**
   * Content of the note
   */
  content: string;
  
  /**
   * When the note was created
   */
  created: string;
  
  /**
   * When the note was last modified
   */
  modified: string;
  
  /**
   * Tags associated with the note
   */
  tags: string[];
  
  /**
   * Type of the note (markdown or plain text)
   */
  file_type: NoteType;
}

/**
 * Represents a note summary for listing
 */
export interface NoteSummary {
  /**
   * Unique identifier for the note
   */
  id: string;
  
  /**
   * Title of the note
   */
  title: string;
  
  /**
   * When the note was created
   */
  created: string;
  
  /**
   * When the note was last modified
   */
  modified: string;
  
  /**
   * Tags associated with the note
   */
  tags: string[];
  
  /**
   * Type of the note (markdown or plain text)
   */
  file_type: NoteType;
}

/**
 * Search result with highlighting information
 */
export interface SearchResult {
  /**
   * The note summary
   */
  note: NoteSummary;
  
  /**
   * Highlighted snippets from the content
   */
  snippets: string[];
  
  /**
   * Search relevance score
   */
  score: number;
}
