# Zettelkasten Subnotes

Notter supports the Zettelkasten method of hierarchical note organization through automatic subnote detection and display. This feature allows you to create and navigate complex knowledge structures using traditional Zettelkasten numbering patterns.

## Overview

The Zettelkasten subnotes feature automatically detects and displays hierarchical relationships between notes based on their titles. When viewing a note, Notter shows all related subnotes with content previews, making it easy to navigate through your knowledge structure.

## Naming Convention

The system follows the traditional Zettelkasten numbering pattern:

### Basic Structure
- **Main notes**: `1-topic`, `2-topic`, `3-topic`, etc.
- **Level 1 subnotes**: `1a-subtopic`, `1b-subtopic`, `1c-subtopic`
- **Level 2 subnotes**: `1a1-subsubtopic`, `1a2-subsubtopic`, `1b1-subsubtopic`
- **Level 3 subnotes**: `1a1a-subsubsubtopic`, `1a1b-subsubsubtopic`

### Examples

```
1-philosophy.md
├── 1a-metaphysics.md
│   ├── 1a1-mind-body-problem.md
│   ├── 1a2-free-will.md
│   └── 1a3-personal-identity.md
├── 1b-epistemology.md
│   ├── 1b1-gettier-problems.md
│   ├── 1b2-skepticism.md
│   └── 1b3-empiricism-vs-rationalism.md
└── 1c-ethics.md
    ├── 1c1-utilitarianism.md
    ├── 1c2-deontology.md
    └── 1c3-virtue-ethics.md
```

## Features

### Automatic Detection
- Subnotes are automatically detected based on title patterns
- No manual configuration required
- Works with both Markdown (.md) and text (.txt) files

### Visual Hierarchy
- Different depth levels are visually distinguished
- Color-coded borders indicate hierarchy depth:
  - **Level 1**: Blue border (primary color)
  - **Level 2**: Green border (success color)
  - **Level 3**: Yellow border
  - **Level 4**: Red border (error color)

### Content Previews
- Each subnote shows a clean preview of its content (up to 300 characters)
- Markdown formatting is stripped for cleaner display
- Previews help you quickly understand the content without opening the note

### Intelligent Sorting
- Subnotes are sorted in logical Zettelkasten order
- Proper alphanumeric sorting: `1a`, `1a1`, `1a2`, `1a10`, `1b`, `1c`
- Maintains hierarchical structure

### Boundary Protection
- Ensures proper note boundaries (e.g., "10" is not considered a subnote of "1")
- Prevents false positives in note detection
- Maintains clean hierarchical relationships

### Navigation
- Click any subnote to navigate directly to it
- Seamless integration with the note viewer
- Maintains context when navigating between related notes

### Metadata Display
- Shows modification dates for each subnote
- Displays tags associated with each subnote
- Provides quick overview of note status

## Usage

### Creating Subnotes

1. **Start with a main note**: Create a note with a simple numeric prefix
   ```
   1-philosophy.md
   ```

2. **Add level 1 subnotes**: Create notes with letter suffixes
   ```
   1a-metaphysics.md
   1b-epistemology.md
   1c-ethics.md
   ```

3. **Add level 2 subnotes**: Create notes with number suffixes after letters
   ```
   1a1-mind-body-problem.md
   1a2-free-will.md
   1b1-gettier-problems.md
   ```

4. **Continue the pattern**: Add more levels as needed
   ```
   1a1a-cartesian-dualism.md
   1a1b-property-dualism.md
   ```

### Viewing Subnotes

1. **Open a parent note**: Click on any note in the note list
2. **Scroll to subnotes section**: The subnotes section appears below the note content
3. **Browse subnotes**: View previews and metadata for each subnote
4. **Navigate**: Click on any subnote to open it

### Best Practices

#### Naming
- Use descriptive titles after the numeric prefix
- Keep titles concise but meaningful
- Use hyphens to separate words in titles

#### Organization
- Start with broad topics for main notes
- Break down topics into logical subtopics
- Don't go too deep (3-4 levels maximum recommended)

#### Content
- Write clear, focused content for each note
- Include relevant tags for better organization
- Link between related notes using `[[Note Title]]` syntax

## Technical Implementation

### Backend (Rust)
- **Pattern Matching**: Uses regex-like pattern matching to identify subnotes
- **Sorting Algorithm**: Custom Zettelkasten comparison function for proper ordering
- **Boundary Detection**: Ensures proper note boundaries to prevent false matches
- **Performance**: Efficient scanning and filtering of note collections

### Frontend (React/TypeScript)
- **SubnotesSection Component**: Displays subnotes with previews and metadata
- **Async Loading**: Loads subnote content asynchronously for better performance
- **Responsive Design**: Adapts to different screen sizes and devices
- **Error Handling**: Graceful handling of missing or corrupted notes

### Styling
- **Consistent Design**: Matches the overall application design language
- **Visual Hierarchy**: Clear visual indicators for different depth levels
- **Dark Mode Support**: Full support for dark mode themes
- **Accessibility**: Proper contrast ratios and keyboard navigation

## Troubleshooting

### Subnotes Not Appearing
- Check that note titles follow the correct naming pattern
- Ensure there are no extra characters or spaces in the prefix
- Verify that the parent note exists and is accessible

### Incorrect Sorting
- Check for typos in note titles
- Ensure consistent use of letters and numbers
- Avoid mixing different numbering schemes

### Performance Issues
- Large numbers of subnotes may slow down loading
- Consider breaking down very large hierarchies
- Use tags and search for alternative organization methods

## Future Enhancements

### Planned Features
- **Custom Patterns**: Support for user-defined numbering patterns
- **Drag and Drop**: Reorder subnotes by dragging
- **Bulk Operations**: Create multiple subnotes at once
- **Templates**: Predefined templates for common structures

### Configuration Options
- **Preview Length**: Adjustable preview text length
- **Depth Limits**: Configurable maximum hierarchy depth
- **Visual Themes**: Customizable colors for different levels
- **Auto-Creation**: Automatic creation of missing parent notes

## Related Features

- **[Note Linking](note-linking.md)**: Create connections between notes
- **[Backlinks](note-linking.md#backlinks)**: View incoming links to notes
- **[Tag Filtering](tag-filtering.md)**: Organize notes by tags
- **[Search](search-user-guide.md)**: Find notes by content and metadata
