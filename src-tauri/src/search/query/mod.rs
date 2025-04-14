use crate::search::error::SearchError;

/// Search options for configuring search behavior
#[derive(Debug, Clone)]
pub struct SearchOptions {
    /// Maximum number of results to return
    pub limit: usize,
    /// Boost factor for title matches
    pub title_boost: f32,
    /// Boost factor for tag matches
    pub tags_boost: f32,
    /// Maximum length of snippet in characters
    pub snippet_length: usize,
    /// HTML tag to use for highlighting matches
    pub highlight_tag: String,
}

impl Default for SearchOptions {
    fn default() -> Self {
        Self {
            limit: 100,
            title_boost: 2.0,
            tags_boost: 1.5,
            snippet_length: 150,
            highlight_tag: "em".to_string(),
        }
    }
}

/// Search hit representing a matching document
#[derive(Debug, Clone)]
pub struct SearchHit {
    /// Unique identifier for the document
    pub id: String,
    /// Title of the document
    pub title: String,
    /// Highlighted snippets from the content
    pub snippets: Vec<String>,
    /// Tags associated with the document
    pub tags: Vec<String>,
    /// When the document was created
    pub created: chrono::DateTime<chrono::Utc>,
    /// When the document was last modified
    pub modified: chrono::DateTime<chrono::Utc>,
    /// Type of the document
    pub file_type: String,
    /// Search relevance score
    pub score: f32,
}

/// Interface for search query operations
pub trait QueryEngine {
    /// Search for documents matching a query
    fn search(&self, query: &str, options: &SearchOptions) -> Result<Vec<SearchHit>, SearchError>;
    
    /// Search for documents with a specific field value
    fn search_by_field(&self, field: &str, value: &str, options: &SearchOptions) -> Result<Vec<SearchHit>, SearchError>;
}

pub mod tantivy_query;
pub use tantivy_query::TantivyQueryEngine;
