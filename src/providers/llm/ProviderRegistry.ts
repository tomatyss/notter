import { LLMProvider } from './types';
import { OllamaProvider } from './OllamaProvider';
import { GeminiProvider } from './GeminiProvider';

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
      this.initializeDefaultProviders();
    }
  }
  
  /**
   * Initialize default providers
   * Includes Ollama and Gemini (if API key is available)
   */
  private initializeDefaultProviders(): void {
    // Add Ollama provider
    const ollamaProvider = new OllamaProvider();
    this.registerProvider(ollamaProvider);
    
    // Add Gemini provider (if API key is available)
    const geminiApiKey = localStorage.getItem('gemini_api_key');
    if (geminiApiKey) {
      const geminiProvider = new GeminiProvider(geminiApiKey);
      this.registerProvider(geminiProvider);
    }
  }
  
  /**
   * Refresh providers
   * Clears existing providers and re-initializes them
   * Useful when API keys change
   */
  public refreshProviders(): void {
    // Clear existing providers
    this.providers.clear();
    
    // Re-initialize providers
    this.initializeDefaultProviders();
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
