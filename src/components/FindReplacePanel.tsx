import React, { useState, useEffect, useRef } from 'react';

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
   * Callback when find is triggered
   */
  onFind: (text: string, options: FindOptions) => void;
  
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
  
  // Focus find input when panel becomes visible
  useEffect(() => {
    if (isVisible && findInputRef.current) {
      findInputRef.current.focus();
    }
  }, [isVisible]);
  
  // Trigger find when options change
  useEffect(() => {
    if (findText) {
      onFind(findText, { caseSensitive, wholeWord });
    }
  }, [caseSensitive, wholeWord, findText, onFind]);
  
  // Handle find text change
  const handleFindTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newText = e.target.value;
    setFindText(newText);
    onFind(newText, { caseSensitive, wholeWord });
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
      handleFindNext();
    }
    // Find previous on Shift+Enter
    else if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
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
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
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
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <button 
            className="find-button"
            onClick={handleFindNext}
            disabled={totalMatches === 0}
            title="Next match (Enter)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
      </div>
      
      <div className="find-options">
        <label className="option-label">
          <input
            type="checkbox"
            checked={caseSensitive}
            onChange={() => setCaseSensitive(!caseSensitive)}
          />
          Case sensitive
        </label>
        <label className="option-label">
          <input
            type="checkbox"
            checked={wholeWord}
            onChange={() => setWholeWord(!wholeWord)}
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
