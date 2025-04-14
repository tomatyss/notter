import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { AppConfig } from '../types';

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
  // Local loading states
  const [selectingFolder, setSelectingFolder] = useState(false);
  const [rebuildingIndex, setRebuildingIndex] = useState(false);
  const [rebuildError, setRebuildError] = useState<string | null>(null);
  const [rebuildSuccess, setRebuildSuccess] = useState(false);

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

  return (
    <div className="settings-panel">
      <h2>Settings</h2>
      
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
  );
};
