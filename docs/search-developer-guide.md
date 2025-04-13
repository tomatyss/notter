# Notter Search Developer Guide

This guide is intended for developers who want to understand, use, or extend the search functionality in the Notter application.

## Table of Contents

1. [Using the Search API](#using-the-search-api)
2. [Adding New Search Features](#adding-new-search-features)
3. [Troubleshooting](#troubleshooting)
4. [Performance Optimization](#performance-optimization)
5. [Testing Search Functionality](#testing-search-functionality)

## Using the Search API

### Backend (Rust)

The search functionality is exposed through two main Tauri commands:

#### 1. `search_notes`

Searches for notes matching a query string.

```rust
#[tauri::command]
async fn search_notes(
    query: String,
    limit: Option<usize>,
    state: State<'_, AppState>
) -> Result<Vec<SearchResult>, String>
```

**Parameters:**
- `query`: The search query string
- `limit`: Maximum number of results to return (optional, defaults to 100)

**Returns:**
- A vector of `SearchResult` objects containing matching notes and highlighted snippets

**Example usage from Rust:**
```rust
let search_manager = state.search_manager.lock().unwrap();
let results = search_manager.search("important meeting", 20)?;
```

#### 2. `rebuild_search_index`

Rebuilds the entire search index from scratch.

```rust
#[tauri::command]
async fn rebuild_search_index(state: State<'_, AppState>) -> Result<(), String>
```

**Returns:**
- Empty result on success, error string on failure

**Example usage from Rust:**
```rust
let search_manager = state.search_manager.lock().unwrap();
let note_manager = state.note_manager.lock().unwrap().as_ref().unwrap();
let notes = note_manager.list_notes()?;
search_manager.rebuild_index(&notes)?;
```

### Frontend (TypeScript/React)

From the frontend, you can invoke these commands using Tauri's `invoke` function:

#### Searching for Notes

```typescript
import { invoke } from '@tauri-apps/api/core';
import { SearchResult } from '../types';

// Search for notes
const searchNotes = async (query: string, limit: number = 50): Promise<SearchResult[]> => {
  try {
    return await invoke<SearchResult[]>('search_notes', { 
      query,
      limit
    });
  } catch (err) {
    console.error('Search failed:', err);
    throw err;
  }
};
```

#### Rebuilding the Index

```typescript
import { invoke } from '@tauri-apps/api/core';

// Rebuild search index
const rebuildSearchIndex = async (): Promise<void> => {
  try {
    await invoke<void>('rebuild_search_index');
  } catch (err) {
    console.error('Failed to rebuild search index:', err);
    throw err;
  }
};
```

## Adding New Search Features

### 1. Adding a New Field to the Search Index

If you need to index additional note properties:

1. Update the schema in `create_schema()`:

```rust
fn create_schema() -> Result<Schema> {
    let mut builder = Schema::builder();
    
    // Existing fields...
    
    // Add new field
    builder.add_text_field("new_field", TEXT | STORED);
    
    Ok(builder.build())
}
```

2. Add a field reference in the `SearchManager` struct:

```rust
pub struct SearchManager {
    // Existing fields...
    new_field: Field,
}
```

3. Initialize the field in the `new()` method:

```rust
let new_field = schema.get_field("new_field").context("Failed to get new_field")?;

Ok(Self {
    // Existing fields...
    new_field,
})
```

4. Include the field when indexing notes:

```rust
writer.add_document(doc!(
    // Existing fields...
    self.new_field => note.new_field.clone(),
))?;
```

5. Update the `search()` method to include the new field in the query parser:

```rust
let mut query_parser = QueryParser::for_index(&self.index, vec![
    // Existing fields...
    self.new_field,
]);
```

### 2. Implementing Advanced Query Features

To add support for advanced query syntax:

1. Update the `search()` method to handle special query syntax:

```rust
pub fn search(&self, query_str: &str, limit: usize) -> Result<Vec<SearchResult>> {
    // Existing code...
    
    // Enable advanced query syntax
    query_parser.set_conjunction_by_default();
    
    // Parse and execute query
    let query = query_parser.parse_query(query_str)?;
    
    // Existing code...
}
```

2. Add a new method for field-specific searches:

```rust
pub fn search_field(&self, field: &str, value: &str, limit: usize) -> Result<Vec<SearchResult>> {
    let searcher = self.reader.searcher();
    
    // Get the field
    let field = match field {
        "title" => self.title_field,
        "content" => self.content_field,
        "tags" => self.tags_field,
        _ => return Err(anyhow::anyhow!("Invalid field: {}", field)),
    };
    
    // Create term query
    let term = Term::from_field_text(field, value);
    let query = TermQuery::new(term, IndexRecordOption::WithFreqsAndPositions);
    
    // Execute search
    let top_docs = searcher.search(&query, &TopDocs::with_limit(limit))?;
    
    // Process results...
}
```

3. Expose the new functionality through a Tauri command:

```rust
#[tauri::command]
async fn search_field(
    field: String,
    value: String,
    limit: Option<usize>,
    state: State<'_, AppState>
) -> Result<Vec<SearchResult>, String> {
    let search_manager = state.search_manager.lock().map_err(|e| e.to_string())?;
    let limit = limit.unwrap_or(100);
    
    search_manager.search_field(&field, &value, limit).map_err(|e| e.to_string())
}
```

### 3. Adding Fuzzy Search

To implement fuzzy search for typo tolerance:

1. Update the query parser configuration:

```rust
pub fn fuzzy_search(&self, query_str: &str, limit: usize) -> Result<Vec<SearchResult>> {
    let searcher = self.reader.searcher();
    
    // Create query parser
    let mut query_parser = QueryParser::for_index(&self.index, vec![
        self.title_field,
        self.content_field,
        self.tags_field,
    ]);
    
    // Configure for fuzzy search
    query_parser.set_field_fuzzy(self.title_field, true, 2, true);
    query_parser.set_field_fuzzy(self.content_field, true, 2, true);
    query_parser.set_field_fuzzy(self.tags_field, true, 1, true);
    
    // Parse and execute query
    let query = query_parser.parse_query(query_str)?;
    let top_docs = searcher.search(&query, &TopDocs::with_limit(limit))?;
    
    // Process results...
}
```

## Troubleshooting

### Common Issues

#### 1. Search Index Corruption

If the search index becomes corrupted, you may need to rebuild it:

```rust
// Delete the index directory
std::fs::remove_dir_all(&self.index_path)?;
std::fs::create_dir_all(&self.index_path)?;

// Recreate the index
let schema = Self::create_schema()?;
let index = Index::create_in_dir(&self.index_path, schema)?;

// Reinitialize the reader
self.reader = index
    .reader_builder()
    .reload_policy(ReloadPolicy::OnCommit)
    .try_into()?;
```

#### 2. Memory Issues

If you encounter memory issues with large note collections:

1. Adjust the memory budget for the index writer:

```rust
// Reduce memory usage (default is 50_000_000)
let mut writer = self.index.writer(10_000_000)?;
```

2. Consider batching document additions:

```rust
pub fn index_notes_batched(&self, notes: &[Note], batch_size: usize) -> Result<()> {
    let mut writer = self.index.writer(50_000_000)?;
    
    for chunk in notes.chunks(batch_size) {
        for note in chunk {
            // Add document...
        }
        writer.commit()?;
    }
    
    Ok(())
}
```

#### 3. Query Parsing Errors

If users enter invalid queries:

```rust
pub fn safe_search(&self, query_str: &str, limit: usize) -> Result<Vec<SearchResult>> {
    // Sanitize query
    let sanitized_query = query_str.replace(|c: char| !c.is_alphanumeric() && !c.is_whitespace(), " ");
    
    // Proceed with normal search
    self.search(&sanitized_query, limit)
}
```

## Performance Optimization

### 1. Index Optimization

After adding many documents, you can optimize the index:

```rust
pub fn optimize_index(&self) -> Result<()> {
    let mut writer = self.index.writer(50_000_000)?;
    writer.merge_segments()?;
    writer.commit()?;
    Ok(())
}
```

### 2. Incremental Updates

Instead of rebuilding the entire index, update only changed notes:

```rust
pub fn update_note_in_index(&self, old_id: &str, new_note: &Note) -> Result<()> {
    let mut writer = self.index.writer(50_000_000)?;
    
    // Remove old document
    writer.delete_term(tantivy::Term::from_field_text(self.id_field, old_id));
    
    // Add new document
    // ... (same as in index_note)
    
    writer.commit()?;
    Ok(())
}
```

### 3. Caching

Consider caching frequent searches:

```rust
use std::collections::HashMap;
use std::time::{Duration, Instant};

struct CachedSearch {
    results: Vec<SearchResult>,
    timestamp: Instant,
}

pub struct SearchManager {
    // Existing fields...
    cache: HashMap<String, CachedSearch>,
    cache_ttl: Duration,
}

impl SearchManager {
    pub fn cached_search(&mut self, query_str: &str, limit: usize) -> Result<Vec<SearchResult>> {
        // Check cache
        if let Some(cached) = self.cache.get(query_str) {
            if cached.timestamp.elapsed() < self.cache_ttl {
                return Ok(cached.results.clone());
            }
        }
        
        // Perform search
        let results = self.search(query_str, limit)?;
        
        // Update cache
        self.cache.insert(query_str.to_string(), CachedSearch {
            results: results.clone(),
            timestamp: Instant::now(),
        });
        
        Ok(results)
    }
}
```

## Testing Search Functionality

### 1. Unit Tests

Example unit test for the search functionality:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    
    #[test]
    fn test_basic_search() {
        // Create temporary directory for test index
        let temp_dir = tempdir().unwrap();
        let search_manager = SearchManager::new(&temp_dir.path().to_path_buf()).unwrap();
        
        // Create test notes
        let note1 = Note {
            id: "note1".to_string(),
            title: "Meeting Notes".to_string(),
            content: "Discussed project timeline and budget.".to_string(),
            // Other fields...
        };
        
        let note2 = Note {
            id: "note2".to_string(),
            title: "Shopping List".to_string(),
            content: "Milk, eggs, bread".to_string(),
            // Other fields...
        };
        
        // Index notes
        search_manager.index_note(&note1).unwrap();
        search_manager.index_note(&note2).unwrap();
        
        // Test search
        let results = search_manager.search("meeting", 10).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].note.id, "note1");
        
        let results = search_manager.search("milk", 10).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].note.id, "note2");
        
        // Test no results
        let results = search_manager.search("nonexistent", 10).unwrap();
        assert_eq!(results.len(), 0);
    }
}
```

### 2. Integration Tests

For integration testing, you can create a test harness that:

1. Sets up a temporary notes directory
2. Creates test notes
3. Initializes the search manager
4. Performs searches
5. Verifies results

This can be done using Tauri's testing utilities or by directly testing the Rust code.
