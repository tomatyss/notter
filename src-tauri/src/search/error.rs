use thiserror::Error;

/// Errors that can occur in the search module
#[derive(Debug, Error)]
pub enum SearchError {
    /// Failed to create search index
    #[error("Failed to create search index: {0}")]
    IndexCreationError(String),
    
    /// Failed to open search index
    #[error("Failed to open search index: {0}")]
    IndexOpenError(String),
    
    /// Failed to add document to index
    #[error("Failed to add document to index: {0}")]
    DocumentAddError(String),
    
    /// Failed to remove document from index
    #[error("Failed to remove document from index: {0}")]
    DocumentRemoveError(String),
    
    /// Failed to parse search query
    #[error("Failed to parse search query: {0}")]
    QueryParseError(String),
    
    /// Failed to execute search
    #[error("Failed to execute search: {0}")]
    SearchExecutionError(String),
    
    /// Failed to generate snippets
    #[error("Failed to generate snippets: {0}")]
    SnippetGenerationError(String),
    
    /// I/O error
    #[error("I/O error: {0}")]
    IoError(#[from] std::io::Error),
    
    /// Tantivy error
    #[error("Tantivy error: {0}")]
    TantivyError(String),
}

/// Convert Tantivy errors to SearchError
impl From<tantivy::TantivyError> for SearchError {
    fn from(err: tantivy::TantivyError) -> Self {
        SearchError::TantivyError(err.to_string())
    }
}
