# Note Linking in Notter

This document provides detailed information about the note linking feature in Notter, which allows you to create connections between your notes.

## Overview

Note linking is a powerful feature that enables you to create a web of interconnected knowledge. By linking notes together, you can:

- Create a personal knowledge graph
- Navigate easily between related notes
- Discover connections between ideas
- Build a more structured knowledge base

## Creating Links

### Link Syntax

To create a link to another note, use the double bracket syntax:

```
[[Note Title]]
```

Where "Note Title" is the exact title of the note you want to link to. The link will work in both Markdown (`.md`) and plain text (`.txt`) files.

### Examples

In a Markdown file:

```markdown
# Project Ideas

I should review my [[Research Notes]] before starting this project.

See also [[Meeting Minutes]] from the kickoff meeting.
```

In a plain text file:

```
DAILY LOG - 2025-05-01

Today I worked on the [[Project Plan]] and reviewed the [[Budget Estimates]].

TODO: Update the [[Team Roster]] with new members.
```

## Navigating Links

When viewing a note in Notter, any links to other notes will be displayed as clickable text. Clicking on a link will navigate to the linked note.

If the linked note doesn't exist, Notter will display an error message.

## Backlinks

Notter automatically tracks which notes link to the current note and displays them in a "Linked from" section at the bottom of the note viewer. This feature helps you understand the connections between your notes and provides additional context.

Backlinks are displayed with:
- The title of the linking note
- The last modified date of the linking note

Clicking on a backlink will navigate to that note.

## Technical Implementation

The note linking feature is implemented with:

1. **Backend (Rust)**:
   - `find_note_by_title`: Finds a note by its title
   - `find_backlinks`: Finds all notes that link to a specific note

2. **Frontend (React/TypeScript)**:
   - Custom rendering for Markdown content using ReactMarkdown
   - Custom rendering for plain text content
   - Link detection using regular expressions
   - Backlinks display component

## Best Practices

For the most effective use of note linking:

1. **Use consistent note titles**: Since links are based on exact titles, consistency helps ensure links work properly.

2. **Create bidirectional links**: When appropriate, link notes to each other to strengthen the connection between related ideas.

3. **Review backlinks**: Regularly check the backlinks section to discover unexpected connections between your notes.

4. **Use links sparingly**: Focus on creating meaningful connections rather than linking every possible related note.

## Future Enhancements

Planned enhancements for the note linking feature include:

- Autocomplete when typing `[[` to suggest existing note titles
- Visual graph of note connections
- Link preview on hover
- Support for linking to specific sections within notes
