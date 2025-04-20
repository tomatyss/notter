use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use anyhow::{Context, Result};
use walkdir::WalkDir;
use base64::Engine;
use natord::compare;

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
        Self { notes_dir }
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
        
        Ok(Note {
            id,
            title,
            content,
            created,
            modified,
            tags,
            file_type,
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
