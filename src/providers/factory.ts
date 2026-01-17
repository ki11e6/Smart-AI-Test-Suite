/**
 * Smart AI Test Suit - Provider Factory
 * Factory for creating LLM providers with auto-detection support.
 */

import type { LLMProvider, ProviderConfig, ProviderType } from './types.js';
import { PROVIDER_PRIORITY, type ProviderStatus } from './types.js';
import { OllamaProvider } from './ollama.js';
import { GroqProvider } from './groq.js';
import { OpenAIProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';
import { ProviderError } from '../utils/errors.js';

// =============================================================================
// Provider Factory
// =============================================================================

export class ProviderFactory {
  /**
   * Create a provider instance based on configuration
   */
  static create(config: ProviderConfig): LLMProvider {
    switch (config.provider) {
      case 'ollama':
        return new OllamaProvider({
          host: config.baseUrl,
          model: config.model,
          timeout: config.timeout,
        });

      case 'groq':
        return new GroqProvider({
          apiKey: config.apiKey,
          model: config.model,
          timeout: config.timeout,
        });

      case 'openai':
        return new OpenAIProvider({
          apiKey: config.apiKey,
          model: config.model,
          baseUrl: config.baseUrl,
          timeout: config.timeout,
        });

      case 'anthropic':
        return new AnthropicProvider({
          apiKey: config.apiKey,
          model: config.model,
          timeout: config.timeout,
        });

      default:
        throw new ProviderError(
          config.provider as string,
          `Unknown provider: ${config.provider}. Valid options: ollama, groq, openai, anthropic`
        );
    }
  }

  /**
   * Create a provider by type name, using environment variables for configuration
   */
  static createByType(
    type: ProviderType,
    options?: { model?: string; timeout?: number }
  ): LLMProvider {
    const config: ProviderConfig = {
      provider: type,
      model: options?.model,
      timeout: options?.timeout,
    };

    // Add API key from environment
    switch (type) {
      case 'groq':
        config.apiKey = process.env.GROQ_API_KEY;
        break;
      case 'openai':
        config.apiKey = process.env.OPENAI_API_KEY;
        break;
      case 'anthropic':
        config.apiKey = process.env.ANTHROPIC_API_KEY;
        break;
      case 'ollama':
        config.baseUrl = process.env.OLLAMA_HOST;
        break;
    }

    return this.create(config);
  }

  /**
   * Auto-detect and create the first available provider
   * Priority order: Groq → OpenAI → Anthropic → Ollama
   */
  static async autoDetect(options?: {
    model?: string;
    timeout?: number;
  }): Promise<LLMProvider> {
    const errors: string[] = [];

    for (const providerType of PROVIDER_PRIORITY) {
      try {
        const provider = this.createByType(providerType as ProviderType, options);
        const available = await provider.isAvailable();

        if (available) {
          return provider;
        }

        errors.push(`${providerType}: not available`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`${providerType}: ${message}`);
      }
    }

    throw new ProviderError(
      'AutoDetect',
      `No LLM provider available. Set API key or start Ollama.\nChecked: ${errors.join(', ')}`
    );
  }

  /**
   * Check availability of all providers
   */
  static async checkAllProviders(): Promise<ProviderStatus[]> {
    const statuses: ProviderStatus[] = [];

    for (const providerType of PROVIDER_PRIORITY) {
      const status: ProviderStatus = {
        name: providerType,
        available: false,
      };

      try {
        const provider = this.createByType(providerType as ProviderType);
        status.available = await provider.isAvailable();

        if ('getDefaultModel' in provider) {
          status.model = (provider as OllamaProvider).getDefaultModel();
        }
      } catch (error) {
        status.error = error instanceof Error ? error.message : String(error);
      }

      statuses.push(status);
    }

    return statuses;
  }

  /**
   * Get the first available provider type (without creating it)
   */
  static async getFirstAvailable(): Promise<ProviderType | null> {
    for (const providerType of PROVIDER_PRIORITY) {
      try {
        const provider = this.createByType(providerType as ProviderType);
        if (await provider.isAvailable()) {
          return providerType as ProviderType;
        }
      } catch {
        // Continue to next provider
      }
    }

    return null;
  }

  /**
   * Validate provider configuration
   */
  static validateConfig(config: Partial<ProviderConfig>): string[] {
    const errors: string[] = [];

    if (!config.provider) {
      errors.push('Provider type is required');
      return errors;
    }

    const validProviders: ProviderType[] = ['ollama', 'groq', 'openai', 'anthropic'];
    if (!validProviders.includes(config.provider)) {
      errors.push(`Invalid provider: ${config.provider}. Valid: ${validProviders.join(', ')}`);
    }

    // Check API key requirements for cloud providers
    const envVarMap: Record<string, string> = {
      groq: 'GROQ_API_KEY',
      openai: 'OPENAI_API_KEY',
      anthropic: 'ANTHROPIC_API_KEY',
    };

    if (config.provider in envVarMap && !config.apiKey) {
      const envVar = envVarMap[config.provider];

      if (!process.env[envVar]) {
        errors.push(`API key required for ${config.provider}. Set ${envVar} environment variable.`);
      }
    }

    return errors;
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Get or create a provider based on user options
 * If provider is specified, use it. Otherwise, auto-detect.
 */
export async function getProvider(options: {
  provider?: ProviderType;
  model?: string;
  timeout?: number;
}): Promise<LLMProvider> {
  if (options.provider) {
    return ProviderFactory.createByType(options.provider, {
      model: options.model,
      timeout: options.timeout,
    });
  }

  return ProviderFactory.autoDetect({
    model: options.model,
    timeout: options.timeout,
  });
}

/**
 * Quick check if any provider is available
 */
export async function hasAvailableProvider(): Promise<boolean> {
  const available = await ProviderFactory.getFirstAvailable();
  return available !== null;
}
