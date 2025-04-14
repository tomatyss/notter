use crate::notes::Note;
use crate::search::index::IndexableDocument;

/// Converts between Note objects and IndexableDocument objects
pub struct DocumentConverter;

impl DocumentConverter {
    /// Creates a new DocumentConverter
    pub fn new() -> Self {
        Self {}
    }
    
    /// Converts a Note to an IndexableDocument
    /// 
    /// # Parameters
    /// * `note` - The note to convert
    /// 
    /// # Returns
    /// An IndexableDocument representing the note
    pub fn note_to_document(&self, note: &Note) -> IndexableDocument {
        IndexableDocument {
            id: note.id.clone(),
            title: note.title.clone(),
            content: note.content.clone(),
            tags: note.tags.clone(),
            created: note.created,
            modified: note.modified,
            file_type: format!("{:?}", note.file_type),
        }
    }
    
    /// Converts multiple Notes to IndexableDocuments
    /// 
    /// # Parameters
    /// * `notes` - The notes to convert
    /// 
    /// # Returns
    /// A vector of IndexableDocuments
    pub fn notes_to_documents(&self, notes: &[Note]) -> Vec<IndexableDocument> {
        notes.iter()
            .map(|note| self.note_to_document(note))
            .collect()
    }
}
