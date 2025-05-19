use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use anyhow::{Context, Result};
use crate::notes::NoteType;

/// Mode for automatic search index updates
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AutoUpdateMode {
    /// Update only changed notes
    Incremental,
    /// Rebuild entire index periodically
    Periodic,
    /// Incremental updates + periodic rebuilds
    Hybrid,
}

/// Theme preference
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Theme {
    /// Follow system preference
    System,
    /// Use light theme
    Light,
    /// Use dark theme
    Dark,
}

impl Default for Theme {
    fn default() -> Self {
        Self::System
    }
}

impl Default for AutoUpdateMode {
    fn default() -> Self {
        Self::Incremental
    }
}

/// Application configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    /// Path to the directory containing notes
    pub notes_dir: Option<PathBuf>,
    
    /// Pattern for naming new notes
    /// Supports placeholders: {number}, {title}, {extension}
    #[serde(default)]
    pub note_naming_pattern: Option<String>,
    
    /// Default note type for new notes
    #[serde(default)]
    pub default_note_type: Option<NoteType>,
    
    /// Whether to automatically update the search index when notes change
    #[serde(default)]
    pub auto_update_search_index: bool,
    
    /// Mode for automatic search index updates
    #[serde(default)]
    pub auto_update_mode: AutoUpdateMode,
    
    /// Interval for periodic index rebuilds (in minutes)
    #[serde(default = "default_update_interval")]
    pub auto_update_interval: u32,

    /// Preferred theme
    #[serde(default)]
    pub theme: Theme,
}

/// Default update interval (30 minutes)
fn default_update_interval() -> u32 {
    30
}

impl Default for AppConfig {
    /// Creates a default configuration
    /// 
    /// # Returns
    /// A new AppConfig with default values
    fn default() -> Self {
        Self {
            notes_dir: None,
            note_naming_pattern: Some("{number}-{title}.{extension}".to_string()),
            default_note_type: Some(NoteType::Markdown),
            auto_update_search_index: true,
            auto_update_mode: AutoUpdateMode::Incremental,
            auto_update_interval: 30,
            theme: Theme::System,
        }
    }
}

/// Manages application configuration
pub struct ConfigManager {
    /// Path to the configuration file
    config_path: PathBuf,
    /// Current configuration
    config: AppConfig,
}

impl ConfigManager {
    /// Creates a new ConfigManager
    /// 
    /// # Parameters
    /// * `config_dir` - Directory to store configuration
    /// 
    /// # Returns
    /// A new ConfigManager instance with loaded configuration
    pub fn new(config_dir: &Path) -> Result<Self> {
        fs::create_dir_all(config_dir)
            .context("Failed to create config directory")?;
        
        let config_path = config_dir.join("config.json");
        
        let config = if config_path.exists() {
            let config_str = fs::read_to_string(&config_path)
                .context("Failed to read config file")?;
            
            serde_json::from_str(&config_str)
                .context("Failed to parse config file")?
        } else {
            AppConfig::default()
        };
        
        Ok(Self {
            config_path,
            config,
        })
    }
    
    /// Gets the current configuration
    /// 
    /// # Returns
    /// The current AppConfig
    pub fn get_config(&self) -> AppConfig {
        self.config.clone()
    }
    
    /// Sets the notes directory
    /// 
    /// # Parameters
    /// * `path` - Path to the notes directory
    /// 
    /// # Returns
    /// Result indicating success or failure
    pub fn set_notes_dir(&mut self, path: PathBuf) -> Result<()> {
        // Validate directory
        if !path.is_dir() {
            anyhow::bail!("Path is not a directory");
        }
        
        // Check if we can write to the directory
        let test_file = path.join(".notter_test");
        fs::write(&test_file, "test")
            .context("Cannot write to directory")?;
        fs::remove_file(test_file)
            .context("Cannot remove test file")?;
        
        // Update config
        self.config.notes_dir = Some(path);
        self.save_config()
    }
    
    /// Sets the note naming pattern
    /// 
    /// # Parameters
    /// * `pattern` - Pattern for naming new notes
    /// 
    /// # Returns
    /// Result indicating success or failure
    pub fn set_note_naming_pattern(&mut self, pattern: String) -> Result<()> {
        // Validate pattern
        if !pattern.contains("{title}") {
            anyhow::bail!("Pattern must contain {{title}} placeholder");
        }
        
        // Update config
        self.config.note_naming_pattern = Some(pattern);
        self.save_config()
    }
    
    /// Sets the default note type
    /// 
    /// # Parameters
    /// * `note_type` - Default note type for new notes
    /// 
    /// # Returns
    /// Result indicating success or failure
    pub fn set_default_note_type(&mut self, note_type: NoteType) -> Result<()> {
        // Update config
        self.config.default_note_type = Some(note_type);
        self.save_config()
    }
    
    /// Sets whether to automatically update the search index
    /// 
    /// # Parameters
    /// * `auto_update` - Whether to automatically update the search index
    /// 
    /// # Returns
    /// Result indicating success or failure
    pub fn set_auto_update_search_index(&mut self, auto_update: bool) -> Result<()> {
        // Update config
        self.config.auto_update_search_index = auto_update;
        self.save_config()
    }
    
    /// Sets the mode for automatic search index updates
    /// 
    /// # Parameters
    /// * `mode` - Mode for automatic search index updates
    /// 
    /// # Returns
    /// Result indicating success or failure
    pub fn set_auto_update_mode(&mut self, mode: AutoUpdateMode) -> Result<()> {
        // Update config
        self.config.auto_update_mode = mode;
        self.save_config()
    }
    
    /// Sets the interval for periodic index rebuilds
    /// 
    /// # Parameters
    /// * `interval` - Interval in minutes
    /// 
    /// # Returns
    /// Result indicating success or failure
    pub fn set_auto_update_interval(&mut self, interval: u32) -> Result<()> {
        // Update config
        self.config.auto_update_interval = interval;
        self.save_config()
    }

    /// Sets the preferred theme
    pub fn set_theme(&mut self, theme: Theme) -> Result<()> {
        self.config.theme = theme;
        self.save_config()
    }
    
    /// Saves the current configuration to disk
    /// 
    /// # Returns
    /// Result indicating success or failure
    fn save_config(&self) -> Result<()> {
        let config_str = serde_json::to_string_pretty(&self.config)
            .context("Failed to serialize config")?;
        
        fs::write(&self.config_path, config_str)
            .context("Failed to write config file")?;
        
        Ok(())
    }
}
