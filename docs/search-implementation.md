# Notter Search Implementation Documentation

This document provides a comprehensive overview of the search functionality implemented in the Notter application. The search feature allows users to quickly find notes based on their content, title, and tags.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Backend Implementation](#backend-implementation)
   - [Search Module](#search-module)
   - [Tantivy Integration](#tantivy-integration)
   - [Schema Design](#schema-design)
   - [Indexing Process](#indexing-process)
   - [Search Process](#search-process)
3. [Frontend Implementation](#frontend-implementation)
   - [Search Panel Component](#search-panel-component)
   - [User Interface](#user-interface)
   - [Search Results Display](#search-results-display)
4. [Integration Points](#integration-points)
5. [Performance Considerations](#performance-considerations)
6. [Future Enhancements](#future-enhancements)

## Architecture Overview

The search functionality in Notter follows a client-server architecture:

- **Backend (Rust/Tauri)**: Handles indexing and searching of notes using the Tantivy full-text search engine
- **Frontend (React)**: Provides the user interface for entering search queries and displaying results

The search implementation is designed to be:
- **Fast**: Leveraging Tantivy's performance for quick search results
- **Relevant**: Using proper relevance ranking to show the most important results first
- **Feature-rich**: Supporting content, title, and tag-based searching with highlighted results

## Backend Implementation

### Search Module

The search functionality is implemented in a dedicated Rust module (`src-tauri/src/search/mod.rs`). This module contains:

- `SearchManager`: The main struct responsible for managing the search index and performing searches
- `SearchResult`: A struct representing search results with highlighting information

### Tantivy Integration

[Tantivy](https://github.com/quickwit-oss/tantivy) is a full-text search engine library written in Rust, similar to Apache Lucene. Key features used in our implementation:

- **Inverted Index**: Efficiently maps terms to documents containing them
- **Relevance Scoring**: Uses BM25 algorithm for ranking search results
- **Highlighting**: Provides context snippets with highlighted matching terms

### Schema Design

The search index schema is designed to capture all relevant note information:

```rust
fn create_schema() -> Result<Schema> {
    let mut builder = Schema::builder();
    
    // Add fields to schema
    builder.add_text_field("id", TEXT | STORED);
    builder.add_text_field("title", TEXT | STORED);
    builder.add_text_field("content", TEXT);
    builder.add_text_field("tags", TEXT | STORED);
    builder.add_date_field("created", STORED);
    builder.add_date_field("modified", STORED);
    builder.add_text_field("file_type", STORED);
    
    Ok(builder.build())
}
```

Field explanations:
- `id`: Unique identifier for the note (stored for retrieval)
- `title`: Note title (indexed for searching, stored for display)
- `content`: Note content (indexed for searching but not stored to save space)
- `tags`: Note tags joined as a string (indexed and stored)
- `created`/`modified`: Timestamps (stored for display)
- `file_type`: Type of note (Markdown or PlainText)

The `TEXT` flag indicates the field should be tokenized and indexed for full-text search, while `STORED` indicates the field's original value should be stored for retrieval.

### Indexing Process

Notes are indexed in several scenarios:

1. **Initial Folder Selection**: When a user selects a notes directory, all notes are indexed
2. **Individual Note Updates**: When notes are added, modified, or deleted (not yet implemented)
3. **Manual Reindexing**: Through the `rebuild_search_index` command

The indexing process:

1. Each note is converted to a Tantivy document
2. Fields are properly formatted (e.g., tags are joined into a space-separated string)
3. Documents are added to the index with proper field mappings
4. The index is committed to disk

```rust
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
```

### Search Process

The search process involves:

1. Parsing the user's query string
2. Setting field boosts to prioritize matches in titles and tags
3. Executing the search against the index
4. Processing results to create `SearchResult` objects
5. Generating highlighted snippets for matching content

```rust
pub fn search(&self, query_str: &str, limit: usize) -> Result<Vec<SearchResult>> {
    let searcher = self.reader.searcher();
    
    // Create query parser with field boosts
    let mut query_parser = QueryParser::for_index(&self.index, vec![
        self.title_field,
        self.content_field,
        self.tags_field,
    ]);
    
    // Set field boosts (title matches are more important)
    query_parser.set_field_boost(self.title_field, 2.0);
    query_parser.set_field_boost(self.tags_field, 1.5);
    
    // Parse and execute query
    let query = query_parser.parse_query(query_str)?;
    let top_docs = searcher.search(&query, &TopDocs::with_limit(limit))?;
    
    // Generate snippets and process results
    // ...
}
```

Field boosting ensures that:
- Matches in the title are considered most important (2.0x boost)
- Matches in tags are next most important (1.5x boost)
- Matches in content have normal importance (1.0x, default)

## Frontend Implementation

### Search Panel Component

The search functionality is exposed through a React component (`src/components/SearchPanel.tsx`) that:

1. Provides an input field for entering search queries
2. Debounces input to avoid excessive API calls
3. Displays search results with highlighting
4. Handles error states and loading indicators

### User Interface

The search UI is designed to be simple and intuitive:

- A search input at the top of the sidebar
- Real-time results as the user types
- Loading indicator during search
- Clear display of no results when appropriate

### Search Results Display

Search results show:

- Note title
- Highlighted snippets showing the matching context
- Tags associated with the note
- Visual indication of the current selection

The highlighting is implemented using the HTML returned from Tantivy's snippet generator, which wraps matching terms in `<em>` tags.

```tsx
// Render HTML from highlighted snippets
const renderSnippet = (html: string) => {
  return { __html: html };
};

// In the component render:
<div 
  className="result-snippet"
  dangerouslySetInnerHTML={renderSnippet(snippet)}
/>
```

## Integration Points

The search functionality integrates with the rest of the application at several points:

1. **Tauri Commands**: Backend exposes `search_notes` and `rebuild_search_index` commands
2. **App State**: The `SearchManager` is part of the application state
3. **UI Integration**: The `SearchPanel` component is placed in the sidebar
4. **Note Selection**: Search results can be clicked to select and view the full note

## Performance Considerations

Several optimizations are in place to ensure good performance:

1. **Debounced Search**: The frontend debounces search input to avoid excessive API calls
2. **Efficient Index**: Tantivy provides a highly optimized search index
3. **Incremental Updates**: The index is designed to support incremental updates (add/remove/update)
4. **Memory Management**: The index writer uses a memory budget (50MB) to balance performance and resource usage
5. **Snippet Generation**: Only generates snippets for displayed results

## Future Enhancements

Potential improvements to the search functionality:

1. **Advanced Query Syntax**: Support for boolean operators (AND, OR, NOT)
2. **Faceted Search**: Filter by tags, date ranges, or note type
3. **Fuzzy Matching**: Support for typo-tolerant searches
4. **Saved Searches**: Allow users to save common searches
5. **Search History**: Track and suggest previous searches
6. **Incremental Indexing**: Update the index when notes change without full reindexing
7. **Semantic Search**: Add vector embeddings for concept-based searching
