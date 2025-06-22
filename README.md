# Notter

Notter is a cross-platform desktop application for working with text files as a knowledge archive. It offers smart searching, summarization, filtering, and the ability to find and display connections between notes through clustering.

> **Disclaimer**: This project is currently in active development. Features may change, and some functionality might be incomplete. Contributions and feedback are welcome!


## Features

- **Smart Searching**: Quickly find notes based on content, tags, or metadata
- **Note Visualization**: See connections between your notes through different visualization techniques
- **Tag-Based Organization**: Automatically extract and organize notes by tags
- **Note Linking**: Create links between notes using `[[Note Title]]` syntax
- **Backlinks**: View which notes link to the current note
- **Zettelkasten Subnotes**: Hierarchical note organization with automatic subnote detection
- **Markdown Support**: Full support for Markdown formatting
- **Plain Text Support**: Work with simple text files
- **Local-First Storage**: Your notes are stored as regular files on your system
- **Cross-Platform**: Works on Windows, macOS, Linux, and iOS

## Installation

### Prerequisites

- None! Notter is packaged as a standalone application.

### Download

Download the latest version for your platform from the [Releases](https://github.com/tomatyss/notter/releases) page.

#### Windows

1. Download the `.msi` installer
2. Run the installer and follow the prompts
3. Launch Notter from the Start menu

#### macOS

1. Download the `.dmg` file
2. Open the `.dmg` file and drag Notter to your Applications folder
3. Launch Notter from your Applications folder

#### Linux

1. Download the `.AppImage` file
2. Make it executable: `chmod +x Notter.AppImage`
3. Run the AppImage: `./Notter.AppImage`

#### iOS

1. Download the app from the App Store
2. Launch Notter from your home screen
3. Grant necessary permissions when prompted

## Usage

### Getting Started

1. **Select a Notes Directory**: When you first launch Notter, you'll need to select a directory where your notes are stored (or where you want to store them).

2. **Browse Your Notes**: Once a directory is selected, Notter will scan for Markdown (`.md`) and text (`.txt`) files and display them in the note list.

3. **View Notes**: Click on a note in the list to view its content in the main panel.

### Interface

The top bar lets you switch between three tabs:

1. **Notes** – browse, edit, and create notes. Use the search box for full-text search and filter by tags in the sidebar.
2. **Chat** – experiment with an LLM-powered assistant (currently just echoes your input).
3. **Settings** – adjust the note naming pattern and search index options.

### Note Organization

Notter automatically extracts tags from your notes. Tags are words that start with `#` in your note content. For example:

```markdown
# My Note Title

This is the content of my note.

#important #reference
```

These tags will be displayed in the note list and can be used for filtering and organization.

### Note Linking

You can create links between notes using the `[[Note Title]]` syntax. For example:

```markdown
# Project Ideas

See my [[Research Notes]] for more information.
```

When viewing the note, the link will be clickable and will navigate to the linked note. This works in both Markdown and plain text files.

### Backlinks

Notter automatically tracks which notes link to the current note and displays them in a "Linked from" section at the bottom of the note. This helps you understand the connections between your notes and navigate between related content.

### Zettelkasten Subnotes

Notter supports the Zettelkasten method of hierarchical note organization through automatic subnote detection. When you view a note, Notter automatically finds and displays related subnotes based on your naming pattern.

#### How It Works

The system follows the traditional Zettelkasten numbering pattern:

- **Main note**: `1-philosophy`
- **Level 1 subnotes**: `1a-metaphysics`, `1b-epistemology`, `1c-ethics`
- **Level 2 subnotes**: `1a1-mind-body-problem`, `1a2-free-will`, `1b1-gettier-problems`

#### Features

- **Automatic Detection**: Subnotes are automatically detected based on title patterns
- **Visual Hierarchy**: Different depth levels are visually distinguished with colored borders
- **Content Previews**: Each subnote shows a clean preview of its content (up to 300 characters)
- **Proper Sorting**: Subnotes are sorted in logical Zettelkasten order (1a, 1a1, 1a2, 1b, 1c, etc.)
- **Boundary Protection**: Ensures "10" is not considered a subnote of "1"
- **Click Navigation**: Click any subnote to navigate directly to it
- **Metadata Display**: Shows modification dates and tags for each subnote

#### Example Structure

```
1-philosophy.md
├── 1a-metaphysics.md
│   ├── 1a1-mind-body-problem.md
│   └── 1a2-free-will.md
├── 1b-epistemology.md
│   ├── 1b1-gettier-problems.md
│   └── 1b2-skepticism.md
└── 1c-ethics.md
    ├── 1c1-utilitarianism.md
    └── 1c2-deontology.md
```

When viewing `1-philosophy.md`, you'll see `1a-metaphysics.md`, `1b-epistemology.md`, and `1c-ethics.md` as subnotes. When viewing `1a-metaphysics.md`, you'll see only `1a1-mind-body-problem.md` and `1a2-free-will.md` as its direct subnotes.

### Visualization Techniques

Notter supports different ways to visualize your notes:

- **Graph-Based Visualization**: See notes as nodes and their relationships as edges
- **Timeline Visualization**: View notes arranged chronologically
- **Tag-Based Visualization**: Group notes by their tags

## Project Structure

The application is written entirely in Rust. The user interface is implemented
with [egui](https://github.com/emilk/egui) so the whole program can run without
any web stack. Notes are stored as regular text files on your file system.

### Key Components

- **NoteList**: Displays a list of all notes with metadata
- **NoteViewer**: Renders the selected note with Markdown support
- **SettingsPanel**: Allows configuration of the application

## Development

### Prerequisites

You only need [Rust](https://www.rust-lang.org/tools/install) (latest stable)
to build and run Notter.

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/tomatyss/notter.git
   cd notter
   ```

2. Run the application from the `src-tauri` crate:
   ```bash
   cargo run --manifest-path src-tauri/Cargo.toml --bin egui_app
   ```

### Building

To build a release version:

```bash
cargo build --manifest-path src-tauri/Cargo.toml --bin egui_app --release
```

The binary will be located in `src-tauri/target/release`.

By default the application loads notes from the `sample-notes` directory. Pass a
path as the first argument to open your own collection.

### Releases

Notter uses GitHub Actions to automate the build and release process. When a new tag is pushed to the repository, the workflow automatically builds the application for Windows, macOS, and Linux, and creates a GitHub release with the built artifacts.

For detailed instructions on creating new releases, see the [Release Guide](docs/release-guide.md).

### iOS Development

To build and run the application on iOS you can use the helper script:

```bash
./ios-build.sh
```

The script requires Xcode and the `cargo tauri` command installed.

## Technologies

- **[Rust](https://www.rust-lang.org/)**: The language used for the entire codebase
- **[egui](https://github.com/emilk/egui)**: Immediate mode GUI library powering the interface

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2025 Notter Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
