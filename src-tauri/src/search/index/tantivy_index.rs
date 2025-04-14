use std::path::{Path, PathBuf};
use log::info;
use tantivy::{
    schema::{Field, Schema, STORED, TEXT},
    Index, IndexReader, ReloadPolicy, Term,
};
use tempfile::TempDir;

use crate::search::error::SearchError;
use super::{IndexableDocument, SearchIndex};

/// Tantivy implementation of the SearchIndex trait
#[derive(Clone)]
pub struct TantivyIndex {
    /// Path to the search index
    index_path: PathBuf,
    /// Tantivy index
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

impl TantivyIndex {
    /// Creates a new TantivyIndex
    /// 
    /// # Parameters
    /// * `index_path` - Path to the search index directory
    /// 
    /// # Returns
    /// A new TantivyIndex instance
    pub fn new(index_path: &Path) -> Result<Self, SearchError> {
        // Create search index directory if it doesn't exist
        std::fs::create_dir_all(index_path)
            .map_err(|e| SearchError::IoError(e))?;
        
        // Define schema
        let schema = Self::create_schema()?;
        
        // Get field references
        let id_field = schema.get_field("id")
            .map_err(|_| SearchError::IndexCreationError("Failed to get id field".into()))?;
        let title_field = schema.get_field("title")
            .map_err(|_| SearchError::IndexCreationError("Failed to get title field".into()))?;
        let content_field = schema.get_field("content")
            .map_err(|_| SearchError::IndexCreationError("Failed to get content field".into()))?;
        let tags_field = schema.get_field("tags")
            .map_err(|_| SearchError::IndexCreationError("Failed to get tags field".into()))?;
        let created_field = schema.get_field("created")
            .map_err(|_| SearchError::IndexCreationError("Failed to get created field".into()))?;
        let modified_field = schema.get_field("modified")
            .map_err(|_| SearchError::IndexCreationError("Failed to get modified field".into()))?;
        let file_type_field = schema.get_field("file_type")
            .map_err(|_| SearchError::IndexCreationError("Failed to get file_type field".into()))?;
        
        // Create or open index
        let index = if index_path.join("meta.json").exists() {
            info!("Opening existing search index at {:?}", index_path);
            Index::open_in_dir(index_path)
                .map_err(|e| SearchError::IndexOpenError(e.to_string()))?
        } else {
            info!("Creating new search index at {:?}", index_path);
            Index::create_in_dir(index_path, schema)
                .map_err(|e| SearchError::IndexCreationError(e.to_string()))?
        };
        
        // Create reader
        let reader = index
            .reader_builder()
            .reload_policy(ReloadPolicy::OnCommit)
            .try_into()
            .map_err(|e| SearchError::IndexOpenError(format!("Failed to create index reader: {}", e)))?;
        
        Ok(Self {
            index_path: index_path.to_path_buf(),
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
    
    /// Get a reference to the underlying Tantivy index
    pub fn index(&self) -> Index {
        self.index.clone()
    }
    
    /// Get a reference to the index reader
    pub fn reader(&self) -> IndexReader {
        self.reader.clone()
    }
    
    /// Creates the search schema
    /// 
    /// # Returns
    /// The Tantivy schema for indexing documents
    fn create_schema() -> Result<Schema, SearchError> {
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
    
    /// Converts an IndexableDocument to a Tantivy document
    /// 
    /// # Parameters
    /// * `document` - The document to convert
    /// 
    /// # Returns
    /// A Tantivy document
    fn convert_to_tantivy_doc(&self, document: &IndexableDocument) -> tantivy::Document {
        let tags_str = document.tags.join(" ");
        
        let mut doc = tantivy::Document::new();
        doc.add_text(self.id_field, &document.id);
        doc.add_text(self.title_field, &document.title);
        doc.add_text(self.content_field, &document.content);
        doc.add_text(self.tags_field, &tags_str);
        doc.add_date(self.created_field, tantivy::DateTime::from_timestamp_secs(document.created.timestamp()));
        doc.add_date(self.modified_field, tantivy::DateTime::from_timestamp_secs(document.modified.timestamp()));
        doc.add_text(self.file_type_field, &document.file_type);
        
        doc
    }
}

impl SearchIndex for TantivyIndex {
    fn add_document(&self, document: &IndexableDocument) -> Result<(), SearchError> {
        let mut writer = self.index.writer(50_000_000)
            .map_err(|e| SearchError::DocumentAddError(e.to_string()))?;
        
        // Remove existing document with same ID if it exists
        writer.delete_term(Term::from_field_text(self.id_field, &document.id));
        
        // Add document
        let doc = self.convert_to_tantivy_doc(document);
        writer.add_document(doc)
            .map_err(|e| SearchError::DocumentAddError(e.to_string()))?;
        
        writer.commit()
            .map_err(|e| SearchError::DocumentAddError(e.to_string()))?;
        
        Ok(())
    }
    
    fn remove_document(&self, id: &str) -> Result<(), SearchError> {
        let mut writer = self.index.writer(50_000_000)
            .map_err(|e| SearchError::DocumentRemoveError(e.to_string()))?;
        
        writer.delete_term(Term::from_field_text(self.id_field, id));
        writer.commit()
            .map_err(|e| SearchError::DocumentRemoveError(e.to_string()))?;
        
        Ok(())
    }
    
    fn clear(&self) -> Result<(), SearchError> {
        let mut writer = self.index.writer(50_000_000)
            .map_err(|e| SearchError::DocumentRemoveError(e.to_string()))?;
        
        writer.delete_all_documents()
            .map_err(|e| SearchError::DocumentRemoveError(e.to_string()))?;
        writer.commit()
            .map_err(|e| SearchError::DocumentRemoveError(e.to_string()))?;
        
        Ok(())
    }
    
    fn optimize(&self) -> Result<(), SearchError> {
        let mut writer = self.index.writer(50_000_000)
            .map_err(|e| SearchError::IndexCreationError(e.to_string()))?;
        
        // Note: merge_segments doesn't exist in current Tantivy version
        // Instead, we'll just commit which should trigger merges based on policy
        writer.commit()
            .map_err(|e| SearchError::IndexCreationError(e.to_string()))?;
        
        Ok(())
    }
    
    fn document_count(&self) -> Result<usize, SearchError> {
        let searcher = self.reader.searcher();
        // Convert u64 to usize
        Ok(searcher.num_docs() as usize)
    }
    
    fn rebuild_index(&self, documents: &[IndexableDocument]) -> Result<(), SearchError> {
        info!("Rebuilding search index with {} documents", documents.len());
        
        // Create a temporary directory for the new index
        let temp_dir = TempDir::new()
            .map_err(|e| SearchError::IndexCreationError(format!("Failed to create temp directory: {}", e)))?;
        
        // Create a new schema
        let schema = Self::create_schema()?;
        
        // Create a new index in the temporary directory
        let temp_index = Index::create_in_dir(temp_dir.path(), schema)
            .map_err(|e| SearchError::IndexCreationError(format!("Failed to create temp index: {}", e)))?;
        
        // Get field references for the new index
        let id_field = temp_index.schema().get_field("id")
            .map_err(|_| SearchError::IndexCreationError("Failed to get id field".into()))?;
        let title_field = temp_index.schema().get_field("title")
            .map_err(|_| SearchError::IndexCreationError("Failed to get title field".into()))?;
        let content_field = temp_index.schema().get_field("content")
            .map_err(|_| SearchError::IndexCreationError("Failed to get content field".into()))?;
        let tags_field = temp_index.schema().get_field("tags")
            .map_err(|_| SearchError::IndexCreationError("Failed to get tags field".into()))?;
        let created_field = temp_index.schema().get_field("created")
            .map_err(|_| SearchError::IndexCreationError("Failed to get created field".into()))?;
        let modified_field = temp_index.schema().get_field("modified")
            .map_err(|_| SearchError::IndexCreationError("Failed to get modified field".into()))?;
        let file_type_field = temp_index.schema().get_field("file_type")
            .map_err(|_| SearchError::IndexCreationError("Failed to get file_type field".into()))?;
        
        // Create a writer with the new index
        let mut writer = temp_index.writer(50_000_000)
            .map_err(|e| SearchError::IndexCreationError(format!("Failed to create index writer: {}", e)))?;
        
        // Add all documents to the index
        for document in documents {
            let tags_str = document.tags.join(" ");
            
            let mut doc = tantivy::Document::new();
            doc.add_text(id_field, &document.id);
            doc.add_text(title_field, &document.title);
            doc.add_text(content_field, &document.content);
            doc.add_text(tags_field, &tags_str);
            doc.add_date(created_field, tantivy::DateTime::from_timestamp_secs(document.created.timestamp()));
            doc.add_date(modified_field, tantivy::DateTime::from_timestamp_secs(document.modified.timestamp()));
            doc.add_text(file_type_field, &document.file_type);
            
            writer.add_document(doc)
                .map_err(|e| SearchError::DocumentAddError(e.to_string()))?;
        }
        
        // Commit the changes
        info!("Committing changes to temporary index");
        writer.commit()
            .map_err(|e| SearchError::IndexCreationError(format!("Failed to commit changes: {}", e)))?;
        
        // Create a backup of the current index
        let backup_path = self.index_path.with_extension("bak");
        if self.index_path.exists() {
            info!("Creating backup of existing index at {:?}", backup_path);
            if backup_path.exists() {
                std::fs::remove_dir_all(&backup_path)
                    .map_err(|e| SearchError::IoError(e))?;
            }
            std::fs::rename(&self.index_path, &backup_path)
                .map_err(|e| SearchError::IoError(e))?;
        }
        
        // Create the target directory if it doesn't exist
        std::fs::create_dir_all(&self.index_path)
            .map_err(|e| SearchError::IoError(e))?;
        
        // Copy the temporary index to the target location
        info!("Moving temporary index to target location");
        copy_dir_all(temp_dir.path(), &self.index_path)
            .map_err(|e| SearchError::IoError(e))?;
        
        // Remove the backup if everything succeeded
        if backup_path.exists() {
            info!("Removing backup index");
            std::fs::remove_dir_all(backup_path)
                .map_err(|e| SearchError::IoError(e))?;
        }
        
        info!("Search index rebuilt successfully");
        Ok(())
    }
}

/// Recursively copy a directory
fn copy_dir_all(src: impl AsRef<Path>, dst: impl AsRef<Path>) -> std::io::Result<()> {
    std::fs::create_dir_all(&dst)?;
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        if ty.is_dir() {
            copy_dir_all(entry.path(), dst.as_ref().join(entry.file_name()))?;
        } else {
            std::fs::copy(entry.path(), dst.as_ref().join(entry.file_name()))?;
        }
    }
    Ok(())
}
