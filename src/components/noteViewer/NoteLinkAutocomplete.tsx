import React from 'react';
import { SearchResult } from '../../types';
import './NoteLinkAutocomplete.css';

interface NoteLinkAutocompleteProps {
  position: { top: number; left: number };
  suggestions: SearchResult[];
  selectedIndex: number;
  onSelect: (title: string) => void;
}

export const NoteLinkAutocomplete: React.FC<NoteLinkAutocompleteProps> = ({
  position,
  suggestions,
  selectedIndex,
  onSelect
}) => {
  if (suggestions.length === 0) return null;

  return (
    <ul
      className="note-link-autocomplete"
      style={{ top: position.top, left: position.left }}
    >
      {suggestions.map((result, index) => (
        <li
          key={result.note.id}
          className={index === selectedIndex ? 'selected' : undefined}
          onMouseDown={() => onSelect(result.note.title)}
        >
          {result.note.title}
        </li>
      ))}
    </ul>
  );
};
