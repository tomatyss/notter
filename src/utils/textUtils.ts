/**
 * Utility functions for text manipulation and searching
 */

/**
 * Escapes special characters in a string for use in a regular expression
 * 
 * @param string The string to escape
 * @returns The escaped string
 */
export const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Gets all text nodes in an element
 * 
 * @param node The node to search in
 * @returns Array of text nodes
 */
export const getTextNodesIn = (node: Node): Text[] => {
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(
    node,
    NodeFilter.SHOW_TEXT,
    null
  );
  
  let currentNode: Node | null = walker.nextNode();
  while (currentNode) {
    textNodes.push(currentNode as Text);
    currentNode = walker.nextNode();
  }
  
  return textNodes;
};

/**
 * Finds text in content and returns the positions of matches
 * 
 * @param content The content to search in
 * @param searchText The text to search for
 * @param options Search options
 * @returns Array of match positions
 */
export const findTextInContent = (
  content: string,
  searchText: string,
  options: { caseSensitive: boolean; wholeWord: boolean }
): number[] => {
  if (!content || !searchText) {
    return [];
  }
  
  const matches: number[] = [];
  
  // Create a regex for the search
  let flags = 'g';
  if (!options.caseSensitive) {
    flags += 'i';
  }
  
  let regex: RegExp;
  if (options.wholeWord) {
    regex = new RegExp(`\\b${escapeRegExp(searchText)}\\b`, flags);
  } else {
    regex = new RegExp(escapeRegExp(searchText), flags);
  }
  
  // Find all matches
  let match;
  while ((match = regex.exec(content)) !== null) {
    matches.push(match.index);
  }
  
  return matches;
};

/**
 * Scrolls to a specific match in the content
 * 
 * @param container The container element
 * @param index The index of the match in the content
 * @param length The length of the match
 */
export const scrollToMatch = (
  container: HTMLElement,
  index: number,
  length: number
): void => {
  // Get all text nodes in the container
  const textNodes = getTextNodesIn(container);
  let currentIndex = 0;
  let targetNode = null;
  let targetOffset = 0;
  
  // Find the text node containing the match
  for (const node of textNodes) {
    const nodeLength = node.textContent?.length || 0;
    
    if (currentIndex + nodeLength > index) {
      targetNode = node;
      targetOffset = index - currentIndex;
      break;
    }
    
    currentIndex += nodeLength;
  }
  
  if (targetNode) {
    // Create a range to select the match
    const range = document.createRange();
    range.setStart(targetNode, targetOffset);
    range.setEnd(targetNode, targetOffset + length);
    
    // Scroll to the range
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
      
      // Scroll the match into view
      const rect = range.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      if (rect.top < containerRect.top || rect.bottom > containerRect.bottom) {
        container.scrollTo({
          top: container.scrollTop + (rect.top - containerRect.top) - 100,
          behavior: 'smooth'
        });
      }
    }
  }
};

/**
 * Creates an array of text segments with match information
 * 
 * @param content The content to highlight matches in
 * @param matches Array of match positions
 * @param matchLength Length of the match
 * @param currentMatchIndex Current match index (1-based)
 * @returns Array of text segments with match information
 */
export interface TextSegment {
  text: string;
  isMatch: boolean;
  isCurrentMatch: boolean;
  key: string;
}

export const createMatchSegments = (
  content: string,
  matches: number[],
  matchLength: number,
  currentMatchIndex: number
): TextSegment[] => {
  if (!content || matches.length === 0) {
    return [{ 
      text: content, 
      isMatch: false, 
      isCurrentMatch: false,
      key: "text-only" 
    }];
  }
  
  const result: TextSegment[] = [];
  let lastIndex = 0;
  
  // Process each match
  for (let i = 0; i < matches.length; i++) {
    const position = matches[i];
    const isCurrentMatch = i === currentMatchIndex - 1;
    
    // Add text before the match
    if (position > lastIndex) {
      result.push({
        text: content.substring(lastIndex, position),
        isMatch: false,
        isCurrentMatch: false,
        key: `text-${i}`
      });
    }
    
    // Add the match
    result.push({
      text: content.substring(position, position + matchLength),
      isMatch: true,
      isCurrentMatch: isCurrentMatch,
      key: `match-${i}`
    });
    
    // Update last index
    lastIndex = position + matchLength;
  }
  
  // Add remaining text after the last match
  if (lastIndex < content.length) {
    result.push({
      text: content.substring(lastIndex),
      isMatch: false,
      isCurrentMatch: false,
      key: "text-end"
    });
  }
  
  return result;
};

/**
 * Regular expression to detect URLs in plain text
 * Matches http://, https://, www. URLs with improved pattern matching
 */
export const urlRegex = /(https?:\/\/[^\s<>]+)|(www\.[^\s<>]+\.[^\s<>]+)/g;

/**
 * Checks if a string is a valid URL
 * 
 * @param text The text to check
 * @returns True if the text is a valid URL
 */
export const isValidUrl = (text: string): boolean => {
  if (text.startsWith('http://') || text.startsWith('https://')) {
    return true;
  }
  
  if (text.startsWith('www.')) {
    return true;
  }
  
  return false;
};

/**
 * Ensures a URL has a proper protocol
 * 
 * @param url The URL to normalize
 * @returns A URL with proper protocol
 */
export const normalizeUrl = (url: string): string => {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  if (url.startsWith('www.')) {
    return `https://${url}`;
  }
  
  return url;
};

/**
 * Regular expression to detect note links
 * Matches [[Note Title]] syntax
 */
export const noteLinkRegex = /\[\[(.*?)\]\]/g;
