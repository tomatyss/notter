import React from 'react';
import { SortOption } from '../types';

/**
 * Props for the SortSelector component
 */
interface SortSelectorProps {
  /**
   * The currently selected sort option
   */
  currentSort: SortOption;
  
  /**
   * Callback when the sort option changes
   */
  onSortChange: (sort: SortOption) => void;
}

/**
 * Component for selecting how to sort notes
 * 
 * @param props Component props
 * @returns Sort selector UI component
 */
export const SortSelector: React.FC<SortSelectorProps> = ({ 
  currentSort, 
  onSortChange 
}) => {
  return (
    <div className="sort-selector">
      <div className="sort-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 5h10"></path>
          <path d="M11 9h7"></path>
          <path d="M11 13h4"></path>
          <path d="M3 17l3 3 3-3"></path>
          <path d="M6 5v15"></path>
        </svg>
      </div>
      <label htmlFor="sort-select">Sort by:</label>
      <select 
        id="sort-select"
        value={currentSort}
        onChange={(e) => onSortChange(e.target.value as SortOption)}
        className="sort-select"
      >
        <option value={SortOption.TitleAsc}>Name (A to Z)</option>
        <option value={SortOption.TitleDesc}>Name (Z to A)</option>
        <option value={SortOption.CreatedNewest}>Date Created (Newest)</option>
        <option value={SortOption.CreatedOldest}>Date Created (Oldest)</option>
        <option value={SortOption.ModifiedNewest}>Date Modified (Newest)</option>
        <option value={SortOption.ModifiedOldest}>Date Modified (Oldest)</option>
      </select>
    </div>
  );
};
