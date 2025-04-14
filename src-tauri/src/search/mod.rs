use anyhow::{Context, Result};
use std::path::PathBuf;
use tantivy::{
    collector::TopDocs,
    doc,
    query::QueryParser,
    schema::{Field, Schema, STORED, TEXT},
    Index, IndexReader, ReloadPolicy, SnippetGenerator,
};
use serde::{Deserialize, Serialize};

use crate::notes::{Note, NoteSummary, NoteType};

/// Search result with highlighting information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    /// The note summary
    pub note: NoteSummary,
    /// Highlighted snippets from the content
    pub snippets: Vec<String>,
    /// Search relevance score
    pub score: f32,
}

/// Manages search functionality for notes
pub struct SearchManager {
    /// Path to the search index
    index_path: PathBuf,
    /// Tantivy index
    index: Index,
    /// Index reader for searching
    reader: IndexReader,
    /// Schema fields
    title_field: Field,
    content_field: Field,
    tags_field: Field,
    id_field: Field,
    created_field: Field,
    modified_field: Field,
    file_type_field: Field,
}

impl SearchManager {
    /// Creates a new SearchManager
    /// 
    /// # Parameters
    /// * `app_data_dir` - Path to the application data directory
    /// 
    /// # Returns
    /// A new SearchManager instance
    pub fn new(app_data_dir: &PathBuf) -> Result<Self> {
        // Create search index directory
        let index_path = app_data_dir.join("search_index");
        std::fs::create_dir_all(&index_path)
            .context("Failed to create search index directory")?;
        
        // Define schema
        let schema = Self::create_schema()?;
        
        // Get field references
        let title_field = schema.get_field("title").context("Failed to get title field")?;
        let content_field = schema.get_field("content").context("Failed to get content field")?;
        let tags_field = schema.get_field("tags").context("Failed to get tags field")?;
        let id_field = schema.get_field("id").context("Failed to get id field")?;
        let created_field = schema.get_field("created").context("Failed to get created field")?;
        let modified_field = schema.get_field("modified").context("Failed to get modified field")?;
        let file_type_field = schema.get_field("file_type").context("Failed to get file_type field")?;
        
        // Create or open index
        let index = if index_path.join("meta.json").exists() {
            Index::open_in_dir(&index_path).context("Failed to open search index")?
        } else {
            Index::create_in_dir(&index_path, schema).context("Failed to create search index")?
        };
        
        // Create reader
        let reader = index
            .reader_builder()
            .reload_policy(ReloadPolicy::OnCommit)
            .try_into()
            .context("Failed to create index reader")?;
        
        Ok(Self {
            index_path,
            index,
            reader,
            title_field,
            content_field,
            tags_field,
            id_field,
            created_field,
            modified_field,
            file_type_field,
        })
    }
    
    /// Creates the search schema
    /// 
    /// # Returns
    /// The Tantivy schema for indexing notes
    fn create_schema() -> Result<Schema> {
        let mut builder = Schema::builder();
        
        // Add fields to schema
        builder.add_text_field("id", TEXT | STORED);
        builder.add_text_field("title", TEXT | STORED);
        builder.add_text_field("content", TEXT | STORED);
        builder.add_text_field("tags", TEXT | STORED);
        builder.add_date_field("created", STORED);
        builder.add_date_field("modified", STORED);
        builder.add_text_field("file_type", STORED);
        
        Ok(builder.build())
    }
    
    /// Indexes a note
    /// 
    /// # Parameters
    /// * `note` - The note to index
    /// 
    /// # Returns
    /// Result indicating success or failure
    pub fn index_note(&self, note: &Note) -> Result<()> {
        let mut writer = self.index.writer(50_000_000)
            .context("Failed to create index writer")?;
        
        // Remove existing document with same ID if it exists
        writer.delete_term(tantivy::Term::from_field_text(self.id_field, &note.id));
        
        // Add document
        let tags_str = note.tags.join(" ");
        let file_type_str = format!("{:?}", note.file_type);
        
        writer.add_document(doc!(
            self.id_field => note.id.clone(),
            self.title_field => note.title.clone(),
            self.content_field => note.content.clone(),
            self.tags_field => tags_str,
            self.created_field => tantivy::DateTime::from_timestamp_secs(note.created.timestamp()),
            self.modified_field => tantivy::DateTime::from_timestamp_secs(note.modified.timestamp()),
            self.file_type_field => file_type_str
        ))?;
        
        writer.commit()?;
        
        Ok(())
    }
    
    /// Indexes multiple notes
    /// 
    /// # Parameters
    /// * `notes` - The notes to index
    /// 
    /// # Returns
    /// Result indicating success or failure
    pub fn index_notes(&self, notes: &[Note]) -> Result<()> {
        let mut writer = self.index.writer(50_000_000)
            .context("Failed to create index writer")?;
        
        for note in notes {
            // Remove existing document with same ID if it exists
            writer.delete_term(tantivy::Term::from_field_text(self.id_field, &note.id));
            
            // Add document
            let tags_str = note.tags.join(" ");
            let file_type_str = format!("{:?}", note.file_type);
            
            writer.add_document(doc!(
                self.id_field => note.id.clone(),
                self.title_field => note.title.clone(),
                self.content_field => note.content.clone(),
                self.tags_field => tags_str,
                self.created_field => tantivy::DateTime::from_timestamp_secs(note.created.timestamp()),
                self.modified_field => tantivy::DateTime::from_timestamp_secs(note.modified.timestamp()),
                self.file_type_field => file_type_str
            ))?;
        }
        
        writer.commit()?;
        
        Ok(())
    }
    
    /// Removes a note from the index
    /// 
    /// # Parameters
    /// * `id` - ID of the note to remove
    /// 
    /// # Returns
    /// Result indicating success or failure
    pub fn remove_note(&self, id: &str) -> Result<()> {
        let mut writer = self.index.writer(50_000_000)
            .context("Failed to create index writer")?;
        
        writer.delete_term(tantivy::Term::from_field_text(self.id_field, id));
        writer.commit()?;
        
        Ok(())
    }
    
    /// Searches for notes matching the query
    /// 
    /// # Parameters
    /// * `query_str` - The search query
    /// * `limit` - Maximum number of results to return
    /// 
    /// # Returns
    /// List of search results
    pub fn search(&self, query_str: &str, limit: usize) -> Result<Vec<SearchResult>> {
        println!("Searching for: {}", query_str);
        
        let searcher = self.reader.searcher();
        println!("Number of documents in index: {}", searcher.num_docs());
        
        // Create query parser
        let mut query_parser = QueryParser::for_index(&self.index, vec![
            self.title_field,
            self.content_field,
            self.tags_field,
        ]);
        
        // Set field boosts (title matches are more important)
        query_parser.set_field_boost(self.title_field, 2.0);
        query_parser.set_field_boost(self.tags_field, 1.5);
        
        // Parse query
        let query = query_parser.parse_query(query_str)
            .context("Failed to parse search query")?;
        
        println!("Parsed query: {:?}", query);
        
        // Search
        let top_docs = searcher.search(
            &query,
            &TopDocs::with_limit(limit),
        )?;
        
        println!("Search returned {} results", top_docs.len());
        
        // Create snippet generator for highlighting
        let mut snippet_generator = SnippetGenerator::create(
            &searcher,
            &query,
            self.content_field,
        )?;
        snippet_generator.set_max_num_chars(150);
        
        // Process results
        let mut results = Vec::new();
        for (score, doc_address) in top_docs {
            let retrieved_doc = searcher.doc(doc_address)?;
            
            // Extract stored fields
            let id = retrieved_doc
                .get_first(self.id_field)
                .and_then(|f| f.as_text())
                .context("Failed to get id from search result")?
                .to_string();
                
            let title = retrieved_doc
                .get_first(self.title_field)
                .and_then(|f| f.as_text())
                .context("Failed to get title from search result")?
                .to_string();
                
            let tags_str = retrieved_doc
                .get_first(self.tags_field)
                .and_then(|f| f.as_text())
                .unwrap_or("")
                .to_string();
                
            let tags = if tags_str.is_empty() {
                Vec::new()
            } else {
                tags_str.split_whitespace().map(String::from).collect()
            };
            
            let created = retrieved_doc
                .get_first(self.created_field)
                .and_then(|f| f.as_date())
                .map(|d| chrono::DateTime::<chrono::Utc>::from_timestamp(d.into_timestamp_secs(), 0).unwrap())
                .unwrap_or_else(chrono::Utc::now);
                
            let modified = retrieved_doc
                .get_first(self.modified_field)
                .and_then(|f| f.as_date())
                .map(|d| chrono::DateTime::<chrono::Utc>::from_timestamp(d.into_timestamp_secs(), 0).unwrap())
                .unwrap_or_else(chrono::Utc::now);
                
            let file_type_str = retrieved_doc
                .get_first(self.file_type_field)
                .and_then(|f| f.as_text())
                .unwrap_or("PlainText");
                
            let file_type = if file_type_str.contains("Markdown") {
                NoteType::Markdown
            } else {
                NoteType::PlainText
            };
            
            // Create note summary
            let note = NoteSummary {
                id,
                title,
                created,
                modified,
                tags,
                file_type,
            };
            
            // Generate snippets for highlighting
            let snippets = if let Some(content) = retrieved_doc.get_first(self.content_field) {
                if let Some(_content_str) = content.as_text() {
                    let snippet = snippet_generator.snippet_from_doc(&retrieved_doc);
                    vec![snippet.to_html()]
                } else {
                    Vec::new()
                }
            } else {
                Vec::new()
            };
            
            results.push(SearchResult {
                note,
                snippets,
                score,
            });
        }
        
        Ok(results)
    }
    
    /// Rebuilds the entire search index
    /// 
    /// # Parameters
    /// * `notes` - All notes to index
    /// 
    /// # Returns
    /// Result indicating success or failure
    pub fn rebuild_index(&self, notes: &[Note]) -> Result<()> {
        println!("Rebuilding search index with {} notes", notes.len());
        
        // Try to recreate the index from scratch
        println!("Creating new index at {:?}", self.index_path);
        
        // First try to delete the existing index directory
        if self.index_path.exists() {
            println!("Removing existing index directory");
            match std::fs::remove_dir_all(&self.index_path) {
                Ok(_) => println!("Successfully removed existing index directory"),
                Err(e) => println!("Warning: Failed to remove existing index directory: {}", e),
            }
            
            // Recreate the directory
            std::fs::create_dir_all(&self.index_path)
                .context("Failed to create search index directory")?;
        }
        
        // Create a new schema
        let schema = Self::create_schema()?;
        
        // Create a new index
        let index = Index::create_in_dir(&self.index_path, schema)
            .context("Failed to create new search index")?;
        
        // Create a writer with the new index
        let mut writer = index.writer(50_000_000)
            .context("Failed to create index writer for new index")?;
        
        println!("Indexing {} notes", notes.len());
        
        // Add all notes to the index
        for note in notes {
            let tags_str = note.tags.join(" ");
            let file_type_str = format!("{:?}", note.file_type);
            
            writer.add_document(doc!(
                self.id_field => note.id.clone(),
                self.title_field => note.title.clone(),
                self.content_field => note.content.clone(),
                self.tags_field => tags_str,
                self.created_field => tantivy::DateTime::from_timestamp_secs(note.created.timestamp()),
                self.modified_field => tantivy::DateTime::from_timestamp_secs(note.modified.timestamp()),
                self.file_type_field => file_type_str
            ))?;
        }
        
        // Commit the changes
        println!("Committing changes to index");
        writer.commit()?;
        
        println!("Search index rebuilt successfully");
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    use chrono::Utc;
    
    #[test]
    fn test_search_manager_creation() {
        let temp_dir = tempdir().unwrap();
        let search_manager = SearchManager::new(&temp_dir.path().to_path_buf());
        assert!(search_manager.is_ok());
    }
    
    #[test]
    fn test_indexing_and_searching() {
        let temp_dir = tempdir().unwrap();
        let search_manager = SearchManager::new(&temp_dir.path().to_path_buf()).unwrap();
        
        // Create test note
        let note = Note {
            id: "test-id".to_string(),
            title: "Test Note".to_string(),
            content: "This is a test note with some content about Rust programming.".to_string(),
            created: Utc::now(),
            modified: Utc::now(),
            tags: vec!["test".to_string(), "rust".to_string()],
            file_type: NoteType::Markdown,
        };
        
        // Index the note
        search_manager.index_note(&note).unwrap();
        
        // Search for "rust"
        let results = search_manager.search("rust", 10).unwrap();
        assert!(!results.is_empty());
        assert_eq!(results[0].note.id, "test-id");
        
        // Search for something that shouldn't match
        let results = search_manager.search("nonexistent", 10).unwrap();
        assert!(results.is_empty());
    }
}
