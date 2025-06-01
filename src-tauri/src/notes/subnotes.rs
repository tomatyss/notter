use crate::notes::{NoteManager, NoteSummary};
use anyhow::Result;
use serde::Serialize;
use std::cmp::Ordering;

/// Information about a subnote
#[derive(Debug, Clone, Serialize)]
pub struct SubnoteInfo {
    /// Note summary
    pub note: NoteSummary,
    /// Depth in the hierarchy
    pub depth: u32,
}

impl NoteManager {
    /// Gets all subnotes for a parent note
    ///
    /// # Parameters
    /// * `parent_id` - ID of the parent note
    ///
    /// # Returns
    /// List of subnotes with their hierarchy depth
    pub fn get_subnotes(&self, parent_id: &str) -> Result<Vec<SubnoteInfo>> {
        let parent_note = self.get_note(parent_id)?;
        let parent_title = &parent_note.title;

        // Extract the parent prefix (e.g., "1" from "1-some-title")
        let parent_prefix = extract_prefix(parent_title);

        // Get all notes in the system
        let all_notes = self.list_notes(None)?;

        let mut subnotes = Vec::new();

        for note in all_notes {
            if let Some(depth) = is_subnote(&note.title, parent_prefix) {
                subnotes.push(SubnoteInfo { note, depth });
            }
        }

        // Sort subnotes in Zettelkasten order (1a, 1a1, 1a2, 1b, 1c, etc.)
        subnotes.sort_by(|a, b| {
            let a_prefix = extract_prefix(&a.note.title).unwrap_or("");
            let b_prefix = extract_prefix(&b.note.title).unwrap_or("");
            zettelkasten_compare(a_prefix, b_prefix)
        });

        Ok(subnotes)
    }
}

/// Extracts the numeric prefix from a note title (e.g., "1" from "1-some-title")
fn extract_prefix(title: &str) -> Option<&str> {
    title.split('-').next()
}

/// Checks if a note is a subnote of another note based on their titles
/// Supports Zettelkasten patterns like: 1 -> 1a, 1b -> 1a1, 1a2, etc.
/// Ensures proper boundary matching (e.g., "10" is not a subnote of "1")
///
/// # Parameters
/// * `title` - Title of the potential subnote
/// * `parent_prefix` - Prefix of the parent note (e.g., "1")
///
/// # Returns
/// Some(depth) if it's a subnote, None otherwise
fn is_subnote(title: &str, parent_prefix: Option<&str>) -> Option<u32> {
    let Some(parent_prefix) = parent_prefix else {
        return None;
    };

    let mut parts = title.split('-');
    let first_part = parts.next()?;

    // Check if the first part starts with the parent prefix and has additional characters
    if first_part.starts_with(parent_prefix) && first_part.len() > parent_prefix.len() {
        let suffix = &first_part[parent_prefix.len()..];
        
        // Ensure proper boundary: if parent ends with digit, suffix must start with letter
        // This prevents "10" from being considered a subnote of "1"
        if parent_prefix.chars().last().map_or(false, |c| c.is_numeric()) {
            if !suffix.chars().next().map_or(false, |c| c.is_alphabetic()) {
                return None;
            }
        }
        
        // Calculate depth based on the Zettelkasten pattern
        // Examples: "1" -> "1a" (depth 1), "1a" -> "1a1" (depth 1), "1" -> "1a1" (depth 2)
        let mut depth = 0;
        let mut chars = suffix.chars().peekable();
        
        while let Some(ch) = chars.next() {
            if ch.is_alphabetic() {
                depth += 1;
            } else if ch.is_numeric() {
                depth += 1;
                // Skip remaining digits in this number
                while chars.peek().map_or(false, |c| c.is_numeric()) {
                    chars.next();
                }
            }
        }
        
        Some(depth)
    } else {
        None
    }
}

/// Compares two Zettelkasten prefixes for proper sorting
/// Ensures order like: 1a, 1a1, 1a2, 1b, 1c, etc.
///
/// # Parameters
/// * `a` - First prefix to compare
/// * `b` - Second prefix to compare
///
/// # Returns
/// Ordering for sorting
fn zettelkasten_compare(a: &str, b: &str) -> Ordering {
    // Parse both prefixes into components
    let a_parts = parse_zettelkasten_parts(a);
    let b_parts = parse_zettelkasten_parts(b);
    
    // Compare component by component
    let max_len = a_parts.len().max(b_parts.len());
    
    for i in 0..max_len {
        let a_part = a_parts.get(i);
        let b_part = b_parts.get(i);
        
        match (a_part, b_part) {
            (Some(a_comp), Some(b_comp)) => {
                let cmp = compare_zettelkasten_component(a_comp, b_comp);
                if cmp != Ordering::Equal {
                    return cmp;
                }
            }
            (Some(_), None) => return Ordering::Greater, // a is longer
            (None, Some(_)) => return Ordering::Less,    // b is longer
            (None, None) => break,
        }
    }
    
    Ordering::Equal
}

/// Represents a component in a Zettelkasten identifier
#[derive(Debug, PartialEq)]
enum ZettelComponent {
    Number(u32),
    Letter(char),
}

/// Parses a Zettelkasten prefix into its components
/// Example: "1a2" -> [Number(1), Letter('a'), Number(2)]
fn parse_zettelkasten_parts(prefix: &str) -> Vec<ZettelComponent> {
    let mut parts = Vec::new();
    let mut chars = prefix.chars().peekable();
    
    while let Some(ch) = chars.next() {
        if ch.is_numeric() {
            let mut num_str = String::new();
            num_str.push(ch);
            
            // Collect all consecutive digits
            while chars.peek().map_or(false, |c| c.is_numeric()) {
                num_str.push(chars.next().unwrap());
            }
            
            if let Ok(num) = num_str.parse::<u32>() {
                parts.push(ZettelComponent::Number(num));
            }
        } else if ch.is_alphabetic() {
            parts.push(ZettelComponent::Letter(ch.to_ascii_lowercase()));
        }
    }
    
    parts
}

/// Compares two Zettelkasten components
fn compare_zettelkasten_component(a: &ZettelComponent, b: &ZettelComponent) -> Ordering {
    match (a, b) {
        (ZettelComponent::Number(a_num), ZettelComponent::Number(b_num)) => a_num.cmp(b_num),
        (ZettelComponent::Letter(a_char), ZettelComponent::Letter(b_char)) => a_char.cmp(b_char),
        (ZettelComponent::Number(_), ZettelComponent::Letter(_)) => Ordering::Less, // Numbers come before letters
        (ZettelComponent::Letter(_), ZettelComponent::Number(_)) => Ordering::Greater, // Letters come after numbers
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_prefix() {
        assert_eq!(extract_prefix("1-title"), Some("1"));
        assert_eq!(extract_prefix("1.1-title"), Some("1.1"));
        assert_eq!(extract_prefix("title"), Some("title"));
    }

    #[test]
    fn test_is_subnote() {
        // Test Zettelkasten pattern: 1 -> 1a, 1b -> 1a1, 1a2, etc.
        assert_eq!(is_subnote("1a-title", Some("1")), Some(1));
        assert_eq!(is_subnote("1b-title", Some("1")), Some(1));
        assert_eq!(is_subnote("1a1-title", Some("1")), Some(2));
        assert_eq!(is_subnote("1a2-title", Some("1")), Some(2));
        assert_eq!(is_subnote("1a1-title", Some("1a")), Some(1));
        assert_eq!(is_subnote("1a2-title", Some("1a")), Some(1));
        assert_eq!(is_subnote("2-title", Some("1")), None);
        assert_eq!(is_subnote("1-title", Some("1")), None);
        assert_eq!(is_subnote("1a-title", Some("2")), None);
        assert_eq!(is_subnote("2a-title", Some("1")), None);
        
        // Test boundary cases: 10 should not be a subnote of 1
        assert_eq!(is_subnote("10-title", Some("1")), None);
        assert_eq!(is_subnote("11-title", Some("1")), None);
        assert_eq!(is_subnote("100-title", Some("1")), None);
        
        // But 10a should be a subnote of 10
        assert_eq!(is_subnote("10a-title", Some("10")), Some(1));
    }
    
    #[test]
    fn test_zettelkasten_sorting() {
        let mut prefixes = vec!["1b", "1a2", "1a", "1a1", "1c", "1a10"];
        prefixes.sort_by(|a, b| zettelkasten_compare(a, b));
        assert_eq!(prefixes, vec!["1a", "1a1", "1a2", "1a10", "1b", "1c"]);
    }
}
