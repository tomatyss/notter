/**
 * Tools module
 * Exports all tool-related types and implementations
 */

// Export types
export * from './types';

// Export note tools
export * from './noteTools';

// Initialize the default tool registry with the available tools
import { defaultToolRegistry } from './types';
import { createNoteTool, updateNoteTool, searchNotesTool } from './noteTools';

// Register the tools with the registry
defaultToolRegistry.registerTool(createNoteTool);
defaultToolRegistry.registerTool(updateNoteTool);
defaultToolRegistry.registerTool(searchNotesTool);

// Export the initialized registry
export { defaultToolRegistry };
