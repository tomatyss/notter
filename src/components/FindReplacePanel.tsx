import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Icon, IconName } from '../components/common';

/**
 * Props for the FindReplacePanel component
 */
interface FindReplacePanelProps {
  /**
   * Whether the panel is visible
   */
  isVisible: boolean;

  /**
   * Callback when the panel should be closed
   */
  onClose: () => void;

  /**
   * Callback when search state should be cleared
   */
  onClearSearch?: () => void;

  /**
   * Callback when find is triggered
   */
  onFind: (text: string, options: FindOptions, skipScroll?: boolean) => void;

  /**
   * Callback when find next is triggered
   */
  onFindNext: () => void;

  /**
   * Callback when find previous is triggered
   */
  onFindPrevious: () => void;

  /**
   * Callback when replace is triggered
   */
  onReplace: (replacement: string) => void;

  /**
   * Callback when replace all is triggered
   */
  onReplaceAll: (replacement: string) => void;

  /**
   * Total number of matches found
   */
  totalMatches: number;

  /**
   * Current match index (1-based)
   */
  currentMatchIndex: number;
}

/**
 * Options for find functionality
 */
export interface FindOptions {
  /**
   * Whether the search is case sensitive
   */
  caseSensitive: boolean;

  /**
   * Whether to match whole words only
   */
  wholeWord: boolean;
}

/**
 * Component for finding and replacing text within a note
 * 
 * @param props Component props
 * @returns Find and replace panel UI component
 */
export const FindReplacePanel: React.FC<FindReplacePanelProps> = ({
  isVisible,
  onClose,
  onClearSearch,
  onFind,
  onFindNext,
  onFindPrevious,
  onReplace,
  onReplaceAll,
  totalMatches,
  currentMatchIndex
}) => {
  // State for find and replace text
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');

  // State for search options
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);

  // State for showing replace options
  const [showReplace, setShowReplace] = useState(false);

  // Ref for find input to focus on open
  const findInputRef = useRef<HTMLInputElement>(null);

  // Ref for debounce timer
  const debounceTimerRef = useRef<number | null>(null);

  // Focus find input when panel becomes visible and clear state when hidden
  useEffect(() => {
    if (isVisible && findInputRef.current) {
      findInputRef.current.focus();
    } else if (!isVisible) {
      // Clear search state when panel is closed
      setFindText('');
      setReplaceText('');
      if (onClearSearch) {
        onClearSearch();
      }
    }
  }, [isVisible, onClearSearch]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Debounced search function
  const debouncedSearch = useCallback((text: string, options: FindOptions) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      onFind(text, options, true); // Skip scroll during typing
    }, 300); // 300ms debounce
  }, [onFind]);

  // Handle option changes without triggering immediate search
  const handleCaseSensitiveChange = () => {
    const newCaseSensitive = !caseSensitive;
    setCaseSensitive(newCaseSensitive);
    if (findText) {
      // Use debounced search for option changes too
      debouncedSearch(findText, { caseSensitive: newCaseSensitive, wholeWord });
    }
  };

  const handleWholeWordChange = () => {
    const newWholeWord = !wholeWord;
    setWholeWord(newWholeWord);
    if (findText) {
      // Use debounced search for option changes too
      debouncedSearch(findText, { caseSensitive, wholeWord: newWholeWord });
    }
  };

  // Handle find text change with debouncing
  const handleFindTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newText = e.target.value;
    setFindText(newText);

    // Clear search immediately if text is empty
    if (!newText) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      onFind('', { caseSensitive, wholeWord });
    } else {
      // Use debounced search for non-empty text
      debouncedSearch(newText, { caseSensitive, wholeWord });
    }
  };

  // Handle initial search when user finishes typing (on blur or explicit action)
  const handleInitialSearch = () => {
    if (findText) {
      // Clear any pending debounced search
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      // Trigger search with scrolling enabled
      onFind(findText, { caseSensitive, wholeWord }, false);
    }
  };

  // Handle replace text change
  const handleReplaceTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setReplaceText(e.target.value);
  };

  // Handle find next button click
  const handleFindNext = () => {
    if (findText) {
      onFindNext();
    }
  };

  // Handle find previous button click
  const handleFindPrevious = () => {
    if (findText) {
      onFindPrevious();
    }
  };

  // Handle replace button click
  const handleReplace = () => {
    if (findText && totalMatches > 0) {
      onReplace(replaceText);
    }
  };

  // Handle replace all button click
  const handleReplaceAll = () => {
    if (findText && totalMatches > 0) {
      onReplaceAll(replaceText);
    }
  };

  // Handle key down events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Close on Escape
    if (e.key === 'Escape') {
      onClose();
    }
    // Find next on Enter
    else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Trigger immediate search if there's pending debounced search
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        onFind(findText, { caseSensitive, wholeWord }, false); // Allow scroll for explicit navigation
      }
      handleFindNext();
    }
    // Find previous on Shift+Enter
    else if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      // Trigger immediate search if there's pending debounced search
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        onFind(findText, { caseSensitive, wholeWord }, false); // Allow scroll for explicit navigation
      }
      handleFindPrevious();
    }
  };

  // Toggle replace section
  const toggleReplace = () => {
    setShowReplace(!showReplace);
  };

  if (!isVisible) return null;

  return (
    <div className="find-replace-panel" onKeyDown={handleKeyDown}>
      <div className="find-replace-header">
        <button
          className="toggle-replace-button"
          onClick={toggleReplace}
          title={showReplace ? "Hide replace" : "Show replace"}
        >
          {showReplace ? "Find" : "Find & Replace"}
        </button>
        <button
          className="close-button"
          onClick={onClose}
          title="Close"
        >
          <Icon name={IconName.Close} title="Close" />
        </button>
      </div>

      <div className="find-section">
        <div className="find-input-container">
          <input
            ref={findInputRef}
            type="text"
            className="find-input"
            placeholder="Find..."
            value={findText}
            onChange={handleFindTextChange}
            onBlur={handleInitialSearch}
          />
          <div className="find-count">
            {totalMatches > 0 ? `${currentMatchIndex} of ${totalMatches}` : 'No matches'}
          </div>
        </div>

        <div className="find-actions">
          <button
            className="find-button"
            onClick={handleFindPrevious}
            disabled={totalMatches === 0}
            title="Previous match (Shift+Enter)"
          >
            <Icon name={IconName.ChevronLeft} title="Previous match" />
          </button>
          <button
            className="find-button"
            onClick={handleFindNext}
            disabled={totalMatches === 0}
            title="Next match (Enter)"
          >
            <Icon name={IconName.ChevronRight} title="Next match" />
          </button>
        </div>
      </div>

      <div className="find-options">
        <label className="option-label">
          <input
            type="checkbox"
            checked={caseSensitive}
            onChange={handleCaseSensitiveChange}
          />
          Case sensitive
        </label>
        <label className="option-label">
          <input
            type="checkbox"
            checked={wholeWord}
            onChange={handleWholeWordChange}
          />
          Whole word
        </label>
      </div>

      {showReplace && (
        <div className="replace-section">
          <div className="replace-input-container">
            <input
              type="text"
              className="replace-input"
              placeholder="Replace with..."
              value={replaceText}
              onChange={handleReplaceTextChange}
            />
          </div>

          <div className="replace-actions">
            <button
              className="replace-button"
              onClick={handleReplace}
              disabled={totalMatches === 0}
              title="Replace current match"
            >
              Replace
            </button>
            <button
              className="replace-all-button"
              onClick={handleReplaceAll}
              disabled={totalMatches === 0}
              title="Replace all matches"
            >
              Replace All
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
