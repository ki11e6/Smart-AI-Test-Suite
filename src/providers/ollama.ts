/**
 * Smart AI Test Suit - Ollama Provider
 * Local LLM provider using Ollama.
 */

import { Ollama } from 'ollama';
import type { LLMProvider, GenerateOptions } from './types.js';
import {
  DEFAULT_OLLAMA_HOST,
  DEFAULT_OLLAMA_MODEL,
  DEFAULT_TIMEOUT_MS,
  type OllamaConfig,
} from './types.js';
import { ProviderError, ProviderNotAvailableError, withTimeout } from '../utils/errors.js';

export class OllamaProvider implements LLMProvider {
  readonly name = 'Ollama';
  private client: Ollama;
  private defaultModel: string;
  private timeout: number;

  constructor(config?: Partial<OllamaConfig>) {
    const host = config?.host || process.env.OLLAMA_HOST || DEFAULT_OLLAMA_HOST;
    this.defaultModel = config?.model || process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL;
    this.timeout = config?.timeout || DEFAULT_TIMEOUT_MS;

    this.client = new Ollama({ host });
  }

  /**
   * Check if Ollama is available by listing models
   */
  async isAvailable(): Promise<boolean> {
    try {
      await withTimeout(
        this.client.list(),
        5000, // 5 second timeout for availability check
        'Ollama availability check'
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate text using Ollama
   */
  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    const model = options?.model || this.defaultModel;
    const timeout = options?.timeout || this.timeout;

    // First check if available
    const available = await this.isAvailable();
    if (!available) {
      throw new ProviderNotAvailableError('Ollama');
    }

    try {
      const response = await withTimeout(
        this.client.generate({
          model,
          prompt,
          stream: false,
          options: {
            temperature: options?.temperature ?? 0.7,
            num_predict: options?.maxTokens,
          },
        }),
        timeout,
        'Ollama generation'
      );

      if (!response.response) {
        throw new ProviderError('Ollama', 'Empty response from model');
      }

      return response.response;
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);

      // Check for model not found error
      if (message.includes('not found') || message.includes('does not exist')) {
        throw new ProviderError(
          'Ollama',
          `Model "${model}" not found. Run: ollama pull ${model}`,
          { cause: error instanceof Error ? error : undefined }
        );
      }

      throw new ProviderError('Ollama', `Generation failed: ${message}`, {
        cause: error instanceof Error ? error : undefined,
      });
    }
  }

  /**
   * Get the default model name
   */
  getDefaultModel(): string {
    return this.defaultModel;
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await this.client.list();
      return response.models.map((m) => m.name);
    } catch (error) {
      throw new ProviderError('Ollama', 'Failed to list models', {
        cause: error instanceof Error ? error : undefined,
      });
    }
  }
}
