/**
 * Interface for tools that can be used by the LLM
 */
export interface Tool {
  /**
   * Unique identifier for the tool
   */
  id: string;
  
  /**
   * Display name for the tool
   */
  name: string;
  
  /**
   * Description of what the tool does
   */
  description: string;
  
  /**
   * Execute the tool with the given parameters
   * 
   * @param params - Parameters for the tool execution
   * @returns Promise resolving to the result of the tool execution
   */
  execute(params: any): Promise<any>;
}

/**
 * Registry for tools
 * Manages the available tools and allows retrieving them by ID
 */
export class ToolRegistry {
  /**
   * Map of tool IDs to tool instances
   */
  private tools = new Map<string, Tool>();
  
  /**
   * Register a tool with the registry
   * 
   * @param tool - The tool to register
   */
  registerTool(tool: Tool): void {
    this.tools.set(tool.id, tool);
  }
  
  /**
   * Get a tool by ID
   * 
   * @param id - The ID of the tool to retrieve
   * @returns The tool instance, or undefined if not found
   */
  getTool(id: string): Tool | undefined {
    return this.tools.get(id);
  }
  
  /**
   * Get all available tools
   * 
   * @returns Array of all registered tools
   */
  getAvailableTools(): Tool[] {
    return Array.from(this.tools.values());
  }
  
  /**
   * Get the IDs of all available tools
   * 
   * @returns Array of tool IDs
   */
  getAvailableToolIds(): string[] {
    return Array.from(this.tools.keys());
  }
}

/**
 * Create and export a default tool registry instance
 */
export const defaultToolRegistry = new ToolRegistry();
