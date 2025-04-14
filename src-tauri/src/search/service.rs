use std::path::Path;
use std::sync::Arc;
use log::info;

use crate::notes::{Note, NoteSummary, NoteType};
use crate::search::error::SearchError;
use crate::search::index::{SearchIndex, TantivyIndex};
use crate::search::query::{QueryEngine, SearchOptions, TantivyQueryEngine};
use crate::search::document::DocumentConverter;

/// Search result with highlighting information
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SearchResult {
    /// The note summary
    pub note: NoteSummary,
    /// Highlighted snippets from the content
    pub snippets: Vec<String>,
    /// Search relevance score
    pub score: f32,
}

/// High-level search service that coordinates index and query operations
pub struct SearchService {
    /// The search index implementation
    index: Arc<dyn SearchIndex + Send + Sync>,
    /// The query engine implementation
    query_engine: Arc<dyn QueryEngine + Send + Sync>,
    /// Document converter for converting between Note and IndexableDocument
    document_converter: DocumentConverter,
}

impl SearchService {
    /// Creates a new SearchService
    /// 
    /// # Parameters
    /// * `app_data_dir` - Path to the application data directory
    /// 
    /// # Returns
    /// A new SearchService instance
    pub fn new(app_data_dir: &Path) -> Result<Self, SearchError> {
        let index_path = app_data_dir.join("search_index");
        
        // Create the index
        let tantivy_index = TantivyIndex::new(&index_path)?;
        let index = Arc::new(tantivy_index.clone()) as Arc<dyn SearchIndex + Send + Sync>;
        
        // Create the query engine
        // Since we know the concrete type is TantivyIndex, we can just use it directly
        let tantivy_query = TantivyQueryEngine::new(&tantivy_index)?;
        let query_engine = Arc::new(tantivy_query) as Arc<dyn QueryEngine + Send + Sync>;
        
        // Create the document converter
        let document_converter = DocumentConverter::new();
        
        Ok(Self {
            index,
            query_engine,
            document_converter,
        })
    }
    
    /// Indexes a note
    /// 
    /// # Parameters
    /// * `note` - The note to index
    /// 
    /// # Returns
    /// Result indicating success or failure
    pub fn index_note(&self, note: &Note) -> Result<(), SearchError> {
        let document = self.document_converter.note_to_document(note);
        self.index.add_document(&document)
    }
    
    /// Removes a note from the index
    /// 
    /// # Parameters
    /// * `id` - ID of the note to remove
    /// 
    /// # Returns
    /// Result indicating success or failure
    pub fn remove_note(&self, id: &str) -> Result<(), SearchError> {
        self.index.remove_document(id)
    }
    
    /// Searches for notes matching a query
    /// 
    /// # Parameters
    /// * `query` - The search query
    /// * `limit` - Maximum number of results to return
    /// 
    /// # Returns
    /// List of search results
    pub fn search(&self, query: &str, limit: usize) -> Result<Vec<SearchResult>, SearchError> {
        let options = SearchOptions {
            limit,
            ..Default::default()
        };
        
        let hits = self.query_engine.search(query, &options)?;
        
        // Convert hits to SearchResult objects
        let results = hits.into_iter()
            .map(|hit| SearchResult {
                note: NoteSummary {
                    id: hit.id,
                    title: hit.title,
                    created: hit.created,
                    modified: hit.modified,
                    tags: hit.tags,
                    file_type: if hit.file_type.contains("Markdown") {
                        NoteType::Markdown
                    } else {
                        NoteType::PlainText
                    },
                },
                snippets: hit.snippets,
                score: hit.score,
            })
            .collect();
        
        Ok(results)
    }
    
    /// Searches for notes with a specific field value
    /// 
    /// # Parameters
    /// * `field` - The field to search in
    /// * `value` - The value to search for
    /// * `limit` - Maximum number of results to return
    /// 
    /// # Returns
    /// List of search results
    pub fn search_by_field(&self, field: &str, value: &str, limit: usize) -> Result<Vec<SearchResult>, SearchError> {
        let options = SearchOptions {
            limit,
            ..Default::default()
        };
        
        let hits = self.query_engine.search_by_field(field, value, &options)?;
        
        // Convert hits to SearchResult objects
        let results = hits.into_iter()
            .map(|hit| SearchResult {
                note: NoteSummary {
                    id: hit.id,
                    title: hit.title,
                    created: hit.created,
                    modified: hit.modified,
                    tags: hit.tags,
                    file_type: if hit.file_type.contains("Markdown") {
                        NoteType::Markdown
                    } else {
                        NoteType::PlainText
                    },
                },
                snippets: hit.snippets,
                score: hit.score,
            })
            .collect();
        
        Ok(results)
    }
    
    /// Rebuilds the search index with all notes
    /// 
    /// # Parameters
    /// * `notes` - All notes to index
    /// 
    /// # Returns
    /// Result indicating success or failure
    pub fn rebuild_index(&self, notes: &[Note]) -> Result<(), SearchError> {
        info!("Rebuilding search index with {} notes", notes.len());
        
        // Convert notes to documents
        let documents = self.document_converter.notes_to_documents(notes);
        
        // Rebuild the index
        self.index.rebuild_index(&documents)?;
        
        info!("Search index rebuilt successfully");
        Ok(())
    }
    
    /// Gets the number of documents in the index
    /// 
    /// # Returns
    /// Number of documents in the index
    pub fn document_count(&self) -> Result<usize, SearchError> {
        self.index.document_count()
    }
    
    /// Optimizes the index for better performance
    /// 
    /// # Returns
    /// Result indicating success or failure
    pub fn optimize(&self) -> Result<(), SearchError> {
        self.index.optimize()
    }
}
