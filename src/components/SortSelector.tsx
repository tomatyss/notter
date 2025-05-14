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
