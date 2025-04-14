use log::{debug, info};
use tantivy::{
    collector::TopDocs,
    query::{QueryParser, TermQuery},
    schema::{Field, IndexRecordOption},
    Term,
    Index, IndexReader, SnippetGenerator,
};

use crate::search::error::SearchError;
use crate::search::index::TantivyIndex;
use super::{QueryEngine, SearchOptions, SearchHit};

/// Tantivy implementation of the QueryEngine trait
pub struct TantivyQueryEngine {
    /// Reference to the Tantivy index
    index: Index,
    /// Index reader for searching
    reader: IndexReader,
    /// Schema fields
    id_field: Field,
    title_field: Field,
    content_field: Field,
    tags_field: Field,
    created_field: Field,
    modified_field: Field,
    file_type_field: Field,
}

impl TantivyQueryEngine {
    /// Creates a new TantivyQueryEngine
    /// 
    /// # Parameters
    /// * `tantivy_index` - The TantivyIndex to use for searching
    /// 
    /// # Returns
    /// A new TantivyQueryEngine instance
    pub fn new(tantivy_index: &TantivyIndex) -> Result<Self, SearchError> {
        // Get access to the underlying Tantivy index
        // This is a bit of a hack, but we need to expose the Tantivy index from TantivyIndex
        // In a real implementation, we would refactor TantivyIndex to provide these
        let index = tantivy_index.index();
        let reader = tantivy_index.reader();
        
        // Get field references
        let schema = index.schema();
        let id_field = schema.get_field("id")
            .map_err(|_| SearchError::QueryParseError("Failed to get id field".into()))?;
        let title_field = schema.get_field("title")
            .map_err(|_| SearchError::QueryParseError("Failed to get title field".into()))?;
        let content_field = schema.get_field("content")
            .map_err(|_| SearchError::QueryParseError("Failed to get content field".into()))?;
        let tags_field = schema.get_field("tags")
            .map_err(|_| SearchError::QueryParseError("Failed to get tags field".into()))?;
        let created_field = schema.get_field("created")
            .map_err(|_| SearchError::QueryParseError("Failed to get created field".into()))?;
        let modified_field = schema.get_field("modified")
            .map_err(|_| SearchError::QueryParseError("Failed to get modified field".into()))?;
        let file_type_field = schema.get_field("file_type")
            .map_err(|_| SearchError::QueryParseError("Failed to get file_type field".into()))?;
        
        Ok(Self {
            index,
            reader,
            id_field,
            title_field,
            content_field,
            tags_field,
            created_field,
            modified_field,
            file_type_field,
        })
    }
    
    /// Process a search result document into a SearchHit
    /// 
    /// # Parameters
    /// * `doc` - The document to process
    /// * `score` - The relevance score
    /// * `snippets` - Highlighted snippets
    /// 
    /// # Returns
    /// A SearchHit representing the document
    fn process_hit(
        &self,
        doc: &tantivy::Document,
        score: f32,
        snippets: Vec<String>,
    ) -> Result<SearchHit, SearchError> {
        // Extract stored fields
        let id = doc
            .get_first(self.id_field)
            .and_then(|f| f.as_text())
            .ok_or_else(|| SearchError::SearchExecutionError("Failed to get id from search result".into()))?
            .to_string();
            
        let title = doc
            .get_first(self.title_field)
            .and_then(|f| f.as_text())
            .ok_or_else(|| SearchError::SearchExecutionError("Failed to get title from search result".into()))?
            .to_string();
            
        let tags_str = doc
            .get_first(self.tags_field)
            .and_then(|f| f.as_text())
            .unwrap_or("")
            .to_string();
            
        let tags = if tags_str.is_empty() {
            Vec::new()
        } else {
            tags_str.split_whitespace().map(String::from).collect()
        };
        
        let created = doc
            .get_first(self.created_field)
            .and_then(|f| f.as_date())
            .map(|d| chrono::DateTime::<chrono::Utc>::from_timestamp(d.into_timestamp_secs(), 0).unwrap())
            .unwrap_or_else(chrono::Utc::now);
            
        let modified = doc
            .get_first(self.modified_field)
            .and_then(|f| f.as_date())
            .map(|d| chrono::DateTime::<chrono::Utc>::from_timestamp(d.into_timestamp_secs(), 0).unwrap())
            .unwrap_or_else(chrono::Utc::now);
            
        let file_type = doc
            .get_first(self.file_type_field)
            .and_then(|f| f.as_text())
            .unwrap_or("PlainText")
            .to_string();
        
        Ok(SearchHit {
            id,
            title,
            snippets,
            tags,
            created,
            modified,
            file_type,
            score,
        })
    }
}

impl QueryEngine for TantivyQueryEngine {
    fn search(&self, query_str: &str, options: &SearchOptions) -> Result<Vec<SearchHit>, SearchError> {
        info!("Executing search query: {}", query_str);
        
        let searcher = self.reader.searcher();
        debug!("Number of documents in index: {}", searcher.num_docs());
        
        // Create query parser
        let mut query_parser = QueryParser::for_index(&self.index, vec![
            self.title_field,
            self.content_field,
            self.tags_field,
        ]);
        
        // Set field boosts
        query_parser.set_field_boost(self.title_field, options.title_boost);
        query_parser.set_field_boost(self.tags_field, options.tags_boost);
        
        // Parse query
        let query = query_parser.parse_query(query_str)
            .map_err(|e| SearchError::QueryParseError(e.to_string()))?;
        
        debug!("Parsed query: {:?}", query);
        
        // Execute search
        let top_docs = searcher.search(
            &query,
            &TopDocs::with_limit(options.limit),
        ).map_err(|e| SearchError::SearchExecutionError(e.to_string()))?;
        
        info!("Search returned {} results", top_docs.len());
        
        // Create snippet generator for highlighting
        let mut snippet_generator = SnippetGenerator::create(
            &searcher,
            &query,
            self.content_field,
        ).map_err(|e| SearchError::SnippetGenerationError(e.to_string()))?;
        
        snippet_generator.set_max_num_chars(options.snippet_length);
        
        // Process results
        let mut results = Vec::new();
        for (score, doc_address) in top_docs {
            let retrieved_doc = searcher.doc(doc_address)
                .map_err(|e| SearchError::SearchExecutionError(e.to_string()))?;
            
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
            
            let hit = self.process_hit(&retrieved_doc, score, snippets)?;
            results.push(hit);
        }
        
        Ok(results)
    }
    
    fn search_by_field(&self, field: &str, value: &str, options: &SearchOptions) -> Result<Vec<SearchHit>, SearchError> {
        info!("Executing field search: {}={}", field, value);
        
        let searcher = self.reader.searcher();
        
        // Get the field
        let field = match field {
            "title" => self.title_field,
            "content" => self.content_field,
            "tags" => self.tags_field,
            "id" => self.id_field,
            "file_type" => self.file_type_field,
            _ => return Err(SearchError::QueryParseError(format!("Invalid field: {}", field))),
        };
        
        // Create term query
        let term = Term::from_field_text(field, value);
        let query = TermQuery::new(term, IndexRecordOption::WithFreqsAndPositions);
        
        // Execute search
        let top_docs = searcher.search(
            &query,
            &TopDocs::with_limit(options.limit),
        ).map_err(|e| SearchError::SearchExecutionError(e.to_string()))?;
        
        info!("Field search returned {} results", top_docs.len());
        
        // Process results
        let mut results = Vec::new();
        for (score, doc_address) in top_docs {
            let retrieved_doc = searcher.doc(doc_address)
                .map_err(|e| SearchError::SearchExecutionError(e.to_string()))?;
            
            let hit = self.process_hit(&retrieved_doc, score, Vec::new())?;
            results.push(hit);
        }
        
        Ok(results)
    }
}
