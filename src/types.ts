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
 * Options for sorting notes
 */
export enum SortOption {
  /**
   * Sort by title alphabetically (A-Z)
   */
  TitleAsc = "TitleAsc",
  
  /**
   * Sort by title reverse alphabetically (Z-A)
   */
  TitleDesc = "TitleDesc",
  
  /**
   * Sort by creation date (newest first)
   */
  CreatedNewest = "CreatedNewest",
  
  /**
   * Sort by creation date (oldest first)
   */
  CreatedOldest = "CreatedOldest",
  
  /**
   * Sort by modification date (newest first)
   */
  ModifiedNewest = "ModifiedNewest",
  
  /**
   * Sort by modification date (oldest first)
   */
  ModifiedOldest = "ModifiedOldest"
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
  
  /**
   * File path relative to the notes directory
   */
  path: string;
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
