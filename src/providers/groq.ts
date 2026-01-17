/**
 * Smart AI Test Suit - Groq Provider
 * Fast cloud inference using Groq API.
 */

import Groq from 'groq-sdk';
import type { LLMProvider, GenerateOptions } from './types.js';
import {
  DEFAULT_GROQ_MODEL,
  DEFAULT_TIMEOUT_MS,
  type GroqConfig,
} from './types.js';
import { ProviderError, ProviderNotAvailableError, withTimeout } from '../utils/errors.js';

export class GroqProvider implements LLMProvider {
  readonly name = 'Groq';
  private client: Groq;
  private defaultModel: string;
  private timeout: number;
  private apiKey: string;

  constructor(config?: Partial<GroqConfig>) {
    this.apiKey = config?.apiKey || process.env.GROQ_API_KEY || '';
    this.defaultModel = config?.model || DEFAULT_GROQ_MODEL;
    this.timeout = config?.timeout || DEFAULT_TIMEOUT_MS;

    if (!this.apiKey) {
      // Create client anyway, but it won't work without API key
      this.client = new Groq({ apiKey: 'missing' });
    } else {
      this.client = new Groq({ apiKey: this.apiKey });
    }
  }

  /**
   * Check if Groq is available (API key is set)
   */
  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    // Optionally verify the API key works by making a minimal request
    // For now, just check if the key exists
    return true;
  }

  /**
   * Generate text using Groq
   */
  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    const model = options?.model || this.defaultModel;
    const timeout = options?.timeout || this.timeout;

    if (!this.apiKey) {
      throw new ProviderNotAvailableError('Groq');
    }

    try {
      const response = await withTimeout(
        this.client.chat.completions.create({
          model,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens,
        }),
        timeout,
        'Groq generation'
      );

      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new ProviderError('Groq', 'Empty response from model');
      }

      return content;
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);

      // Check for common API errors
      if (message.includes('401') || message.includes('Unauthorized')) {
        throw new ProviderError('Groq', 'Invalid API key. Check GROQ_API_KEY.', {
          cause: error instanceof Error ? error : undefined,
        });
      }

      if (message.includes('429') || message.includes('rate limit')) {
        throw new ProviderError('Groq', 'Rate limit exceeded. Try again later.', {
          cause: error instanceof Error ? error : undefined,
        });
      }

      if (message.includes('model') && message.includes('not found')) {
        throw new ProviderError('Groq', `Model "${model}" not available.`, {
          cause: error instanceof Error ? error : undefined,
        });
      }

      throw new ProviderError('Groq', `Generation failed: ${message}`, {
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
}
