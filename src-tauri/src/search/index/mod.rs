use crate::search::error::SearchError;

/// Document that can be indexed
#[derive(Debug, Clone)]
pub struct IndexableDocument {
    /// Unique identifier for the document
    pub id: String,
    /// Title of the document
    pub title: String,
    /// Content of the document
    pub content: String,
    /// Tags associated with the document
    pub tags: Vec<String>,
    /// When the document was created
    pub created: chrono::DateTime<chrono::Utc>,
    /// When the document was last modified
    pub modified: chrono::DateTime<chrono::Utc>,
    /// Type of the document
    pub file_type: String,
}

/// Interface for search index operations
pub trait SearchIndex {
    /// Add a document to the index
    #[allow(dead_code)]
    fn add_document(&self, document: &IndexableDocument) -> Result<(), SearchError>;
    
    /// Remove a document from the index
    #[allow(dead_code)]
    fn remove_document(&self, id: &str) -> Result<(), SearchError>;
    
    /// Clear the entire index
    #[allow(dead_code)]
    fn clear(&self) -> Result<(), SearchError>;
    
    /// Optimize the index for better performance
    #[allow(dead_code)]
    fn optimize(&self) -> Result<(), SearchError>;
    
    /// Get the number of documents in the index
    #[allow(dead_code)]
    fn document_count(&self) -> Result<usize, SearchError>;
    
    /// Rebuild the index with the given documents
    fn rebuild_index(&self, documents: &[IndexableDocument]) -> Result<(), SearchError>;
}

pub mod tantivy_index;
pub use tantivy_index::TantivyIndex;
