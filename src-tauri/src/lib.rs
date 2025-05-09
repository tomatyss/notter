mod config;
mod notes;
mod search;

use anyhow::Result;
use log::info;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Manager, State};

use config::{AppConfig, ConfigManager};
use notes::{Note, NoteManager, NoteSummary};
use search::{SearchResult, SearchService};

#[cfg(target_os = "ios")]
use std::sync::Arc;

/// Application state shared between commands
struct AppState {
    config_manager: Mutex<ConfigManager>,
    note_manager: Mutex<Option<NoteManager>>,
    search_service: Mutex<SearchService>,
    last_index_rebuild: Mutex<Instant>,
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
async fn set_note_naming_pattern(
    pattern: String,
    state: State<'_, AppState>,
) -> Result<AppConfig, String> {
    let mut config_manager = state.config_manager.lock().map_err(|e| e.to_string())?;

    config_manager
        .set_note_naming_pattern(pattern)
        .map_err(|e| e.to_string())?;

    Ok(config_manager.get_config())
}

/// Sets the default note type
///
/// # Parameters
/// * `note_type` - Default note type for new notes
///
/// # Returns
/// The updated application configuration
#[tauri::command]
async fn set_default_note_type(
    note_type: notes::NoteType,
    state: State<'_, AppState>,
) -> Result<AppConfig, String> {
    let mut config_manager = state.config_manager.lock().map_err(|e| e.to_string())?;

    config_manager
        .set_default_note_type(note_type)
        .map_err(|e| e.to_string())?;

    Ok(config_manager.get_config())
}

/// Sets whether to automatically update the search index
///
/// # Parameters
/// * `auto_update` - Whether to automatically update the search index
///
/// # Returns
/// The updated application configuration
#[tauri::command]
async fn set_auto_update_search_index(
    auto_update: bool,
    state: State<'_, AppState>,
) -> Result<AppConfig, String> {
    let mut config_manager = state.config_manager.lock().map_err(|e| e.to_string())?;

    config_manager
        .set_auto_update_search_index(auto_update)
        .map_err(|e| e.to_string())?;

    Ok(config_manager.get_config())
}

/// Sets the mode for automatic search index updates
///
/// # Parameters
/// * `mode` - Mode for automatic search index updates
///
/// # Returns
/// The updated application configuration
#[tauri::command]
async fn set_auto_update_mode(
    mode: config::AutoUpdateMode,
    state: State<'_, AppState>,
) -> Result<AppConfig, String> {
    let mut config_manager = state.config_manager.lock().map_err(|e| e.to_string())?;

    config_manager
        .set_auto_update_mode(mode)
        .map_err(|e| e.to_string())?;

    Ok(config_manager.get_config())
}

/// Sets the interval for periodic index rebuilds
///
/// # Parameters
/// * `interval` - Interval in minutes
///
/// # Returns
/// The updated application configuration
#[tauri::command]
async fn set_auto_update_interval(
    interval: u32,
    state: State<'_, AppState>,
) -> Result<AppConfig, String> {
    let mut config_manager = state.config_manager.lock().map_err(|e| e.to_string())?;

    config_manager
        .set_auto_update_interval(interval)
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

    // Initialize note manager
    let note_manager = NoteManager::new(folder.clone());
    
    // Get all notes
    let note_summaries = note_manager.list_notes(None).map_err(|e| e.to_string())?;
    let mut notes = Vec::new();

    // Load full notes
    for summary in note_summaries {
        let note = note_manager
            .get_note(&summary.id)
            .map_err(|e| e.to_string())?;
        notes.push(note);
    }
    
    // Update config
    let mut config_manager = state.config_manager.lock().map_err(|e| e.to_string())?;
    config_manager
        .set_notes_dir(folder)
        .map_err(|e| e.to_string())?;
    
    // Update note manager
    *state.note_manager.lock().map_err(|e| e.to_string())? = Some(note_manager);

    // Rebuild search index with all notes
    let search_service = state.search_service.lock().map_err(|e| e.to_string())?;

    // Rebuild index
    search_service
        .rebuild_index(&notes)
        .map_err(|e| e.to_string())?;

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
    state: State<'_, AppState>,
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
async fn update_note_content(
    app_handle: AppHandle,
    id: String,
    content: String,
    state: State<'_, AppState>,
) -> Result<Note, String> {
    // Get the note manager
    let note_manager = {
        let note_manager_lock = state.note_manager.lock().map_err(|e| e.to_string())?;
        
        match note_manager_lock.as_ref() {
            Some(nm) => nm.clone(),
            None => return Err("Note manager not initialized".into()),
        }
    };

    // Update the note content
    let updated_note = note_manager
        .update_note_content(&id, &content)
        .map_err(|e| e.to_string())?;

    // Check if we should update the search index
    let should_update_index = {
        let config = state
            .config_manager
            .lock()
            .map_err(|e| e.to_string())?
            .get_config();
        
        (config.auto_update_search_index, config.auto_update_mode)
    };

    if should_update_index.0 {
        // Update the search index with the new note content
        match should_update_index.1 {
            config::AutoUpdateMode::Incremental | config::AutoUpdateMode::Hybrid => {
                let search_service = state.search_service.lock().map_err(|e| e.to_string())?;
                search_service
                    .index_note(&updated_note)
                    .map_err(|e| e.to_string())?;
                info!(
                    "Incrementally updated search index for note: {}",
                    updated_note.id
                );
            },
            config::AutoUpdateMode::Periodic => {
                // For periodic mode, we don't update the index immediately
                // It will be updated during the next scheduled rebuild
            }
        }

        // Check if we need to do a periodic rebuild
        check_periodic_rebuild(app_handle, state).await?;
    }

    Ok(updated_note)
}

/// Helper function to update backlinks when a note is renamed
///
/// # Parameters
/// * `note_manager` - The note manager instance
/// * `old_title` - The original title of the note
/// * `new_title` - The new title of the note
///
/// # Returns
/// Result indicating success or failure
fn update_backlinks(note_manager: &NoteManager, old_title: &str, new_title: &str) -> Result<(), String> {
    // Find all notes that link to the old title
    let backlinks = note_manager.find_backlinks(old_title).map_err(|e| e.to_string())?;
    
    // Update each backlink
    for backlink in backlinks {
        // Get the full note content
        let backlink_note = note_manager.get_note(&backlink.id).map_err(|e| e.to_string())?;
        
        // Replace [[Old Title]] with [[New Title]] in the content
        let updated_content = backlink_note.content.replace(
            &format!("[[{}]]", old_title),
            &format!("[[{}]]", new_title)
        );
        
        // Save the updated content
        note_manager.update_note_content(&backlink.id, &updated_content)
            .map_err(|e| e.to_string())?;
    }
    
    Ok(())
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
async fn rename_note(
    app_handle: AppHandle,
    id: String,
    new_name: String,
    state: State<'_, AppState>,
) -> Result<Note, String> {
    // Get the note manager
    let note_manager = {
        let note_manager_lock = state.note_manager.lock().map_err(|e| e.to_string())?;
        
        match note_manager_lock.as_ref() {
            Some(nm) => nm.clone(),
            None => return Err("Note manager not initialized".into()),
        }
    };

    // Get the original note to remove from index and to get the old title
    let original_note = note_manager.get_note(&id).map_err(|e| e.to_string())?;
    let old_title = original_note.title.clone();

    // Rename the note (synchronous operation)
    let updated_note = note_manager
        .rename_note(&id, &new_name)
        .map_err(|e| e.to_string())?;
    
    // Update backlinks synchronously
    if let Err(e) = update_backlinks(&note_manager, &old_title, &updated_note.title) {
        eprintln!("Error updating backlinks: {}", e);
        // We don't return an error here because the note rename was successful
        // The backlinks update is a secondary operation
    }

    // Check if we should update the search index
    let should_update_index = {
        let config = state
            .config_manager
            .lock()
            .map_err(|e| e.to_string())?
            .get_config();
        
        (config.auto_update_search_index, config.auto_update_mode)
    };

    if should_update_index.0 {
        // Update the search index
        match should_update_index.1 {
            config::AutoUpdateMode::Incremental | config::AutoUpdateMode::Hybrid => {
                let search_service = state.search_service.lock().map_err(|e| e.to_string())?;

                // Remove the old note from the index
                search_service
                    .remove_note(&original_note.id)
                    .map_err(|e| e.to_string())?;

                // Add the updated note to the index
                search_service
                    .index_note(&updated_note)
                    .map_err(|e| e.to_string())?;

                info!(
                    "Incrementally updated search index for renamed note: {} -> {}",
                    original_note.id, updated_note.id
                );
            },
            config::AutoUpdateMode::Periodic => {
                // For periodic mode, we don't update the index immediately
                // It will be updated during the next scheduled rebuild
            }
        }

        // Check if we need to do a periodic rebuild
        check_periodic_rebuild(app_handle, state).await?;
    }

    Ok(updated_note)
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
async fn move_note(
    app_handle: AppHandle,
    id: String,
    new_path: String,
    state: State<'_, AppState>,
) -> Result<Note, String> {
    // Get the note manager
    let note_manager = {
        let note_manager_lock = state.note_manager.lock().map_err(|e| e.to_string())?;
        
        match note_manager_lock.as_ref() {
            Some(nm) => nm.clone(),
            None => return Err("Note manager not initialized".into()),
        }
    };

    // Get the original note to remove from index
    let original_note = note_manager.get_note(&id).map_err(|e| e.to_string())?;

    // Move the note
    let updated_note = note_manager
        .move_note(&id, &new_path)
        .map_err(|e| e.to_string())?;

    // Check if we should update the search index
    let should_update_index = {
        let config = state
            .config_manager
            .lock()
            .map_err(|e| e.to_string())?
            .get_config();
        
        (config.auto_update_search_index, config.auto_update_mode)
    };

    if should_update_index.0 {
        // Update the search index
        match should_update_index.1 {
            config::AutoUpdateMode::Incremental | config::AutoUpdateMode::Hybrid => {
                let search_service = state.search_service.lock().map_err(|e| e.to_string())?;

                // Remove the old note from the index
                search_service
                    .remove_note(&original_note.id)
                    .map_err(|e| e.to_string())?;

                // Add the updated note to the index
                search_service
                    .index_note(&updated_note)
                    .map_err(|e| e.to_string())?;

                info!(
                    "Incrementally updated search index for moved note: {} -> {}",
                    original_note.id, updated_note.id
                );
            },
            config::AutoUpdateMode::Periodic => {
                // For periodic mode, we don't update the index immediately
                // It will be updated during the next scheduled rebuild
            }
        }

        // Check if we need to do a periodic rebuild
        check_periodic_rebuild(app_handle, state).await?;
    }

    Ok(updated_note)
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
    app_handle: AppHandle,
    title: String,
    content: String,
    file_type: notes::NoteType,
    pattern: Option<String>,
    state: State<'_, AppState>,
) -> Result<Note, String> {
    // Get the note manager
    let note_manager = {
        let note_manager_lock = state.note_manager.lock().map_err(|e| e.to_string())?;
        
        match note_manager_lock.as_ref() {
            Some(nm) => nm.clone(),
            None => return Err("Note manager not initialized".into()),
        }
    };

    let pattern_ref = pattern.as_deref();
    let new_note = note_manager
        .create_note(&title, &content, file_type, pattern_ref)
        .map_err(|e| e.to_string())?;

    // Check if we should update the search index
    let should_update_index = {
        let config = state
            .config_manager
            .lock()
            .map_err(|e| e.to_string())?
            .get_config();
        
        (config.auto_update_search_index, config.auto_update_mode)
    };

    if should_update_index.0 {
        // Update the search index
        match should_update_index.1 {
            config::AutoUpdateMode::Incremental | config::AutoUpdateMode::Hybrid => {
                let search_service = state.search_service.lock().map_err(|e| e.to_string())?;
                search_service
                    .index_note(&new_note)
                    .map_err(|e| e.to_string())?;
                info!(
                    "Incrementally updated search index for new note: {}",
                    new_note.id
                );
            },
            config::AutoUpdateMode::Periodic => {
                // For periodic mode, we don't update the index immediately
                // It will be updated during the next scheduled rebuild
            }
        }

        // Check if we need to do a periodic rebuild
        check_periodic_rebuild(app_handle, state).await?;
    }

    Ok(new_note)
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
    state: State<'_, AppState>,
) -> Result<Vec<SearchResult>, String> {
    let search_service = state.search_service.lock().map_err(|e| e.to_string())?;
    let limit = limit.unwrap_or(100);

    search_service
        .search(&query, limit)
        .map_err(|e| e.to_string())
}

/// Searches for notes with specific tags
///
/// # Parameters
/// * `tags` - List of tags to filter by
/// * `match_all` - If true, notes must have all tags; if false, notes can have any of the tags
/// * `sort` - Optional sort option to determine the order of notes
///
/// # Returns
/// A list of note summaries
#[tauri::command]
async fn filter_notes_by_tags(
    tags: Vec<String>,
    match_all: bool,
    sort: Option<notes::SortOption>,
    state: State<'_, AppState>,
) -> Result<Vec<NoteSummary>, String> {
    let note_manager_lock = state.note_manager.lock().map_err(|e| e.to_string())?;

    let Some(note_manager) = note_manager_lock.as_ref() else {
        return Err("Note manager not initialized".into());
    };

    // Get all notes
    let all_notes = note_manager.list_notes(sort).map_err(|e| e.to_string())?;

    // Filter notes by tags
    let filtered_notes = if match_all {
        // Notes must have all specified tags
        all_notes
            .into_iter()
            .filter(|note| tags.iter().all(|tag| note.tags.contains(tag)))
            .collect()
    } else {
        // Notes can have any of the specified tags
        all_notes
            .into_iter()
            .filter(|note| tags.iter().any(|tag| note.tags.contains(tag)))
            .collect()
    };

    Ok(filtered_notes)
}

/// Finds a note by its title
///
/// # Parameters
/// * `title` - Title of the note to find
///
/// # Returns
/// The note ID if found, None otherwise
#[tauri::command]
async fn find_note_by_title(
    title: String,
    state: State<'_, AppState>,
) -> Result<Option<String>, String> {
    let note_manager_lock = state.note_manager.lock().map_err(|e| e.to_string())?;

    let Some(note_manager) = note_manager_lock.as_ref() else {
        return Err("Note manager not initialized".into());
    };

    note_manager
        .find_note_by_title(&title)
        .map_err(|e| e.to_string())
}

/// Finds all notes that link to a specific note
///
/// # Parameters
/// * `note_title` - Title of the note to find backlinks for
///
/// # Returns
/// A list of note summaries that link to the specified note
#[tauri::command]
async fn find_backlinks(
    note_title: String,
    state: State<'_, AppState>,
) -> Result<Vec<NoteSummary>, String> {
    let note_manager_lock = state.note_manager.lock().map_err(|e| e.to_string())?;

    let Some(note_manager) = note_manager_lock.as_ref() else {
        return Err("Note manager not initialized".into());
    };

    note_manager
        .find_backlinks(&note_title)
        .map_err(|e| e.to_string())
}

/// Rebuilds the search index with all notes
///
/// # Returns
/// Result indicating success or failure
#[tauri::command]
async fn rebuild_search_index(
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    info!("Rebuilding search index...");

    // Get the app data directory
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .expect("Failed to get app data directory");

    // Get note manager and all notes
    let notes = {
        let note_manager_lock = state.note_manager.lock().map_err(|e| e.to_string())?;
        
        let Some(note_manager) = note_manager_lock.as_ref() else {
            return Err("Note manager not initialized".into());
        };
        
        // Get all notes
        info!("Getting all notes...");
        let note_summaries = note_manager.list_notes(None).map_err(|e| e.to_string())?;
        let mut notes = Vec::new();
        
        // Load full notes
        info!("Loading full notes...");
        for summary in note_summaries {
            let note = note_manager
                .get_note(&summary.id)
                .map_err(|e| e.to_string())?;
            notes.push(note);
        }
        
        notes
    };

    // Create a new search service
    info!("Creating new search service...");
    let new_search_service = SearchService::new(&app_dir)
        .map_err(|e| format!("Failed to create new search service: {}", e))?;

    // Rebuild index with the new search service
    info!("Rebuilding index with {} notes...", notes.len());
    new_search_service
        .rebuild_index(&notes)
        .map_err(|e| format!("Failed to rebuild index: {}", e))?;

    // Update the search service in the app state
    info!("Updating search service in app state...");
    {
        let mut search_service_lock = state.search_service.lock().map_err(|e| e.to_string())?;
        *search_service_lock = new_search_service;
    }

    // Update the last rebuild time
    {
        *state.last_index_rebuild.lock().map_err(|e| e.to_string())? = Instant::now();
    }

    info!("Search index rebuilt successfully");
    Ok(())
}

/// Checks if a periodic rebuild is needed and performs it if necessary
///
/// # Parameters
/// * `app_handle` - Tauri app handle
/// * `state` - Application state
///
/// # Returns
/// Result indicating success or failure
async fn check_periodic_rebuild(
    app_handle: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    // Check if periodic rebuilds are enabled and if it's time for a rebuild
    let needs_rebuild = {
        let config = state
            .config_manager
            .lock()
            .map_err(|e| e.to_string())?
            .get_config();
        
        // Check if periodic rebuilds are enabled
        if !config.auto_update_search_index {
            false
        } else {
            match config.auto_update_mode {
                config::AutoUpdateMode::Periodic | config::AutoUpdateMode::Hybrid => {
                    // Check if it's time for a rebuild
                    let last_rebuild = *state.last_index_rebuild.lock().map_err(|e| e.to_string())?;
                    let interval = Duration::from_secs(config.auto_update_interval as u64 * 60);
                    last_rebuild.elapsed() >= interval
                },
                _ => false,
            }
        }
    };

    if needs_rebuild {
        info!("Periodic rebuild interval reached, rebuilding search index...");

        // Rebuild the index
        rebuild_search_index(app_handle, state).await?;
    }

    Ok(())
}

/// iOS-specific initialization
#[cfg(target_os = "ios")]
fn ios_init(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    println!("Initializing iOS-specific functionality");

    // Get the app's documents directory on iOS
    let documents_dir =
        tauri::api::path::document_dir().ok_or("Failed to get documents directory")?;

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
            let app_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data directory");
            let config_dir = app_dir.join("config");

            let config_manager =
                ConfigManager::new(&config_dir).expect("Failed to initialize config manager");

            // Initialize search service
            let search_service =
                SearchService::new(&app_dir).expect("Failed to initialize search service");

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
                last_index_rebuild: Mutex::new(Instant::now()),
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
            set_default_note_type,
            set_auto_update_search_index,
            set_auto_update_mode,
            set_auto_update_interval,
            list_notes,
            get_note,
            update_note_content,
            rename_note,
            move_note,
            search_notes,
            rebuild_search_index,
            create_note,
            filter_notes_by_tags,
            find_note_by_title,
            find_backlinks,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
