/**
 * Mode for automatic search index updates
 */
export enum AutoUpdateMode {
  /**
   * Update only changed notes
   */
  Incremental = "Incremental",
  
  /**
   * Rebuild entire index periodically
   */
  Periodic = "Periodic",
  
  /**
   * Incremental updates + periodic rebuilds
   */
  Hybrid = "Hybrid"
}

/**
 * Application configuration
 */
export interface AppConfig {
  /**
   * Path to the directory containing notes
   */
  notes_dir: string | null;
  
  /**
   * Pattern for naming new notes
   * Supports placeholders: {number}, {title}, {extension}
   */
  note_naming_pattern: string | null;
  
  /**
   * Default note type for new notes
   */
  default_note_type: NoteType | null;
  
  /**
   * Whether to automatically update the search index when notes change
   */
  auto_update_search_index: boolean;
  
  /**
   * Mode for automatic search index updates
   */
  auto_update_mode: AutoUpdateMode;
  
  /**
   * Interval for periodic index rebuilds (in minutes)
   */
  auto_update_interval: number;
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

/**
 * Information about a subnote with hierarchy depth
 */
export interface SubnoteInfo {
  /**
   * The note summary
   */
  note: NoteSummary;
  
  /**
   * Depth in the hierarchy (1 = direct child, 2 = grandchild, etc.)
   */
  depth: number;
}
