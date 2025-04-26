use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use anyhow::{Context, Result};
use walkdir::WalkDir;
use base64::Engine;
use natord::compare;
use regex::Regex;
#[cfg(target_os = "ios")]
use std::sync::Arc;

/// Options for sorting notes
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SortOption {
    /// Sort by title alphabetically (A-Z)
    TitleAsc,
    /// Sort by title reverse alphabetically (Z-A)
    TitleDesc,
    /// Sort by creation date (newest first)
    CreatedNewest,
    /// Sort by creation date (oldest first)
    CreatedOldest,
    /// Sort by modification date (newest first)
    ModifiedNewest,
    /// Sort by modification date (oldest first)
    ModifiedOldest,
}

/// Represents the type of a note file
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum NoteType {
    /// Markdown formatted note
    Markdown,
    /// Plain text note
    PlainText,
}

/// Represents a note in the system
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Note {
    /// Unique identifier for the note
    pub id: String,
    /// Title of the note
    pub title: String,
    /// Content of the note
    pub content: String,
    /// When the note was created
    pub created: DateTime<Utc>,
    /// When the note was last modified
    pub modified: DateTime<Utc>,
    /// Tags associated with the note
    pub tags: Vec<String>,
    /// Type of the note (markdown or plain text)
    pub file_type: NoteType,
    /// File path relative to the notes directory
    pub path: String,
}

/// Represents a note summary for listing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NoteSummary {
    /// Unique identifier for the note
    pub id: String,
    /// Title of the note
    pub title: String,
    /// When the note was created
    pub created: DateTime<Utc>,
    /// When the note was last modified
    pub modified: DateTime<Utc>,
    /// Tags associated with the note
    pub tags: Vec<String>,
    /// Type of the note (markdown or plain text)
    pub file_type: NoteType,
}

/// Manages notes in the file system
#[derive(Clone)]
pub struct NoteManager {
    /// Base directory for notes
    notes_dir: PathBuf,
    /// Flag indicating if running on iOS
    #[cfg(target_os = "ios")]
    is_ios: bool,
}

impl NoteManager {
    /// Creates a new NoteManager
    /// 
    /// # Parameters
    /// * `notes_dir` - Path to the notes directory
    /// 
    /// # Returns
    /// A new NoteManager instance
    pub fn new(notes_dir: PathBuf) -> Self {
        #[cfg(target_os = "ios")]
        {
            Self { 
                notes_dir,
                is_ios: true,
            }
        }
        
        #[cfg(not(target_os = "ios"))]
        {
            Self { notes_dir }
        }
    }
    
    /// Lists all notes in the directory
    /// 
    /// # Parameters
    /// * `sort` - Optional sort option to determine the order of notes
    /// 
    /// # Returns
    /// A list of note summaries
    pub fn list_notes(&self, sort: Option<SortOption>) -> Result<Vec<NoteSummary>> {
        let mut notes = Vec::new();
        
        #[cfg(target_os = "ios")]
        {
            // On iOS, we need to be more careful with file system access
            // and handle the case where the directory might not be accessible yet
            if !self.notes_dir.exists() {
                return Ok(Vec::new());
            }
        }
        
        for entry in WalkDir::new(&self.notes_dir)
            .follow_links(true)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            let path = entry.path();
            
            // Process markdown and txt files
            if path.is_file() && path.extension().map_or(false, |ext| ext == "md" || ext == "txt") {
                if let Ok(note) = self.get_note_summary(path) {
                    notes.push(note);
                }
            }
        }
        
        // Apply sorting based on the provided option
        match sort.unwrap_or(SortOption::ModifiedNewest) {
            // Use natural sorting for title comparisons
            SortOption::TitleAsc => notes.sort_by(|a, b| compare(&a.title, &b.title)),
            SortOption::TitleDesc => notes.sort_by(|a, b| compare(&b.title, &a.title)),
            SortOption::CreatedNewest => notes.sort_by(|a, b| b.created.cmp(&a.created)),
            SortOption::CreatedOldest => notes.sort_by(|a, b| a.created.cmp(&b.created)),
            SortOption::ModifiedNewest => notes.sort_by(|a, b| b.modified.cmp(&a.modified)),
            SortOption::ModifiedOldest => notes.sort_by(|a, b| a.modified.cmp(&b.modified)),
        }
        
        Ok(notes)
    }
    
    /// Gets a note by ID
    /// 
    /// # Parameters
    /// * `id` - ID of the note to retrieve
    /// 
    /// # Returns
    /// The note if found
    pub fn get_note(&self, id: &str) -> Result<Note> {
        let path = self.get_note_path(id)?;
        self.read_note(&path)
    }
    
    /// Determines the note type based on file extension
    /// 
    /// # Parameters
    /// * `path` - Path to the note file
    /// 
    /// # Returns
    /// The note type (Markdown or PlainText)
    fn get_note_type(&self, path: &Path) -> NoteType {
        if path.extension().map_or(false, |ext| ext == "md") {
            NoteType::Markdown
        } else {
            NoteType::PlainText
        }
    }
    
    /// Extracts tags from note content
    /// 
    /// # Parameters
    /// * `content` - Note content to extract tags from
    /// 
    /// # Returns
    /// Vector of extracted tags
    fn extract_tags(&self, content: &str) -> Vec<String> {
        let mut tags = Vec::new();
        
        for line in content.lines() {
            // Split line into words and find those starting with #
            for word in line.split_whitespace() {
                if word.starts_with("#") && word.len() > 1 {
                    // Remove the # and any trailing punctuation
                    let tag = word.trim_start_matches('#')
                              .trim_end_matches(|c: char| !c.is_alphanumeric())
                              .to_string();
                    if !tag.is_empty() && !tags.contains(&tag) {
                        tags.push(tag);
                    }
                }
            }
        }
        
        tags
    }
    
    /// Reads a note from a file
    /// 
    /// # Parameters
    /// * `path` - Path to the note file
    /// 
    /// # Returns
    /// The parsed note
    fn read_note(&self, path: &Path) -> Result<Note> {
        let content = fs::read_to_string(path)
            .context("Failed to read note file")?;
        
        let file_type = self.get_note_type(path);
        
        // Extract title based on file type
        let title = match file_type {
            NoteType::Markdown => content.lines()
                .next()
                .map(|line| line.trim_start_matches('#').trim().to_string())
                .unwrap_or_else(|| "Untitled Note".to_string()),
            NoteType::PlainText => path.file_stem()
                .and_then(|stem| stem.to_str())
                .map(|s| s.to_string())
                .unwrap_or_else(|| "Untitled Note".to_string()),
        };
        
        // Extract tags from content
        let tags = self.extract_tags(&content);
        
        // Get file metadata
        let metadata = path.metadata()
            .context("Failed to read file metadata")?;
        
        let created = metadata.created()
            .map(|time| DateTime::<Utc>::from(time))
            .unwrap_or_else(|_| Utc::now());
        
        let modified = metadata.modified()
            .map(|time| DateTime::<Utc>::from(time))
            .unwrap_or_else(|_| Utc::now());
        
        // Generate ID from file path
        let id = self.path_to_id(path)?;
        
        // Get relative path from notes directory
        let relative_path = path.strip_prefix(&self.notes_dir)
            .context("Path is not in notes directory")?
            .to_string_lossy()
            .to_string();
        
        Ok(Note {
            id,
            title,
            content,
            created,
            modified,
            tags,
            file_type,
            path: relative_path,
        })
    }
    
    /// Gets a summary of a note without loading full content
    /// 
    /// # Parameters
    /// * `path` - Path to the note file
    /// 
    /// # Returns
    /// A summary of the note
    fn get_note_summary(&self, path: &Path) -> Result<NoteSummary> {
        // Read just enough of the file to extract metadata
        let content = fs::read_to_string(path)
            .context("Failed to read note file")?;
        
        let file_type = self.get_note_type(path);
        
        // Extract title based on file type
        let title = match file_type {
            NoteType::Markdown => content.lines()
                .next()
                .map(|line| line.trim_start_matches('#').trim().to_string())
                .unwrap_or_else(|| "Untitled Note".to_string()),
            NoteType::PlainText => path.file_stem()
                .and_then(|stem| stem.to_str())
                .map(|s| s.to_string())
                .unwrap_or_else(|| "Untitled Note".to_string()),
        };
        
        // Extract tags from content
        let tags = self.extract_tags(&content);
        
        // Get file metadata
        let metadata = path.metadata()
            .context("Failed to read file metadata")?;
        
        let created = metadata.created()
            .map(|time| DateTime::<Utc>::from(time))
            .unwrap_or_else(|_| Utc::now());
        
        let modified = metadata.modified()
            .map(|time| DateTime::<Utc>::from(time))
            .unwrap_or_else(|_| Utc::now());
        
        // Generate ID from file path
        let id = self.path_to_id(path)?;
        
        Ok(NoteSummary {
            id,
            title,
            created,
            modified,
            tags,
            file_type,
        })
    }
    
    /// Converts a note ID to a file path
    /// 
    /// # Parameters
    /// * `id` - ID of the note
    /// 
    /// # Returns
    /// Path to the note file
    fn get_note_path(&self, id: &str) -> Result<PathBuf> {
        // Decode the ID back to a relative path
        let relative_path = base64::engine::general_purpose::STANDARD
            .decode(id)
            .context("Failed to decode note ID")?;
        
        let relative_path = String::from_utf8(relative_path)
            .context("Invalid UTF-8 in note ID")?;
        
        let path = self.notes_dir.join(relative_path);
        
        if !path.exists() {
            anyhow::bail!("Note not found: {}", id);
        }
        
        Ok(path)
    }
    
    /// Updates the content of a note
    /// 
    /// # Parameters
    /// * `id` - ID of the note to update
    /// * `content` - New content for the note
    /// 
    /// # Returns
    /// The updated note
    pub fn update_note_content(&self, id: &str, content: &str) -> Result<Note> {
        // Get the file path from the ID
        let path = self.get_note_path(id)?;
        
        // Write the new content to the file
        fs::write(&path, content)
            .context("Failed to write note content")?;
        
        // Return the updated note
        self.read_note(&path)
    }
    
    /// Renames a note file
    /// 
    /// # Parameters
    /// * `id` - ID of the note to rename
    /// * `new_name` - New name for the note file (without extension)
    /// 
    /// # Returns
    /// The updated note with new ID
    pub fn rename_note(&self, id: &str, new_name: &str) -> Result<Note> {
        // Get the current file path from the ID
        let current_path = self.get_note_path(id)?;
        
        // Get the file extension
        let extension = current_path.extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("txt");
        
        // Get the parent directory
        let parent_dir = current_path.parent()
            .unwrap_or_else(|| Path::new(""));
        
        // Create the new path with the new name and same extension
        let new_path = parent_dir.join(format!("{}.{}", new_name, extension));
        
        // Check if the new path already exists
        if new_path.exists() {
            anyhow::bail!("A file with this name already exists");
        }
        
        // Rename the file
        fs::rename(&current_path, &new_path)
            .context("Failed to rename note file")?;
        
        // Return the updated note
        self.read_note(&new_path)
    }
    
    /// Moves a note to a different path
    /// 
    /// # Parameters
    /// * `id` - ID of the note to move
    /// * `new_path` - New relative path for the note (including filename)
    /// 
    /// # Returns
    /// The updated note with new ID
    pub fn move_note(&self, id: &str, new_relative_path: &str) -> Result<Note> {
        // Get the current file path from the ID
        let current_path = self.get_note_path(id)?;
        
        // Create the new absolute path
        let new_path = self.notes_dir.join(new_relative_path);
        
        // Ensure the parent directory exists
        if let Some(parent) = new_path.parent() {
            fs::create_dir_all(parent)
                .context("Failed to create parent directories")?;
        }
        
        // Check if the new path already exists
        if new_path.exists() {
            anyhow::bail!("A file already exists at the target path");
        }
        
        // Move the file
        fs::rename(&current_path, &new_path)
            .context("Failed to move note file")?;
        
        // Return the updated note
        self.read_note(&new_path)
    }
    
    /// Creates a new note file
    /// 
    /// # Parameters
    /// * `title` - Title of the note
    /// * `content` - Initial content of the note
    /// * `file_type` - Type of note (Markdown or PlainText)
    /// * `pattern` - Optional naming pattern (e.g., "{number}-{title}")
    /// 
    /// # Returns
    /// The newly created note
    pub fn create_note(&self, title: &str, content: &str, file_type: NoteType, pattern: Option<&str>) -> Result<Note> {
        // Generate filename based on pattern or use title directly
        let filename = if let Some(pattern) = pattern {
            self.generate_filename_from_pattern(title, pattern, &file_type)?
        } else {
            format!("{}.{}", title, self.get_extension_for_type(&file_type))
        };
        
        // Create the full path
        let file_path = self.notes_dir.join(&filename);
        
        // Check if file already exists
        if file_path.exists() {
            anyhow::bail!("A note with this name already exists");
        }
        
        // Write content to file
        fs::write(&file_path, content)
            .context("Failed to write note file")?;
        
        // Read the newly created note
        self.read_note(&file_path)
    }
    
    /// Generates a filename based on a pattern
    /// 
    /// # Parameters
    /// * `title` - Title of the note
    /// * `pattern` - Naming pattern (e.g., "{number}-{title}")
    /// * `file_type` - Type of note (Markdown or PlainText)
    /// 
    /// # Returns
    /// The generated filename
    fn generate_filename_from_pattern(&self, title: &str, pattern: &str, file_type: &NoteType) -> Result<String> {
        let extension = self.get_extension_for_type(file_type);
        
        // If pattern contains {number}, find the highest number and increment
        if pattern.contains("{number}") {
            let highest_number = self.find_highest_number_in_notes(pattern)?;
            let next_number = highest_number + 1;
            
            // Replace placeholders in pattern
            let filename = pattern
                .replace("{number}", &next_number.to_string())
                .replace("{title}", title)
                .replace("{extension}", extension);
            
            Ok(filename)
        } else {
            // Simple replacement without number logic
            let filename = pattern
                .replace("{title}", title)
                .replace("{extension}", extension);
            
            Ok(filename)
        }
    }
    
    /// Finds the highest number used in existing note filenames that follow a pattern
    /// 
    /// # Parameters
    /// * `pattern` - Naming pattern to match
    /// 
    /// # Returns
    /// The highest number found, or 0 if none found
    fn find_highest_number_in_notes(&self, pattern: &str) -> Result<u32> {
        let mut highest_number = 0;
        
        // Create a regex pattern from the naming pattern
        // This converts "{number}-{title}" to something like "(\d+)-.*"
        let regex_pattern = pattern
            .replace("{number}", r"(\d+)")
            .replace("{title}", ".*")
            .replace("{extension}", "");
        
        let regex = Regex::new(&regex_pattern)
            .context("Failed to create regex from pattern")?;
        
        // Scan all notes in the directory
        for entry in WalkDir::new(&self.notes_dir)
            .max_depth(1) // Only look at root directory
            .into_iter()
            .filter_map(|e| e.ok())
        {
            let path = entry.path();
            
            if path.is_file() {
                if let Some(filename) = path.file_name().and_then(|n| n.to_str()) {
                    if let Some(captures) = regex.captures(filename) {
                        if let Some(number_match) = captures.get(1) {
                            if let Ok(number) = number_match.as_str().parse::<u32>() {
                                if number > highest_number {
                                    highest_number = number;
                                }
                            }
                        }
                    }
                }
            }
        }
        
        Ok(highest_number)
    }
    
    /// Gets the file extension for a note type
    /// 
    /// # Parameters
    /// * `file_type` - Type of note
    /// 
    /// # Returns
    /// The file extension without the dot
    fn get_extension_for_type(&self, file_type: &NoteType) -> &str {
        match file_type {
            NoteType::Markdown => "md",
            NoteType::PlainText => "txt",
        }
    }
    
    /// Converts a file path to a note ID
    /// 
    /// # Parameters
    /// * `path` - Path to the note file
    /// 
    /// # Returns
    /// ID for the note
    fn path_to_id(&self, path: &Path) -> Result<String> {
        // Get relative path from notes directory
        let relative_path = path.strip_prefix(&self.notes_dir)
            .context("Path is not in notes directory")?;
        
        // Use base64-encoded relative path as ID
        let id = base64::engine::general_purpose::STANDARD
            .encode(relative_path.to_string_lossy().as_bytes());
        
        Ok(id)
    }
}
