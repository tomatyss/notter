# Find and Replace in Notter

This document provides detailed information about the find and replace functionality in Notter, which allows you to search for and replace text within your notes.

## Overview

The find and replace feature in Notter provides a powerful way to search for specific text within the current note and optionally replace it. This functionality is similar to what you would find in text editors and word processors, making it familiar and easy to use.

Key capabilities include:
- Finding text with real-time highlighting
- Navigating between matches
- Replacing individual matches
- Replacing all matches at once
- Case-sensitive and whole word search options

## Accessing Find and Replace

There are several ways to access the find and replace functionality:

### Keyboard Shortcuts

- **Ctrl+F** (Windows/Linux) or **Cmd+F** (macOS): Open the find panel
- **Ctrl+H** (Windows/Linux) or **Cmd+H** (macOS): Open the find and replace panel
- **F3** or **Ctrl+G**: Find next match
- **Shift+F3** or **Ctrl+Shift+G**: Find previous match
- **Escape**: Close the find/replace panel

### Context Menu

Right-click in the note content area and select "Find" or "Find and Replace" from the context menu.

## Using Find

### Basic Search

1. Open the find panel using Ctrl+F/Cmd+F
2. Type the text you want to find in the search box
3. Matches will be highlighted in the note content in real-time
4. The number of matches will be displayed (e.g., "3 of 10")

### Navigating Between Matches

- Use the up and down arrow buttons to navigate between matches
- Alternatively, use F3/Shift+F3 keyboard shortcuts
- The current match is highlighted with a different color

### Search Options

The find panel includes two search options:

1. **Case Sensitive**: When enabled, the search will match the exact case of the search text
   - Example: Searching for "Note" with case sensitivity will not match "note" or "NOTE"

2. **Whole Word**: When enabled, the search will only match complete words
   - Example: Searching for "note" with whole word enabled will match "note" but not "notebook" or "footnote"

## Using Replace

### Accessing Replace

1. Open the find panel using Ctrl+F/Cmd+F
2. Click the "Find & Replace" button to expand the replace options
   - Alternatively, use Ctrl+H/Cmd+H to open the find and replace panel directly

### Replacing Text

1. Enter the text to find in the search box
2. Enter the replacement text in the replace box
3. Navigate to the match you want to replace
4. Click the "Replace" button to replace only the current match
5. Click "Replace All" to replace all matches at once

### Replace Confirmation

When using "Replace All", a confirmation will appear showing the number of replacements that will be made. This helps prevent accidental mass replacements.

## Technical Implementation

The find and replace functionality is implemented with:

1. **Components**:
   - `FindReplacePanel.tsx`: The UI component for the find/replace panel
   - `NoteViewer.tsx`: Contains the logic for finding and replacing text

2. **Key Functions**:
   - `findTextInContent`: Searches for matches in the note content
   - `scrollToMatch`: Scrolls to and highlights the current match
   - `replaceMatch`: Replaces the current match with new text
   - `replaceAllMatches`: Replaces all matches with new text

3. **State Management**:
   - Tracks the current search text, options, and matches
   - Maintains the current match index for navigation
   - Handles highlighting of matches in the content

## Limitations and Edge Cases

### Markdown Mode vs. Plain Text Mode

- In Markdown mode, the find and replace functionality works on the source Markdown text, not the rendered HTML
- When replacing text in Markdown, be careful not to break the Markdown syntax

### Large Documents

- For very large documents, the search might take a moment to complete
- The number of matches is limited to prevent performance issues

### Special Characters

- When searching for special characters used in regular expressions (like `*`, `.`, `[`, etc.), they are automatically escaped
- This ensures that searching for text like "example.com" works as expected

## Best Practices

For the most effective use of find and replace:

1. **Start specific**: Begin with specific search terms to avoid too many matches
2. **Use options wisely**: Enable case sensitivity or whole word matching to narrow down results
3. **Preview before replacing**: Navigate to matches before replacing to ensure you're changing the right text
4. **Use replace all carefully**: Always verify your search pattern before using "Replace All"

## Future Enhancements

Planned enhancements for the find and replace feature include:

- Regular expression (regex) search support
- Find in selection
- Find across all notes
- Search history
- Persistent search options
