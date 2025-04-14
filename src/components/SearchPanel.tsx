import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { SearchResult } from '../types';
import { debounce } from 'lodash';

/**
 * Props for the SearchPanel component
 */
interface SearchPanelProps {
  /**
   * Callback when a search result is selected
   */
  onSelectNote: (id: string) => void;
  
  /**
   * Whether the component is in a loading state
   */
  loading: boolean;
  
  /**
   * Function to determine whether to show the note list
   * Returns true if note list should be shown, false otherwise
   */
  showNoteList?: (query: string) => boolean;
  
  /**
   * Child components to render (typically the NoteList)
   */
  children?: React.ReactNode;
}

/**
 * Component for searching notes
 * 
 * @param props Component props
 * @returns Search panel UI component
 */
export const SearchPanel: React.FC<SearchPanelProps> = ({ 
  onSelectNote,
  loading,
  showNoteList = () => true,
  children
}) => {
  // State
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }
      
      try {
        setSearching(true);
        const searchResults = await invoke<SearchResult[]>('search_notes', { 
          query: searchQuery,
          limit: 50
        });
        setResults(searchResults);
        setError(null);
      } catch (err) {
        console.error('Search failed:', err);
        setError(`Search failed: ${err}`);
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300),
    []
  );
  
  // Trigger search when query changes
  useEffect(() => {
    debouncedSearch(query);
    
    // Cleanup
    return () => {
      debouncedSearch.cancel();
    };
  }, [query, debouncedSearch]);
  
  // Handle input change
  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };
  
  // Handle result selection
  const handleResultClick = (id: string) => {
    onSelectNote(id);
  };
  
  // Render HTML from highlighted snippets
  const renderSnippet = (html: string) => {
    return { __html: html };
  };
  
  // Determine if we should show search results or note list
  const hasSearchResults = results.length > 0;
  const shouldShowNoteList = showNoteList(query);
  
  // Handle clear search
  const handleClearSearch = () => {
    setQuery('');
    setResults([]);
  };
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div className="search-panel" style={{ flex: 'none' }}>
        <div className="search-input-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search notes..."
            value={query}
            onChange={handleQueryChange}
            disabled={loading}
          />
          {query && !searching && (
            <button 
              className="clear-search-button" 
              onClick={handleClearSearch}
              aria-label="Clear search"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
          {searching && <div className="search-spinner"></div>}
        </div>
        
        {error && (
          <div className="search-error">
            {error}
          </div>
        )}
      </div>
      
      {hasSearchResults ? (
        <div className="search-results">
          <h3>Search Results</h3>
          <ul className="results-list">
            {results.map(result => (
              <li 
                key={result.note.id} 
                className="search-result-item"
                onClick={() => handleResultClick(result.note.id)}
              >
                <h4 className="result-title">{result.note.title}</h4>
                
                {result.snippets.length > 0 && (
                  <div className="result-snippets">
                    {result.snippets.map((snippet, index) => (
                      <div 
                        key={index}
                        className="result-snippet"
                        dangerouslySetInnerHTML={renderSnippet(snippet)}
                      />
                    ))}
                  </div>
                )}
                
                {result.note.tags.length > 0 && (
                  <div className="result-tags">
                    {result.note.tags.map(tag => (
                      <span key={tag} className="result-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : query.trim() !== '' && !searching ? (
        <div className="no-results">
          No results found
        </div>
      ) : shouldShowNoteList ? (
        children
      ) : null}
    </div>
  );
};
