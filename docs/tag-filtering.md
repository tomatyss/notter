# Tag Filtering in Notter

This document provides detailed information about the tag filtering feature in Notter, which allows you to organize and filter your notes based on tags.

## Overview

Tag filtering is a powerful feature that enables you to quickly find related notes by filtering your note collection based on tags. This feature helps you:

- Organize notes by topic, project, or category
- Quickly find related information
- Create an implicit structure in your note collection
- Focus on specific areas of your knowledge base

## How Tags Work in Notter

### Tag Definition

In Notter, tags are words that start with the `#` symbol in your note content. For example:

```markdown
# Project Meeting Notes

Discussion about the new feature implementation.

#project #meeting #important
```

Tags can be placed anywhere in your note content, but it's common practice to group them at the beginning or end of a note for better visibility.

### Tag Extraction

Notter automatically extracts tags from your notes when:
- A note is first loaded
- A note is updated
- The search index is rebuilt

Extracted tags are displayed in the note list and can be used for filtering.

## Using Tag Filtering

### Accessing Tag Filters

The tag filtering interface is located at the top of the sidebar, above the note list. It displays:

1. A list of all available tags in your note collection
2. Options for how to apply multiple tag filters

### Filtering by Tags

To filter your notes by tags:

1. Click on a tag in the tag filter section
2. The note list will update to show only notes containing that tag
3. The active filter will be displayed above the note list

### Multiple Tag Filtering

You can filter by multiple tags using two different modes:

#### "Match Any" Mode (Default)

In this mode, notes that contain ANY of the selected tags will be displayed. This is useful for broader searches across related categories.

For example, selecting `#project` and `#meeting` will show notes that have either the `#project` tag OR the `#meeting` tag.

#### "Match All" Mode

In this mode, only notes that contain ALL of the selected tags will be displayed. This is useful for narrowing down to very specific combinations.

For example, selecting `#project` and `#meeting` with "Match All" enabled will only show notes that have both the `#project` tag AND the `#meeting` tag.

To toggle between these modes, use the "Match All Tags" checkbox in the tag filter section.

### Clearing Filters

To clear tag filters:
- Click on an active tag filter to remove it
- Click the "Clear All" button to remove all tag filters at once

### Tag Filtering from Note View

You can also activate tag filtering directly from the note view:
1. When viewing a note, click on any tag displayed in the note metadata
2. The tag filter will be applied, and the note list will update accordingly

## Technical Implementation

The tag filtering feature is implemented with:

1. **Backend (Rust)**:
   - `filter_notes_by_tags`: Filters notes based on selected tags and match mode
   - Tag extraction during note indexing

2. **Frontend (React/TypeScript)**:
   - `TagFilter.tsx`: Component for displaying and selecting tags
   - `App.tsx`: State management for selected tags and filter mode
   - `NoteList.tsx`: Display of filtered notes

## Best Practices

For the most effective use of tag filtering:

1. **Use consistent tag naming**: Develop a personal tagging system and stick to it
   - Example: `#project-name` for project-specific tags

2. **Use hierarchical tags**: Consider using a hierarchy in your tags
   - Example: `#project-frontend`, `#project-backend`

3. **Combine with search**: Use tag filtering together with the search feature for powerful filtering
   - First filter by tags, then search within the filtered results

4. **Tag groups**: Group related tags together in your notes for better organization
   - Example: `#status-active #priority-high #area-development`

## Future Enhancements

Planned enhancements for the tag filtering feature include:

- Tag autocomplete when typing `#` in the note editor
- Tag management interface for renaming and organizing tags
- Tag hierarchies and nested tags
- Tag statistics showing most used tags
- Color coding for different tag categories
