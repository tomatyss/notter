import { invoke } from '@tauri-apps/api/core';
import { Note, NoteType, SearchResult } from '../types';
import { Tool } from './types';

/**
 * Tool for creating a new note
 */
export const createNoteTool: Tool = {
  id: 'create-note',
  name: 'Create Note',
  description: 'Creates a new note with the specified title and content',
  
  /**
   * Execute the create note tool
   * 
   * @param params - Parameters for creating a note
   * @param params.title - Title of the note
   * @param params.content - Content of the note
   * @param params.fileType - Type of the note (optional, defaults to Markdown)
   * @returns Promise resolving to the created note
   */
  async execute({ title, content, fileType = NoteType.Markdown }: { 
    title: string; 
    content: string; 
    fileType?: NoteType;
  }): Promise<Note> {
    try {
      // Use the existing note creation functionality via invoke
      const note = await invoke<Note>('create_note', {
        title,
        content,
        fileType,
        pattern: null
      });
      
      return note;
    } catch (error) {
      console.error('Error creating note:', error);
      throw new Error(`Failed to create note: ${error}`);
    }
  }
};

/**
 * Tool for updating an existing note
 */
export const updateNoteTool: Tool = {
  id: 'update-note',
  name: 'Update Note',
  description: 'Updates the content of an existing note',
  
  /**
   * Execute the update note tool
   * 
   * @param params - Parameters for updating a note
   * @param params.id - ID of the note to update
   * @param params.content - New content for the note
   * @returns Promise resolving to the updated note
   */
  async execute({ id, content }: { id: string; content: string }): Promise<Note> {
    try {
      // Use the existing note update functionality via invoke
      const note = await invoke<Note>('update_note_content', {
        id,
        content
      });
      
      return note;
    } catch (error) {
      console.error('Error updating note:', error);
      throw new Error(`Failed to update note: ${error}`);
    }
  }
};

/**
 * Tool for searching notes
 */
export const searchNotesTool: Tool = {
  id: 'search-notes',
  name: 'Search Notes',
  description: 'Searches for notes matching the query',
  
  /**
   * Execute the search notes tool
   * 
   * @param params - Parameters for searching notes
   * @param params.query - Search query
   * @param params.limit - Maximum number of results to return (optional, defaults to 5)
   * @returns Promise resolving to an array of search results
   */
  async execute({ query, limit = 5 }: { query: string; limit?: number }): Promise<SearchResult[]> {
    try {
      // Use the existing search functionality via invoke
      const results = await invoke<SearchResult[]>('search_notes', {
        query,
        limit
      });
      
      return results;
    } catch (error) {
      console.error('Error searching notes:', error);
      throw new Error(`Failed to search notes: ${error}`);
    }
  }
};
