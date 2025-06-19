import React, { useState } from 'react';
import { Icon, IconName } from '../components/common';

/**
 * Props for the TagFilter component
 */
interface TagFilterProps {
  /**
   * All available tags in the system
   */
  allTags: string[];
  
  /**
   * Currently selected tags for filtering
   */
  selectedTags: string[];
  
  /**
   * Callback when selected tags change
   */
  onTagsChange: (tags: string[]) => void;
  
  /**
   * Whether to match all selected tags (AND) or any tag (OR)
   */
  matchAll: boolean;
  
  /**
   * Callback when match mode changes
   */
  onMatchAllChange: (matchAll: boolean) => void;
}

/**
 * Component for filtering notes by tags
 * 
 * @param props Component props
 * @returns Tag filter UI component
 */
export const TagFilter: React.FC<TagFilterProps> = ({
  allTags,
  selectedTags,
  onTagsChange,
  matchAll,
  onMatchAllChange
}) => {
  // State to track if the tag filter is expanded or collapsed
  const [isExpanded, setIsExpanded] = useState(false);
  // State for quick tag search
  const [query, setQuery] = useState("");
  /**
   * Toggle a tag's selection state
   * 
   * @param tag The tag to toggle
   */
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter(t => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  /**
   * Clear all selected tags
   */
  const clearFilters = () => {
    onTagsChange([]);
  };

  /**
   * Toggle the expanded/collapsed state of the tag filter
   */
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // If there are no tags, don't render anything
  if (allTags.length === 0) {
    return null;
  }

  // Filter tags based on the search query
  const visibleTags =
    query.length >= 3
      ? allTags.filter((t) => t.toLowerCase().startsWith(query.toLowerCase()))
      : allTags;

  return (
    <div className="tag-filter">
      <div className="tag-filter-header" onClick={toggleExpanded}>
        <h3>
          <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
            {isExpanded ? (
              <Icon name={IconName.ChevronDown} title="Collapse tag filter" />
            ) : (
              <Icon name={IconName.ChevronRight} title="Expand tag filter" />
            )}
          </span>
          Filter by Tags {selectedTags.length > 0 && `(${selectedTags.length})`}
        </h3>
        {selectedTags.length > 0 && (
          <button 
            className="clear-filters-button" 
            onClick={(e) => {
              e.stopPropagation(); // Prevent toggling expansion when clicking clear
              clearFilters();
            }}
          >
            Clear
          </button>
        )}
      </div>
      
      {isExpanded && (
        <>
          {selectedTags.length > 0 && (
            <div className="match-option">
              <label>
                <input
                  type="checkbox"
                  checked={matchAll}
                  onChange={(e) => onMatchAllChange(e.target.checked)}
                />
                Match all selected tags
              </label>
            </div>
          )}

          <div
            className="tag-search"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="text"
              className="tag-search-input"
              placeholder="Search tags..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          
          <div className="selected-tags">
            {selectedTags.length > 0 && (
              <div className="active-filters">
                <span>Active filters: </span>
                {selectedTags.map(tag => (
                  <span 
                    key={tag} 
                    className="active-filter-tag"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag} ×
                  </span>
                ))}
              </div>
            )}
          </div>
          
          <div className="all-tags-container">
            <div className="all-tags">
              {visibleTags.map((tag) => (
                <span
                  key={tag}
                  className={`filter-tag ${selectedTags.includes(tag) ? "selected" : ""}`}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </span>
              ))}
              {visibleTags.length === 0 && (
                <span className="no-tags">No matching tags</span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
