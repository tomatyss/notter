# Notter Search Architecture

This document provides visual representations of the search architecture in the Notter application.

## Search Component Architecture

```mermaid
graph TD
    subgraph Frontend
        A[Search Input] -->|Query| B[SearchPanel Component]
        B -->|Debounced Query| C[Tauri Invoke]
        C -->|Results| D[Search Results Display]
        D -->|Click| E[Note Selection]
        E -->|ID| F[Note Viewer]
    end
    
    subgraph Backend
        G[search_notes Command] -->|Query| H[SearchManager]
        H -->|Query| I[Tantivy Index]
        I -->|Raw Results| J[Result Processing]
        J -->|Formatted Results| G
    end
    
    C -->|IPC| G
```

## Search Data Flow

```mermaid
sequenceDiagram
    participant User
    participant SearchPanel
    participant TauriAPI
    participant SearchManager
    participant TantivyIndex
    
    User->>SearchPanel: Types search query
    SearchPanel->>SearchPanel: Debounce input
    SearchPanel->>TauriAPI: invoke('search_notes', query)
    TauriAPI->>SearchManager: search_notes(query)
    SearchManager->>TantivyIndex: Create query parser
    SearchManager->>TantivyIndex: Set field boosts
    SearchManager->>TantivyIndex: Execute search
    TantivyIndex->>SearchManager: Return raw results
    SearchManager->>SearchManager: Process results
    SearchManager->>SearchManager: Generate snippets
    SearchManager->>TauriAPI: Return SearchResults
    TauriAPI->>SearchPanel: Return results
    SearchPanel->>User: Display results with highlighting
    User->>SearchPanel: Clicks result
    SearchPanel->>TauriAPI: invoke('get_note', id)
```

## Search Index Structure

```mermaid
graph LR
    subgraph "Tantivy Index"
        A[Schema] --> B[Fields]
        B --> C1[id: TEXT + STORED]
        B --> C2[title: TEXT + STORED]
        B --> C3[content: TEXT]
        B --> C4[tags: TEXT + STORED]
        B --> C5[created: STORED]
        B --> C6[modified: STORED]
        B --> C7[file_type: STORED]
        
        D[Documents] --> E[Inverted Index]
        E --> F1[Term Dictionary]
        E --> F2[Posting Lists]
        
        G[Searcher] --> H[Query Parser]
        H --> I[BM25 Scoring]
    end
```

## Integration with Application

```mermaid
graph TD
    subgraph "Notter Application"
        A[App Component] --> B[SettingsPanel]
        A --> C[SearchPanel]
        A --> D[NoteList]
        A --> E[NoteViewer]
        
        C -->|Search Results| D
        D -->|Selected Note| E
    end
    
    subgraph "Backend Services"
        F[ConfigManager] --> B
        G[NoteManager] --> D
        G --> E
        H[SearchManager] --> C
        
        F --> G
        G --> H
    end
```
