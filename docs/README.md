# Notter Search Documentation

This directory contains comprehensive documentation for the search functionality implemented in the Notter application.

## Available Documentation

### For Users

- [**Search User Guide**](./search-user-guide.md) - A practical guide for end users on how to use the search functionality.
- [**Search Implementation Summary**](./search-implementation-summary.md) - A high-level overview of the search functionality, suitable for all readers.

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

## Implementation Overview

The search functionality is built using:

- **Tantivy**: A Rust-based full-text search engine (similar to Apache Lucene)
- **React**: For the frontend search interface
- **Tauri**: For communication between the frontend and backend

## Getting Started

If you're new to the search functionality:

1. **For end users**: Start with the [Search User Guide](./search-user-guide.md) to learn how to use the search feature
2. **For an overview**: Read the [Search Implementation Summary](./search-implementation-summary.md) for a high-level understanding
3. **For developers**: Proceed to the [Search Developer Guide](./search-developer-guide.md) for practical usage examples
4. **For technical details**: Refer to the [Search Implementation Documentation](./search-implementation.md) for in-depth information
