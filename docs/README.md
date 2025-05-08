# Notter Documentation

This directory contains comprehensive documentation for various features implemented in the Notter application.

## Available Documentation

### For Users

- [**Search User Guide**](./search-user-guide.md) - A practical guide for end users on how to use the search functionality.
- [**Search Implementation Summary**](./search-implementation-summary.md) - A high-level overview of the search functionality, suitable for all readers.
- [**Note Linking Documentation**](./note-linking.md) - Comprehensive guide to creating and using links between notes.
- [**Tag Filtering Documentation**](./tag-filtering.md) - Guide to using tags to organize and filter your notes.
- [**Find and Replace Documentation**](./find-replace.md) - Instructions for using the find and replace functionality within notes.

### For Developers

- [**Search Implementation Documentation**](./search-implementation.md) - Detailed technical documentation of how search is implemented in Notter.
- [**Search Developer Guide**](./search-developer-guide.md) - Practical guide for developers who want to use or extend the search functionality.
- [**Search Architecture Diagrams**](./search-architecture.md) - Visual representations of the search architecture and data flow.

## Search Features

The Notter application includes a powerful search functionality that allows users to:

- Search through note content, titles, and tags
- See real-time results as they type
- View highlighted snippets showing the context of matches
- Select search results to view the full note

## Note Linking Features

The Notter application includes a powerful note linking functionality that allows users to:

- Create links between notes using the `[[Note Title]]` syntax
- Navigate between linked notes with a single click
- View backlinks to see which notes link to the current note
- Build a personal knowledge graph through interconnected notes

## Tag Filtering Features

The Notter application includes a flexible tag filtering system that allows users to:

- Automatically extract tags from note content (words prefixed with `#`)
- Filter notes by one or multiple tags
- Choose between "Match Any" or "Match All" filtering modes
- Click on tags in notes to instantly filter by that tag
- Organize notes using a personal tagging system

## Find and Replace Features

The Notter application includes a comprehensive find and replace functionality that allows users to:

- Search for text within the current note with real-time highlighting
- Navigate between matches using keyboard shortcuts or UI controls
- Replace individual matches or all matches at once
- Use case-sensitive and whole word search options
- Access the functionality through familiar keyboard shortcuts (Ctrl+F/Cmd+F)

## Implementation Overview

The search functionality is built using:

- **Tantivy**: A Rust-based full-text search engine (similar to Apache Lucene)
- **React**: For the frontend search interface
- **Tauri**: For communication between the frontend and backend

The note linking functionality is built using:

- **Regular Expressions**: For detecting and parsing note links
- **ReactMarkdown**: For rendering Markdown content with custom link handling
- **Custom Rendering**: For plain text files to support the same linking syntax

The tag filtering functionality is built using:

- **React State Management**: For tracking selected tags and filter mode
- **Rust Backend**: For filtering notes based on tag criteria
- **Component Architecture**: TagFilter component for UI, with integration in App and NoteList

The find and replace functionality is built using:

- **React Components**: FindReplacePanel for UI, integrated with NoteViewer
- **Regular Expressions**: For flexible text matching with options
- **DOM Manipulation**: For highlighting and scrolling to matches
- **Event Handling**: For keyboard shortcuts and navigation

## Getting Started

If you're new to the search functionality:

1. **For end users**: Start with the [Search User Guide](./search-user-guide.md) to learn how to use the search feature
2. **For an overview**: Read the [Search Implementation Summary](./search-implementation-summary.md) for a high-level understanding
3. **For developers**: Proceed to the [Search Developer Guide](./search-developer-guide.md) for practical usage examples
4. **For technical details**: Refer to the [Search Implementation Documentation](./search-implementation.md) for in-depth information

If you're interested in the note linking functionality:

1. **For all users**: Read the [Note Linking Documentation](./note-linking.md) for a comprehensive guide on creating and using links between notes

If you're interested in organizing your notes with tags:

1. **For all users**: Read the [Tag Filtering Documentation](./tag-filtering.md) to learn how to use tags to organize and filter your notes

If you need to find or replace text within your notes:

1. **For all users**: Check out the [Find and Replace Documentation](./find-replace.md) for instructions on using the find and replace functionality
