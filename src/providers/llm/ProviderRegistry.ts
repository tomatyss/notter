import { LLMProvider } from './types';

/**
 * Registry for LLM providers
 * Manages the available LLM providers and allows retrieving them by ID
 */
export class ProviderRegistry {
  /**
   * Map of provider IDs to provider instances
   */
  private providers = new Map<string, LLMProvider>();

  /**
   * Creates a new ProviderRegistry instance
   * Initializes with default providers if specified
   * 
   * @param initializeDefaults - Whether to initialize with default providers (default: true)
   */
  constructor(initializeDefaults = true) {
    if (initializeDefaults) {
      // Initialize providers asynchronously
      this.initializeDefaultProviders().catch(error => {
        console.error('Error initializing default providers:', error);
      });
    }
  }

  /**
   * Initialize default providers
   * Includes Ollama and Gemini (if API key is available)
   * Uses dynamic imports to load providers only when needed
   */
  private async initializeDefaultProviders(): Promise<void> {
    try {
      // Dynamically import the Ollama provider
      const { OllamaProvider } = await import('./OllamaProvider');
      const ollamaProvider = new OllamaProvider();
      this.registerProvider(ollamaProvider);
      
      // Add Gemini provider (if API key is available)
      const geminiApiKey = localStorage.getItem('gemini_api_key');
      if (geminiApiKey) {
        const { GeminiProvider } = await import('./GeminiProvider');
        const geminiProvider = new GeminiProvider(geminiApiKey);
        this.registerProvider(geminiProvider);
      }
    } catch (error) {
      console.error('Error initializing providers:', error);
    }
  }

  /**
   * Refresh providers
   * Clears existing providers and re-initializes them
   * Useful when API keys change
   */
  public async refreshProviders(): Promise<void> {
    // Clear existing providers
    this.providers.clear();

    // Re-initialize providers
    await this.initializeDefaultProviders();
  }

  /**
   * Register a provider with the registry
   * 
   * @param provider - The provider to register
   */
  registerProvider(provider: LLMProvider): void {
    this.providers.set(provider.id, provider);
  }

  /**
   * Get a provider by ID
   * 
   * @param id - The ID of the provider to retrieve
   * @returns The provider instance, or undefined if not found
   */
  getProvider(id: string): LLMProvider | undefined {
    return this.providers.get(id);
  }

  /**
   * Get all available providers
   * 
   * @returns Array of all registered providers
   */
  getAvailableProviders(): LLMProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get the IDs of all available providers
   * 
   * @returns Array of provider IDs
   */
  getAvailableProviderIds(): string[] {
    return Array.from(this.providers.keys());
  }
}

/**
 * Create and export a default provider registry instance
 */
export const defaultProviderRegistry = new ProviderRegistry();
