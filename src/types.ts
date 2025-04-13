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
   * Content of the note in markdown format
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
}
