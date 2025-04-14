mod config;
mod notes;
mod search;

use std::sync::Mutex;
use std::path::PathBuf;
use tauri::{Manager, State};
use anyhow::Result;

use config::{AppConfig, ConfigManager};
use notes::{Note, NoteManager, NoteSummary};
use search::{SearchManager, SearchResult};

/// Application state shared between commands
struct AppState {
    config_manager: Mutex<ConfigManager>,
    note_manager: Mutex<Option<NoteManager>>,
    search_manager: Mutex<SearchManager>,
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
    *state.note_manager.lock().map_err(|e| e.to_string())? = Some(note_manager.clone());
    
    // Rebuild search index with all notes
    let search_manager = state.search_manager.lock().map_err(|e| e.to_string())?;
    
    // Get all notes
    let note_summaries = note_manager.list_notes(None).map_err(|e| e.to_string())?;
    let mut notes = Vec::new();
    
    // Load full notes
    for summary in note_summaries {
        let note = note_manager.get_note(&summary.id).map_err(|e| e.to_string())?;
        notes.push(note);
    }
    
    // Rebuild index
    search_manager.rebuild_index(&notes).map_err(|e| e.to_string())?;
    
    Ok(config_manager.get_config())
}

/// Lists all notes in the configured directory
/// 
/// # Parameters
/// * `sort` - Optional sort option to determine the order of notes
/// 
/// # Returns
/// A list of note summaries
#[tauri::command]
async fn list_notes(
    sort: Option<notes::SortOption>,
    state: State<'_, AppState>
) -> Result<Vec<NoteSummary>, String> {
    let note_manager_lock = state.note_manager.lock().map_err(|e| e.to_string())?;
    
    let Some(note_manager) = note_manager_lock.as_ref() else {
        return Err("Note manager not initialized".into());
    };
    
    note_manager.list_notes(sort).map_err(|e| e.to_string())
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

/// Searches for notes matching the query
/// 
/// # Parameters
/// * `query` - The search query
/// * `limit` - Maximum number of results to return (optional)
/// 
/// # Returns
/// List of search results
#[tauri::command]
async fn search_notes(
    query: String,
    limit: Option<usize>,
    state: State<'_, AppState>
) -> Result<Vec<SearchResult>, String> {
    let search_manager = state.search_manager.lock().map_err(|e| e.to_string())?;
    let limit = limit.unwrap_or(100);
    
    search_manager.search(&query, limit).map_err(|e| e.to_string())
}

/// Rebuilds the search index with all notes
/// 
/// # Returns
/// Result indicating success or failure
#[tauri::command]
async fn rebuild_search_index(app_handle: tauri::AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    println!("Rebuilding search index...");
    
    // Get the app data directory
    let app_dir = app_handle.path().app_data_dir().expect("Failed to get app data directory");
    
    // Get note manager
    let note_manager_lock = state.note_manager.lock().map_err(|e| e.to_string())?;
    
    let Some(note_manager) = note_manager_lock.as_ref() else {
        return Err("Note manager not initialized".into());
    };
    
    // Get all notes
    println!("Getting all notes...");
    let note_summaries = note_manager.list_notes(None).map_err(|e| e.to_string())?;
    let mut notes = Vec::new();
    
    // Load full notes
    println!("Loading full notes...");
    for summary in note_summaries {
        let note = note_manager.get_note(&summary.id).map_err(|e| e.to_string())?;
        notes.push(note);
    }
    
    // Create a new search manager
    println!("Creating new search manager...");
    let new_search_manager = SearchManager::new(&app_dir)
        .map_err(|e| format!("Failed to create new search manager: {}", e))?;
    
    // Rebuild index with the new search manager
    println!("Rebuilding index with {} notes...", notes.len());
    new_search_manager.rebuild_index(&notes)
        .map_err(|e| format!("Failed to rebuild index: {}", e))?;
    
    // Update the search manager in the app state
    println!("Updating search manager in app state...");
    let mut search_manager_lock = state.search_manager.lock().map_err(|e| e.to_string())?;
    *search_manager_lock = new_search_manager;
    
    println!("Search index rebuilt successfully");
    Ok(())
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
            
            // Initialize search manager
            let search_manager = SearchManager::new(&app_dir)
                .expect("Failed to initialize search manager");
            
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
                search_manager: Mutex::new(search_manager),
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_config,
            select_folder,
            list_notes,
            get_note,
            search_notes,
            rebuild_search_index,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
