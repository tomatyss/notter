import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { AppConfig, NoteType, AutoUpdateMode } from '../types';
import { defaultProviderRegistry } from '../providers/llm/ProviderRegistry';
import './SettingsPanel.css';

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
  
  // Search index auto-update settings
  const [autoUpdateIndex, setAutoUpdateIndex] = useState<boolean>(true);
  const [savingAutoUpdate, setSavingAutoUpdate] = useState(false);
  const [autoUpdateError, setAutoUpdateError] = useState<string | null>(null);
  const [autoUpdateSuccess, setAutoUpdateSuccess] = useState(false);
  
  // API key settings
  const [geminiApiKey, setGeminiApiKey] = useState<string>('');
  const [savingGeminiApiKey, setSavingGeminiApiKey] = useState(false);
  const [geminiApiKeyError, setGeminiApiKeyError] = useState<string | null>(null);
  const [geminiApiKeySuccess, setGeminiApiKeySuccess] = useState(false);
  
  const [updateMode, setUpdateMode] = useState<AutoUpdateMode>(AutoUpdateMode.Incremental);
  const [savingUpdateMode, setSavingUpdateMode] = useState(false);
  const [updateModeError, setUpdateModeError] = useState<string | null>(null);
  const [updateModeSuccess, setUpdateModeSuccess] = useState(false);
  
  const [updateInterval, setUpdateInterval] = useState<number>(30);
  const [savingUpdateInterval, setSavingUpdateInterval] = useState(false);
  const [updateIntervalError, setUpdateIntervalError] = useState<string | null>(null);
  const [updateIntervalSuccess, setUpdateIntervalSuccess] = useState(false);
  
  // Initialize settings from config
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
    
    // Initialize search index auto-update settings
    if (config) {
      setAutoUpdateIndex(config.auto_update_search_index);
      setUpdateMode(config.auto_update_mode);
      setUpdateInterval(config.auto_update_interval);
    }
    
    // Initialize API key settings
    const savedGeminiApiKey = localStorage.getItem('gemini_api_key') || '';
    setGeminiApiKey(savedGeminiApiKey);
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
  
  /**
   * Handles toggling automatic search index updates
   * Updates the configuration with the new setting
   */
  const handleToggleAutoUpdate = async () => {
    try {
      setSavingAutoUpdate(true);
      setAutoUpdateError(null);
      setAutoUpdateSuccess(false);
      
      // Toggle the auto-update setting
      const newValue = !autoUpdateIndex;
      setAutoUpdateIndex(newValue);
      
      // Update configuration
      const updatedConfig = await invoke<AppConfig>('set_auto_update_search_index', {
        autoUpdate: newValue
      });
      
      onConfigUpdate(updatedConfig);
      setAutoUpdateSuccess(true);
      setSavingAutoUpdate(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setAutoUpdateSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Failed to update auto-update setting:', error);
      setAutoUpdateError(`Failed to update setting: ${error}`);
      setSavingAutoUpdate(false);
    }
  };
  
  /**
   * Handles changing the update mode
   * Updates the configuration with the new mode
   */
  const handleUpdateModeChange = async (newMode: AutoUpdateMode) => {
    try {
      setSavingUpdateMode(true);
      setUpdateModeError(null);
      setUpdateModeSuccess(false);
      
      setUpdateMode(newMode);
      
      // Update configuration
      const updatedConfig = await invoke<AppConfig>('set_auto_update_mode', {
        mode: newMode
      });
      
      onConfigUpdate(updatedConfig);
      setUpdateModeSuccess(true);
      setSavingUpdateMode(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setUpdateModeSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Failed to update mode setting:', error);
      setUpdateModeError(`Failed to update mode: ${error}`);
      setSavingUpdateMode(false);
    }
  };
  
  /**
   * Handles changing the update interval
   * Updates the configuration with the new interval
   */
  const handleUpdateIntervalChange = async () => {
    try {
      setSavingUpdateInterval(true);
      setUpdateIntervalError(null);
      setUpdateIntervalSuccess(false);
      
      // Validate interval
      if (updateInterval < 1) {
        setUpdateIntervalError('Interval must be at least 1 minute');
        setSavingUpdateInterval(false);
        return;
      }
      
      // Update configuration
      const updatedConfig = await invoke<AppConfig>('set_auto_update_interval', {
        interval: updateInterval
      });
      
      onConfigUpdate(updatedConfig);
      setUpdateIntervalSuccess(true);
      setSavingUpdateInterval(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setUpdateIntervalSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Failed to update interval setting:', error);
      setUpdateIntervalError(`Failed to update interval: ${error}`);
      setSavingUpdateInterval(false);
    }
  };
  
  /**
   * Handles saving the Gemini API key
   * Stores the key in localStorage and refreshes providers
   */
  const handleSaveGeminiApiKey = () => {
    try {
      setSavingGeminiApiKey(true);
      setGeminiApiKeyError(null);
      setGeminiApiKeySuccess(false);
      
      // Store API key in localStorage
      localStorage.setItem('gemini_api_key', geminiApiKey);
      
      // Refresh providers to register the Gemini provider with the new API key
      defaultProviderRegistry.refreshProviders();
      
      setGeminiApiKeySuccess(true);
      setSavingGeminiApiKey(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setGeminiApiKeySuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Failed to save Gemini API key:', error);
      setGeminiApiKeyError(`Failed to save API key: ${error}`);
      setSavingGeminiApiKey(false);
    }
  };

  return (
    <div className="settings-panel settings-tab">
      <h2>Settings</h2>
      
      <div className="settings-content">
        <div className="setting-section">
          <h3>API Keys</h3>
          <p className="section-description">
            API keys are required for some LLM providers. Keys are stored securely in your browser's local storage.
          </p>
          
          <div className="api-key-settings">
            <div className="api-key-item">
              <div className="api-key-header">
                <label htmlFor="gemini-api-key">Google Gemini API Key</label>
                <div className="api-key-status">
                  <span className={geminiApiKey ? "status-indicator active" : "status-indicator inactive"}></span>
                  <span className="status-text">{geminiApiKey ? "Active" : "Not configured"}</span>
                </div>
              </div>
              
              <div className="api-key-input-container">
                <input 
                  id="gemini-api-key"
                  type="password"
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder="Enter your Gemini API key"
                  className="api-key-input"
                />
                <button 
                  onClick={handleSaveGeminiApiKey}
                  disabled={loading || savingGeminiApiKey}
                  className="save-api-key-btn"
                >
                  {savingGeminiApiKey ? 'Saving...' : 'Save Key'}
                </button>
              </div>
              
              <div className="api-key-help">
                <span className="help-icon">ℹ️</span>
                <span className="help-text">
                  Get your API key from the <a href="https://ai.google.dev/tutorials/setup" target="_blank" rel="noopener noreferrer">Google AI Studio</a>
                </span>
              </div>
              
              {geminiApiKeyError && <div className="error-message">{geminiApiKeyError}</div>}
              {geminiApiKeySuccess && <div className="success-message">API key saved successfully!</div>}
            </div>
          </div>
        </div>
        
        <div className="setting-item">
          <h3>Notes Directory</h3>
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
        
        <div className="setting-item">
          <label>Automatic Index Updates</label>
          <div className="auto-update-settings">
            <div className="checkbox-container">
              <input 
                type="checkbox" 
                id="auto-update-checkbox"
                checked={autoUpdateIndex}
                onChange={handleToggleAutoUpdate}
                disabled={loading || savingAutoUpdate}
              />
              <label htmlFor="auto-update-checkbox">
                Automatically update search index when notes change
              </label>
            </div>
            
            {autoUpdateError && <div className="error-message">{autoUpdateError}</div>}
            {autoUpdateSuccess && <div className="success-message">Setting saved successfully!</div>}
            
            {autoUpdateIndex && (
              <>
                <div className="update-mode-selector">
                  <label>Update Mode:</label>
                  <select 
                    value={updateMode}
                    onChange={(e) => handleUpdateModeChange(e.target.value as AutoUpdateMode)}
                    disabled={loading || savingUpdateMode || !autoUpdateIndex}
                    className="mode-select"
                  >
                    <option value={AutoUpdateMode.Incremental}>Incremental (update only changed notes)</option>
                    <option value={AutoUpdateMode.Periodic}>Periodic (rebuild entire index periodically)</option>
                    <option value={AutoUpdateMode.Hybrid}>Hybrid (incremental + periodic rebuilds)</option>
                  </select>
                  
                  {updateModeError && <div className="error-message">{updateModeError}</div>}
                  {updateModeSuccess && <div className="success-message">Mode updated successfully!</div>}
                </div>
                
                {(updateMode === AutoUpdateMode.Periodic || updateMode === AutoUpdateMode.Hybrid) && (
                  <div className="update-interval-selector">
                    <label>Rebuild interval (minutes):</label>
                    <div className="interval-input-container">
                      <input 
                        type="number" 
                        min="1"
                        value={updateInterval}
                        onChange={(e) => setUpdateInterval(parseInt(e.target.value) || 30)}
                        disabled={loading || savingUpdateInterval || !autoUpdateIndex}
                        className="interval-input"
                      />
                      <button 
                        onClick={handleUpdateIntervalChange}
                        disabled={loading || savingUpdateInterval || !autoUpdateIndex}
                        className="save-interval-btn"
                      >
                        {savingUpdateInterval ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                    
                    {updateIntervalError && <div className="error-message">{updateIntervalError}</div>}
                    {updateIntervalSuccess && <div className="success-message">Interval updated successfully!</div>}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
