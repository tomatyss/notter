mod config;
mod notes;
mod search;

use std::sync::Mutex;
use std::path::PathBuf;
use tauri::{Manager, State};
use anyhow::Result;

use config::{AppConfig, ConfigManager};
use notes::{Note, NoteManager, NoteSummary};
use search::{SearchService, SearchResult};

#[cfg(target_os = "ios")]
use std::sync::Arc;

/// Application state shared between commands
struct AppState {
    config_manager: Mutex<ConfigManager>,
    note_manager: Mutex<Option<NoteManager>>,
    search_service: Mutex<SearchService>,
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

/// Sets the note naming pattern
/// 
/// # Parameters
/// * `pattern` - Pattern for naming new notes
/// 
/// # Returns
/// The updated application configuration
#[tauri::command]
async fn set_note_naming_pattern(pattern: String, state: State<'_, AppState>) -> Result<AppConfig, String> {
    let mut config_manager = state.config_manager.lock().map_err(|e| e.to_string())?;
    
    config_manager.set_note_naming_pattern(pattern)
        .map_err(|e| e.to_string())?;
    
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
    let search_service = state.search_service.lock().map_err(|e| e.to_string())?;
    
    // Get all notes
    let note_summaries = note_manager.list_notes(None).map_err(|e| e.to_string())?;
    let mut notes = Vec::new();
    
    // Load full notes
    for summary in note_summaries {
        let note = note_manager.get_note(&summary.id).map_err(|e| e.to_string())?;
        notes.push(note);
    }
    
    // Rebuild index
    search_service.rebuild_index(&notes).map_err(|e| e.to_string())?;
    
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

/// Updates the content of a note
/// 
/// # Parameters
/// * `id` - ID of the note to update
/// * `content` - New content for the note
/// 
/// # Returns
/// The updated note
#[tauri::command]
async fn update_note_content(id: String, content: String, state: State<'_, AppState>) -> Result<Note, String> {
    let note_manager_lock = state.note_manager.lock().map_err(|e| e.to_string())?;
    
    let Some(note_manager) = note_manager_lock.as_ref() else {
        return Err("Note manager not initialized".into());
    };
    
    note_manager.update_note_content(&id, &content).map_err(|e| e.to_string())
}

/// Renames a note file
/// 
/// # Parameters
/// * `id` - ID of the note to rename
/// * `new_name` - New name for the note file (without extension)
/// 
/// # Returns
/// The updated note with new ID
#[tauri::command]
async fn rename_note(id: String, new_name: String, state: State<'_, AppState>) -> Result<Note, String> {
    let note_manager_lock = state.note_manager.lock().map_err(|e| e.to_string())?;
    
    let Some(note_manager) = note_manager_lock.as_ref() else {
        return Err("Note manager not initialized".into());
    };
    
    note_manager.rename_note(&id, &new_name).map_err(|e| e.to_string())
}

/// Moves a note to a different path
/// 
/// # Parameters
/// * `id` - ID of the note to move
/// * `new_path` - New relative path for the note (including filename)
/// 
/// # Returns
/// The updated note with new ID
#[tauri::command]
async fn move_note(id: String, new_path: String, state: State<'_, AppState>) -> Result<Note, String> {
    let note_manager_lock = state.note_manager.lock().map_err(|e| e.to_string())?;
    
    let Some(note_manager) = note_manager_lock.as_ref() else {
        return Err("Note manager not initialized".into());
    };
    
    note_manager.move_note(&id, &new_path).map_err(|e| e.to_string())
}

/// Creates a new note
/// 
/// # Parameters
/// * `title` - Title of the note
/// * `content` - Initial content of the note
/// * `file_type` - Type of note (Markdown or PlainText)
/// * `pattern` - Optional naming pattern (e.g., "{number}-{title}")
/// 
/// # Returns
/// The newly created note
#[tauri::command]
async fn create_note(
    title: String,
    content: String,
    file_type: notes::NoteType,
    pattern: Option<String>,
    state: State<'_, AppState>
) -> Result<Note, String> {
    let note_manager_lock = state.note_manager.lock().map_err(|e| e.to_string())?;
    
    let Some(note_manager) = note_manager_lock.as_ref() else {
        return Err("Note manager not initialized".into());
    };
    
    let pattern_ref = pattern.as_deref();
    note_manager.create_note(&title, &content, file_type, pattern_ref).map_err(|e| e.to_string())
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
    let search_service = state.search_service.lock().map_err(|e| e.to_string())?;
    let limit = limit.unwrap_or(100);
    
    search_service.search(&query, limit).map_err(|e| e.to_string())
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
    
    // Create a new search service
    println!("Creating new search service...");
    let new_search_service = SearchService::new(&app_dir)
        .map_err(|e| format!("Failed to create new search service: {}", e))?;
    
    // Rebuild index with the new search service
    println!("Rebuilding index with {} notes...", notes.len());
    new_search_service.rebuild_index(&notes)
        .map_err(|e| format!("Failed to rebuild index: {}", e))?;
    
    // Update the search service in the app state
    println!("Updating search service in app state...");
    let mut search_service_lock = state.search_service.lock().map_err(|e| e.to_string())?;
    *search_service_lock = new_search_service;
    
    println!("Search index rebuilt successfully");
    Ok(())
}

/// iOS-specific initialization
#[cfg(target_os = "ios")]
fn ios_init(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    println!("Initializing iOS-specific functionality");
    
    // Get the app's documents directory on iOS
    let documents_dir = tauri::api::path::document_dir()
        .ok_or("Failed to get documents directory")?;
    
    println!("iOS documents directory: {:?}", documents_dir);
    
    // Update the config to use the documents directory
    let state: State<AppState> = app.state();
    let mut config_manager = state.config_manager.lock().map_err(|e| e.to_string())?;
    
    // Set the notes directory to a subdirectory in the documents folder
    let notes_dir = documents_dir.join("Notes");
    
    // Create the directory if it doesn't exist
    if !notes_dir.exists() {
        std::fs::create_dir_all(&notes_dir)?;
    }
    
    config_manager.set_notes_dir(notes_dir.clone())?;
    
    // Initialize note manager with the iOS documents directory
    let note_manager = NoteManager::new(notes_dir);
    *state.note_manager.lock().map_err(|e| e.to_string())? = Some(note_manager);
    
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
            
            // Initialize search service
            let search_service = SearchService::new(&app_dir)
                .expect("Failed to initialize search service");
            
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
                search_service: Mutex::new(search_service),
            });
            
            // Initialize iOS-specific functionality
            #[cfg(target_os = "ios")]
            {
                if let Err(e) = ios_init(app) {
                    eprintln!("Error initializing iOS: {}", e);
                }
            }
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_config,
            select_folder,
            set_note_naming_pattern,
            list_notes,
            get_note,
            update_note_content,
            rename_note,
            move_note,
            search_notes,
            rebuild_search_index,
            create_note,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
