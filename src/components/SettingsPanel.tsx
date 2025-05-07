import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { AppConfig, NoteType } from '../types';

/**
 * Props for the SettingsPanel component
 */
interface SettingsPanelProps {
  /**
   * Current application configuration
   */
  config: AppConfig | null;
  
  /**
   * Callback when configuration is updated
   */
  onConfigUpdate: (config: AppConfig) => void;
  
  /**
   * Whether the component is in a loading state
   */
  loading: boolean;
}

/**
 * Component for displaying and editing application settings
 * 
 * @param props Component props
 * @returns Settings panel UI component
 */
export const SettingsPanel: React.FC<SettingsPanelProps> = ({ 
  config, 
  onConfigUpdate,
  loading 
}) => {
  // Local state
  const [selectingFolder, setSelectingFolder] = useState(false);
  const [rebuildingIndex, setRebuildingIndex] = useState(false);
  const [rebuildError, setRebuildError] = useState<string | null>(null);
  const [rebuildSuccess, setRebuildSuccess] = useState(false);
  const [namingPattern, setNamingPattern] = useState<string>('');
  const [savingPattern, setSavingPattern] = useState(false);
  const [patternError, setPatternError] = useState<string | null>(null);
  const [patternSuccess, setPatternSuccess] = useState(false);
  const [defaultNoteType, setDefaultNoteType] = useState<NoteType>(NoteType.Markdown);
  const [savingNoteType, setSavingNoteType] = useState(false);
  const [noteTypeError, setNoteTypeError] = useState<string | null>(null);
  const [noteTypeSuccess, setNoteTypeSuccess] = useState(false);
  
  // Initialize naming pattern and default note type from config
  useEffect(() => {
    if (config?.note_naming_pattern) {
      setNamingPattern(config.note_naming_pattern);
    } else {
      setNamingPattern('{number}-{title}.{extension}');
    }
    
    if (config?.default_note_type) {
      setDefaultNoteType(config.default_note_type);
    } else {
      setDefaultNoteType(NoteType.Markdown);
    }
  }, [config]);

  /**
   * Handles folder selection using a dialog
   * Opens a folder selection dialog and updates the configuration
   * with the selected folder path
   */
  const handleSelectFolder = async () => {
    try {
      setSelectingFolder(true);
      
      // Open folder selection dialog
      const selectedPath = await open({
        directory: true,
        multiple: false,
        title: 'Select Notes Directory'
      });
      
      // If user canceled the dialog, selectedPath will be null
      if (selectedPath === null) {
        setSelectingFolder(false);
        return;
      }
      
      // Update configuration with selected folder path
      const updatedConfig = await invoke<AppConfig>('select_folder', {
        path: selectedPath
      });
      
      onConfigUpdate(updatedConfig);
      setSelectingFolder(false);
    } catch (error) {
      console.error('Failed to select folder:', error);
      setSelectingFolder(false);
    }
  };

  /**
   * Handles rebuilding the search index
   * Triggers a backend command to rebuild the search index
   */
  const handleRebuildIndex = async () => {
    if (!config?.notes_dir) {
      setRebuildError('No notes directory selected');
      return;
    }

    try {
      setRebuildingIndex(true);
      setRebuildError(null);
      setRebuildSuccess(false);
      
      await invoke('rebuild_search_index');
      
      setRebuildSuccess(true);
      setRebuildingIndex(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setRebuildSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Failed to rebuild search index:', error);
      setRebuildError(`Failed to rebuild search index: ${error}`);
      setRebuildingIndex(false);
    }
  };

  /**
   * Handles saving the note naming pattern
   * Updates the configuration with the new pattern
   */
  const handleSavePattern = async () => {
    if (!namingPattern.includes('{title}')) {
      setPatternError('Pattern must include {title} placeholder');
      return;
    }
    
    try {
      setSavingPattern(true);
      setPatternError(null);
      setPatternSuccess(false);
      
      // Update configuration with new pattern
      const updatedConfig = await invoke<AppConfig>('set_note_naming_pattern', {
        pattern: namingPattern
      });
      
      onConfigUpdate(updatedConfig);
      setPatternSuccess(true);
      setSavingPattern(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setPatternSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Failed to save naming pattern:', error);
      setPatternError(`Failed to save naming pattern: ${error}`);
      setSavingPattern(false);
    }
  };
  
  /**
   * Handles saving the default note type
   * Updates the configuration with the new default note type
   */
  const handleSaveDefaultNoteType = async () => {
    try {
      setSavingNoteType(true);
      setNoteTypeError(null);
      setNoteTypeSuccess(false);
      
      // Update configuration with new default note type
      const updatedConfig = await invoke<AppConfig>('set_default_note_type', {
        noteType: defaultNoteType
      });
      
      onConfigUpdate(updatedConfig);
      setNoteTypeSuccess(true);
      setSavingNoteType(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setNoteTypeSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Failed to save default note type:', error);
      setNoteTypeError(`Failed to save default note type: ${error}`);
      setSavingNoteType(false);
    }
  };

  return (
    <div className="settings-panel settings-tab">
      <h2>Settings</h2>
      
      <div className="settings-content">
        <div className="setting-item">
          <label>Notes Directory</label>
          <div className="folder-selector">
            <input 
              type="text" 
              value={config?.notes_dir || 'No folder selected'} 
              readOnly 
              className="folder-path"
            />
            <button 
              onClick={handleSelectFolder}
              disabled={loading || selectingFolder}
              className="select-folder-btn"
            >
              {loading ? 'Loading...' : selectingFolder ? 'Selecting...' : 'Select Folder'}
            </button>
          </div>
        </div>
        
        <div className="setting-item">
          <label>Note Naming Pattern</label>
          <div className="pattern-selector">
            <input 
              type="text" 
              value={namingPattern} 
              onChange={(e) => setNamingPattern(e.target.value)}
              className="pattern-input"
              placeholder="e.g., {number}-{title}.{extension}"
            />
            <button 
              onClick={handleSavePattern}
              disabled={loading || savingPattern}
              className="save-pattern-btn"
            >
              {savingPattern ? 'Saving...' : 'Save Pattern'}
            </button>
          </div>
          <div className="pattern-help">
            Available placeholders: {'{number}'}, {'{title}'}, {'{extension}'}
          </div>
          {patternError && <div className="error-message">{patternError}</div>}
          {patternSuccess && <div className="success-message">Naming pattern saved successfully!</div>}
        </div>
        
        <div className="setting-item">
          <label>Default Note Type</label>
          <div className="pattern-selector">
            <select 
              value={defaultNoteType}
              onChange={(e) => setDefaultNoteType(e.target.value as NoteType)}
              className="pattern-input"
            >
              <option value={NoteType.Markdown}>Markdown</option>
              <option value={NoteType.PlainText}>Plain Text</option>
            </select>
            <button 
              onClick={handleSaveDefaultNoteType}
              disabled={loading || savingNoteType}
              className="save-pattern-btn"
            >
              {savingNoteType ? 'Saving...' : 'Save Default'}
            </button>
          </div>
          <div className="pattern-help">
            Default type to use when creating new notes
          </div>
          {noteTypeError && <div className="error-message">{noteTypeError}</div>}
          {noteTypeSuccess && <div className="success-message">Default note type saved successfully!</div>}
        </div>

        <div className="setting-item">
          <label>Search Index</label>
          <div className="action-buttons">
            <button 
              onClick={handleRebuildIndex}
              disabled={loading || !config?.notes_dir || rebuildingIndex}
              className="rebuild-index-btn"
            >
              {rebuildingIndex ? 'Rebuilding...' : 'Rebuild Search Index'}
            </button>
            {rebuildError && <div className="error-message">{rebuildError}</div>}
            {rebuildSuccess && <div className="success-message">Search index rebuilt successfully!</div>}
          </div>
        </div>
      </div>
    </div>
  );
};
