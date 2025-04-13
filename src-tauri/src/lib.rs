mod config;
mod notes;

use std::sync::Mutex;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, State, Runtime};
use anyhow::Result;

use config::{AppConfig, ConfigManager};
use notes::{Note, NoteManager, NoteSummary};

/// Application state shared between commands
struct AppState {
    config_manager: Mutex<ConfigManager>,
    note_manager: Mutex<Option<NoteManager>>,
}

/// Gets the current configuration
/// 
/// # Returns
/// The current application configuration
#[tauri::command]
async fn get_config(state: State<'_, AppState>) -> Result<AppConfig, String> {
    let config_manager = state.config_manager.lock().map_err(|e| e.to_string())?;
    Ok(config_manager.get_config())
}

/// Selects a folder for storing notes
/// 
/// # Parameters
/// * `path` - Path to the notes directory
/// 
/// # Returns
/// The updated application configuration
#[tauri::command]
async fn select_folder(path: String, state: State<'_, AppState>) -> Result<AppConfig, String> {
    let folder = PathBuf::from(path);
    
    // Validate folder
    if !folder.is_dir() {
        return Err("Invalid directory path".into());
    }
    
    // Update config
    let mut config_manager = state.config_manager.lock().map_err(|e| e.to_string())?;
    config_manager.set_notes_dir(folder.clone())
        .map_err(|e| e.to_string())?;
    
    // Initialize note manager
    let note_manager = NoteManager::new(folder);
    *state.note_manager.lock().map_err(|e| e.to_string())? = Some(note_manager);
    
    Ok(config_manager.get_config())
}

/// Lists all notes in the configured directory
/// 
/// # Returns
/// A list of note summaries
#[tauri::command]
async fn list_notes(state: State<'_, AppState>) -> Result<Vec<NoteSummary>, String> {
    let note_manager_lock = state.note_manager.lock().map_err(|e| e.to_string())?;
    
    let Some(note_manager) = note_manager_lock.as_ref() else {
        return Err("Note manager not initialized".into());
    };
    
    note_manager.list_notes().map_err(|e| e.to_string())
}

/// Gets a note by ID
/// 
/// # Parameters
/// * `id` - ID of the note to retrieve
/// 
/// # Returns
/// The note if found
#[tauri::command]
async fn get_note(id: String, state: State<'_, AppState>) -> Result<Note, String> {
    let note_manager_lock = state.note_manager.lock().map_err(|e| e.to_string())?;
    
    let Some(note_manager) = note_manager_lock.as_ref() else {
        return Err("Note manager not initialized".into());
    };
    
    note_manager.get_note(&id).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Initialize app state
            let app_dir = app.path().app_data_dir().expect("Failed to get app data directory");
            let config_dir = app_dir.join("config");
            
            let config_manager = ConfigManager::new(&config_dir)
                .expect("Failed to initialize config manager");
            
            // Initialize note manager if notes directory is configured
            let note_manager = if let Some(notes_dir) = config_manager.get_config().notes_dir {
                Some(NoteManager::new(notes_dir))
            } else {
                None
            };
            
            // Set up app state
            app.manage(AppState {
                config_manager: Mutex::new(config_manager),
                note_manager: Mutex::new(note_manager),
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_config,
            select_folder,
            list_notes,
            get_note,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
